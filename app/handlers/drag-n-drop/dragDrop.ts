import { PDFDocument } from 'pdf-lib';
import { Dispatch, SetStateAction } from "react";
import { renderSkeleton } from "@/app/handlers/drag-n-drop/skeletons";
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations";
import { convertFileToBase64 } from "@/app/utilities/crossplatform";
import { processDbRequests } from "../invoice-processor/processdb";
import { vendorMatch } from "../smart-query/query";
import { generateTemplateSheet } from "../excel-handler/processxlsx";

export const handleDragOver = async (
    e: React.DragEvent<HTMLElement>,
    setIsDragging: Dispatch<SetStateAction<boolean>>,
) => {
    e.preventDefault();
    setIsDragging(true);
}
export const handleDragLeave = (
    e: React.DragEvent<HTMLElement>,
    setIsDragging: Dispatch<SetStateAction<boolean>>,
) => {
    e.preventDefault();
    setIsDragging(false);
}
export const handleDrop = async (
    e: React.DragEvent<HTMLElement>,
    getUploadedFiles: any[],
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setIsDragging: Dispatch<SetStateAction<boolean>>,
) => {
    const files = e.dataTransfer.files;
    setIsDragging(false);
    if (files && files.length > 0) {
        const MAX_SIZE_MB = 10;
        const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
        try {
            const filesArray = Array.from(files);
            const invalidFile = filesArray.find(f => f.type !== 'application/pdf') ?? filesArray.find(f => f.size > MAX_SIZE_BYTES);
            if (invalidFile) {
                const message = invalidFile.type !== 'application/pdf' ? `${invalidFile.name} is not a PDF` : `${invalidFile.name} exceeds ${MAX_SIZE_MB}MB limit`;
                showNotification("Error", setNotifications, message, "error");
            } else {
                for (const file of Array.from(files)) {
                    const index = await renderSkeleton(file, getUploadedFiles, setUploadedFiles);
                    try {
                        const fileData = await handleFiles(file, index, setUploadedFiles, setNotifications);
                        await vendorMatch(index, fileData, setNotifications, setUploadedFiles);
                    } catch (err) {
                        showNotification("Error", setNotifications, `Could not render ${files.length} file${files.length > 1 ? 's' : ''}`, "info");
                    }
                }
            }
        } catch (err) {
            showNotification("Error", setNotifications, "Something went wrong uploading your files", "error");
        }
    }
}
export const handleFiles = async (
    file: File,
    index: number,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>
) => {
    const base64 = await convertFileToBase64(file);
    let processedData;
    try {
        processedData = await processDbRequests(base64, setNotifications);
    } catch (err) {
        console.log(err);
    }
    const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        state: "skeleton",
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
export const clearUploadedFiles = (
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setProcessedFileData: Dispatch<SetStateAction<any[]>>,
    setIsSelected: Dispatch<SetStateAction<number[]>>,
    setActiveIndex: Dispatch<SetStateAction<number>>,
) => {
    setUploadedFiles([]);
    setProcessedFileData([]);
    setIsSelected([]);
    setActiveIndex(0);
    sessionStorage.removeItem('uploadedFiles');
};
export const setDownloadData = async (
    file: {
        name: string,
        size: number,
        type: string,
        lastModified: number,
        state: string,
        unProcessedData: string,
        processedData: {
            invoice_number: string,
        },
        resolution: {
            vendorId: string,
        }
    },
    getTemplate: any[],
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setIsSelected: Dispatch<SetStateAction<number[]>>,
    getActiveIndex: number,
    items: {
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null;
    }[],
    trigger: boolean,
) => {
    setUploadedFiles(prev => { const updated = [...prev]; updated[getActiveIndex] = { ...updated[getActiveIndex], state: 'skeleton' }; return updated; });
    let downloadArray: any[] = [];
    for (const item of items) {
        if (item.parent === true && item.label === 'Invoice') {
            try {
                const invoice = file.unProcessedData.split(',')[1];
                const doc = await PDFDocument.load(Uint8Array.from(atob(invoice), c => c.charCodeAt(0)));
                downloadArray.push(doc);
            } catch (err) {
                showNotification("Error", setNotifications, `1-setDownloadData says ${err}`, "error");
            }
        }
        if (item.parent === true && item.label === 'Cover Sheet') {
            try {
                const coverSheet = await generateTemplateSheet(file, getTemplate, setNotifications);
                if (!coverSheet) continue;
                const arrayBuffer = await coverSheet.finalDownload.file.arrayBuffer();
                const doc = await PDFDocument.load(arrayBuffer);
                downloadArray.push(doc);
            } catch (err) {
                showNotification("Error", setNotifications, `2-setDownloadData says ${err}`, "error");
            }
        }
        if (!item.parent && item.label !== 'Invoice' && item.label !== 'Cover Sheet') {
            try {
                const file = item.content?.split(',')[1];
                if (!file) continue;
                const doc = await PDFDocument.load(Uint8Array.from(atob(file), c => c.charCodeAt(0)));
                downloadArray.push(doc);
            } catch (err) {
                showNotification("Error", setNotifications, `3-setDownloadData says ${err}`, "error");
            }
        }
    }
    try {
        const merged = await PDFDocument.create();
        const dateNow = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/[\s,]/g, '').toUpperCase();
        const downloadName = `${file.resolution.vendorId.replace(/\s+/g, '_')}-${file.processedData.invoice_number}-${dateNow}`;
        for (const doc of downloadArray) {
            const pages = await merged.copyPages(doc, doc.getPageIndices());
            pages.forEach(p => merged.addPage(p));
        }
        const base64 = await merged.saveAsBase64();
        const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setTimeout(() => { setUploadedFiles(prev => { const updated = [...prev]; updated[getActiveIndex] = { ...updated[getActiveIndex], state: 'file_object' }; return updated; }); setIsSelected([]); }, 2000);

        if (trigger) {
            triggerDownload(url, downloadName);
        } else {
            return downloadArray as PDFDocument[];;
        }

    } catch (err) {
        showNotification("Error", setNotifications, `${err}`, "error");
    }
}
export const setDownloadDataAll = async (
    files: {
        name: string,
        size: number,
        type: string,
        lastModified: number,
        state: string,
        unProcessedData: string,
        processedData: { invoice_number: string },
        resolution: { vendorId: string }
    }[],
    getTemplate: any[],
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setIsSelected: Dispatch<SetStateAction<number[]>>,
    getActiveIndex: number,
    getIsSelected: number[],
    items: {
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null;
    }[],
) => {
    let downloadArray: any[] = [];
    try {
        for (const file of files) {
            setUploadedFiles(prev => { const updated = [...prev]; updated[getActiveIndex] = { ...updated[getActiveIndex], state: 'skeleton' }; return updated; });
            const resultArray = await setDownloadData(file, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, items, false);
            if (!resultArray) continue;
            for (const result of resultArray) {
                downloadArray.push(result);
            }
        }
        const merged = await PDFDocument.create();
        const dateNow = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/[\s,]/g, '').toUpperCase();
        for (const doc of downloadArray) {
            const pages = await merged.copyPages(doc, doc.getPageIndices());
            pages.forEach(p => merged.addPage(p));
        }
        const base64 = await merged.saveAsBase64();
        const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `pdfBundle-${dateNow}`);
    } catch (err) {
        showNotification('System', setNotifications, `setDownloadDataAll says ${err}`, 'error');
    }
}
export const triggerDownload = (url: string, downloadName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
};