import { Dispatch, SetStateAction } from 'react';
import { handleExcelOver, handleExcelLeave, handleExcelDrop } from "@/app/handlers/excel-handler/processxlsx";
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations";

interface VendorModalProp {
    setShowVendorModal: Dispatch<SetStateAction<boolean>>,
    setIsDraggingExcel: Dispatch<SetStateAction<boolean>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setProcessedFileData: Dispatch<SetStateAction<any[]>>,
    setExcelModal: Dispatch<SetStateAction<boolean>>,
    getIsDraggingExcel: boolean
}

export default function VendorModal(
    {
        setShowVendorModal,
        setIsDraggingExcel,
        setNotifications,
        setProcessedFileData,
        setExcelModal,
        getIsDraggingExcel
    }: VendorModalProp) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div className="items-center hover:text-red-600 rounded-md hover:outline-2 hover:outline-red-600 cursor-pointer">
                        <svg
                            onClick={() => { setShowVendorModal(false) }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div className="text-xs text-neutral-500">Excel files only</div>
                    <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:outline-2 hover:outline-purple-500 transition-all cursor-pointer" onClick={() => { showNotification("Error", setNotifications, "This button hasn't been programmed yet", "error"); }}>Add</button>
                </div>
                <section
                    onDragOver={(e) => (handleExcelOver(e, setIsDraggingExcel))}
                    onDragLeave={(e) => (handleExcelLeave(e, setIsDraggingExcel))}
                    onDrop={(e) => (handleExcelDrop(e, setIsDraggingExcel, setNotifications, setProcessedFileData, setExcelModal, setShowVendorModal))}
                    className={`flex flex-1 justify-center items-center transition-all rounded-lg border-2 border-dashed text-neutral-300 ${getIsDraggingExcel ? 'border-purple-500 bg-purple-50 text-indigo-400' : 'bg-gray-100 border-gray-200'}`}>
                    <div className="flex flex-col items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="w-32 h-32">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    </div>
                </section>
            </div>
        </div>
    )
}