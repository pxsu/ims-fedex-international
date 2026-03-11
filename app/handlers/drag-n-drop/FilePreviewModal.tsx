import { Dispatch, SetStateAction } from 'react';
import { generateTemplateSheet } from "@/app/handlers/excel-handler/processxlsx";
import { learnAlias } from "@/app/handlers/smart-query/query";
import { Notification } from "../notifications/notifcations";

interface FilePreviewModalProps {
    getUploadedFiles: any[],
    getIsSelected: number[],
    getPreviewState: 'loading' | 'idle',
    setFilePreview: Dispatch<SetStateAction<boolean>>,
    setIsSelected: Dispatch<SetStateAction<number[]>>,
    setPreviewState: Dispatch<SetStateAction<"loading" | "idle">>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    getTemplate: any[],
    items: {
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null;
    }[],
    setResolveModal: Dispatch<SetStateAction<boolean>>,
    setActiveIndex: Dispatch<SetStateAction<number>>,
}
export default function FilePreviewModal(
    {
        getUploadedFiles,
        getIsSelected,
        getPreviewState,
        setFilePreview,
        setIsSelected,
        setPreviewState,
        setNotifications,
        setUploadedFiles,
        getTemplate,
        items,
        setResolveModal,
        setActiveIndex
    }: FilePreviewModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="flex flex-col items-center gap-4">
                {(() => {
                    const file = getUploadedFiles[getIsSelected[0]];
                    if (!file) return null;
                    const isAutoResolved = file.resolution?.status === 'AUTO_RESOLVED' && file.state === 'file_object';
                    const isNeedsResolution = file.resolution?.status === 'NEEDS_RESOLUTION' && file.state === 'file_object';
                    const isManualResolved = file.resolution?.status === 'MANUAL_RESOLVED' && file.state === 'file_object';
                    return (
                        <>
                            <div>
                                <div className="flex flex-col items-center h-[90vh] min-w-[480px] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
                                    {isAutoResolved && getPreviewState === 'idle' && (
                                        <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                            <span className="text-white/70 text-sm font-medium tracking-wide">{file.processedData["vendor_name"]}</span>
                                            <button
                                                onClick={() => { setFilePreview(false); setIsSelected([]); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                                Close
                                            </button>
                                        </div>
                                    )}
                                    {isManualResolved && getPreviewState === 'idle' && (
                                        <>
                                            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                <span className="text-white/70 text-sm font-medium tracking-wide">{file.processedData["vendor_name"]}</span>
                                                <button
                                                    onClick={() => { setFilePreview(false); setIsSelected([]); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/50 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                    Close
                                                </button>
                                            </div>
                                            <div data-section="Generate" className="w-full p-4 h-full bg-white">
                                                <div className="bg-white p-8 rounded-xl w-144 min-h-96 max-h-[80vh] overflow-y-auto"></div>
                                            </div>
                                        </>
                                    )}
                                    {isNeedsResolution && getPreviewState === 'idle' && (
                                        <>
                                            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 fill-amber-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                                </svg>
                                                <span className="text-white text-sm font-medium tracking-wide">{`"${file.processedData["vendor_name"]}"`}</span>
                                                <button
                                                    onClick={() => { setFilePreview(false); setIsSelected([]); }}
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
                                                {file.resolution?.candidates?.map((candidate: any, i: number) => (
                                                    <div key={i} onClick={() => {
                                                        setPreviewState('loading');
                                                        learnAlias(
                                                            setNotifications,
                                                            setUploadedFiles,
                                                            setPreviewState,
                                                            setResolveModal,
                                                            setActiveIndex,
                                                            {
                                                                companyId: "FedEx",
                                                                parentId: candidate.vendorId,
                                                                rawInput: file.resolution.rawInput,
                                                                confidence: candidate.score,
                                                                invoiceFile: file.unProcessedData,
                                                                processedData: file.processedData,
                                                                index: getIsSelected[0],
                                                            }
                                                        );
                                                        generateTemplateSheet(file, getTemplate, setNotifications);
                                                    }} className="flex justify-center bg-neutral-600 rounded-md px-2 py-4 outline-2 outline-neutral-500 cursor-pointer hover:bg-green-300 hover:outline-green-400 hover:text-green-800 transition-all">
                                                        {candidate.canonicalName}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {isNeedsResolution && getPreviewState === 'loading' && (
                                        <>
                                            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 fill-amber-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                                </svg>
                                                <span className="text-white text-sm font-medium tracking-wide">{`Loading...`}</span>
                                            </div>
                                            <div className="flex w-full h-full justify-center items-center">
                                                <div className="animate-spin rounded-full w-32 h-32 border-[3px] border-gray-200 border-t-indigo-400" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {items.map(({ label, position, parent }) => (
                                    <div className="w-[180px]">
                                        {parent ? (
                                            <div className="flex gap-2 justify-center items-center flex-1 py-3 rounded-xl border border-indigo-400/50 bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-all cursor-pointer gap-0.5">
                                                <span className="font-semibold text-sm">{position}</span>
                                                <span className="font-semibold text-sm">{label.length > 15 ? `${label.slice(0, 15)}...` : label}</span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 justify-center items-center flex-1 py-3 rounded-xl bg-white/15 border border-white/10 text-white/70 text-xs font-medium transition-all cursor-pointer gap-0.5">
                                                <span className="font-semibold text-sm">{position}</span>
                                                <span className="font-semibold text-sm">{label.length > 15 ? `${label.slice(0, 15)}...` : label}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    )
}