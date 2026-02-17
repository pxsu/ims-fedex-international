'use client';

import { useState, useRef, useEffect } from "react";
import * as XLSX from 'xlsx';
import { getDoc, setDoc, doc } from 'firebase/firestore';
import { db } from "@/firebase"
import { Transition } from '@headlessui/react';
import { PDFDocument } from 'pdf-lib';

import { useInvoiceProcessor } from '@/app/pdfjs/documentProcessor';
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

    // * CIA SELECTION CODE
    const ciaInputRef = useRef<HTMLInputElement>(null);
    const handleCiaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCiaTemplate(file);
        }
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
    // * FILL PDF FIELD
    const { getGptData, processInvoice } = useInvoiceProcessor(); // getGptData returns an object
    const [getGlQueue, setGlQueue] = useState<any[]>([]);
    const getCurrentDate = (): string => {
        const now = new Date();
        const day = now.getDate();
        const month = now.toLocaleString('en-US', { month: 'short' });
        return `${day}-${month}`;
    };
    const getTaxValue = (vendorInfo: any) => {
        const province = vendorInfo.province;
        const taxRates: { [key: string]: { totalRate: number, gstRate: number, gstType: string, pstRate?: number, pstType?: string } } = {
            'ON': { totalRate: 0.13, gstRate: 0.13, gstType: 'HST-122810' },
            'QC': { totalRate: 0.14975, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.09975, pstType: 'QST-122900' },
            'BC': { totalRate: 0.12, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.07, pstType: 'PST-122850' },
            'AB': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
            'SK': { totalRate: 0.11, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.06, pstType: 'PST-122850' },
            'MB': { totalRate: 0.12, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.07, pstType: 'PST-122850' },
            'NS': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
            'NB': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
            'NL': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
            'PE': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
            'YT': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
            'NT': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
            'NU': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' }
        };
        return taxRates[province] || { totalRate: 0, gstRate: 0, gstType: 'UNKNOWN' };
    }
    const phoneBook = async (): Promise<Map<string, any>> => {
        const vendor_number = getGptData?.vendor_number;
        const query = (`CIA-${vendor_number}`);
        const docRef = doc(db, 'vendor_data', query);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const vendorData = docSnap.data();
            const vendorMap = new Map();
            vendorMap.set('vendor_name', vendorData.vendor_name);
            vendorMap.set('vendor_number', vendorData.vendor_number);
            vendorMap.set('relevant_gls', vendorData.relevant_gls);
            vendorMap.set('province', vendorData.province);
            vendorMap.set('currency', vendorData.currency);
            return vendorMap;
        } else {
            throw new Error(`Document ${query} not found`);
        }
    }
    const processDbRequests = async (data: any) => {
        const processedData = [];
        for (const item of data) {
            const processedItem: any = {};
            const base64 = await convertFileToBase64(item);
            processInvoice(base64);
            const gptInfo = getGptData;
            const vendorInfo = await phoneBook();

            const headerMap = new Map([
                [
                    'vendor_number',
                    {
                        value: vendorInfo.get('vendor_number'),
                        field: 'FIELD_vendorNumber'
                    }
                ],
                [
                    'vendor_name',
                    {
                        value: vendorInfo.get('vendor_name'),
                        field: 'GL_A1:B1'
                    }],
                [
                    'date',
                    {
                        value: gptInfo.invoice_date,
                        field: 'FIELD_invoiceDate'
                    }
                ],
                [
                    'invoice_number',
                    {
                        value: gptInfo.invoice_number,
                        field: 'FIELD_invoiceDate'
                    }
                ],
                [
                    'po_number',
                    {
                        value: gptInfo.invoice_number,
                        field: 'FIELD_poValue'
                    }
                ],
                [
                    'province',
                    {
                        value: gptInfo.invoice_number,
                        field: 'FIELD_province'
                    }
                ],
                [
                    'currency_selection',
                    {
                        value: vendorInfo.get('currency'),
                        field: 'FIELD_province'
                    }
                ],
                [
                    'approval_date',
                    {
                        value: getCurrentDate(),
                        field: 'FIELD_date'
                    }
                ],
            ]);
            const glMap = new Map();
            vendorInfo.get('relevant_gls').forEach((gl: any, index: number) => {
                const rowNum = index + 1;
                glMap.set(index, {
                    description: { value: gl.description, field: `GL_A${rowNum}:A${rowNum}` },
                    gl_account: { value: gl.gl_account, field: `GL_A${rowNum}:B${rowNum}` },
                    cost_centre: { value: gl.cost_centre, field: `GL_A${rowNum}:C${rowNum}` },
                    amount: { value: '', field: `GL_A${rowNum}:D${rowNum}` }
                });
            });
            const calcMap = new Map([]);
            const subtotal = parseFloat(gptInfo.subtotal);
            calcMap.set('subtotal',
                {
                    value: subtotal.toFixed(2),
                    field: 'FIELD_subtotal'
                });
            const taxValue = getTaxValue(vendorInfo);;
            calcMap.set('taxValue',
                {
                    value: (subtotal * taxValue.gstRate).toFixed(2),
                    field: 'FIELD_primaryTax',
                    type: taxValue.gstType
                });
            if (taxValue.pstRate && taxValue.pstType) {
                calcMap.set('secTaxValue',
                    {
                        value: (subtotal * taxValue.pstRate).toFixed(2),
                        field: 'FIELD_secondaryTax',
                        type: taxValue.pstType
                    });
            }
            const totalAmount = subtotal * taxValue.totalRate;
            calcMap.set('totalAmount',
                {
                    value: totalAmount.toFixed(2),
                    field: 'FIELD_totalValue'
                });
            const vendorMap = new Map([
                ...headerMap,
                ...glMap,
                ...calcMap
            ]);
            processedItem.fieldMap = vendorMap;
            processedData.push(processedItem);
        }
        return processedData;
    }
    const fillPdfField = async () => {
        /**
         * I'm pretty sure it's the same thing around here were we have to create a pre-defined
         * map of all the values that we'll need before we can go ahead with the rendering side of things.
         * if anything fillPdfField will come last. Might as well create the same queue functionality
         * that we used earlier for the excel to db downloader.
         */
        /**
         * TODO: take processedData
         * TODO: process the data array map and then iterate it through each text field
         */

        //* all good
        const arrayBuffer = await getCiaTemplate.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();

        //! HEADER */
        /**
         * TODO: databasePull(getGptData) --> find most relevant vendor, return valid profile
         * TODO: iterate through database pull & fill header text
         */
        form.getTextField('FIELD_vendorNumber').setText(getGptData?.vendor_number || 'N/A');
        form.getTextField('FIELD_vendorName').setText(getGptData?.vendor_name || 'N/A');
        form.getTextField('FIELD_invoiceDate').setText(getGptData?.invoice_date || 'N/A');
        form.getTextField('FIELD_invoiceNumber').setText(getGptData?.invoice_number || 'N/A');

        //! GL DESCRIPTIONS --> FILL ONLY NECESSARY */
        form.getTextField('GL_A1:A1').setText('N/A');
        form.getTextField('GL_A1:B1').setText('N/A');
        form.getTextField('GL_A1:C1').setText('N/A');

        //! CALCULATION */
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
    const [getExcelModal, setExcelModal] = useState(false);
    const [getCurrentExcelPage, setCurrentExcelPage] = useState(0);
    const navigateExcelPage = (direction: 'left' | 'right') => {
        if (direction === 'left' && getCurrentExcelPage > 0) {
            setCurrentExcelPage(getCurrentExcelPage - 1);
        } else if (direction === 'right' && getCurrentExcelPage < getProcessedFileData.length - 1) {
            setCurrentExcelPage(getCurrentExcelPage + 1);
        }
    };
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
        const allFiles = Array.from(e.dataTransfer.files);
        const files = allFiles.filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        if (files.length === 0) {
            return;
        } else if (files.length === 1) {
            handleExcelFiles(files);
            setExcelModal(true);
        } else {
            handleExcelFiles(files);
            setExcelModal(true);
        }
    };
    //* leaving this useState variable here so that if I come back and want to add more funcitonality its there
    const [getCurrentProcessingIndex, setCurrentProcessingIndex] = useState(0);
    const [getProcessedFileData, setProcessedFileData] = useState<any[]>([]);
    const handleExcelFiles = async (files: File[]) => {
        /**
         * TODO: Account for 1 file or an array of files
         * TODO: variable to store total index count
         * TODO: state function to store real time index 
         * TODO: after the end of processing each fileData, we need to replace the value stored in its existing position with the new processed data
         * TODO: submit an array that either holds 1 index of processed data, versus 2 indexes of processed data
         */
        const allFileData: any[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setCurrentProcessingIndex(i);
            const arrayBuffer = await file.arrayBuffer();
            const base64 = await convertFileToBase64(file);
            const fileData = {
                index: i,
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                data: base64,
                processed: false
            };
            allFileData.push(fileData);
            const processedResult = await processExcelData(arrayBuffer);
            allFileData[i] = {
                ...allFileData[i],
                processedData: processedResult,
                processed: true
            };
            setProcessedFileData([...allFileData]);
        }
        sessionStorage.setItem('uploadedExcelFiles', JSON.stringify(getProcessedFileData));
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
    //* we don't use this?
    interface ExtractedData {
        vendorEmpNumber: number | null;
        vendorEmpName: string | null;
        relevant_gls: GLAccount[];
        province: string | null;
        taxValue: string | null;
        costCentre: number | null;
        currency: 'CAD' | 'USD' | null;
    }
    const processExcelData = async (arrayBuffer: ArrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet);
        const findRow = (text: string) => jsonData.find(row => row.__EMPTY?.includes(text));
        const vendorRow = findRow('VENDOR/EMP #:');
        const provinceRow = findRow('SELECT PROVINCE');
        const totalRow = jsonData.find(row => row.__EMPTY_3?.toString().trim() === 'Total');
        const relevant_gls = jsonData
            .filter(row => row.__EMPTY_3 && typeof row.__EMPTY_3 === 'number' && row.__EMPTY_5)
            .map(row => ({
                description: row.__EMPTY?.toString() || null,
                gl_account: row.__EMPTY_3?.toString() || null,
                cost_centre: row.__EMPTY_4?.toString() || null,
            }));
        const currency: 'CAD' | 'USD' | null = totalRow?.__EMPTY_5 ? 'CAD' : 'USD';
        return {
            vendorEmpNumber: vendorRow?.__EMPTY_1 ? Number(vendorRow.__EMPTY_1) : null,
            vendorEmpName: vendorRow?.__EMPTY_4?.toString() || null,
            relevant_gls,
            province: provinceRow?.__EMPTY_1?.toString() || null,
            taxValue: provinceRow?.__EMPTY_3?.toString() || null,
            costCentre: provinceRow?.__EMPTY_4 ? Number(provinceRow.__EMPTY_4) : null,
            currency,
        };
    };
    const [getSubmissionIndex, setSubmissionIndex] = useState<any[]>([]);
    const submitToFirebase = async (data: any) => {
        for (let i = 0; i < data.length; i++) {
            try {
                setUploadStatus('uploading');
                const docRef = doc(db, 'vendor_data', `CIA-${data[i]?.processedData.vendorEmpNumber}`);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSubmissionIndex(prev => [...prev, { index: i, exists: 1 }]);
                    setUploadStatus("exists")
                } else {
                    setSubmissionIndex(prev => [...prev, { index: i, exists: 0 }]);
                    await setDoc(docRef, data[i].processedData);
                    setUploadStatus("success")
                }
            } catch (error) {
                setSubmissionIndex(prev => [...prev, { index: i, exists: -1 }]);
                setUploadStatus("error")
            }
        }
        setTimeout(() => {
            setExcelModal(false);
            setUploadStatus('idle');
            setSubmissionIndex([]);
            setCurrentProcessingIndex(0);
            setProcessedFileData([]);
        }, 1500);
    };
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'exists'>('idle');
    const getUploadBtnResponse = () => {
        const uploadedCount = getSubmissionIndex.filter(item => item.exists === 0).length;
        const existingCount = getSubmissionIndex.filter(item => item.exists === 1).length;
        const baseStyles = 'p-1 px-4 rounded-md transition-all';

        if (uploadStatus === 'success' && uploadedCount === 0 && existingCount > 0) {
            return {
                className: `${baseStyles} bg-yellow-500 text-white`,
                text: 'Files already exist'
            };
        }

        const statusConfig = {
            success: {
                styles: 'bg-green-500 text-white',
                text: `Uploaded ${uploadedCount} file${uploadedCount !== 1 ? 's' : ''}`
            },
            error: { styles: 'bg-red-500 text-white', text: 'Error' },
            exists: { styles: 'bg-yellow-500 text-white', text: 'File Exists' },
            uploading: { styles: 'bg-gray-400 text-white cursor-wait', text: 'Uploading...' },
            idle: {
                styles: 'bg-black text-white hover:bg-white hover:text-purple-500 hover:border-2 hover:border-purple-500 cursor-pointer',
                text: 'Upload'
            }
        };

        return {
            className: `${baseStyles} ${statusConfig[uploadStatus].styles}`,
            text: statusConfig[uploadStatus].text
        };
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
                            await processDbRequests(getUploadedFiles);
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
                        {getProcessedFileData.length > 0 && getExcelModal ? (
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
                        <div className="space-y-4">
                            {/**
                             * 🟢 all of the errors here are because we removed 
                             * getExcelTemplate or whatever. This is wrong as 
                             * we're processing just one file. We need to change 
                             * this modal so that it (1) checks to see how many 
                             * files are in array, (2), displays modal 1 for just one file, 
                             * and modal 2 for displaying previews of multiple files, 
                             * and with the click of the cursor being able to switch 
                             * to any one of them. 
                             */}
                            {getProcessedFileData.length === 1 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex gap-1 justify-center items-center">
                                            <div>Adding</div>
                                            <span>"{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.length > 30 ? `${getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.slice(0, 30)}...` : getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName}"</span>
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
                                    <div className="grid grid-cols-2">
                                        <div>
                                            <p className="text-xs text-gray-500">VENDOR NUMBER</p>
                                            <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">VENDOR NAME</p>
                                            <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName}</p>
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
                                                {getProcessedFileData[getCurrentExcelPage]?.processedData?.relevant_gls.map((gl: any, index: number) => (
                                                    <tr key={index}>
                                                        <td className="border p-2">{gl.description || null}</td>
                                                        <td className="border p-2 text-center font-semibold">{gl.gl_account || null}</td>
                                                        <td className="border p-2 text-center font-semibold">{gl.cost_centre || null}</td>
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
                                                    <td className="border p-2 font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.province}</td>
                                                    <td className="border p-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue}</td>
                                                    <td className="border p-2 text-gray-400">N/A</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">CURRENCY</p>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency === 'CAD'} readOnly />
                                                <span>CAD</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency === 'USD'} readOnly />
                                                <span>USD</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex gap-1 justify-center items-center">
                                            <div>Adding</div>
                                            <span>"{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.length > 30 ? `${getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.slice(0, 30)}...` : getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName}"</span>
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
                                    <div className="grid grid-cols-2">
                                        <div>
                                            <p className="text-xs text-gray-500">VENDOR NUMBER</p>
                                            <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">VENDOR NAME</p>
                                            <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName}</p>
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
                                                {getProcessedFileData[getCurrentExcelPage]?.processedData?.relevant_gls.map((gl: any, index: number) => (
                                                    <tr key={index}>
                                                        <td className="border p-2">{gl.description || null}</td>
                                                        <td className="border p-2 text-center font-semibold">{gl.gl_account || null}</td>
                                                        <td className="border p-2 text-center font-semibold">{gl.cost_centre || null}</td>
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
                                                    <td className="border p-2 font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.province}</td>
                                                    <td className="border p-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue}</td>
                                                    <td className="border p-2 text-gray-400">N/A</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">CURRENCY</p>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency === 'CAD'} readOnly />
                                                <span>CAD</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency === 'USD'} readOnly />
                                                <span>USD</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => { submitToFirebase(getProcessedFileData) }}
                                    disabled={uploadStatus !== 'idle'}
                                    className={getUploadBtnResponse().className}>
                                    {getUploadBtnResponse().text}
                                </button>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { navigateExcelPage("left") }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </button>
                                    <div>Page {getCurrentExcelPage + 1}</div>
                                    <button onClick={() => { navigateExcelPage("right") }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main >
    )
}