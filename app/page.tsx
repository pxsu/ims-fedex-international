'use client';

import { useState, useRef, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { getDoc, setDoc, doc } from 'firebase/firestore';
import { db } from "@/firebase"
import { Transition } from '@headlessui/react';
import { PDFDocument } from 'pdf-lib';

import { useInvoiceProcessor } from '@/app/pdfjs/documentProcessor';
import { convertPdfToImage, downloadBlob } from '@/app/pdfjs/conversionProcessor';

{/* REQUIREMENT: GLOBAL WORKER */ }
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
                return 'bg-green-400 border-2 border-black';
            case 'error':
                return 'bg-red-400 border-2 border-black';
            case 'warning':
                return 'bg-orange-300 border-2 border-black ';
            case 'info':
                return 'bg-black/40 border-2 border-black';
            default:
                return 'bg-black/40 border-2 border-black';
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
        // * FEATURES: TYPE VALIDATION -- SIZE LIMIT GAURD -- REHYDRATION
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        // * (1) PROCESSOR
        if (files && files.length > 0) {
            const MAX_SIZE_MB = 10;
            const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
            try {
                const filesArray = Array.from(files);
                const invalidFile = filesArray.find(f => f.type !== 'application/pdf') ?? filesArray.find(f => f.size > MAX_SIZE_BYTES);
                if (invalidFile) {
                    const message = invalidFile.type !== 'application/pdf' ? `${invalidFile.name} is not a PDF` : `${invalidFile.name} exceeds ${MAX_SIZE_MB}MB limit`;
                    showNotification("Error", message, "error");
                } else {
                    Array.from(files).map(async (file) => {
                        const index = await renderSkeleton(file);
                        try {
                            await handleFiles(file, index)
                            await renderCoverSheet(index)
                        } catch (err) {
                            showNotification("Error", `Could not render ${files.length} file${files.length > 1 ? 's' : ''}`, "info");
                        }
                    })
                }
            } catch (err) {
                showNotification("Error", "Something went wrong uploading your files", "error");
            }
        }
    }
    const renderSkeleton = async (file: File) => {
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
    const handleFiles = async (file: File, index: number) => {
        const base64 = await convertFileToBase64(file);
        let processedData;
        try {
            processedData = await processDbRequests(base64);
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
    }
    const renderCoverSheet = async (index: number) => {
        // * INPUT: index number to add new variable holding pdf base64 data
        // * OUTPUT: coverSheetData: base64

        let vendorData;
        const inputData = new Map();
        try {
            // TODO: get the appropriate vendor data
            try {
                // TODO: const searchName = smartQuery(getUploadedFiles[index])
                await smartQuery(getUploadedFiles[index].processedData["vendor_name"])
            } catch (err) {
                console.log(err);
            }
        } catch (err) {
            console.log(err);
        }

        // TODO: const coverSheetData = newPdf(inputData);
        const fileData = {
            // TODO: coverSheetData: coverSheetData
        }
        setUploadedFiles(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...fileData };
            sessionStorage.setItem('uploadedFiles', JSON.stringify(updated));
            return updated;
        })
    }
    const runTest = async (data: any) => {
        console.log(`Now searching for ${data.processedData["vendor_name"]}`)
        smartQuery(data.processedData["vendor_name"]);
    }
    const smartQuery = async (inputQuery: string) => {
        console.log("i work")
        
        const question = query(collection(db, "vendor_data"), where("vendorEmpName", "==", inputQuery));
        console.log(question)

        const snapshot = await getDocs(question);

        snapshot.forEach((doc) => {
            console.log('hi')
            console.log(doc.id, doc.data());
        });
    }
    const newPdf = () => {
        null
    }
    const fillPdfField = async (fieldMap: Map<string, { key: string | number; value: string }>): Promise<Uint8Array> => {
        const arrayBuffer = await getCiaTemplate.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();
        form.getTextField(String(fieldMap.get('vendor_number')?.key ?? '')).setText(String(fieldMap.get('vendor_number')?.value ?? ''));
        form.getTextField(String(fieldMap.get('vendor_name')?.key ?? '')).setText(String(fieldMap.get('vendor_name')?.value ?? ''));
        form.getTextField(String(fieldMap.get('date')?.key ?? '')).setText(String(fieldMap.get('date')?.value ?? ''));
        form.getTextField(String(fieldMap.get('invoice_number')?.key ?? '')).setText(String(fieldMap.get('invoice_number')?.value ?? ''));
        form.getTextField(String(fieldMap.get('po_number')?.key ?? '')).setText(String(fieldMap.get('po_number')?.value ?? ''));
        form.getTextField(String(fieldMap.get('province')?.key ?? '')).setText(String(fieldMap.get('province')?.value ?? ''));
        form.getTextField(String(fieldMap.get('currency_selection')?.key ?? '')).setText(String(fieldMap.get('currency_selection')?.value ?? ''));
        form.getTextField(String(fieldMap.get('approval_date')?.key ?? '')).setText(String(fieldMap.get('approval_date')?.value ?? ''));
        fieldMap.forEach((index, value) => {
            if (typeof index === 'number') {
                Object.entries(value).forEach(([id, obj]: [string, any]) => {
                    //* mental example
                    const description = id
                    const value = fieldMap.get(obj)?.key
                    const field = fieldMap.get(obj)?.value
                    form.getTextField(String(value)).setText(String(field));
                });
            }
        });
        form.getTextField(String(fieldMap.get('subtotal')?.key ?? '')).setText(String(fieldMap.get('subtotal')?.value ?? ''));
        form.getTextField(String(fieldMap.get('taxValue')?.key ?? '')).setText(String(fieldMap.get('taxValue')?.value ?? ''));
        if (fieldMap.has('secTaxValue')) {
            form.getTextField(String(fieldMap.get('secTaxValue')?.key ?? '')).setText(String(fieldMap.get('secTaxValue')?.value ?? ''));
        }
        form.getTextField(String(fieldMap.get('totalAmount')?.key ?? '')).setText(String(fieldMap.get('totalAmount')?.value ?? ''));
        form.flatten();
        const pdfBytes = await pdfDoc.save();
        return pdfBytes
    }
    const processInvoice = async (base64: string) => {
        console.log(`BASE64 DATA: ${base64}`)
        const pdfData = atob(base64.split(',')[1]);
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map((item: any) => item.str).join(' '));
        }
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
                    content:
                        `Extract from this invoice text. Return ONLY JSON, no explanation:
                        { 
                            "vendor_name": "", 
                            "invoice_number": "", 
                            "invoice_date": "", 
                            "po_number": "", 
                            "subtotal": "", 
                            "province", ""
                        }
                        Invoice text: ${pages.join('\n')}`
                }]
            })
        });
        const data = await res.json();
        const cleanJson = data.choices[0].message.content.replace(/```json\n?|```\n?/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        return parsedData;
    };
    const processDbRequests = async (data: any) => {
        const processedInvoiceMap = new Map<string, any>();
        let gptInfo;
        try {
            gptInfo = await processInvoice(data);
            processedInvoiceMap.set("vendor_name", gptInfo.vendor_name || "missing");
            processedInvoiceMap.set("invoice_number", gptInfo.invoice_number || "missing");
            processedInvoiceMap.set("invoice_date", gptInfo.invoice_date || "missing");
            processedInvoiceMap.set("po_number", gptInfo.po_number || "missing");
            processedInvoiceMap.set("subtotal", gptInfo.subtotal || "missing");
            processedInvoiceMap.set("province", gptInfo.province || "missing");
            return processedInvoiceMap;
        } catch (err) {
            showNotification("System", `Could not process file`, "info");
            throw err;
        }
    }
    const downloadQueue = (queue: any[]) => {
        null
    }
    const clearUploadedFiles = () => {
        setUploadedFiles([]);
        sessionStorage.removeItem('uploadedFiles');
    };
    useEffect(() => {
        const saved = sessionStorage.getItem('uploadedFiles');
        if (saved) {
            setUploadedFiles(JSON.parse(saved));
        }
    }, []);
    const [getCanvasState, setCanvasState] = useState<'idle' | 'loading'>('idle');

    // * FILL PDF FIELD
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
    const [getDownloadData, setDownloadData] = useState<any[]>([]);
    const [getShowDownloadModal, setShowDownloadModal] = useState(false);
    const [getCurrentDownloadIndex, setCurrentDownloadIndex] = useState(0);
    const [getShowProcessModal, setShowProcessModal] = useState(false);

    const downloadFiles = async (files: any[]) => {
        const mergedPdf = await PDFDocument.create();
        for (const file of files) {
            setCurrentDownloadIndex(prev => prev + 1)
            const pdf = await PDFDocument.load(file);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        const mergedBytes = await mergedPdf.save();
        const blob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged.pdf';
        a.click();
        URL.revokeObjectURL(url);

        setTimeout(() => {
            setDownloadData([]);
            setCurrentDownloadIndex(0);
            setShowDownloadModal(false);
        }, 1500);
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


    // * CONSOLE COMMANDS
    useEffect(() => {
        (window as any).dev = {
            setCanvasStateLoading: () => setCanvasState('loading'),
            setCanvasStateIdle: () => setCanvasState('idle'),
        };
    }, [getCanvasState]);


    return (
        <main data-section="whole page" className="bg-white text-black h-screen flex flex-col">

            <nav className="flex gap-2 justify-between bg-neutral-100 p-2 px-8 items-center h-14">
                <button
                    onClick={() => window.location.href = '/'}
                    className="text-[24px] font-bold text-black hover:text-transparent hover:text-[28px] hover:[-webkit-text-stroke:1px_rgb(51.1_0.262_276.96)] transition-all cursor-pointer">
                    ims
                </button>
                <div className="flex gap-2 items-center">
                    <button onClick={() => { runTest(getUploadedFiles[0]) }} className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:border-2 hover:border-purple-500 transition-all cursor-pointer">runTest</button>
                </div>
            </nav>

            <section
                data-section="drag and drop area"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex justify-center items-center h-3/4 transition-all border-y-2 border-gray-100 text-neutral-300 ${isDragging ? 'border-purple-500 bg-purple-50 text-indigo-400' : 'bg-gray-200'}`}>
                <div className="flex flex-col justify-between h-full w-full">
                    <div className="flex justify-center items-center gap-2 h-full">
                        <div className="px-6 py-3 rounded-lg flex items-center gap-2 flex flex-col">
                            {getCanvasState === 'idle' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="w-32 h-32">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            ) : (
                                <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                            )}
                        </div>
                    </div>
                    <div className="flex justify-center items-center text-green-600 w-full p-4">
                        <div className="flex gap-4 w-3/4 mx-auto overflow-x-auto overflow-y-hidden p-4">
                            {getUploadedFiles.map((file, index) => {
                                const bytes = file.size || 0;
                                const size = bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1024 * 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
                                if (file.state === "skeleton") {
                                    return (
                                        <div className="bg-gray-100 flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 h-52 shrink-0 overflow-hidden hover:outline-2 hover:outline-indigo-400 cursor-pointer" key={index}>
                                            <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                                            <div className="flex flex-col items-left w-full gap-1">
                                                <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded"></div>
                                                <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded"></div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="bg-gray-100 flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 h-52 shrink-0 overflow-hidden hover:outline-2 hover:outline-indigo-400 cursor-pointer" key={index}>
                                            <div className="flex-1 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-gray-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col items-left w-full">
                                                <span className="text-gray-700 truncate w-full text-[10px] sm:text-xs md:text-sm">{file.processedData["vendor_name"]}</span>
                                                <div className="flex gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                    </svg>
                                                    <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm">{size}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <section data-section="file queue array" className="p-8 flex-1">
                <div className="flex-1 flex items-center justify-center -translate-y-6 text-black/40 gap-2">
                    <span>{`${getUploadedFiles.length} files added`}</span>
                    <span>|</span>
                    <button
                        onClick={clearUploadedFiles}
                        className="text-black/40 cursor-pointer">
                        <div className="flex items-center hover:text-red-400">
                            <span>clear</span>
                        </div>
                    </button>
                </div>
                <div className="flex justify-between">
                    <button className="bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-transparent hover:outline-2 hover:outline-black">PDF to Image</button>
                    {getUploadedFiles.length > 0 ? (
                        <button onClick={() => downloadQueue(getUploadedFiles)} className="bg-indigo-500 p-3 px-6 text-white rounded-xl cursor-pointer hover:text-indigo-500 hover:bg-transparent hover:outline-2 hover:outline-indigo-500">Download</button>
                    ) : (
                        <button disabled className="bg-indigo-200 p-3 px-6 text-white rounded-xl cursor-not-allowed opacity-50">Download</button>
                    )}
                </div>
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


            {getShowDownloadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div className="items-center hover:text-red-600 rounded-md hover:outline-2 hover:outline-red-600 cursor-pointer">
                                <svg
                                    onClick={() => setShowDownloadModal(false)}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:outline-2 hover:outline-purple-500 transition-all cursor-pointer" onClick={() => { downloadFiles(getDownloadData); setShowDownloadModal(true) }}>download</button>
                        </div>
                        <div className="flex flex-1 flex-col justify-center">
                            <div className="flex justify-center items-center">
                                <div>{`Download ${getDownloadData.length} files?`}</div>
                            </div>
                            <div className="flex justify-center items-center">{`${getCurrentDownloadIndex} out of ${getDownloadData.length} processed`}</div>
                        </div>
                    </div>
                </div>
            )}


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