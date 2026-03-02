'use client';

import { useState, useRef, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, arrayUnion, onSnapshot, getDoc, setDoc, doc } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { db } from "@/firebase"
import { Transition } from '@headlessui/react';
import { PDFDocument } from 'pdf-lib';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {

    // * global notification system
    const [getNotifications, setNotifications] = useState<Notification[]>([]);
    type NotificationType = 'success' | 'error' | 'warning' | 'info';
    interface Notification {
        id: string;
        title: string;
        message?: string;
        type: NotificationType;
    }

    const getNotificationStyles = (type: NotificationType) => {
        switch (type) {
            case 'success':
                return 'bg-green-400 border-2 border-black';
            case 'error':
                return 'bg-red-400 border-2 border-black';
            case 'warning':
                return 'bg-orange-300 border-2 border-black ';
            case 'info':
                return 'bg-black/40 border-2 border-black';
            default:
                return 'bg-black/40 border-2 border-black';
        }
    };
    const showNotification = (title: string, message?: string, type: NotificationType = 'success') => {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, { id, title, message, type }]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    };

    // * DRAG / DROP FUNCTIONALITY
    const [isDragging, setIsDragging] = useState(false);
    const [getIsDraggingExcel, setIsDraggingExcel] = useState(false);
    const [getUploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleExcelOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingExcel(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }
    const handleExcelLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingExcel(false);
    }
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const MAX_SIZE_MB = 10;
            const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
            try {
                const filesArray = Array.from(files);
                const invalidFile = filesArray.find(f => f.type !== 'application/pdf') ?? filesArray.find(f => f.size > MAX_SIZE_BYTES);
                if (invalidFile) {
                    const message = invalidFile.type !== 'application/pdf' ? `${invalidFile.name} is not a PDF` : `${invalidFile.name} exceeds ${MAX_SIZE_MB}MB limit`;
                    showNotification("Error", message, "error");
                } else {
                    for (const file of Array.from(files)) {
                        const index = await renderSkeleton(file);
                        try {
                            const fileData = await handleFiles(file, index);
                            await vendorMatch(index, fileData);
                        } catch (err) {
                            showNotification("Error", `Could not render ${files.length} file${files.length > 1 ? 's' : ''}`, "info");
                        }
                    }
                }
            } catch (err) {
                showNotification("Error", "Something went wrong uploading your files", "error");
            }
        }
    }
    const vendorMatch = async (index: number, fileData: any) => {
        try {
            const activeCompanyId = "FedEx";
            const rawVendorName = fileData.processedData["vendor_name"];
            const result = await smartQuery(rawVendorName, activeCompanyId);
            if (result.status === 'AUTO_RESOLVED' && result.match) {
                await resolutionLog({
                    companyId: activeCompanyId,
                    parentId: result.match.vendorId,
                    rawInput: rawVendorName,
                    confidence: result.match.score,
                    wasManual: false,
                    resolvedBy: 'system',
                    invoiceFile: getUploadedFiles[index].unProcessedData,
                });
                await promoteAlias({
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
            showNotification("Error", `vendorMatch says: ${error}`, "error");
        }
    }
    const renderSkeleton = async (file: File) => {
        const skeleton = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            state: "skeleton"
        };
        const index = getUploadedFiles.length;
        setUploadedFiles(prev => [...prev, skeleton]);
        return index;
    }
    const handleFiles = async (file: File, index: number) => {
        const base64 = await convertFileToBase64(file);
        let processedData;
        try {
            processedData = await processDbRequests(base64);
        } catch (err) {
            console.log(err);
        }
        const fileData = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            state: "file_object",
            unProcessedData: base64,
            processedData: Object.fromEntries(processedData as Map<string, any>)
        };
        setUploadedFiles(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...fileData };
            sessionStorage.setItem('uploadedFiles', JSON.stringify(updated));
            return updated;
        });
        return fileData;
    }
    const handleExcelDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingExcel(false);
        const allFiles = Array.from(e.dataTransfer.files);
        const files = allFiles.filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        if (files.length === 0) {
            showNotification("System", `No Excel files detected`, "info");
        } else if (files.length === 1) {
            handleExcelFiles(files);
            setExcelModal(true);
            setShowVendorModal(false);
        } else {
            handleExcelFiles(files);
            setExcelModal(true);
            setShowVendorModal(false);
        }
    };

    // * ------------ DOWNLOAD DECISION TREE ------------

    const [getTemplate, setTemplate] = useState<any[]>([]);
    const [getShowTemplateModal, setShowTemplateModal] = useState(false);

    const handleTemplate = async () => {
        if (getTemplate.length >= 5) {
            showNotification('System', 'Maximum of 5 templates allowed', 'error');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = async (e) => {
            try {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                if (file.type !== 'application/pdf') {
                    showNotification('System', `${file.name} is not a valid PDF`, 'error');
                    return;
                }
                if (file.size > MAX_FILE_SIZE) {
                    showNotification('System', `${file.name} exceeds 10MB limit`, 'error');
                    return;
                }
                const base64 = await convertFileToBase64(file);
                const id = `${file.name}-${Date.now()}`;
                const templateData = {
                    id,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: base64,
                    selected: false,
                    uploadedAt: new Date().toISOString(),
                };
                const existing = JSON.parse(sessionStorage.getItem('pdfTemplates') || '[]');
                existing.push(templateData);
                sessionStorage.setItem('pdfTemplates', JSON.stringify(existing));
                setTemplate(prev => [...prev, templateData]);
                showNotification('System', `${file.name} set as template`, 'success');
            } catch (err) {
                showNotification('System', `handleTemplate says: ${err}`, 'error');
            }
        };
        input.click();
    };

    useEffect(() => {
        const saved = sessionStorage.getItem('pdfTemplates');
        if (saved) setTemplate(JSON.parse(saved));
    }, []);

    const selectTemplate = (file: any, i: number) => {
        setTemplate(prev => {
            const updated = prev.map((t, index) => ({
                ...t,
                selected: index === i ? !t.selected : false
            }));
            sessionStorage.setItem('pdfTemplates', JSON.stringify(updated));
            return updated;
        });
    };

    const removeTemplate = (i: number) => {
        setTemplate(prev => {
            const updated = prev.filter((_, index) => index !== i);
            sessionStorage.setItem('pdfTemplates', JSON.stringify(updated));
            return updated;
        });
    };

    const populatePdf = () => {
        null
    }

    const generateTemplateSheet = async (file: any, i: number) => {
        // TODO: take in file & index value ✅
        // * PULL: | 'date' | 'invoice_number' | 'po_number' | 'subtotal' | 'taxValue' | 'secTaxValue' | FROM: processedData  & vendorData
        const processedData = file.processedData;

        // * PULL: | 'vendor_number' | 'vendor_name' | 'gl_accounts' | 'province' | 'currency_selection' | FROM: vendorData
        const vendorData = file.vendorData;

        // * PULL: | 'approval_date ✅' | from local calculations
        const dateNow = `${new Date().getDate()}-${new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`;

        // TODO: RETURN pdf file blob if successful + save it to current getUploadedFile object index and updates sessionStorage OR RETURN 'Please select a template' OR RETURN null
    };

    const downloadQueue = async () => {
        // TODO: this is the download processor that layers on top of our pre-processor
        null
    }

    // * ------------------------------------------------

    const [getCurrentProcessingIndex, setCurrentProcessingIndex] = useState(0);
    const [getProcessedFileData, setProcessedFileData] = useState<any[]>([]);
    const [getExcelModal, setExcelModal] = useState(false);
    const [getCurrentExcelPage, setCurrentExcelPage] = useState(0);
    const navigateExcelPage = (direction: 'left' | 'right') => {
        if (direction === 'left' && getCurrentExcelPage > 0) {
            setCurrentExcelPage(getCurrentExcelPage - 1);
        } else if (direction === 'right' && getCurrentExcelPage < getProcessedFileData.length - 1) {
            setCurrentExcelPage(getCurrentExcelPage + 1);
        }
    };
    useEffect(() => {
        if (getExcelModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [getExcelModal]);
    const handleExcelFiles = async (files: File[]) => {
        const allFileData: any[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setCurrentProcessingIndex(i);
            const arrayBuffer = await file.arrayBuffer();
            const base64 = await convertFileToBase64(file);
            const fileData = {
                index: i,
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                data: base64,
                processed: false
            };
            allFileData.push(fileData);
            const processedResult = await processExcelData(arrayBuffer);
            allFileData[i] = {
                ...allFileData[i],
                processedData: processedResult,
                processed: true
            };
            setProcessedFileData([...allFileData]);
        }
    }
    interface ExcelRow {
        __EMPTY?: string;
        __EMPTY_1?: string | number;
        __EMPTY_3?: string | number;
        __EMPTY_10?: string | number;
        __EMPTY_4?: string | number;
        __EMPTY_5?: string | number;
        __EMPTY_12?: string;
        __EMPTY_13?: string;
    }
    useEffect(() => {
        (window as any).taxQuery = taxQuery;
        return () => {
            delete (window as any).taxQuery;
        }
    }, []);
    const taxQuery = (province: string) => {
        const tax = taxRates[province];
        if (!tax) {
            showNotification("System", `No tax data found for province: ${province}`, "error");
            return null;
        }
        return {
            totalRate: tax.totalRate,
            gstType: tax.gstType,
            ...(tax.pstType && { pstType: tax.pstType })
        }
    }
    const taxRates: { [key: string]: { totalRate: number, gstRate: number, gstType: string, pstRate?: number, pstType?: string } } = {
        'ON': { totalRate: 0.13, gstRate: 0.13, gstType: 'HST-122810' },
        'QC': { totalRate: 0.14975, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.09975, pstType: 'QST-122900' },
        'BC': { totalRate: 0.12, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.07, pstType: 'PST-122850' },
        'AB': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
        'SK': { totalRate: 0.11, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.06, pstType: 'PST-122850' },
        'MB': { totalRate: 0.12, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.07, pstType: 'PST-122850' },
        'NS': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
        'NB': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
        'NL': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
        'PE': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
        'YT': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
        'NT': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
        'NU': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' }
    };
    const processExcelData = async (arrayBuffer: ArrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet);
        const findRow = (text: string) => jsonData.find(row => row.__EMPTY?.includes(text));
        const vendorRow = findRow('VENDOR/EMP #:');
        const provinceRow = findRow('SELECT PROVINCE');
        const totalRow = jsonData.find(row => row.__EMPTY_3?.toString().trim() === 'Total');
        const relevant_gls = jsonData
            .filter(row => row.__EMPTY_3 && typeof row.__EMPTY_3 === 'number' && row.__EMPTY_5)
            .map(row => ({
                columns: {
                    description: { label: 'DESCRIPTION / PURPOSE', value: row.__EMPTY?.toString() || null },
                    gl_account: { label: 'GL ACCOUNT', value: row.__EMPTY_3?.toString() || null },
                    cost_centre: { label: 'COST CENTRE', value: row.__EMPTY_4?.toString() || null },
                }
            }));
        const currency: 'CAD' | 'USD' | null = totalRow?.__EMPTY_5 ? 'CAD' : 'USD';
        return {
            vendorEmpNumber: {
                label: 'VENDOR NUMBER',
                values: vendorRow?.__EMPTY_1 ? Number(vendorRow.__EMPTY_1) : null
            },
            vendorEmpName: {
                label: 'VENDOR NAME',
                values: vendorRow?.__EMPTY_4?.toString() || null
            },
            relevant_gls: {
                label: 'GL ACCOUNTS',
                values: relevant_gls
            },
            taxValue: (() => {
                const province = provinceRow?.__EMPTY_1?.toString() || null;
                if (!province) return null;
                const tax = taxQuery(province);
                if (!tax) return null;
                return {
                    label: 'PROVINCE & TAX CODES',
                    province,
                    ...tax
                };
            })(),
            costCentre: {
                label: 'COST CENTER',
                values: provinceRow?.__EMPTY_4 ? Number(provinceRow.__EMPTY_4) : null
            },
            currency: {
                label: 'CURRENCY',
                values: currency
            },
        };
    };
    const [getSubmissionIndex, setSubmissionIndex] = useState<any[]>([]);
    const submitToFirebase = async (data: any, companyId: string) => {
        for (let i = 0; i < data.length; i++) {
            try {
                setUploadStatus('uploading');
                const vendorName = data[i]?.processedData.vendorEmpName.values
                    ?.toString()
                    .trim()
                    .toUpperCase()
                    .replace(/[/.]/g, '_');
                const docRef = doc(db, companyId, 'query', 'vendor_data', vendorName);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSubmissionIndex(prev => [...prev, { index: i, exists: 1 }]);
                    await setDoc(docRef, {
                        ...data[i].processedData,
                        updatedAt: new Date(),
                    }, { merge: true });
                    setUploadStatus("exists");
                } else {
                    setSubmissionIndex(prev => [...prev, { index: i, exists: 0 }]);
                    await setDoc(docRef, {
                        ...data[i].processedData,
                        canonicalName: vendorName,
                        aliases: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    setUploadStatus("success");
                }
            } catch (error) {
                setSubmissionIndex(prev => [...prev, { index: i, exists: -1 }]);
                setUploadStatus("error");
                showNotification('System', `submitToFirebase says: ${error}`, 'error');
            }
        }
        setTimeout(() => {
            setExcelModal(false);
            setUploadStatus('idle');
            setSubmissionIndex([]);
            setCurrentProcessingIndex(0);
            setProcessedFileData([]);
        }, 1500);
    };
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'exists'>('idle');
    const getUploadBtnResponse = () => {
        const uploadedCount = getSubmissionIndex.filter(item => item.exists === 0).length;
        const existingCount = getSubmissionIndex.filter(item => item.exists === 1).length;
        const baseStyles = 'p-1 px-4 rounded-md transition-all';
        if (uploadStatus === 'success' && uploadedCount === 0 && existingCount > 0) {
            return {
                className: `${baseStyles} bg-yellow-500 text-white`,
                text: 'Files already exist'
            };
        }
        const statusConfig = {
            success: {
                styles: 'bg-green-500 text-white',
                text: `Uploaded ${uploadedCount} file${uploadedCount !== 1 ? 's' : ''}`
            },
            error: { styles: 'bg-red-500 text-white', text: 'Error' },
            exists: { styles: 'bg-yellow-500 text-white', text: 'File Exists' },
            uploading: { styles: 'bg-gray-400 text-white cursor-wait', text: 'Uploading...' },
            idle: {
                styles: 'bg-black text-white hover:bg-white hover:text-purple-500 hover:outline-2 hover:outline-purple-500 cursor-pointer',
                text: 'Upload'
            }
        };
        return {
            className: `${baseStyles} ${statusConfig[uploadStatus].styles}`,
            text: statusConfig[uploadStatus].text
        };
    };

    // * ------------------

    const levenshtein = (a: string, b: string): number => {
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
    const fuzzyScore = (input: string, candidate: string): number => {
        const a = input.toLowerCase().trim();
        const b = candidate.toLowerCase().trim();
        const distance = levenshtein(a, b);
        const maxLen = Math.max(a.length, b.length);
        return 1 - distance / maxLen;
    };
    const smartQuery = async (inputQuery: string, companyId: string) => {
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
    const resolutionLog = async ({
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
    }) => {
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
            showNotification('System', `logResolution error: ${error}`, 'error');
        }
    }

    const promoteAlias = async ({
        companyId,
        parentId,
        rawInput,
    }: {
        companyId: string,
        parentId: string,
        rawInput: string,
    }) => {
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
                showNotification('System', `promoted "${rawInput}" to alias of ${parentId} after ${seenCount} resolutions`, 'error');
            }
        } catch (error) {
            showNotification('System', `promoteAlias says ${error}`, 'error');
        }
    };

    const learnAlias = async ({
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
    }) => {
        try {
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
                showNotification('System', `Added "${rawInput}" known aliases of ${parentId} after ${seenCount} resolutions`, 'success');
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
            setPreviewState('idle');
            showNotification('System', `Manually resolved to ${parentId}`, 'success');
        } catch (error) {
            showNotification('System', `learnAlias says: ${error}`, 'error');
        }
    };

    // * ------------------

    const processInvoice = async (base64: string) => {
        console.log(`BASE64 DATA: ${base64}`)
        const pdfData = atob(base64.split(',')[1]);
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map((item: any) => item.str).join(' '));
        }
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content:
                        `Extract from this invoice text. Return ONLY JSON, no explanation:
                        { 
                            "vendor_name": "", 
                            "invoice_number": "", 
                            "invoice_date": "", 
                            "po_number": "", 
                            "subtotal": "", 
                            "province", ""
                        }
                        Invoice text: ${pages.join('\n')}`
                }]
            })
        });
        const data = await res.json();
        const cleanJson = data.choices[0].message.content.replace(/```json\n?|```\n?/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        return parsedData;
    };
    const processDbRequests = async (data: any) => {
        const processedInvoiceMap = new Map<string, any>();
        let gptInfo;
        try {
            gptInfo = await processInvoice(data);
            processedInvoiceMap.set("vendor_name", gptInfo.vendor_name || "missing");
            processedInvoiceMap.set("invoice_number", gptInfo.invoice_number || "missing");
            processedInvoiceMap.set("invoice_date", gptInfo.invoice_date || "missing");
            processedInvoiceMap.set("po_number", gptInfo.po_number || "missing");
            processedInvoiceMap.set("subtotal", gptInfo.subtotal || "missing");
            processedInvoiceMap.set("province", gptInfo.province || "missing");
            return processedInvoiceMap;
        } catch (err) {
            showNotification("System", `Could not process file`, "info");
            throw err;
        }
    }
    const clearUploadedFiles = () => {
        setUploadedFiles([]);
        sessionStorage.removeItem('uploadedFiles');
    };
    const [getCanvasState, setCanvasState] = useState<'idle' | 'loading'>('idle');
    const [getDownloadData, setDownloadData] = useState<any[]>([]);
    const [getCurrentDownloadIndex, setCurrentDownloadIndex] = useState(0);

    const downloadFiles = async (files: any[]) => {
        const mergedPdf = await PDFDocument.create();
        for (const file of files) {
            setCurrentDownloadIndex(prev => prev + 1)
            const pdf = await PDFDocument.load(file);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        const mergedBytes = await mergedPdf.save();
        const blob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged.pdf';
        a.click();
        URL.revokeObjectURL(url);

        setTimeout(() => {
            setDownloadData([]);
            setCurrentDownloadIndex(0);
            setShowDownloadModal(false);
        }, 1500);
    }

    // * FILE TO BASE64
    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }

    // * CONSOLE COMMANDS ----------------------------------------
    const runTest = async (data: any) => {
        null
    }
    const getUploaded = async () => {
        console.log(`${JSON.stringify(getUploadedFiles, null, 2)}`)
    }
    const logSession = async () => {
        console.log(JSON.stringify(
            Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])),
            null,
            2
        ));
        console.log(JSON.parse(sessionStorage.getItem('vendorId') ?? '{}'))
    };
    useEffect(() => {
        (window as any).dev = {
            getUploaded,
        };
    }, [getUploadedFiles]);
    // * CONSOLE COMMANDS ----------------------------------------


    // * SELECTION ALGO
    const [getIsSelected, setIsSelected] = useState<number[]>([]);
    const [getFilePreview, setFilePreview] = useState(false);
    const [getPreviewIndex, setPreviewIndex] = useState<number | null>(null);
    const [getPreviewState, setPreviewState] = useState<'loading' | 'idle'>('idle');
    const [getInsertModal, setInsertModal] = useState(false)
    const [items, setItems] = useState([
        { position: '1', id: '1', label: 'Invoice', parent: true, size: 0 },
        { position: '2', id: '2', label: 'Cover Sheet', parent: true, size: 0 },
    ]);
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const MAX_FILES = 20;
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
    const saveBundle = () => {
        sessionStorage.setItem('savedBundle', JSON.stringify(items));
        showNotification('System', 'Saved bundle to browser', 'info')
    }
    const getBundleStatus = (item: any) => {
        const savedBundle: any[] = JSON.parse(sessionStorage.getItem('savedBundle') || '[]');
        if (item.parent) return null;
        const inBundle = savedBundle.some(s => s.id === item.id && !s.parent && s.position === item.position);
        return inBundle ? 'saved' : 'not saved';
    };
    const addToBundle = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.pdf';
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            const errors: string[] = [];
            const validated = files.filter(file => {
                if (file.type !== 'application/pdf') {
                    errors.push(`${file.name}: not a valid PDF`);
                    return false;
                }
                if (file.size > MAX_FILE_SIZE) {
                    errors.push(`${file.name}: exceeds 10MB limit`);
                    return false;
                }
                if (items.some(i => i.label === file.name)) {
                    errors.push(`${file.name}: already in bundle`);
                    return false;
                }
                return true;
            });
            if (items.length + validated.length > MAX_FILES) {
                errors.push(`Bundle cannot exceed ${MAX_FILES} files`);
                if (errors.length) showNotification('System', `addToBundle says ${errors}`, 'info');
                return;
            }
            const currentTotalSize = items.reduce((acc, i) => acc + (i.size || 0), 0);
            const incomingSize = validated.reduce((acc, f) => acc + f.size, 0);
            if (currentTotalSize + incomingSize > MAX_TOTAL_SIZE) {
                errors.push(`Bundle would exceed 50MB total size limit`);
                if (errors.length) showNotification('System', `addToBundle says ${errors}`, 'info');
                return;
            }
            if (errors.length) showNotification('System', `addToBundle says ${errors}`, 'info');
            setItems(prev => [
                ...prev,
                ...validated.map((file, i) => ({
                    id: String(prev.length + i + 1),
                    label: file.name,
                    parent: false,
                    size: file.size,
                    position: String(prev.length + i + 1),
                }))
            ]);
        };
        input.click();
    };
    const removeItem = (position: string) => {
        const item = items.find(i => i.position === position);
        if (item?.parent) return showNotification('System', 'Cannot remove a parent item', 'error');
        setItems(prev => prev.filter(item => item.position !== position).map((item, i) => ({ ...item, position: String(i + 1) })));
    };
    const sensors = useSensors(useSensor(PointerSensor));
    function Row({ id, label, parent, position }: { id: string; label: string; parent: boolean, position: string }) {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
        return (
            <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }} className={`bg-neutral-200 rounded-xl p-2 px-4 w-full flex gap-2 items-center border-2 ${parent ? 'border-indigo-400 text-indigo-600 bg-violet-200' : 'border-transparent'}`}>
                <svg {...attributes} {...listeners} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 cursor-grab shrink-0 outline-none focus:outline-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <div className="flex justify-between w-full">
                    <span className="">{label}</span>
                    <span className="">{position}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="items-center hover:text-red-600 cursor-pointer">
                        <svg
                            onClick={() => { removeItem(position) }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    // * DOWNLOAD MODAL
    const [getShowDownloadModal, setShowDownloadModal] = useState(false);

    // * ADD VENDOR MODAL
    const [getShowVendorModal, setShowVendorModal] = useState(false);

    // * DB SELECTION
    const [getSetDbLock, setSetDbLock] = useState(true);
    const [getDbSelection, setDbSelection] = useState(false);
    const MAX_VISIBLE = 5;


    // ! HOT RELOAD ----------------------------------------
    useEffect(() => {
        const savedFiles = sessionStorage.getItem('uploadedFiles');
        const savedBundle = sessionStorage.getItem('savedBundle');
        if (savedFiles) { setUploadedFiles(JSON.parse(savedFiles)); }
        if (savedBundle) { setItems(JSON.parse(savedBundle)); }
    }, []);
    // ! HOT RELOAD ----------------------------------------


    return (
        <main data-section="whole page" className="bg-white text-black h-screen flex flex-col">
            <nav className="flex gap-2 justify-between bg-white p-2 px-8 items-center h-14">
                <div className="w-4 h-full">
                    <button onClick={() => window.location.href = '/'} className="text-[24px] font-bold text-black hover:text-transparent hover:text-[28px] hover:[-webkit-text-stroke:1px_rgb(51.1_0.262_276.96)] transition-all cursor-pointer">ims</button>
                </div>
                <div onClick={() => setDbSelection(prev => !prev)} className={`flex gap-1 items-center py-1 px-3 rounded-xl cursor-pointer transition-all ${getSetDbLock ? 'outline-2 outline-indigo-500 bg-indigo-200 text-indigo-700' : 'outline-2 outline-gray-300 bg-gray-100 text-gray-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    <span>FedEx</span>
                </div>
                <button onClick={() => { runTest(getUploadedFiles[0]) }} className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-indigo-700 hover:outline-2 hover:outline-indigo-500 transition-all cursor-pointer">runTest</button>
            </nav>
            <section
                data-section="drag and drop area"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex justify-center items-center h-3/4 transition-all border-y-2 border-gray-100 text-neutral-300 ${isDragging ? 'border-purple-500 bg-purple-50 text-indigo-400' : 'bg-gray-200'}`}>
                <div className="flex flex-col justify-between h-full w-full">
                    <div className="flex justify-center items-center gap-2 h-full">
                        <div className="px-6 py-3 rounded-lg flex items-center gap-2 flex flex-col">
                            {getCanvasState === 'idle' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="w-32 h-32">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            ) : (
                                <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                            )}
                        </div>
                    </div>
                    <div className="flex justify-center items-center text-green-600 w-full p-4">
                        <div className="flex gap-4 w-3/4 mx-auto overflow-x-auto overflow-y-hidden p-4">
                            {getUploadedFiles.map((file, index) => {
                                const bytes = file.size || 0;
                                const size = bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1024 * 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
                                const isSelected = getIsSelected.includes(index);
                                const baseClass = `bg-white flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 h-52 shrink-0 overflow-hidden cursor-pointer hover:outline-2 hover:outline-indigo-400 ${isSelected ? 'outline-2 outline-indigo-400' : ''}`;
                                const needAttention = `bg-white flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 h-52 shrink-0 overflow-hidden cursor-pointer hover:outline-2 hover:outline-amber-400 ${isSelected ? 'outline-2 outline-amber-400' : ''}`;
                                if (file.state === "skeleton") {
                                    return (
                                        <div className={baseClass} key={index} onClick={() => setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index])}>
                                            <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                                            <div className="flex flex-col items-left w-full gap-1">
                                                <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded"></div>
                                                <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded"></div>
                                            </div>
                                        </div>
                                    );
                                } else if (file.resolution?.status === 'AUTO_RESOLVED' && file.state === 'file_object') {
                                    return (
                                        <div className={baseClass} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setFilePreview(true); setPreviewIndex(index); }}>
                                            <div className="flex-1 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-gray-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col items-left w-full">
                                                <span className="text-gray-700 truncate w-full text-[10px] sm:text-xs md:text-sm">{file.processedData["vendor_name"]}</span>
                                                <div className="flex gap-1">
                                                    <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm">{size}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else if (file.resolution?.status === 'NEEDS_RESOLUTION' && file.state === 'file_object') {
                                    return (
                                        <div className={needAttention} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setFilePreview(true); setPreviewIndex(index); }}>
                                            <div className="flex-1 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 text-amber-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col items-left w-full">
                                                <span className="text-gray-700 truncate w-full text-[10px] sm:text-xs md:text-sm">{`${file.processedData["vendor_name"]}`}</span>
                                                <div className="flex gap-1">
                                                    <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm">{size}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else if (file.resolution?.status === 'MANUAL_RESOLVED' && file.state === 'file_object') {
                                    return (
                                        <div className={baseClass} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setFilePreview(true); setPreviewIndex(index); }}>
                                            <div className="flex-1 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-gray-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col items-left w-full">
                                                <span className="text-gray-700 truncate w-full text-[10px] sm:text-xs md:text-sm">{file.vendorData?.canonicalName}</span>
                                                <div className="flex gap-1">
                                                    <span className="text-green-500 text-[10px] sm:text-xs md:text-xs">Ready to download</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                </div>
            </section>
            <section data-section="Queue array" className="p-8 flex-1">
                <div className="flex-1 flex items-center justify-center -translate-y-6 text-black gap-2">
                    <span>{`${getUploadedFiles.length} files added`}</span>
                    <span>|</span>
                    <button
                        onClick={clearUploadedFiles}
                        className="text-black cursor-pointer">
                        <div className="flex items-center hover:text-red-400">
                            <span>clear</span>
                        </div>
                    </button>
                </div>
                <div data-section='FUN BUTTONS' className="flex justify-between">
                    <div className="flex gap-4">
                        <button onClick={() => { showNotification("System", 'Button is not programmed yet', "error"); }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-transparent hover:outline-2 hover:outline-black h-14">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            PDF to Image
                        </button>
                        <button onClick={() => { setShowVendorModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-transparent hover:outline-2 hover:outline-black h-14">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                            </svg>
                            Add Vendor
                        </button>
                        {(() => {
                            const nonParentItems = items.filter(i => !i.parent);
                            const hasUnsaved = nonParentItems.some(i => getBundleStatus(i) === 'not saved');
                            const hasSaved = nonParentItems.some(i => getBundleStatus(i) === 'saved');
                            return hasUnsaved ? (
                                <div className="flex flex-col justify-center items-center bg-amber-200 outline-2 outline-amber-400 rounded-xl">
                                    <button onClick={() => { setInsertModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                        <div className="flex gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                            </svg>
                                            <span>Set Bundle</span>
                                        </div>
                                    </button>
                                    <div>unsaved</div>
                                </div>
                            ) : hasSaved ? (
                                <div className="flex flex-col justify-center items-center bg-green-200 outline-2 outline-green-400 rounded-xl">
                                    <button onClick={() => { setInsertModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                        <div className="flex gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                            </svg>
                                            <span>Set Bundle</span>
                                        </div>
                                    </button>
                                    <div>saved</div>
                                </div>
                            ) : (
                                <div className="flex flex-col justify-center items-center rounded-xl">
                                    <button onClick={() => { setInsertModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                        <div className="flex gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                            </svg>
                                            <span>Set Bundle</span>
                                        </div>
                                    </button>
                                </div>
                            );
                        })()}
                        <div className="flex flex-col justify-center items-center bg-neutral-200 outline-2 outline-neutral-400 rounded-xl">
                            <button onClick={() => { setShowTemplateModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                <div className="flex gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                    <span>Choose Template</span>
                                </div>
                            </button>
                            <div>{getTemplate.some(t => t.selected) ? (getTemplate.find(t => t.selected)?.name.length > 10 ? `${getTemplate.find(t => t.selected)?.name.slice(0, 10).toLowerCase()}...` : getTemplate.find(t => t.selected)?.name.toLowerCase()) : 'select template'}</div>
                        </div>
                    </div>
                    {getUploadedFiles.length > 0 ? (
                        <button onClick={() => downloadQueue()} className="transition-all p-3 px-6 text-white rounded-xl cursor-pointer bg-orange-400 hover:text-orange-400 hover:outline-orange-400 hover:bg-transparent hover:outline-2 h-14">Download</button>
                    ) : (
                        <button disabled className="bg-indigo-200 p-3 px-6 text-white rounded-xl cursor-not-allowed opacity-50">Download</button>
                    )}
                </div>
            </section>
            {
                <div className="pointer-events-none fixed -inset-3 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]">
                    <div className="flex w-full flex-col items-center space-y-2">
                        {getNotifications.map(notification => (
                            <Transition
                                key={notification.id}
                                show={true}
                                enter="transform transition duration-300 ease-out"
                                enterFrom="translate-y-2 opacity-0"
                                enterTo="translate-y-0 opacity-100"
                                leave="transform transition duration-100 ease-in"
                                leaveFrom="translate-y-0 opacity-100"
                                leaveTo="translate-y-2 opacity-0">
                                <div className={`pointer-events-auto w-full max-w-sm rounded-xl text-white p-4 ${getNotificationStyles(notification.type)}`}>
                                    <div className="flex items-start">
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium font-semibold">{notification.title}</p>
                                            {notification.message && (
                                                <p className="mt-1 text-sm -translate-y-1">{notification.message}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                                            className="ml-4 text-white cursor-pointer">
                                            <div className="flex items-center gap-2 hover:text-red-200 rounded-md hover:outline-2 hover:outline-red-200">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </Transition>
                        ))}
                    </div>
                </div>
            }
            {getDbSelection && (
                <div className="fixed inset-0 flex justify-center z-50 translate-y-14">
                    <div className="">
                        <div className="bg-white rounded-xl p-4 w-128 flex flex-col gap-4 transition">
                            <div className="flex justify-end items-center">
                                <div className="items-center hover:text-red-600 rounded-md hover:outline-2 hover:outline-red-600 cursor-pointer">
                                    <svg
                                        onClick={() => setDbSelection(false)}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                            <div className="w-full">
                                <span className="text-sm text-neutral-400 block text-center">List of available databases</span>
                                {MAX_VISIBLE && (
                                    <div className="bg-gray-200 py-2 px-4 rounded-lg hover:outline-2 hover:outline-indigo-400 cursor-pointer">
                                        <div className="flex justify-between items-center">
                                            <div className="text-md">FedEx</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {getShowTemplateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
                        <div className="flex">
                            <div className="flex justify-end items-center w-full">
                                <svg
                                    onClick={() => { setShowTemplateModal(false) }}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-6 h-6 hover:text-red-600 cursor-pointer">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex flex-col h-full gap-2">
                            <div className="flex flex-col gap-2">
                                {getTemplate.length > 0 ? (
                                    getTemplate.map((file: File, i: number) => (
                                        <>
                                            <span className="text-sm text-neutral-500 translate-y-1">Uploaded</span>
                                            <div key={i} className="bg-indigo-300 rounded-xl py-2 w-full h-12 flex px-2.5 justify-between items-center">
                                                <div className="flex gap-2">
                                                    <div>
                                                        <button className="flex h-full items-center justify-center hover:text-red-600 cursor-pointer">
                                                            <svg
                                                                onClick={() => { removeTemplate(i) }}
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth={2}
                                                                stroke="currentColor"
                                                                className="size-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="text-indigo-500">{file.name}</div>
                                                </div>
                                                <div onClick={() => selectTemplate(file, i)} className={`px-3 py-1 rounded-md cursor-pointer transition-all ${getTemplate[i]?.selected ? 'bg-transparent outline-2 outline-black text-black hover:bg-black hover:text-white' : 'bg-black text-white hover:outline-2 hover:outline-black hover:text-black hover:bg-transparent'}`}>
                                                    {getTemplate[i]?.selected ? 'Selected' : 'Select'}
                                                </div>
                                            </div>
                                        </>
                                    ))
                                ) : (
                                    <div className="bg-neutral-200 outline-2 outline-neutral-300 text-neutral-400 rounded-xl py-2 w-full h-12 flex px-4 justify-left items-center">
                                        No template selected
                                    </div>
                                )}
                            </div>
                            <section onClick={handleTemplate} className="flex flex-1 justify-center items-center transition-all rounded-lg">
                                <div className="bg-white rounded-xl py-2 w-full h-full flex justify-center items-center">
                                    <span className="cursor-pointer hover:underline text-black">Select Template</span>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
            {getShowVendorModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div className="items-center hover:text-red-600 rounded-md hover:outline-2 hover:outline-red-600 cursor-pointer">
                                <svg
                                    onClick={() => { setShowVendorModal(false) }}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="text-xs text-neutral-500">Excel files only</div>
                            <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:outline-2 hover:outline-purple-500 transition-all cursor-pointer" onClick={() => { showNotification("Error", "This button hasn't been programmed yet", "error"); }}>Add</button>
                        </div>
                        <section
                            onDragOver={handleExcelOver}
                            onDragLeave={handleExcelLeave}
                            onDrop={handleExcelDrop}
                            className={`flex flex-1 justify-center items-center transition-all rounded-lg border-2 border-dashed text-neutral-300 ${getIsDraggingExcel ? 'border-purple-500 bg-purple-50 text-indigo-400' : 'bg-gray-100 border-gray-200'}`}>
                            <div className="flex flex-col items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="w-32 h-32">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            </div>
                        </section>
                    </div>
                </div>
            )}
            {getExcelModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-xl w-144 min-h-96 max-h-[80vh] overflow-y-auto">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-1 justify-center items-center">
                                    <div>Adding</div>
                                    <span>"{(() => {
                                        const name = getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.values;
                                        return name?.length > 30 ? `${name.slice(0, 30)}...` : name;
                                    })()}"</span>
                                </div>
                                <button
                                    onClick={() => setExcelModal(false)}
                                    className="bg-red-500 p-2 rounded-md text-white hover:bg-white hover:text-red-500 hover:outline-2 hover:outline-red-500 transition-all cursor-pointer">
                                    <div className="flex px-1 items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                </button>
                            </div>
                            <div className="grid grid-cols-2">
                                <div>
                                    <p className="text-xs text-gray-500">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpNumber.label}</p>
                                    <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpNumber.values}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.label}</p>
                                    <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.values}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.relevant_gls.label}</p>
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">DESCRIPTION / PURPOSE</th>
                                            <th className="border p-2 text-center">GL ACCOUNT</th>
                                            <th className="border p-2 text-center">COST CENTRE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getProcessedFileData[getCurrentExcelPage]?.processedData?.relevant_gls.values.map((gl: any, index: number) => (
                                            <tr key={index}>
                                                <td className="border p-2">{gl.columns.description.value || 'N/A'}</td>
                                                <td className="border p-2 text-center font-semibold">{gl.columns.gl_account.value || 'N/A'}</td>
                                                <td className="border p-2 text-center font-semibold">{gl.columns.cost_centre.value || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.label}</p>
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">PROVINCE</th>
                                            <th className="border p-2 text-left">TAX 1</th>
                                            <th className="border p-2 text-left">TAX 2</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border p-2 font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.province ?? 'N/A'}</td>
                                            <td className="border p-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.gstType ?? 'N/A'}</td>
                                            <td className="border p-2 text-gray-400">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.pstType ?? 'N/A'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">{getProcessedFileData[getCurrentExcelPage]?.processedData?.currency.label}</p>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency.values === 'CAD'} readOnly />
                                        <span>CAD</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency.values === 'USD'} readOnly />
                                        <span>USD</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => { submitToFirebase(getProcessedFileData, "FedEx") }}
                                    disabled={uploadStatus !== 'idle'}
                                    className={getUploadBtnResponse().className}>
                                    {getUploadBtnResponse().text}
                                </button>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { navigateExcelPage("left") }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </button>
                                    <div>Page {getCurrentExcelPage + 1}</div>
                                    <button onClick={() => { navigateExcelPage("right") }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {getShowDownloadModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div className="items-center hover:text-red-600 rounded-md hover:outline-2 hover:outline-red-600 cursor-pointer">
                                <svg
                                    onClick={() => setShowDownloadModal(false)}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:outline-2 hover:outline-purple-500 transition-all cursor-pointer" onClick={() => { downloadFiles(getDownloadData); setShowDownloadModal(true) }}>download</button>
                        </div>
                        <div className="flex flex-1 flex-col justify-center">
                            <div className="flex justify-center items-center">
                                <div>{`Download ${getDownloadData.length} files?`}</div>
                            </div>
                            <div className="flex justify-center items-center">{`${getCurrentDownloadIndex} out of ${getDownloadData.length} processed`}</div>
                        </div>
                    </div>
                </div>
            )}
            {getFilePreview && getPreviewIndex !== null && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="flex flex-col items-center gap-4">
                        {(() => {
                            const file = getUploadedFiles[getIsSelected[0]];
                            if (!file) return null;
                            const isAutoResolved = file.resolution?.status === 'AUTO_RESOLVED' && file.state === 'file_object';
                            const isNeedsResolution = file.resolution?.status === 'NEEDS_RESOLUTION' && file.state === 'file_object';
                            const isManualResolved = file.resolution?.status === 'MANUAL_RESOLVED' && file.state === 'file_object';
                            return (
                                <>
                                    <div>
                                        <div className="flex flex-col items-center h-[90vh] w-[480px] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
                                            {isAutoResolved && getPreviewState === 'idle' && (
                                                <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                    <span className="text-white/70 text-sm font-medium tracking-wide">{file.processedData["vendor_name"]}</span>
                                                    <button
                                                        onClick={() => { setFilePreview(false); setIsSelected([]); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                        </svg>
                                                        Close
                                                    </button>
                                                </div>
                                            )}
                                            {isManualResolved && getPreviewState === 'idle' && (
                                                <>
                                                    <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                        <span className="text-white/70 text-sm font-medium tracking-wide">{file.processedData["vendor_name"]}</span>
                                                        <button
                                                            onClick={() => { setFilePreview(false); setIsSelected([]); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                            </svg>
                                                            Close
                                                        </button>
                                                    </div>
                                                    {/* 
                                                        // TODO: ternary condition from function, generateTemplateSheet
                                                        // TODO: returns file blob if successful, saves it to current getUploadedFile object index and updates sessionStorage, 'Please select a template' or null
                                                        // TODO: renders PDF using some library in this preview UI module
                                                    */}
                                                    <div className="text-neutral-400 text-sm w-full px-4 mt-4">
                                                        <span>Loading cover sheet...</span>
                                                    </div>
                                                </>
                                            )}
                                            {isNeedsResolution && getPreviewState === 'idle' && (
                                                <>
                                                    <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 fill-amber-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                                        </svg>
                                                        <span className="text-white text-sm font-medium tracking-wide">{`"${file.processedData["vendor_name"]}"`}</span>
                                                        <button
                                                            onClick={() => { setFilePreview(false); setIsSelected([]); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="text-neutral-400 text-sm w-full px-4 mt-4">
                                                        <span>Who is the correct vendor?</span>
                                                    </div>
                                                    <div className="flex flex-col text-neutral-300 w-full px-4 py-4 gap-3">
                                                        {file.resolution?.candidates?.map((candidate: any, i: number) => (
                                                            <div key={i} onClick={() => {
                                                                setPreviewState('loading');
                                                                learnAlias({
                                                                    companyId: "FedEx",
                                                                    parentId: candidate.vendorId,
                                                                    rawInput: file.resolution.rawInput,
                                                                    confidence: candidate.score,
                                                                    invoiceFile: file.unProcessedData,
                                                                    processedData: file.processedData,
                                                                    index: getIsSelected[0],
                                                                });
                                                            }} className="flex justify-center bg-neutral-600 rounded-md px-2 py-4 outline-2 outline-neutral-500 cursor-pointer hover:bg-green-300 hover:outline-green-400 hover:text-green-800 transition-all">
                                                                {candidate.canonicalName}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                            {isNeedsResolution && getPreviewState === 'loading' && (
                                                <>
                                                    <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 fill-amber-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                                        </svg>
                                                        <span className="text-white text-sm font-medium tracking-wide">{`Loading...`}</span>
                                                    </div>
                                                    <div className="flex w-full h-full justify-center items-center">
                                                        <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {items.map(({ label, position, parent }) => (
                                            <div className="w-[180px]">
                                                {parent ? (
                                                    <div className="flex gap-2 justify-center items-center flex-1 py-3 rounded-xl border border-indigo-400/50 bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-all cursor-pointer gap-0.5">
                                                        <span className="font-semibold text-sm">{position}</span>
                                                        <span className="font-semibold text-sm">{label.length > 15 ? `${label.slice(0, 15)}...` : label}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 justify-center items-center flex-1 py-3 rounded-xl bg-white/15 border border-white/10 text-white/70 text-xs font-medium transition-all cursor-pointer gap-0.5">
                                                        <span className="font-semibold text-sm">{position}</span>
                                                        <span className="font-semibold text-sm">{label.length > 15 ? `${label.slice(0, 15)}...` : label}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
            {getInsertModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div className="items-center hover:text-red-600 rounded-md hover:outline-2 hover:outline-red-600 cursor-pointer">
                                <svg
                                    onClick={() => { setInsertModal(false) }}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:outline-2 hover:text-indigo-500 hover:outline-indigo-500 transition-all cursor-pointer" onClick={() => { addToBundle() }}>Add File</div>
                        </div>
                        <section className="flex flex-col flex-1 min-h-0 rounded-lg">
                            <div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
                                    if (active.id !== over?.id) {
                                        setItems(prev => arrayMove(prev, prev.findIndex(i => i.id === active.id), prev.findIndex(i => i.id === over!.id)).map((item, i) => ({ ...item, position: String(i + 1) })));
                                    }
                                }}>
                                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                        <div className="flex flex-col gap-2 w-full overflow-y-auto p-1">
                                            {items.map(item => <Row key={item.id} {...item} />)}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </section>
                        <div className="w-full flex justify-end">
                            <div className="p-1 px-4 rounded-md text-black cursor-pointer hover:outline-2" onClick={() => { saveBundle() }}>Save</div>
                        </div>
                    </div>
                </div>
            )}
        </main >
    )
}