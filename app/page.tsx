"use client";

import { useState, useRef } from "react";
import { pdfjs } from "react-pdf";
import { PDFDocument } from 'pdf-lib';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {


    /**
     * ! DRAGGING CODE
     */
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [getUploadedFiles, setUploadedFiles] = useState<any[]>([]);
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
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    };
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
        setUploadedFiles(fileDataArray);
    }
    /**
     * ! DRAGGING CODE
     */


    /**
     * ------------------------------------------------------------------
     */


    /**
     * ! CHATGPT API CALL
     */
    const [getGptData, setGptData] = useState<any>(null);
    const processInvoice = async (base64: string, name: string) => {
        // Extract data from PDF
        const fileName = name;
        const pdfData = atob(base64.split(',')[1]);
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        const pages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map((item: any) => item.str).join(' '));
        }

        // Send to GPT
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
                    content: `Extract from this invoice text. Return ONLY JSON, no explanation:
                        {
                            "vendor_name": "",
                            "invoice_number": "",
                            "invoice_date": "",
                            "po_number": "",
                            "subtotal": "",
                            "tax": "",
                            "total": ""
                        }
                        Invoice text:
                    ${pages.join('\n')}`
                }]
            })
        });

        const data = await res.json();
        const content = data.choices[0].message.content;
        const cleanJson = content.replace(/```json\n?|```\n?/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        setGptData(parsedData);
        return JSON.parse(cleanJson);
    };
    const [getSelectedFile, setSelectedFile] = useState<File | null>(null);
    const ciaInputRef = useRef<HTMLInputElement>(null);
    const [getCiaTemplate, setCiaTemplate] = useState<any>(null);
    const handleCiaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCiaTemplate(file);
            setSelectedFile(file); // For fillPdfField to use
        }
    };
    const fillPdfField = async () => {
        if (!getCiaTemplate) return;

        const arrayBuffer = await getCiaTemplate.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();

        form.getTextField('FIELD_vendorNumber').setText('anothea');
        form.getTextField('FIELD_vendorName').setText('NAME');

        form.flatten();

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `filled_${getCiaTemplate.name}`;
        link.click();
        URL.revokeObjectURL(url);
    }


    /**
     * ! CHATGPT API CALL
     */


    /**
     * ------------------------------------------------------------------
     */


    /**
     * ! MISC FUNCTIONALITY
     */
    const convertPdfToImage = async (base64Data: string) => {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const pdfData = atob(base64Data.split(',')[1]);
        const pdfArray = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) {
            pdfArray[i] = pdfData.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument(pdfArray).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob!);
            const a = document.createElement('a');
            a.href = url;
            const originalName = getUploadedFiles[0]?.name.replace('.pdf', '') || 'page';
            a.download = `${originalName}.jpg`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg');
    };

    const clearUploadedFiles = () => {
        setUploadedFiles([]);
        sessionStorage.removeItem('uploadedFiles');
    };
    /**
     * ! MISC FUNCTIONALITY
     */


    return (
        <main data-section="whole page" className="bg-white text-black h-screen">
            <section
                data-section="drag and drop area"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex justify-center items-center border-b-2 h-1/3 transition-colors 
                            ${isDragging ? 'bg-neutral-200' : ''}`}>
                {getUploadedFiles.length > 0 ? (
                    <>
                        <div className="relative flex h-full w-full items-center justify-center">
                            <div className="flex gap-2 justify-center items-center text-green-700">
                                <span>{(getUploadedFiles[0]?.size / 1024).toFixed(1)} KB</span>
                                <span>{getUploadedFiles[0]?.name} ✅</span>
                            </div>
                            <div className="absolute bottom-0 w-full flex gap-3 items-center justify-center p-4">
                                <button
                                    onClick={clearUploadedFiles}
                                    className="border-1 py-1 px-2 rounded-md hover:bg-neutral-900 hover:text-white">
                                    clear selection
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <span
                                onClick={() => fileInputRef.current?.click()}
                                className="hover:underline cursor-pointer">
                                select pdf ❌
                            </span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    </>
                )}
            </section>
            <section data-section="fun buttons" className="p-8">
                <section className="flex gap-8">
                    <div onClick={() => fillPdfField()} className="border-2 w-80 h-80 rounded-xl text-lg hover:bg-black/5 hover:shadow-md cursor-pointer flex flex-col justify-center items-center">
                        <button
                            onClick={() => ciaInputRef.current?.click()}
                            className="flex hover:underline cursor-pointer">
                            {getCiaTemplate ? `${getCiaTemplate.name} ✅` : 'set cia ❌'}
                        </button>
                        <input
                            ref={ciaInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleCiaFileSelect}
                            className="hidden"
                        />
                    </div>
                    <button
                        onClick={async () => {
                            const pdfData = getUploadedFiles[0]?.data || '';
                            if (pdfData) await convertPdfToImage(pdfData);
                        }}
                        className="border-2 w-80 h-80 rounded-xl flex justify-center items-center text-lg hover:bg-black/5 hover:shadow-md cursor-pointer">
                        pdf to jpeg (single)
                    </button>
                    <button className="border-2 w-80 h-80 rounded-xl flex justify-center items-center text-lg hover:bg-black/5 hover:shadow-md cursor-pointer">add blank & support sheet</button>
                </section>
            </section>
        </main>
    )
}