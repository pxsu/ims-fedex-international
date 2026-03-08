import { Dispatch, SetStateAction } from "react";
import { renderSkeleton } from "@/app/handlers/drag-n-drop/skeletons";
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations";
import { convertFileToBase64 } from "@/app/utilities/crossplatform";
import { processDbRequests } from "../invoice-processor/processdb";
import { vendorMatch } from "../smart-query/query";

export const handleDragOver = (
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
                        await vendorMatch(index, fileData, getUploadedFiles, setNotifications, setUploadedFiles);
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
export const clearUploadedFiles = (
    setUploadedFiles: Dispatch<SetStateAction<any[]>>, 
) => {
    setUploadedFiles([]);
    sessionStorage.removeItem('uploadedFiles');
};