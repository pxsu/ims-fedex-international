import { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { Notification, showNotification } from '../handlers/notifications/notifcations';
import { clearDrop, processSelection } from '@/app/handlers/drag-n-drop/dragDrop';

export default function MultipleFileModal({
    setMultiFileState,
    file,
    fileUint8,
    setNotifications,
    setIsFileSelected,
    setSelectedFile,
    getIsFileSelected,
    setMultiFileModal,
    setMultiFile,
    setMultiFileUint8,
    setSelectedFiles,
    getSelectedFiles,
    getUploadedFiles,
    setUploadedFiles,
    getMultiFileUint8
}: {
    setMultiFileState: Dispatch<SetStateAction<boolean>>;
    file: any[] | null;
    fileUint8: Uint8Array[] | null;
    setNotifications: Dispatch<SetStateAction<Notification[]>>;
    setIsFileSelected: Dispatch<SetStateAction<number[]>>;
    setSelectedFile: Dispatch<SetStateAction<number>>;
    getIsFileSelected: number[];
    setMultiFileModal: Dispatch<SetStateAction<boolean>>,
    setMultiFile: Dispatch<SetStateAction<any[] | null>>,
    setMultiFileUint8: Dispatch<SetStateAction<Uint8Array[] | null>>,
    setSelectedFiles: Dispatch<SetStateAction<Uint8Array[]>>,
    getSelectedFiles: Uint8Array[],
    getUploadedFiles: any[],
    setUploadedFiles: Dispatch<SetStateAction<any[]>>
    getMultiFileUint8: Uint8Array[],
}) {
    const [pageUrls, setPageUrls] = useState<string[]>([]);
    useEffect(() => {
        if (!fileUint8) return;
        const urls = fileUint8.map(page => {
            const blob = new Blob([new Uint8Array(page.buffer as ArrayBuffer)], { type: 'application/pdf' });
            return URL.createObjectURL(blob);
        });
        setPageUrls(urls);
    }, [fileUint8]);
    return (
        <section className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-[1000]">
            <div className='flex flex-col w-full px-6'>
                <div className='w-full flex flex-col justify-center items-center'>
                    <nav className='absolute top-0 left-0 flex items-center justify-around w-full py-4 px-6'>
                        <div className="flex justify-between items-center w-full text-white">
                            <svg
                                onClick={() => { setMultiFileState(false); clearDrop(setMultiFileModal, setMultiFile, setMultiFileUint8, setIsFileSelected, setSelectedFile) }}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-7 h-7 hover:text-red-400 cursor-pointer rounded-md">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                            <span className="absolute select-none inset-x-0 top-1 flex justify-center items-start pointer-events-none p-2 py-4">{getIsFileSelected.length} selected {getIsFileSelected.length > 0 && `| ${getIsFileSelected.join(', ')}`}</span>
                            <div className='flex items-center gap-6'>
                                {/** HAS NOT BEEN MADE YET: <span className="cursor-pointer hover:text-indigo-400">Select All</span> */}
                                <span
                                    onClick={() => { if (getIsFileSelected.length > 0) processSelection(pageUrls, getIsFileSelected, setPageUrls, setIsFileSelected, getUploadedFiles, setUploadedFiles, setNotifications, getMultiFileUint8, setMultiFileModal) }}
                                    className={`p-2 px-4 rounded-lg outline-1 outline-indigo-600 transition-all ${getIsFileSelected.length > 0 ? 'cursor-pointer bg-indigo-400/80 hover:bg-indigo-400/40' : 'cursor-not-allowed bg-indigo-400/20 text-white/30'}`}>
                                    Submit
                                </span>
                            </div>
                        </div>
                    </nav>
                    <div className='h-screen overflow-hidden py-16 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'>
                        <div className='flex py-2 grid grid-cols-3 gap-4 px-4'>
                            {pageUrls && (
                                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                                    {pageUrls.map((url, index) => (
                                        <div
                                            key={index}
                                            className={`w-78 shrink-0 rounded-sm cursor-pointer p-1 ${getIsFileSelected.includes(index)
                                                ? 'outline-4 outline outline-orange-400'
                                                : 'hover:outline-4 hover:outline hover:outline-orange-400'
                                                }`}
                                            onClick={() => { setIsFileSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); }}>
                                            <Viewer fileUrl={url} defaultScale={0.5} />
                                        </div>
                                    ))}
                                </Worker>
                            )}
                        </div>
                    </div>
                </div>
                <div className='absolute bottom-10 right-10 flex w-full justify-end translate-y-4 rounded-xl text-white items-center gap-2 z-[200]'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    <span>Select files to process together or by itself</span>
                </div>
            </div>
        </section>
    )
}

// plugins={[defaultLayoutPluginInstance]}
{/**
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer fileUrl={} initialPage={0} defaultScale={SpecialZoomLevel.PageFit}></Viewer>
    </Worker>
*/}