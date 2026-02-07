import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function BLOCK_QuickActions() {

    {/* ALLOWS YOU DO TO HANDLE FILE DROP-INS*/ }
    {/* TODO: CREATE A HOOK */ }
    const [isDragging, setIsDragging] = useState(false);
    const router = useRouter();
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    }
    {/* --------------------------------------------------------- */ }


    {/* CUSTOM FUNCTIONS USED TO CONVERT & STORE FILE CONTENT DATA */ }
    {/* TODO: CREATE A HOOK */ }
    // Helper function to convert File to Base64
    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }
    const handleFiles = async (files: FileList) => {
        const fileDataArray = await Promise.all(
            Array.from(files).map(async (file) => {
                // Convert file to Base64 string so we can store it
                const base64 = await convertFileToBase64(file);

                return {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    data: base64 // The actual file content as Base64
                };
            })
        );

        // Store in sessionStorage
        sessionStorage.setItem('uploadedFiles', JSON.stringify(fileDataArray));

        // Redirect to n_sesh page
        router.push('/new_session');
    }
    {/* --------------------------------------------------------- */ }


    return (
        <section className='bg-[#F9F9F9] w-full h-[30vh] flex items-center justify-center'>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full h-full flex items-center gap-2 justify-center text-black/50 transition-colors 
                            ${isDragging ? 'bg-[#E7E7E7] text-purple-800' : ''}`}>
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                </div>
                <div className="flex gap-2">
                    <button className="hover:underline cursor-pointer">Drag or select files</button>
                    <div> | </div>
                    <button className="hover:underline cursor-pointer">
                        PDF Editor
                    </button>
                </div>
            </div>
        </section>
    )
}