'use client';

// Drag n' Drop
import { handleDragOver, handleDragLeave, handleDrop, clearUploadedFiles, setDownloadData, setDownloadDataAll, removeFile } from "@/app/handlers/drag-n-drop/dragDrop";
import FilePreviewModal from "./handlers/drag-n-drop/FilePreviewModal";
import { updateBrowserStorage } from "./handlers/server/server";

// Excel Handler
import ExcelModal from "./handlers/excel-handler/ExcelModal";
import dynamic from 'next/dynamic';
const TemplateModal = dynamic(
    () => import('./handlers/excel-handler/TemplateModal'),
    { ssr: false }
);
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

// Utilities 
import { buildSelection } from '@/app/handlers/server/server';
import MultipleFileModal from "@/app/utilities/multipleFileModal";
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function Page() {

    // Zoom function for resolve modal 
    const zoomPluginInstance = zoomPlugin();
    const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

    // Resolution vendor list
    const [getVendorList, setVendorList] = useState<any[]>([]);
    const [getIsLoading, setIsLoading] = useState<boolean>(false);

    // global notification system
    const [getNotifications, setNotifications] = useState<Notification[]>([]);

    // DRAG / DROP FUNCTIONALITY
    const [isDragging, setIsDragging] = useState(false);
    const [getIsDraggingExcel, setIsDraggingExcel] = useState(false);
    const [getUploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [getResolveModal, setResolveModal] = useState<boolean>(false);
    const [getMultiFileModal, setMultiFileModal] = useState<boolean>(false);
    const [getMultiFile, setMultiFile] = useState<any[] | null>(null);
    const [getMultiFileUint8, setMultiFileUint8] = useState<Uint8Array[] | null>(null);
    const [getIsFileSelected, setIsFileSelected] = useState<number[]>([]);
    const [getSelectedFile, setSelectedFile] = useState<number>(0);
    const [getSelectedFiles, setSelectedFiles] = useState<Uint8Array[]>([]);

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
        updateBrowserStorage(setUploadedFiles, setItems);
        setMultiFileModal(false);
        setMultiFile([]);
        setMultiFileUint8([])
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
                        setResolveModal={setResolveModal}
                        setActiveIndex={setActiveIndex}
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
                {getMultiFileModal && getMultiFileUint8 && (
                    <MultipleFileModal
                        setMultiFileState={setMultiFileModal}
                        file={getMultiFile}
                        fileUint8={getMultiFileUint8}
                        setNotifications={setNotifications}
                        setIsFileSelected={setIsFileSelected}
                        setSelectedFile={setSelectedFile}
                        getIsFileSelected={getIsFileSelected}
                        setMultiFileModal={setMultiFileModal}
                        setMultiFile={setMultiFile}
                        setMultiFileUint8={setMultiFileUint8}
                        setSelectedFiles={setSelectedFiles}
                        getSelectedFiles={getSelectedFiles}
                        getUploadedFiles={getUploadedFiles}
                        setUploadedFiles={setUploadedFiles}
                        getMultiFileUint8={getMultiFileUint8}
                    />
                )}
                {getResolveModal && getResolveState === 'idle' ? (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]">
                        <div className="flex flex-col items-center h-[90vh] w-[90vw] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 fill-amber-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <span className="text-white text-sm font-medium tracking-wide">{`"${getUploadedFiles[getIsSelected[0]]?.processedData?.["vendor_name"] ?? "Unknown Vendor"}"`}</span>
                                <button
                                    onClick={() => { setResolveModal(false); setIsSelected([]); setActiveIndex(0); setVendorList([]) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex w-full overflow-hidden h-full">
                                <div className="flex-1 min-w-[520px] h-full">
                                    <div className="flex flex-col items-center h-full bg-white">
                                        {getUploadedFiles[getActiveIndex]?.unProcessedData && (
                                            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                                                <div className="h-[70px]"></div>
                                                <Viewer fileUrl={getUploadedFiles[getActiveIndex].unProcessedData} defaultScale={SpecialZoomLevel.PageFit} plugins={[zoomPluginInstance]} />
                                            </Worker>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col min-w-[480px] h-full gap-4">
                                    <div className="w-full h-full">
                                        <div className="text-neutral-400 text-sm w-full px-4 mt-4">
                                            <span>Top five possibilities</span>
                                        </div>
                                        <div className="flex flex-col text-neutral-300 bg w-full px-4 py-4 gap-3 h-full">
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
                                                    className="flex justify-center bg-neutral-600 rounded-md px-4 py-4 outline-2 outline-neutral-500 cursor-pointer hover:bg-green-300 hover:outline-green-400 hover:text-green-800 transition-all">
                                                    <div className="w-full flex justify-around items-center gap-2">
                                                        <span className="text-left flex-1">{candidate.canonicalName}</span>
                                                        <span className="text-white/50">{(candidate.score * 100).toFixed(1)}% likely</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative w-full h-[500px] border border-neutral-700 flex flex-col h-screen overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full z-20 text-neutral-400 text-sm px-4 py-3 bg-neutral-900/60 backdrop-blur-lg">
                                            <span>Other</span>
                                        </div>
                                        <div className="flex-1 flex flex-col text-neutral-300 px-4 pt-14 pb-4 gap-3 overflow-y-auto">
                                            {getIsLoading ? (
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="animate-spin rounded-full w-8 h-8 border-[3px] border-neutral-600 border-t-neutral-300" />
                                                </div>
                                            ) : getVendorList.length > 0 ? getVendorList.map((vendor, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => {
                                                        learnAlias(
                                                            setNotifications,
                                                            setUploadedFiles,
                                                            setResolveState,
                                                            setResolveModal,
                                                            setActiveIndex,
                                                            {
                                                                companyId: "FedEx",
                                                                parentId: vendor,
                                                                rawInput: getUploadedFiles[getActiveIndex].resolution.rawInput,
                                                                confidence: 100,
                                                                invoiceFile: getUploadedFiles[getActiveIndex].unProcessedData,
                                                                processedData: getUploadedFiles[getActiveIndex].processedData,
                                                                index: getActiveIndex,
                                                            });
                                                    }}
                                                    className="flex justify-center rounded-md px-4 min-h-[34px] outline-1 outline-neutral-500 cursor-pointer hover:bg-indigo-300 hover:outline-indigo-400 hover:text-indigo-800 transition-all">
                                                    <div className="w-full flex justify-around items-center gap-2">
                                                        <span className="text-left flex-1">{vendor}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex justify-center bg-neutral-600 rounded-md px-4 min-h-[64px] outline-2 outline-neutral-500">
                                                    <div className="w-full flex justify-around items-center gap-2">
                                                        <span className="text-left flex-1">Could not retrieve list</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
                        <div className="w-full h-full">
                            <button onClick={() => window.location.href = '/'} className="flex items-center gap-1 text-[24px] font-bold text-black hover:text-transparent hover:text-[28px] hover:[-webkit-text-stroke:1px_rgb(51.1_0.262_276.96)] transition-all cursor-pointer">
                                <img src="/favicon.ico" className="w-5 h-5" />
                                <span>ims</span>
                            </button>
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
                                    <div onClick={() => setDbSelection(prev => !prev)} className={`pointer-events-auto flex gap-1 items-center py-1 px-3 rounded-xl cursor-pointer transition-all ${getSetDbLock ? ' bg-indigo-200 text-indigo-700' : 'outline-2 outline-gray-300 bg-gray-100 text-gray-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
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
                    onDrop={(e) => handleDrop(e, getUploadedFiles, setUploadedFiles, setNotifications, setIsDragging, setMultiFileModal, setMultiFile, setMultiFileUint8, getMultiFileModal)}
                    className={`flex justify-center items-center h-3/4 transition-all border-y-4 border-gray-200 text-neutral-300 ${isDragging ? 'border-indigo-400 bg-purple-50 text-indigo-400' : 'bg-zinc-50'}`}>
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
                        <div className="w-full shrink-0 h-60 overflow-hidden">
                            <div className="flex gap-4 w-3/4 mx-auto overflow-x-auto overflow-y-hidden p-4 [mask-image:linear-gradient(to_right,black_95%,transparent)]">
                                {getUploadedFiles.map((file, index) => {
                                    const bytes = file.size || 0;
                                    const size = bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1024 * 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
                                    const isSelected = getIsSelected.includes(index);
                                    const baseClass = `bg-white outline-3 outline-gray-200 flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 min-h-52 shrink-0 overflow-hidden`;
                                    const needAttention = `bg-white outline-3 outline-gray-200 flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 min-h-52 shrink-0 overflow-hidden`;
                                    const downloadClass = `bg-white outline-3 outline-gray-200 flex flex-col justify-between items-center rounded-xl text-sm p-2 gap-3 w-40 min-h-52 shrink-0 overflow-hidden`;
                                    const deleteBtn = `size-6 text-red-400 hover:text-white hover:bg-red-300 rounded-xl cursor-pointer`;
                                    if (file.state === "skeleton") {
                                        return (
                                            <div className={baseClass} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setActiveIndex(index); }}>
                                                <div className="flex w-full items-center justify-end">
                                                    <svg onClick={() => { }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`disabled ${deleteBtn}`}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="flex flex-col">
                                                        <div className="animate-spin rounded-full w-16 h-16 border-[3px] border-gray-200 border-t-indigo-400" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-left w-full gap-1">
                                                    <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded" />
                                                    <div className="text-gray-400 text-[10px] sm:text-xs md:text-sm animate-pulse w-full bg-neutral-200 h-5 rounded" />
                                                </div>
                                            </div>
                                        );
                                    } else if (file.resolution?.status === 'AUTO_RESOLVED' && file.state === 'file_object') {
                                        return (
                                            <div className={downloadClass} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setActiveIndex(index); }}>
                                                <div className="flex w-full items-center justify-end">
                                                    <svg onClick={() => { removeFile(setUploadedFiles, setNotifications, index); }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`${deleteBtn}`}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="flex flex-col">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="0.5" stroke="currentColor" className="w-20 h-20 text-emerald-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m9 13.5 3 3m0 0 3-3m-3 3v-6m1.06-4.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                                                        </svg>
                                                        <button onClick={() => { setDownloadData(file, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, setActiveIndex, items, true) }} className="text-emerald-500 -translate-y-2 hover:text-emerald-400 gap-1 hover:underline cursor-pointer transition-colors duration-150">Download</button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-left w-full">
                                                    <span className="text-gray-600 truncate w-full text-[10px] sm:text-xs md:text-sm font-medium">{file.vendorData?.canonicalName}</span>
                                                    <div className="flex gap-1">
                                                        <span className="text-gray-500 text-[10px] sm:text-xs md:text-sm">{size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (file.resolution?.status === 'NEEDS_RESOLUTION' && file.state === 'file_object') {
                                        return (
                                            <div className={needAttention} key={index} onClick={() => { setIsSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); setActiveIndex(index); }}>
                                                <div className="flex w-full items-center justify-end">
                                                    <svg onClick={() => { removeFile(setUploadedFiles, setNotifications, index); }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`${deleteBtn}`}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="flex flex-col text-black">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-amber-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                                        </svg>
                                                        <button onClick={() => { setResolveModal(true); buildSelection("FedEx", setVendorList, setIsLoading); }} className="text-amber-400 gap-1 hover:underline cursor-pointer -translate-y-2">Resolve</button>
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
                                                <div className="flex w-full items-center justify-end">
                                                    <svg onClick={() => { removeFile(setUploadedFiles, setNotifications, index); }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`${deleteBtn}`}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="flex flex-col">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="0.5" stroke="currentColor" className="w-20 h-20 text-emerald-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m9 13.5 3 3m0 0 3-3m-3 3v-6m1.06-4.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                                                        </svg>
                                                        <button onClick={() => { setDownloadData(file, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, setActiveIndex, items, true) }} className="text-emerald-500 -translate-y-2 hover:text-emerald-400 gap-1 hover:underline cursor-pointer transition-colors duration-150">Download</button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-left w-full">
                                                    <span className="text-gray-600 truncate w-full text-[10px] sm:text-xs md:text-sm font-medium">{file.vendorData?.canonicalName}</span>
                                                    <div className="flex gap-1">
                                                        <span className="text-gray-500 text-[10px] sm:text-xs md:text-sm">{size}</span>
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
                <section className="p-8 flex-1">
                    <div className="flex-1 flex items-center justify-center -translate-y-6 text-gray-600 gap-2 select-none">
                        <span>{`${getUploadedFiles.length} files added`}</span>
                        <span className="text-gray-600">|</span>
                        <button
                            onClick={() => { clearUploadedFiles(setUploadedFiles, setProcessedFileData, setIsSelected, setActiveIndex) }}
                            className="text-black cursor-pointer">
                            <div className="flex text-gray-600 items-center hover:text-red-400">
                                <span>clear all</span>
                            </div>
                        </button>
                    </div>
                    <div data-section='FUN BUTTONS' className="flex justify-between">
                        <div className="flex gap-4">
                            <button onClick={() => { showNotification("System", setNotifications, 'Button is not programmed yet', "error"); }} className="hidden transition-all flex items-center gap-2 bg-black p-3 px-6 rounded-xl cursor-pointer text-white hover:text-black hover:bg-transparent hover:outline-2 hover:outline-black h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                <span>PDF to Image</span>
                            </button>
                            <button onClick={() => { setShowVendorModal(true) }} className="transition-all flex items-center gap-2 bg-black/75 p-3 px-6 rounded-[50px] cursor-pointer text-neutral-100 hover:text-indigo-600 hover:bg-indigo-200 hover:outline-2 hover:outline-indigo-600 h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                                </svg>
                                <span>Add Vendor</span>
                            </button>
                            <button onClick={() => { setInsertModal(true) }} className="transition-all flex items-center gap-2 bg-black/75 p-3 px-6 rounded-[50px] cursor-pointer text-neutral-100 hover:text-indigo-600 hover:bg-indigo-200 hover:outline-2 hover:outline-indigo-600 h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                </svg>
                                <span>Set Bundle</span>
                            </button>
                            <button onClick={() => { setShowTemplateModal(true) }} className="transition-all flex items-center gap-2 bg-black/75 p-3 px-6 rounded-[50px] cursor-pointer text-neutral-100 hover:text-indigo-600 hover:bg-indigo-200 hover:outline-2 hover:outline-indigo-600 h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={getTemplate.length > 0 ? "w-5 h-5 text-green-300 drop-shadow-[0_0_6px_#4ade80]" : "w-5 h-5 text-neutral-100"}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                <span>Choose Template</span>
                            </button>
                        </div>
                        {/** DISABLED BECAUSE FORM FIELDS MERGED TOGETHER CAUSE ISSUES
                         * {getUploadedFiles.length > 0 && getUploadedFiles[0].processedData ? (
                            <button disabled onClick={() => setDownloadDataAll(getUploadedFiles, getTemplate, setNotifications, setUploadedFiles, setIsSelected, getActiveIndex, getIsSelected, setActiveIndex, items)} className="transition-all p-3 px-6 text-neutral-100 rounded-[50px] cursor-pointer bg-orange-400 hover:text-orange-600 hover:outline-orange-600 hover:bg-orange-300 hover:outline-2 h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </button>
                        ) : (
                            <button disabled className="hidden text-neutral-100 transition-all p-3 px-6 text-white rounded-[50px] cursor-pointer bg-orange-400 hover:text-orange-400 hover:outline-orange-400 hover:bg-transparent hover:outline-2 h-14">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </button>
                        )}
                         */}
                    </div>
                </section>
                <section className="text-black w-full bg-neutral-900 h-6 flex justify-center items-center text-white text-sm gap-1">
                    <span>version 2</span>
                </section>
            </main>
        </>
    )
}