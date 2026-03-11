'use client';

// Drag n' Drop
import { handleDragOver, handleDragLeave, handleDrop, clearUploadedFiles, setDownloadData, setDownloadDataAll } from "@/app/handlers/drag-n-drop/dragDrop";
import FilePreviewModal from "./handlers/drag-n-drop/FilePreviewModal";

// Excel Handler
import ExcelModal from "./handlers/excel-handler/ExcelModal";
import TemplateModal from "./handlers/excel-handler/TemplateModal";
import VendorModal from "./handlers/drag-n-drop/VendorModal";

// Notifications
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations";
import NotificationComponent from '@/app/handlers/notifications/Notification';

// React
import { useState, useEffect } from "react";

// DND - Sortable content
import { getBundleStatus } from "./utilities/bundle-sorter";
import InsertModal from "@/app/utilities/InsertModal";

// Learning algorithm
import { learnAlias } from "@/app/handlers/smart-query/query";

export default function Page() {

    // global notification system
    const [getNotifications, setNotifications] = useState<Notification[]>([]);

    // DRAG / DROP FUNCTIONALITY
    const [isDragging, setIsDragging] = useState(false);
    const [getIsDraggingExcel, setIsDraggingExcel] = useState(false);
    const [getUploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [getResolveModal, setResolveModal] = useState<boolean>(false);

    // Template states
    const [getTemplate, setTemplate] = useState<any[]>([]);
    const [getShowTemplateModal, setShowTemplateModal] = useState(false);

    // processed data / excel modal states
    const [getProcessedFileData, setProcessedFileData] = useState<any[]>([]);
    const [getExcelModal, setExcelModal] = useState(false);
    const [getCurrentExcelPage, setCurrentExcelPage] = useState(0);

    // submission index states
    const [getSubmissionIndex, setSubmissionIndex] = useState<any[]>([]);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'exists'>('idle');
    const [getCanvasState, setCanvasState] = useState<'idle' | 'loading'>('idle');
    const [getCurrentDownloadIndex, setCurrentDownloadIndex] = useState(0);

    // SELECTION ALGO
    const [getIsSelected, setIsSelected] = useState<number[]>([]);
    const [getActiveIndex, setActiveIndex] = useState(0);
    const [getFilePreview, setFilePreview] = useState(false);
    const [getPreviewIndex, setPreviewIndex] = useState<number | null>(null);
    const [getPreviewState, setPreviewState] = useState<'loading' | 'idle'>('idle');
    const [getResolveState, setResolveState] = useState<'loading' | 'idle'>('idle');
    const [getInsertModal, setInsertModal] = useState(false)
    const [items, setItems] = useState<{
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null; // ! BASE64 ITEM
    }[]>([
        { position: '1', id: '1', label: 'Invoice', parent: true, size: 0, content: null },
        { position: '2', id: '2', label: 'Cover Sheet', parent: true, size: 0, content: null },
    ]);

    // DOWNLOAD MODAL
    const [getShowDownloadModal, setShowDownloadModal] = useState(false);

    // ADD VENDOR MODAL
    const [getShowVendorModal, setShowVendorModal] = useState(false);

    // DB SELECTION
    const [getSetDbLock, setSetDbLock] = useState(true);
    const [getDbSelection, setDbSelection] = useState(false);
    const MAX_VISIBLE = 5;

    // Save memory after browser refresh
    useEffect(() => {
        const savedFiles = sessionStorage.getItem('uploadedFiles');
        const savedBundle = sessionStorage.getItem('savedBundle');
        if (savedFiles) {
            const parsed = JSON.parse(savedFiles);
            const restored = parsed.map((file: any) => {
                if (file?.finalDownload?.fileBlob && typeof file.finalDownload.fileBlob === 'string') {
                    const base64Data = file.finalDownload.fileBlob.replace(/^data:application\/pdf;base64,/, '');
                    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    return {
                        ...file,
                        finalDownload: {
                            ...file.finalDownload,
                            fileBlob: blob
                        }
                    };
                }
                return file;
            });
            setUploadedFiles(restored);
        }
        if (savedBundle) { setItems(JSON.parse(savedBundle)); }
    }, []);

    // Save template to browser storage
    useEffect(() => {
        const saved = sessionStorage.getItem('pdfTemplates');
        if (saved) setTemplate(JSON.parse(saved));
    }, []);

    // Reset dragover/drop after a drag event
    useEffect(() => {
        const prevent = (e: DragEvent) => e.preventDefault();
        window.addEventListener('dragover', prevent);
        window.addEventListener('drop', prevent);
        return () => {
            window.removeEventListener('dragover', prevent);
            window.removeEventListener('drop', prevent);
        };
    }, []);

    // locks page from being scrollable when a modal is present
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

    return (
        <>
            <main data-section="whole page" className="bg-white text-black h-screen flex flex-col">
                {getExcelModal && (
                    <ExcelModal
                        getProcessedFileData={getProcessedFileData}
                        getCurrentExcelPage={getCurrentExcelPage}
                        setExcelModal={setExcelModal}
                        navigateExcelPage={getCurrentExcelPage}
                        setCurrentExcelPage={setCurrentExcelPage}
                        uploadStatus={uploadStatus}
                        setUploadStatus={setUploadStatus}
                        setSubmissionIndex={setSubmissionIndex}
                        setProcessedFileData={setProcessedFileData}
                        setNotifications={setNotifications}
                        getSubmissionIndex={getSubmissionIndex}
                    />
                )}
                <NotificationComponent notifications={getNotifications} onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
                {getShowTemplateModal && (<TemplateModal setShowTemplateModal={setShowTemplateModal} setTemplate={setTemplate} getTemplate={getTemplate} setNotifications={setNotifications} />)}
                {getShowVendorModal && (
                    <VendorModal setShowVendorModal={setShowVendorModal} setIsDraggingExcel={setIsDraggingExcel} setNotifications={setNotifications} setProcessedFileData={setProcessedFileData} setExcelModal={setExcelModal} getIsDraggingExcel={getIsDraggingExcel} />
                )}
                {getFilePreview && getPreviewIndex !== null && (
                    <FilePreviewModal
                        getUploadedFiles={getUploadedFiles}
                        getIsSelected={getIsSelected}
                        getPreviewState={getPreviewState}
                        setFilePreview={setFilePreview}
                        setIsSelected={setIsSelected}
                        setPreviewState={setPreviewState}
                        setNotifications={setNotifications}
                        setUploadedFiles={setUploadedFiles}
                        getTemplate={getTemplate}
                        items={items}
                    />
                )}
                {getInsertModal && (
                    <InsertModal
                        setInsertModal={setInsertModal}
                        setNotifications={setNotifications}
                        items={items}
                        setItems={setItems}
                    />
                )}
                {getResolveModal && getResolveState === 'idle' ? (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]">
                        <div className="flex flex-col items-center h-[90vh] w-[480px] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 fill-amber-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <span className="text-white text-sm font-medium tracking-wide">{`"${getUploadedFiles[getIsSelected[0]]?.processedData?.["vendor_name"] ?? "Unknown Vendor"}"`}</span>
                                <button
                                    onClick={() => { setResolveModal(false); setIsSelected([]); setActiveIndex(0); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="text-neutral-400 text-sm w-full px-4 mt-4">
                                <span>Who is the correct vendor?</span>
                            </div>
                            <div className="flex flex-col text-neutral-300 w-full px-4 py-4 gap-3">
                                {getUploadedFiles[getActiveIndex]?.resolution?.candidates?.map((candidate: any, i: number) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            learnAlias(
                                                setNotifications,
                                                setUploadedFiles,
                                                setResolveState,
                                                setResolveModal,
                                                setActiveIndex,
                                                {
                                                    companyId: "FedEx",
                                                    parentId: candidate.vendorId,
                                                    rawInput: getUploadedFiles[getActiveIndex].resolution.rawInput,
                                                    confidence: candidate.score,
                                                    invoiceFile: getUploadedFiles[getActiveIndex].unProcessedData,
                                                    processedData: getUploadedFiles[getActiveIndex].processedData,
                                                    index: getActiveIndex,
                                                });
                                        }}
                                        className="flex justify-center bg-neutral-600 rounded-md px-2 py-4 outline-2 outline-neutral-500 cursor-pointer hover:bg-green-300 hover:outline-green-400 hover:text-green-800 transition-all">
                                        <div className="w-full flex justify-around items-center gap-2">
                                            <span className="text-left flex-1">{candidate.canonicalName}</span>
                                            <span className="text-white/50">{(candidate.score * 100).toFixed(1)}% likely</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : getResolveModal && getResolveState === 'loading' && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]">
                        <div className="flex flex-col items-center h-[90vh] w-[480px] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 fill-amber-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <span className="text-white text-sm font-medium tracking-wide">{`Loading...`}</span>
                            </div>
                            <div className="flex w-full h-full justify-center items-center">
                                <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                            </div>
                        </div>
                    </div>
                )}
                <div className="relative">
                    <nav className="select-none flex gap-2 justify-between bg-white p-2 px-8 items-center h-14">
                        <div className="w-4 h-full">
                            <button onClick={() => window.location.href = '/'} className="text-[24px] font-bold text-black hover:text-transparent hover:text-[28px] hover:[-webkit-text-stroke:1px_rgb(51.1_0.262_276.96)] transition-all cursor-pointer">ims</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { null }} className="hidden bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-indigo-700 hover:outline-2 hover:outline-indigo-500 transition-all cursor-pointer">Get Uploaded</button>
                        </div>
                    </nav>
                    <nav className="absolute select-none inset-x-0 top-1 flex justify-center items-start pointer-events-none pt-2">
                        <div className="flex flex-col">
                            {getDbSelection ? (
                                <>
                                    <div onClick={() => setDbSelection(prev => !prev)} className="pointer-events-auto flex gap-1 items-center py-1 px-3 rounded-xl cursor-pointer transition-all outline-2 outline-black bg-black text-white">
                                        <div className="flex flex-col gap-2 w-128">
                                            <div className="flex gap-2 items-center justify-center p-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                </svg>
                                                <span>FedEx</span>
                                            </div>
                                            <span className="text-sm text-white block text-center">List of available databases</span>
                                            <div className="flex flex-col gap-1">
                                                {MAX_VISIBLE && (
                                                    <div className="mb-1 bg-white py-2 px-4 rounded-lg hover:bg-indigo-400 cursor-pointer">
                                                        <div className="flex justify-between items-center">
                                                            <div className="text-md text-black">FedEx</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div onClick={() => setDbSelection(prev => !prev)} className={`pointer-events-auto flex gap-1 items-center py-1 px-3 rounded-xl cursor-pointer transition-all ${getSetDbLock ? 'outline-2 outline-indigo-500 bg-indigo-200 text-indigo-700' : 'outline-2 outline-gray-300 bg-gray-100 text-gray-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                        <span>FedEx</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
                <section
                    onDragOver={(e) => handleDragOver(e, setIsDragging)}
                    onDragLeave={(e) => handleDragLeave(e, setIsDragging)}
                    onDrop={(e) => handleDrop(e, getUploadedFiles, setUploadedFiles, setNotifications, setIsDragging)}
                    className={`flex justify-center items-center h-3/4 transition-all border-y-2 border-gray-100 text-neutral-300 ${isDragging ? 'border-purple-500 bg-purple-50 text-indigo-400' : 'bg-neutral-200'}`}>
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
                                    const isSelected = getIsSelected.includes(index);
                                    const baseClass = `bg-white flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 h-52 shrink-0 overflow-hidden cursor-pointer hover:outline-2 hover:outline-indigo-400 ${isSelected ? 'outline-2 outline-indigo-400' : ''}`;
                                    const needAttention = `bg-white flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 h-52 shrink-0 overflow-hidden cursor-pointer hover:outline-2 hover:outline-amber-400 ${isSelected ? 'outline-2 outline-amber-400' : ''}`;
                                    const downloadClass = `bg-white flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 h-52 shrink-0 overflow-hidden cursor-pointer hover:outline-2 hover:outline-green-400 ${isSelected ? 'outline-2 outline-green-400' : ''}`;
                                    if (file.state === "skeleton") {
                                        return (
                                            <div className={baseClass} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setActiveIndex(index); }}>
                                                <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                                                <div className="flex flex-col items-left w-full gap-1">
                                                    <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded"></div>
                                                    <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded"></div>
                                                </div>
                                            </div>
                                        );
                                    } else if (file.resolution?.status === 'AUTO_RESOLVED' && file.state === 'file_object') {
                                        return (
                                            <div className={downloadClass} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setActiveIndex(index); }}>
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="flex flex-col">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-emerald-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                        </svg>
                                                        <button onClick={() => { setDownloadData(file, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, items, true) }} className="text-emerald-500 hover:text-emerald-400 gap-1 hover:underline cursor-pointer transition-colors duration-150">download?</button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-left w-full">
                                                    <span className="text-emerald-900 truncate w-full text-[10px] sm:text-xs md:text-sm font-medium">{file.vendorData?.canonicalName}</span>
                                                    <div className="flex gap-1">
                                                        <span className="text-emerald-600/60 text-[10px] sm:text-xs md:text-sm">{size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (file.resolution?.status === 'NEEDS_RESOLUTION' && file.state === 'file_object') {
                                        return (
                                            <div className={needAttention} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setActiveIndex(index); }}>
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="flex flex-col text-black">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-amber-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                                        </svg>
                                                        <button onClick={() => { setResolveModal(true) }} className="text-amber-400 gap-1 hover:underline cursor-pointer">Resolve?</button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-left w-full">
                                                    <span className="text-gray-700 truncate w-full text-[10px] sm:text-xs md:text-sm">{`${file.processedData["vendor_name"]}`}</span>
                                                    <div className="flex gap-1">
                                                        <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm">{size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (file.resolution?.status === 'MANUAL_RESOLVED' && file.state === 'file_object') {
                                        return (
                                            <div className={downloadClass} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setActiveIndex(index); }}>
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="flex flex-col">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-emerald-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                        </svg>
                                                        <button onClick={() => { setDownloadData(file, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, items, true) }} className="text-emerald-500 hover:text-emerald-400 gap-1 hover:underline cursor-pointer transition-colors duration-150">download?</button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-left w-full">
                                                    <span className="text-emerald-900 truncate w-full text-[10px] sm:text-xs md:text-sm font-medium">{file.vendorData?.canonicalName}</span>
                                                    <div className="flex gap-1">
                                                        <span className="text-emerald-600/60 text-[10px] sm:text-xs md:text-sm">{size}</span>
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
                <section data-section="Queue array" className="p-8 flex-1">
                    <div className="flex-1 flex items-center justify-center -translate-y-6 text-black gap-2">
                        <span>{`${getUploadedFiles.length} files added`}</span>
                        <span>|</span>
                        <button
                            onClick={() => { clearUploadedFiles(setUploadedFiles, setProcessedFileData, setIsSelected, setActiveIndex) }}
                            className="text-black cursor-pointer">
                            <div className="flex items-center hover:text-red-400">
                                <span>clear</span>
                            </div>
                        </button>
                    </div>
                    <div data-section='FUN BUTTONS' className="flex justify-between">
                        <div className="flex gap-4">
                            <button onClick={() => { showNotification("System", setNotifications, 'Button is not programmed yet', "error"); }} className="hidden transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-transparent hover:outline-2 hover:outline-black h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                PDF to Image
                            </button>
                            <button onClick={() => { setShowVendorModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-transparent hover:outline-2 hover:outline-black h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                                </svg>
                                Add Vendor
                            </button>
                            {(() => {
                                const nonParentItems = items.filter(i => !i.parent);
                                const hasUnsaved = nonParentItems.some(i => getBundleStatus(i) === 'not saved');
                                const hasSaved = nonParentItems.some(i => getBundleStatus(i) === 'saved');
                                return hasUnsaved ? (
                                    <div className="flex flex-col justify-center items-center bg-amber-200 outline-2 outline-amber-400 rounded-xl">
                                        <button onClick={() => { setInsertModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                            <div className="flex gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                                </svg>
                                                <span>Set Bundle</span>
                                            </div>
                                        </button>
                                        <div>unsaved</div>
                                    </div>
                                ) : hasSaved ? (
                                    <div className="flex flex-col justify-center items-center bg-green-200 outline-2 outline-green-400 rounded-xl">
                                        <button onClick={() => { setInsertModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                            <div className="flex gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                                </svg>
                                                <span>Set Bundle</span>
                                            </div>
                                        </button>
                                        <div>saved</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center rounded-xl">
                                        <button onClick={() => { setInsertModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                            <div className="flex gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                                </svg>
                                                <span>Set Bundle</span>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })()}
                            <div className="flex flex-col justify-center items-center bg-neutral-200 outline-2 outline-neutral-400 rounded-xl">
                                <button onClick={() => { setShowTemplateModal(true) }} className="transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-white hover:outline-2 hover:outline-black h-14 z-50">
                                    <div className="flex gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                        <span>Choose Template</span>
                                    </div>
                                </button>
                                <div>{getTemplate[0] ? (getTemplate[0].name.length > 10 ? `${getTemplate[0].name.slice(0, 10).toLowerCase()}...` : getTemplate[0].name.toLowerCase()) : 'select template'}</div>
                            </div>
                        </div>
                        {getUploadedFiles.length > 0 ? (
                            <button onClick={() => setDownloadDataAll(getUploadedFiles, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, getIsSelected, items)} className="transition-all p-3 px-6 text-white rounded-xl cursor-pointer bg-orange-400 hover:text-orange-400 hover:outline-orange-400 hover:bg-transparent hover:outline-2 h-14">Download All</button>
                        ) : (
                            <button disabled className="hidden transition-all p-3 px-6 h-14 text-white rounded-xl cursor-not-allowed bg-indigo-200 opacity-50">Download All</button>
                        )}
                    </div>
                </section>
                <section className="text-black w-full bg-neutral-900 h-6 flex justify-center items-center text-white text-sm">version 1.1</section>
            </main>
        </>
    )
}