import { Dispatch, SetStateAction } from "react";

export const renderSkeleton = async (
    setUploadedFiles: Dispatch<SetStateAction<any[]>>
) => {
    const skeleton = {
        state: "skeleton"
    };
    setUploadedFiles(prev => [...prev, skeleton]);
}
export const removeSkeleton = async (
    setUploadedFiles: Dispatch<SetStateAction<any[]>>
) => {
    setUploadedFiles(prev => {
        return prev.filter(file => file.state !== "skeleton");
    });
}