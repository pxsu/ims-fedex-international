import { Dispatch, SetStateAction } from "react";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { db } from "@/firebase"
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations"

export const updateBrowserStorage = async (
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setItems: Dispatch<SetStateAction<{
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null;
    }[]>>
) => {
    const savedFiles = sessionStorage.getItem('uploadedFiles');
    const savedBundle = sessionStorage.getItem('savedBundle');
    if (savedFiles) {
        const parsed = JSON.parse(savedFiles);
        const restored = parsed.map((file: any) => {
            if (file?.finalDownload?.fileBlob && typeof file.finalDownload.fileBlob === 'string') {
                const base64Data = file.finalDownload.fileBlob.replace(/^data:application\/pdf;base64,/, '');
                const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                return {
                    ...file,
                    finalDownload: {
                        ...file.finalDownload,
                        fileBlob: blob
                    }
                };
            }
            return file;
        });
        setUploadedFiles(restored);
    }
    if (savedBundle) { setItems(JSON.parse(savedBundle)); }
}
export const submitToFirebase = async (
    data: any,
    companyId: string,
    setUploadStatus: Dispatch<SetStateAction<'idle' | 'uploading' | 'success' | 'error' | 'exists'>>,
    setSubmissionIndex: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setExcelModal: Dispatch<SetStateAction<boolean>>,
    setProcessedFileData: Dispatch<SetStateAction<any[]>>,
) => {
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
            showNotification('System', setNotifications, `submitToFirebase says: ${error}`, 'error');
        }
    }
    setTimeout(() => {
        setExcelModal(false);
        setUploadStatus('idle');
        setSubmissionIndex([]);
        setProcessedFileData([]);
    }, 1500);
};

export const getUploadBtnResponse = (
    getSubmissionIndex: any[],
    uploadStatus: 'idle' | 'uploading' | 'success' | 'error' | 'exists'
) => {
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