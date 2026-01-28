/**
    * TODO: CONVERT: NAVIGATION RIBBON --> PRIMARY COMPONENT
    * TODO: CONVERT: CANVAS AREA --> PRIMARY COMPONENT
    * TODO: CONVERT: SIDEBAR VIEW --> PRIMARY COMPONENT
*/

'use client'

{/* ----- */ }
/**
 * * LIBRARY IMPORTS
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

/**
 * * COMPONENT IMPORTS
 */
import INTERACTION_PDFPreview from './INTERACTION_PDFPreview';
import INTERACTION_NavigationRibbon from './INTERACTION_NavigationRibbon'
import INTERACTION_ContentArea from './INTERACTION_ContentArea'
{/* ----- */ }

export default function PDFEngine() {
    const [pdfFile, setPdfFile] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);


    /** 
     * * (1) CREATE FILE DROP AREA
     * TODO: CONVERT TO HOOK
     * TODO: CREATE INDEPENDENT COMPONENT
     */
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;

        if (files && files[0]) {  // ← Check first
            const fileUrl = URL.createObjectURL(files[0]);
            setPdfFile(fileUrl);
            await handleFiles(files);
        }
    }


    /** 
     * * (2) CONVERT FILE TO BASE64 --> STORE CONTENT FILE IN SESSION STORAGE SPACE
     * TODO: CONVERT TO HOOK
     */
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
        sessionStorage.setItem('uploadedFiles', JSON.stringify(fileDataArray));
    }


    /**
     * * (3) READ FILES UPLOADED TO THE BROWSER
     * TODO: CONVERT TO HOOK
     * TODO: READ FROM DATABASE NEXT
     */
    useEffect(() => {
        const data = sessionStorage.getItem('uploadedFiles');
        if (data) {
            setUploadedFiles(JSON.parse(data));
        }
    }, [pdfFile]);


    return (
        <main data-section="PARENT" className='h-screen overflow-hidden'>
            {/* PARENT:NAVIGATION RIBBON */}
            <INTERACTION_NavigationRibbon />

            {/* PARENT:CONTENT AREA */}
            <INTERACTION_ContentArea />
        </main>
    )
}