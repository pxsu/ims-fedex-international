"use client";

import { useState, useRef } from "react";
import { pdfjs } from "react-pdf";
import { PDFDocument } from 'pdf-lib';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {

    // *  DRAGGING CODE
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


    // * TOP BAR FUNCTIONALITY
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
    const handleFiles = async (files: FileList) => {
        const fileDataArray = await Promise.all(
            Array.from(files).map(async (file) => {
                const base64 = await convertFileToBase64(file);
                return {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    data: base64
                };
            })
        );
        sessionStorage.setItem('uploadedFiles', JSON.stringify(fileDataArray));
        setUploadedFiles(fileDataArray);
    }


    // * EXCEL FUNCTIONALITY
    const excelInputRef = useRef<HTMLInputElement>(null);
    const [getExcelTemplate, setExcelTemplate] = useState<any>(null);
    const handleExcelTemplateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCiaTemplate(file);
        }
    };
    const handleExcelDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleExcelFiles(files);
        }
    }
    const handleExcelFiles = async (files: FileList) => {
        const fileDataArray = await Promise.all(
            Array.from(files).map(async (file) => {
                const base64 = await convertFileToBase64(file);
                return {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    data: base64
                };
            })
        );
        sessionStorage.setItem('uploadedExcelFiles', JSON.stringify(fileDataArray));
        setUploadedFiles(fileDataArray);
    }


    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }


    {/* CHATGPT API CALL */ }
    const [getGptData, setGptData] = useState<any>(null);
    const processInvoice = async (base64: string) => {
        // Extract data from PDF
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
        console.log(parsedData);
        setGptData(parsedData);
        return JSON.parse(cleanJson);
    };
    

    const fillPdfField = async () => {
        if (!getCiaTemplate) return;
        const arrayBuffer = await getCiaTemplate.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();
        form.getTextField('FIELD_vendorNumber').setText(getGptData?.vendor_number || 'N/A');
        form.getTextField('FIELD_vendorName').setText(getGptData?.vendor_name || 'N/A');
        form.getTextField('FIELD_invoiceDate').setText(getGptData?.invoice_date || 'N/A');
        form.getTextField('FIELD_invoiceNumber').setText(getGptData?.invoice_number || 'N/A');
        form.getTextField('GL_A1:A1').setText('N/A');
        form.getTextField('GL_A1:B1').setText('N/A');
        form.getTextField('GL_A1:C1').setText('N/A');
        form.getTextField('GL_A1:D1').setText(getGptData?.subtotal || 'N/A');
        form.getTextField('FIELD_poValue').setText(getGptData?.po_number || 'N/A');
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


    const ciaInputRef = useRef<HTMLInputElement>(null);
    const [getCiaTemplate, setCiaTemplate] = useState<any>(null);
    const handleCiaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCiaTemplate(file);
        }
    };



    const clearUploadedFiles = () => {
        setUploadedFiles([]);
        sessionStorage.removeItem('uploadedFiles');
    };


    return (
        <main data-section="whole page" className="bg-white text-black h-screen">
            <nav className="flex gap-2 justify-between bg-neutral-100 p-2 px-8 items-center h-14">
                <button
                    onClick={() => window.location.href = '/'}
                    className="text-[24px] font-bold text-black hover:text-transparent hover:text-[28px] hover:[-webkit-text-stroke:1px_rgb(168_85_247)] transition-all cursor-pointer">
                    ims
                </button>
                <div className="flex gap-2 items-center">
                    <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:border-2 hover:border-purple-500 transition-all cursor-pointer">
                        btn 1
                    </button>
                    <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:border-2 hover:border-purple-500 transition-all cursor-pointer">
                        btn 2
                    </button>
                </div>
            </nav>


            <section
                data-section="drag and drop area"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex justify-center items-center h-1/3 transition-all border-y-2 border-gray-100 ${isDragging ? 'border-purple-500 bg-purple-50' : 'bg-gray-50'}`}>
                {getUploadedFiles.length > 0 ? (
                    <>
                        <div className="relative flex h-full w-full items-center justify-center">
                            <div className="flex gap-2 justify-center items-center text-green-600">
                                <span>
                                    {(() => {
                                        const bytes = getUploadedFiles[0]?.size || 0;
                                        if (bytes < 1024) return `${bytes} B`;
                                        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                                        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                                        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
                                    })()}
                                </span>
                                <span>{getUploadedFiles[0]?.name}</span>
                            </div>
                            <div className="absolute bottom-0 w-full flex gap-3 items-center justify-center p-4">
                                <button
                                    onClick={clearUploadedFiles}
                                    className="bg-red-500 p-1 rounded-md text-white hover:bg-white hover:text-red-500 hover:border-2 hover:border-red-500 transition-all cursor-pointer">
                                    <div className="flex px-1 items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                        <span className="text-xs">clear</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <span
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 rounded-lg cursor-pointer text-gray-600 hover:text-purple-600 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                select pdf
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


            <section data-section="fun buttons" className="p-8 h-full bg-neutral-100">
                <section className="py-2 text-black/60">
                    Quick actions
                </section>
                <section className="flex gap-8">


                    {/* PRIMARY BUTTON */}
                    <div
                        onClick={async () => {
                            await processInvoice(getUploadedFiles[0]?.data || '');
                            await fillPdfField();
                        }}
                        className="relative border-2 border-gray-300 w-80 h-80 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-center items-center gap-4 p-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <div className="text-center">
                            <h3 className="font-semibold text-gray-700">Auto generate cover sheet</h3>
                            <p className="text-sm text-gray-500 -translate-y-1">upload CIA template to begin</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                ciaInputRef.current?.click();
                            }}
                            className="absolute bottom-4 px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer">
                            {getCiaTemplate ? (
                                <>
                                    <div className="flex text-green-600 gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                        <span className="text-sm">
                                            {getCiaTemplate.name.length > 15
                                                ? `${getCiaTemplate.name.slice(0, 15)}...`
                                                : getCiaTemplate.name}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="hover:text-purple-600 flex gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        <span className="text-sm">set cia template</span>
                                    </div>
                                </>
                            )}
                        </button>
                        <input
                            ref={ciaInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleCiaFileSelect}
                            className="hidden"
                        />
                    </div>


                    {/* PDF TO JPEG BUTTON */}
                    <div
                        onClick={async () => {
                            const pdfData = getUploadedFiles[0]?.data || '';
                            if (pdfData) await convertPdfToImage(pdfData);
                        }}
                        className="relative border-2 border-gray-300 w-80 h-80 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-center items-center gap-4 p-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                        <div className="text-center">
                            <h3 className="font-semibold text-gray-700">PDF to JPEG</h3>
                            <p className="text-sm text-gray-500 -translate-y-1">convert first page to image</p>
                        </div>
                    </div>


                    {/* TBD */}
                    <div className="relative border-2 border-gray-300 w-80 h-80 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-center items-center gap-4 p-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <div className="text-center">
                            <h3 className="font-semibold text-gray-700">Add supporting sheets</h3>
                            <p className="text-sm text-gray-500 -translate-y-1">blank + support sheet</p>
                        </div>
                    </div>


                    {/* adding vendors to database */}
                    <div
                        onClick={async () => {
                            const pdfData = getUploadedFiles[0]?.data || '';
                            if (pdfData) await convertPdfToImage(pdfData);
                        }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="relative border-2 border-gray-300 w-80 h-80 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-center items-center gap-4 p-6">
                        <div className="text-center">
                            <h3 className="font-semibold text-gray-700">EXCEL to FIRESTORE</h3>
                            <p className="text-sm text-gray-500 -translate-y-1"></p>
                        </div>
                    </div>
                </section>
            </section>
        </main >
    )
}