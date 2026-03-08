import { Dispatch, SetStateAction } from "react";

export const renderSkeleton = async (
    file: File,
    getUploadedFiles: any[],
    setUploadedFiles: Dispatch<SetStateAction<any[]>>
) => {
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