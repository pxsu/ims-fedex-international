'use client';

import { Dispatch, SetStateAction } from 'react';
import { removeTemplate, handleTemplate } from "@/app/handlers/excel-handler/processxlsx";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

interface TemplateModalProps {
    setShowTemplateModal: Dispatch<SetStateAction<boolean>>,
    setTemplate: Dispatch<SetStateAction<any[]>>,
    getTemplate: any[],
    setNotifications: Dispatch<SetStateAction<any[]>>
}
export default function TemplateModal(
    {
        setShowTemplateModal,
        setTemplate,
        getTemplate,
        setNotifications
    }: TemplateModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000]">
            <div className="bg-white p-2 rounded-xl min-w-144 w-fit min-h-96 flex flex-col">
                <div className="flex mb-4">
                    <div className="flex justify-start items-center w-full">
                        <svg
                            onClick={() => { setShowTemplateModal(false) }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-6 h-6 hover:text-red-600 cursor-pointer">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </div>
                </div>
                <div className="flex flex-col h-full w-200">
                    <div className="flex flex-col gap-2 mb-2">
                        {getTemplate.length > 0 ? (
                            getTemplate.map((file: File, i: number) => (
                                <div key={i} className="bg-violet-200 outline-2 outline-violet-400 rounded-xl w-full flex justify-between items-center h-12 py-2 px-4 ">
                                    <div className="flex gap-2">
                                        <div className="text-black">{file.name}</div>
                                    </div>
                                    <div onClick={() => removeTemplate(i, setTemplate)} className="px-3 py-1 rounded-md cursor-pointer transition-all">Remove</div>
                                </div>
                            ))
                        ) : (
                            <button onClick={() => { handleTemplate(getTemplate, setTemplate, setNotifications) }} className="bg-neutral-200 outline-2 outline-neutral-300 hover:outline-neutral-400 hover:text-black/60 text-black/40 rounded-xl w-full h-12 py-2 px-4 flex justify-center items-center cursor-pointer hover:text-black/40">Select Template</button>
                        )}
                        {getTemplate.length > 0 && getTemplate.map((file, i) => (
                            <div key={i}>
                                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js" >
                                    <Viewer fileUrl={file.data} defaultScale={0.8}/>
                                </Worker>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}