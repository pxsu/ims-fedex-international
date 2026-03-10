import { Dispatch, SetStateAction } from 'react';
import { removeTemplate, selectTemplate, handleTemplate } from "@/app/handlers/excel-handler/processxlsx";
import { Notification } from "../notifications/notifcations";

interface TemplateModalProps {
    setShowTemplateModal: Dispatch<SetStateAction<boolean>>,
    setTemplate: Dispatch<SetStateAction<any[]>>,
    getTemplate: any[],
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
}
export default function TemplateModal(
    {
        setShowTemplateModal,
        setTemplate,
        getTemplate,
        setNotifications
    }: TemplateModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]">
            <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
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
                    <div className="flex flex-col gap-2">
                        {getTemplate.length > 0 ? (
                            getTemplate.map((file: File, i: number) => (
                                <>
                                    <span className="text-sm text-neutral-500 translate-y-1">Uploaded</span>
                                    <div key={i} className="bg-violet-200 text-indigo-600 border-2 border-indigo-400 rounded-xl py-2 w-full h-12 flex px-2.5 justify-between items-center">
                                        <div className="flex gap-2">
                                            <div>
                                                <button className="flex h-full items-center justify-center hover:text-red-600 cursor-pointer">
                                                    <svg
                                                        onClick={() => { removeTemplate(i, setTemplate) }}
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={2}
                                                        stroke="currentColor"
                                                        className="size-6">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <span>{file.name}</span>
                                        </div>
                                        <div onClick={() => selectTemplate(file, i, setTemplate)} className={`px-2 py rounded-md cursor-pointer transition-all ${getTemplate[i]?.selected ? 'bg-black text-white hover:bg-transparent hover:text-black hover:outline-2 hover:outline-black' : 'bg-black text-white hover:outline-2 hover:outline-black hover:text-black hover:bg-transparent'}`}>
                                            {getTemplate[i]?.selected ? 'Selected' : 'Select'}
                                        </div>
                                    </div>
                                </>
                            ))
                        ) : (
                            <div className="bg-neutral-200 outline-2 outline-neutral-300 text-neutral-400 rounded-xl py-2 w-full h-12 flex px-4 justify-left items-center">
                                No template selected
                            </div>
                        )}
                    </div>
                    <section onClick={() => { handleTemplate(getTemplate, setTemplate, setNotifications) }} className="flex flex-1 justify-center items-center transition-all rounded-lg">
                        <div className="bg-white rounded-xl py-2 w-full h-full flex justify-center items-center">
                            <span className="cursor-pointer hover:text-black/40 text-black">Select Template</span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}