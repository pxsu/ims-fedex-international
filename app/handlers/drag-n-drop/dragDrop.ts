import { PDFDocument } from 'pdf-lib';
import { Dispatch, SetStateAction } from "react";
import { renderSkeleton, removeSkeleton } from "@/app/handlers/drag-n-drop/skeletons";
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
    setMultiFileModal: Dispatch<SetStateAction<boolean>>,
    setMultiFile: Dispatch<SetStateAction<any>>,
    setMultiFileUint8: Dispatch<SetStateAction<Uint8Array[] | null>>,
    getMultiFileModal: boolean,
) => {
    const files = e.dataTransfer.files;
    setIsDragging(false);
    if (files && files.length === 1) {
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
                    // CHECK IF PDF
                    const isMultiPage = await checkUpload(file, setMultiFileModal, setMultiFile, setMultiFileUint8, getMultiFileModal);
                    if (!isMultiPage) {
                        updateClient(file, getUploadedFiles, setUploadedFiles, setNotifications);
                    }
                }
            }
        } catch (err) {
            showNotification("Error", setNotifications, "Could not rsead file", "error");
        }
    }
}
export const checkUpload = async (
    file: any,
    setMultiFileModal: Dispatch<SetStateAction<boolean>>,
    setMultiFile: Dispatch<SetStateAction<any>>,
    setMultiFileUint8: Dispatch<SetStateAction<Uint8Array[] | null>>,
    getMultiFileModal: boolean
) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pageCount = pdf.getPageCount();
        // CHECK PAGE COUNT
        if (pageCount > 1) {
            const pages: PDFDocument[] = [];
            const pageUint8Array: Uint8Array[] = [];
            for (let i = 0; i < pageCount; i++) {
                // Core document
                const singlePage = await PDFDocument.create();
                // Add onto core document
                const [copiedPage] = await singlePage.copyPages(pdf, [i]);
                singlePage.addPage(copiedPage);
                pages.push(singlePage);
                // Add onto Uint8Array array
                const singlePageBytes = await singlePage.save();
                const singlePageUint8 = new Uint8Array(singlePageBytes.buffer.slice(0));
                pageUint8Array.push(singlePageUint8);
            }
            setMultiFile(pages);
            setMultiFileUint8(pageUint8Array);
            setMultiFileModal(true);
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.log(`checkUpload(): ${err}`);
    }
}
export const clearDrop = async (
    setMultiFileModal: Dispatch<SetStateAction<boolean>>,
    setMultiFile: Dispatch<SetStateAction<any[] | null>>,
    setMultiFileUint8: Dispatch<SetStateAction<Uint8Array[] | null>>,
    setIsFileSelected: Dispatch<SetStateAction<number[]>>,
    setSelectedFile: Dispatch<SetStateAction<number>>,
) => {
    setMultiFile([]);
    setMultiFileUint8([]);
    setIsFileSelected([]);
    setSelectedFile(0);
    setMultiFileModal(false);
}
export const processSelection = async (
    selectedFiles: string[],
    getIsFileSelected: number[],
    setPageUrls: Dispatch<SetStateAction<string[]>>,
    setIsFileSelected: Dispatch<SetStateAction<number[]>>,
    getUploadedFiles: any[],
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    getMultiFileUint8: Uint8Array[],
    setMultiFileModal: Dispatch<SetStateAction<boolean>>,
): Promise<File> => {

    // ! FILTER
    const sendDown = selectedFiles.filter((_, i) => getIsFileSelected.includes(i)); // * Sends selected files from pool
    const filtered = selectedFiles.filter((_, i) => !getIsFileSelected.includes(i)); // * Updates removes selected files from pool
    if (filtered.length === 0) {
        setPageUrls([]);
        setMultiFileModal(false);
        setIsFileSelected([]);
    } else {
        setPageUrls(filtered ?? []);
    };

    // ! PROCESSOR
    // ! ERROR - PRODUCES DUPLICATE
    const mergedPdf = await PDFDocument.create();
    const addedPages = new Set<string>();

    for (const str of sendDown) {
        if (addedPages.has(str)) continue;
        addedPages.add(str);
        const response = await fetch(str);
        const arrayBuffer = await response.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const pdf = await PDFDocument.load(uint8);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
    }

    sendDown.forEach(url => URL.revokeObjectURL(url));
    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const file = new File([blob], 'merged.pdf', { type: 'application/pdf' });

    try {
        updateClient(file, getUploadedFiles, setUploadedFiles, setNotifications);
    } finally {
        setIsFileSelected([]);
    }
    return file;
}
export const updateClient = async (
    file: any,
    getUploadedFiles: any[],
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
) => {
    try {
        const index = getUploadedFiles.length;
        const fileData = await handleFiles(file, index, setUploadedFiles, setNotifications);
        if (fileData) await vendorMatch(index, fileData, setNotifications, setUploadedFiles);
    } catch (err) {
        console.log(`Unable to process`, "error");
    }
}
export const handleFiles = async (
    file: File,
    index: number,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>
) => {
    renderSkeleton(setUploadedFiles);
    // ! PROCESS FILE
    const base64 = await convertFileToBase64(file);
    let processedData;
    try {
        processedData = await processDbRequests(base64, setNotifications);
    } catch (err) {
        console.log(err);
    }
    // ! INVOICE CHECKING
    if (!processedData || processedData.get("isInvoice") === false) {
        showNotification("System", setNotifications, `File does not appear to be an invoice`, "info");
        removeSkeleton(setUploadedFiles);
        return null;
    } else {
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
            vendor_name: string
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
    setActiveIndex: Dispatch<SetStateAction<number>>,
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
    setUploadedFiles(prev => {
        const updated = prev.map(f =>
            f.name === file.name
                ? { ...f, state: 'skeleton' }
                : f
        );
        return updated;
    });
    let downloadArray: any[] = [];
    for (const item of items) {
        if (item.parent === true && item.label === 'Invoice') {
            try {
                const invoice = file.unProcessedData.split(',')[1];
                const doc = await PDFDocument.load(Uint8Array.from(atob(invoice), c => c.charCodeAt(0)));
                downloadArray.push(doc);
            } catch (err) { console.log('1-Cover Sheet item not found.') }
        }
        if (item.parent === true && item.label === 'Cover Sheet') {
            try {
                const coverSheet = await generateTemplateSheet(file, getTemplate, setNotifications);
                if (!coverSheet) continue;
                const arrayBuffer = await coverSheet.finalDownload.file.arrayBuffer();
                const doc = await PDFDocument.load(arrayBuffer);
                downloadArray.push(doc);
            } catch (err) { console.log('2-Cover Sheet item not found.') }
        }
        if (!item.parent && item.label !== 'Invoice' && item.label !== 'Cover Sheet') {
            try {
                const file = item.content?.split(',')[1];
                if (!file) continue;
                const doc = await PDFDocument.load(Uint8Array.from(atob(file), c => c.charCodeAt(0)));
                downloadArray.push(doc);
            } catch (err) {
                console.log('3-Cover Sheet item not found.')
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
        setTimeout(() => {
            setUploadedFiles(prev => {
                const updated = prev.map(f =>
                    f.name === file.name
                        ? { ...f, state: 'file_object' }
                        : f
                );
                return updated;
            }); setIsSelected([]);
        }, 2000);
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
        processedData: { invoice_number: string, vendor_name: string },
        resolution: { vendorId: string }
    }[],
    getTemplate: any[],
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setIsSelected: Dispatch<SetStateAction<number[]>>,
    getActiveIndex: number,
    getIsSelected: number[],
    setActiveIndex: Dispatch<SetStateAction<number>>,
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
            const resultArray = await setDownloadData(file, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, setActiveIndex, items, false);
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
export const removeFile = async (
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    index: number,
) => {
    try {
        setUploadedFiles((prevFiles) => {
            const updatedFiles = prevFiles.filter((_, i) => i !== index);
            sessionStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles));
            return updatedFiles;
        });
        // showNotification('System', setNotifications, 'Removed file', 'success');
    } catch (err) {
        return
    }
}