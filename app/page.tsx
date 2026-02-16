'use client';

import { useState, useRef, useEffect } from "react";
import * as XLSX from 'xlsx';
import { getDoc, setDoc, doc } from 'firebase/firestore';
import { db } from "@/firebase"
import { Transition } from '@headlessui/react';
import { PDFDocument } from 'pdf-lib';

import { useInvoiceProcessor } from '@/app/pdfjs/invoiceProcessor';
import { convertPdfToImage, downloadBlob } from '@/app/pdfjs/conversionProcessor';

export default function Page() {
    // * global notification system
    const [getNotifications, setNotifications] = useState<Notification[]>([]);
    type NotificationType = 'success' | 'error' | 'warning' | 'info';
    interface Notification {
        id: string;
        title: string;
        message?: string;
        type: NotificationType;
    }
    const getNotificationStyles = (type: NotificationType) => {
        switch (type) {
            case 'success':
                return 'bg-green-400 border-2 border-green-300';
            case 'error':
                return 'bg-red-400 border-2 border-red-300';
            case 'warning':
                return 'bg-yellow-400 border-2 border-yellow-300';
            case 'info':
                return 'bg-neutral-400 border-2 border-neutral-300';
            default:
                return 'bg-black border-2 border-gray-800';
        }
    };
    const showNotification = (title: string, message?: string, type: NotificationType = 'success') => {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, { id, title, message, type }]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    };


    // * TOP BAR FUNCTIONALITY
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [getCiaTemplate, setCiaTemplate] = useState<any>(null);
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
    const clearUploadedFiles = () => {
        setUploadedFiles([]);
        sessionStorage.removeItem('uploadedFiles');
    };


    // * CIA SELECTION CODE
    const { getGptData, processInvoice } = useInvoiceProcessor();
    const ciaInputRef = useRef<HTMLInputElement>(null);
    const handleCiaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCiaTemplate(file);
        }
    };
    // * FILL PDF FIELD
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


    // * EXCEL FUNCTIONALITY
    const [getIsDraggingExcel, setIsDraggingExcel] = useState(false);
    const [getExcelTemplate, setExcelTemplate] = useState<any[]>([]);
    const [getExcelModal, setExcelModal] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'exists'>('idle');
    const [getExtractedExcelData, setExtractedExcelData] = useState<ExtractedData | null>(null);
    useEffect(() => {
        if (getExcelModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [getExcelModal]);
    const handleExcelDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingExcel(true);
    };
    const handleExcelDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingExcel(false);
    }
    const handleExcelDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingExcel(false);

        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );

        if (files && files.length > 0) {
            handleExcelFiles(files);
            setExcelModal(true);
        }
    };
    const handleExcelFiles = async (files: File[]) => {
        const allFileData = [];
        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = await convertFileToBase64(file);
            const fileData = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                data: base64
            };
            allFileData.push(fileData);
            await processExcelData(arrayBuffer);
        }
        sessionStorage.setItem('uploadedExcelFiles', JSON.stringify(allFileData));
        setExcelTemplate(allFileData);
    }
    interface ExcelRow {
        __EMPTY?: string;
        __EMPTY_1?: string | number;
        __EMPTY_3?: string | number;
        __EMPTY_10?: string | number;
        __EMPTY_4?: string | number;
        __EMPTY_5?: string | number;
        __EMPTY_12?: string;
        __EMPTY_13?: string;
    }
    interface GLAccount {
        description: string | null;
        gl_account: string | null;
        cost_centre: string | null;
    }
    interface ExtractedData {
        vendorEmpNumber: number | null;
        vendorEmpName: string | null;
        relevant_gls: GLAccount[];
        province: string | null;
        taxValue: string | null;
        costCentre: number | null;
        currency: 'CAD' | 'USD' | null;
    }
    const processExcelData = async (arrayBuffer: ArrayBuffer): Promise<void> => {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

        const findRow = (text: string) => jsonData.find(row => row.__EMPTY?.includes(text));

        // Extract values
        const vendorRow = findRow('VENDOR/EMP #:');
        const provinceRow = findRow('SELECT PROVINCE');
        const totalRow = jsonData.find(row => row.__EMPTY_3?.toString().trim() === 'Total');

        // Get GL accounts with values (filter out empty AMOUNT fields)
        const relevant_gls = jsonData
            .filter(row => row.__EMPTY_3 && typeof row.__EMPTY_3 === 'number' && row.__EMPTY_5)
            .map(row => ({
                description: row.__EMPTY?.toString() || null,
                gl_account: row.__EMPTY_3?.toString() || null,
                cost_centre: row.__EMPTY_4?.toString() || null,
            }));

        // Determine currency (check which column in Total row has value)
        const currency: 'CAD' | 'USD' | null = totalRow?.__EMPTY_5 ? 'CAD' : 'USD';
        setExtractedExcelData({
            vendorEmpNumber: vendorRow?.__EMPTY_1 ? Number(vendorRow.__EMPTY_1) : null,
            vendorEmpName: vendorRow?.__EMPTY_4?.toString() || null,
            relevant_gls,
            province: provinceRow?.__EMPTY_1?.toString() || null,
            taxValue: provinceRow?.__EMPTY_3?.toString() || null,
            costCentre: provinceRow?.__EMPTY_4 ? Number(provinceRow.__EMPTY_4) : null,
            currency,
        });
    };
    const submitToFirebase = async (data: ExtractedData): Promise<boolean> => {
        try {
            setUploadStatus('uploading');
            const docRef = doc(db, 'vendor_data', `CIA-${data.vendorEmpNumber}`);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setUploadStatus('exists');
                setTimeout(() => setExcelModal(false), 1500);
                return false;
            }

            await setDoc(docRef, data);
            setUploadStatus('success');
            setTimeout(() => setExcelModal(false), 1500);
            return true;
        } catch (error) {
            setUploadStatus('error');
            setTimeout(() => setExcelModal(false), 1500);
            return false;
        }
    };


    // * FILE TO BASE64
    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }


    return (
        <main data-section="whole page" className="bg-white text-black h-screen">
            <nav className="flex gap-2 justify-between bg-neutral-100 p-2 px-8 items-center h-14">
                <button
                    onClick={() => window.location.href = '/'}
                    className="text-[24px] font-bold text-black hover:text-transparent hover:text-[28px] hover:[-webkit-text-stroke:1px_rgb(168_85_247)] transition-all cursor-pointer">
                    ims
                </button>
                <div className="flex gap-2 items-center">
                    <button onClick={() => { showNotification("Title", "test message", "info") }} className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:border-2 hover:border-purple-500 transition-all cursor-pointer">
                        noti_test
                    </button>
                    <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:border-2 hover:border-purple-500 transition-all cursor-pointer">
                        func_2
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
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">


                    {/* PRIMARY BUTTON */}
                    <div
                        onClick={async () => {
                            await processInvoice(getUploadedFiles[0]?.data || '');
                            await fillPdfField();
                        }}
                        className="relative border-2 border-gray-300 w-full aspect-square rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-center items-center gap-4 p-6">
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
                        className="relative border-2 border-gray-300 w-full aspect-square rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-center items-center gap-4 p-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                        <div className="text-center">
                            <h3 className="font-semibold text-gray-700">PDF to JPEG</h3>
                            <p className="text-sm text-gray-500 -translate-y-1">convert first page to image</p>
                        </div>
                    </div>


                    {/* TBD */}
                    <div className="relative border-2 border-gray-300 w-full aspect-square rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col justify-center items-center gap-4 p-6">
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
                        onDragOver={handleExcelDragOver}
                        onDragLeave={handleExcelDragLeave}
                        onDrop={handleExcelDrop}
                        className={`relative border-2 w-full aspect-square rounded-xl transition-all flex flex-col justify-center items-center gap-4 p-6 border-gray-300 cursor-pointer hover:border-purple-500 hover:bg-purple-50
                        ${getIsDraggingExcel ? 'border-purple-500 bg-purple-50' : ''}`}>
                        {getExcelTemplate.length > 0 && getExcelModal ? (
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-purple-500"></div>
                        ) : (
                            <div className="text-center">
                                <h3 className="font-semibold text-gray-700">EXCEL to FIRESTORE</h3>
                                <p className="text-sm text-gray-500 -translate-y-1">drag & drop excel file</p>
                            </div>
                        )}
                    </div>
                </section>
            </section>


            {
                <div className="pointer-events-none fixed -inset-3 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]">
                    <div className="flex w-full flex-col items-center space-y-2">
                        {getNotifications.map(notification => (
                            <Transition
                                key={notification.id}
                                show={true}
                                enter="transform transition duration-300 ease-out"
                                enterFrom="translate-y-2 opacity-0"
                                enterTo="translate-y-0 opacity-100"
                                leave="transform transition duration-100 ease-in"
                                leaveFrom="translate-y-0 opacity-100"
                                leaveTo="translate-y-2 opacity-0">
                                <div className={`pointer-events-auto w-full max-w-sm rounded-xl text-white p-4 ${getNotificationStyles(notification.type)}`}>
                                    <div className="flex items-start">
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium font-semibold">{notification.title}</p>
                                            {notification.message && (
                                                <p className="mt-1 text-sm -translate-y-1">{notification.message}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                                            className="ml-4 text-white cursor-pointer">
                                            <div className="flex items-center gap-2 hover:text-red-200 rounded-md hover:outline-2 hover:outline-red-200">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </Transition>
                        ))}
                    </div>
                </div>
            }


            {getExcelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl w-144 min-h-96 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-1 justify-center items-center">
                                <div>Adding</div>
                                <span>"{getExcelTemplate[0]?.name.length > 30 ? `${getExcelTemplate[0]?.name.slice(0, 30)}...` : getExcelTemplate[0]?.name}"</span>
                            </div>
                            <button
                                onClick={() => setExcelModal(false)}
                                className="bg-red-500 p-2 rounded-md text-white hover:bg-white hover:text-red-500 hover:outline-2 hover:outline-red-500 transition-all cursor-pointer">
                                <div className="flex px-1 items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                        <div className="space-y-4">
                            {getExtractedExcelData && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2">
                                        <div>
                                            <p className="text-xs text-gray-500">VENDOR NUMBER</p>
                                            <p className="font-semibold">{getExtractedExcelData.vendorEmpNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">VENDOR NAME</p>
                                            <p className="font-semibold">{getExtractedExcelData.vendorEmpName}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">GL ACCOUNTS</p>
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border p-2 text-left">DESCRIPTION / PURPOSE</th>
                                                    <th className="border p-2 text-center">GL ACCOUNT</th>
                                                    <th className="border p-2 text-center">COST CENTRE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getExtractedExcelData.relevant_gls.map((gl, index) => (
                                                    <tr key={index}>
                                                        <td className="border p-2">{gl.description}</td>
                                                        <td className="border p-2 text-center font-semibold">{gl.gl_account}</td>
                                                        <td className="border p-2 text-center font-semibold">{gl.cost_centre}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">PROVINCE & TAX CODES</p>
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border p-2 text-left">PROVINCE</th>
                                                    <th className="border p-2 text-left">TAX 1</th>
                                                    <th className="border p-2 text-left">TAX 2</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="border p-2 font-semibold">{getExtractedExcelData.province}</td>
                                                    <td className="border p-2">{getExtractedExcelData.taxValue}</td>
                                                    <td className="border p-2 text-gray-400">N/A</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">CURRENCY</p>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="currency" checked={getExtractedExcelData.currency === 'CAD'} readOnly />
                                                <span>CAD</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="currency" checked={getExtractedExcelData.currency === 'USD'} readOnly />
                                                <span>USD</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div>
                                <button
                                    onClick={() => { submitToFirebase(getExtractedExcelData!) }}
                                    disabled={uploadStatus !== 'idle'}
                                    className={`p-1 px-4 rounded-md transition-all ${uploadStatus === 'success' ? 'bg-green-500 text-white' :
                                        uploadStatus === 'error' ? 'bg-red-500 text-white' :
                                            uploadStatus === 'exists' ? 'bg-yellow-500 text-white' :
                                                uploadStatus === 'uploading' ? 'bg-gray-400 text-white cursor-wait' :
                                                    'bg-black text-white hover:bg-white hover:text-purple-500 hover:border-2 hover:border-purple-500 cursor-pointer'
                                        }`}>
                                    {uploadStatus === 'success' ? 'Success' :
                                        uploadStatus === 'error' ? 'Error' :
                                            uploadStatus === 'exists' ? 'File Exists' :
                                                uploadStatus === 'uploading' ? 'Uploading...' :
                                                    'Upload'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main >
    )
}