import dynamic from 'next/dynamic';
const Document = dynamic(() => import('react-pdf').then(m => m.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(m => m.Page), { ssr: false });
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Dispatch, SetStateAction } from 'react';
import { removeTemplate, handleTemplate } from "@/app/handlers/excel-handler/processxlsx";

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
            <div className="bg-white p-2 rounded-xl w-144 min-h-96 flex flex-col">
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
                <div className="flex flex-col h-full gap-2">
                    <div className="flex flex-col gap-4">
                        {getTemplate.length > 0 ? (
                            getTemplate.map((file: File, i: number) => (
                                <div key={i} className="bg-violet-200 outline-2 outline-violet-400 rounded-xl w-ful flex justify-between items-center h-12 py-2 px-4 ">
                                    <div className="flex gap-2">
                                        <div className="text-black">{file.name}</div>
                                    </div>
                                    <div onClick={() => removeTemplate(i, setTemplate)} className={`px-3 py-1 rounded-md cursor-pointer transition-all bg-red-400}`}>Remove</div>
                                </div>
                            ))
                        ) : (
                            <button onClick={() => { handleTemplate(getTemplate, setTemplate, setNotifications) }} className="bg-neutral-200 outline-2 outline-neutral-300 hover:outline-neutral-400 hover:text-black/60 text-black/40 rounded-xl w-full h-12 py-2 px-4 flex justify-center items-center cursor-pointer hover:text-black/40">Select Template</button>
                        )}
                        {getTemplate.length > 0 && getTemplate.map((file, i) => (
                            <div key={i} className="w-full flex justify-center items-center overflow-hidden rounded-lg">
                                <Document file={file.data}><Page pageNumber={1} width={500}></Page></Document>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}