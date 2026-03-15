import { Dispatch, SetStateAction } from "react";
import { showNotification, Notification } from "../notifications/notifcations";

import { collection, query, where, getDocs, addDoc, updateDoc, arrayUnion, getDoc, setDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";

export const levenshtein = (a: string, b: string): number => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1]
                ? matrix[i - 1][j - 1]
                : Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1
                );
        }
    }
    return matrix[b.length][a.length];
};
export const fuzzyScore = (input: string, candidate: string): number => {
    const a = input.toLowerCase().trim();
    const b = candidate.toLowerCase().trim();
    const distance = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return 1 - distance / maxLen;
};
export const resolutionLog = async (
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    {
        companyId,
        parentId,
        rawInput,
        confidence,
        wasManual,
        resolvedBy,
        invoiceFile,
    }: {
        companyId: string,
        parentId: string,
        rawInput: string,
        confidence: number,
        wasManual: boolean,
        resolvedBy: string,
        invoiceFile: string,
    }
) => {
    try {
        const resolutionRef = collection(db, companyId, 'query', 'vendor_data', parentId, 'resolutions');
        await addDoc(resolutionRef, {
            rawInput,
            confidence,
            wasManual,
            resolvedBy,
            invoiceFile,
            resolvedAt: new Date(),
        })
    } catch (error) {
        console.log(`logResolution error: ${error}`);
    }
}
export const promoteAlias = async (
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    {
        companyId,
        parentId,
        rawInput,
    }: {
        companyId: string,
        parentId: string,
        rawInput: string,
    }
) => {
    try {
        const resolutionsRef = collection(db, companyId, 'query', 'vendor_data', parentId, 'resolutions');
        const resolutionSnap = await getDocs(query(resolutionsRef, where('rawInput', '==', rawInput)));
        const seenCount = resolutionSnap.size;
        if (seenCount >= 10) {
            const parentRef = doc(db, companyId, 'query', 'vendor_data', parentId);
            await updateDoc(parentRef, {
                aliases: arrayUnion(rawInput.toLowerCase().trim()),
                updatedAt: new Date(),
            });
        }
    } catch (error) {
        console.log(`promoteAlias says ${error}`);
    }
};
export const learnAlias = async (
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setResolveState: Dispatch<SetStateAction<'loading' | 'idle'>>,
    setResolveModal: Dispatch<SetStateAction<boolean>>,
    setActiveIndex: Dispatch<SetStateAction<number>>,
    {
        companyId,
        parentId,
        rawInput,
        confidence,
        invoiceFile,
        processedData,
        index,
    }: {
        companyId: string,
        parentId: string,
        rawInput: string,
        confidence: number,
        invoiceFile: string,
        processedData: any,
        index: number,
    }
) => {
    try {
        setResolveState('loading');
        const childRef = collection(db, companyId, 'query', 'vendor_data', parentId, 'invoice_data');
        await addDoc(childRef, {
            parentId,
            file: invoiceFile,
            resolution: {
                rawInput,
                wasManual: true,
                confidence,
            },
            processedData,
            createdAt: new Date(),
        });
        const resolutionsRef = collection(db, companyId, 'query', 'vendor_data', parentId, 'resolutions');
        await addDoc(resolutionsRef, {
            rawInput,
            confidence,
            wasManual: true,
            resolvedAt: new Date(),
        });
        const resolutionSnap = await getDocs(query(resolutionsRef, where('rawInput', '==', rawInput)));
        const seenCount = resolutionSnap.size;
        if (seenCount > 10) {
            const parentRef = doc(db, companyId, 'query', 'vendor_data', parentId);
            await updateDoc(parentRef, {
                aliases: arrayUnion(rawInput.toLowerCase().trim()),
                updatedAt: new Date(),
            });
        }
        const vendorDoc = await getDoc(doc(db, companyId, 'query', 'vendor_data', parentId));
        const vendorData = vendorDoc.data();
        setUploadedFiles(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                resolution: {
                    status: 'MANUAL_RESOLVED',
                    vendorId: parentId,
                    canonicalName: vendorData?.canonicalName,
                    confidence,
                    userInterventionRequired: false,
                },
                vendorData
            };
            sessionStorage.setItem('uploadedFiles', JSON.stringify(updated));
            return updated;
        });
        setResolveState('idle');
        setResolveModal(false);
        setActiveIndex(0);
    } catch (error) {
        console.log(`learnAlias says: ${error}`);
    }
};
export const smartQuery = async (inputQuery: string, companyId: string) => {
    const vendors = await getDocs(query(collection(db, companyId, 'query', 'vendor_data')));
    const results = vendors.docs.map(doc => {
        const data = doc.data();
        const canonicalScore = fuzzyScore(inputQuery, data.canonicalName);
        const aliasScore = data.aliases?.length ? Math.max(...data.aliases.map((alias: string) => fuzzyScore(inputQuery, alias))) : 0;
        const finalScore = Math.max(canonicalScore, aliasScore);
        return {
            vendorId: doc.id,
            canonicalName: data.canonicalName,
            score: finalScore
        };
    });
    const ranked = results
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    if (ranked[0].score > 0.85) {
        return { status: 'AUTO_RESOLVED', match: ranked[0] };
    }
    return { status: 'NEEDS_RESOLUTION', candidates: ranked };
}
export const vendorMatch = async (
    index: number,
    fileData: any,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
) => {
    try {
        const activeCompanyId = "FedEx";
        const rawVendorName = fileData.processedData["vendor_name"];
        const result = await smartQuery(rawVendorName, activeCompanyId);
        if (result.status === 'AUTO_RESOLVED' && result.match) {
            await resolutionLog(setNotifications, {
                companyId: activeCompanyId,
                parentId: result.match.vendorId,
                rawInput: rawVendorName,
                confidence: result.match.score,
                wasManual: false,
                resolvedBy: 'system',
                invoiceFile: fileData.unProcessedData,
            });
            await promoteAlias(setNotifications, {
                companyId: activeCompanyId,
                parentId: result.match.vendorId,
                rawInput: rawVendorName,
            });
            const vendorDoc = await getDoc(doc(db, activeCompanyId, 'query', 'vendor_data', result.match.vendorId));
            const vendorData = vendorDoc.data();
            setUploadedFiles(prev => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    state: 'file_object',
                    resolution: {
                        status: 'AUTO_RESOLVED',
                        vendorId: result.match.vendorId,
                        canonicalName: result.match.canonicalName,
                        confidence: result.match.score,
                        userInterventionRequired: false,
                    },
                    vendorData
                };
                sessionStorage.setItem('uploadedFiles', JSON.stringify(updated));
                return updated;
            });
        } else {
            setUploadedFiles(prev => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    state: 'file_object',
                    resolution: {
                        status: 'NEEDS_RESOLUTION',
                        candidates: result.candidates,
                        userInterventionRequired: true,
                        rawInput: rawVendorName,
                    }
                };
                sessionStorage.setItem('uploadedFiles', JSON.stringify(updated));
                return updated;
            });
        }
    } catch (error) {
        console.log(`vendorMatch says: ${error}`, "error");
    }
}