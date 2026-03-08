import { Dispatch, SetStateAction } from 'react';
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations";

interface DownloadModalProps {
    setShowDownloadModal: Dispatch<SetStateAction<boolean>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    getCurrentDownloadIndex: number,
    getDownloadData: any[],
}
export default function DownloadModal({ setShowDownloadModal, getDownloadData, getCurrentDownloadIndex, setNotifications }: DownloadModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
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
                    <button className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-purple-500 hover:outline-2 hover:outline-purple-500 transition-all cursor-pointer" onClick={() => { showNotification('System', setNotifications, 'Not programmed in yet', 'info') }}>download</button>
                </div>
                <div className="flex flex-1 flex-col justify-center">
                    <div className="flex justify-center items-center">
                        <div>{`Download ${getDownloadData.length} files?`}</div>
                    </div>
                    <div className="flex justify-center items-center">{`${getCurrentDownloadIndex} out of ${getDownloadData.length} processed`}</div>
                </div>
            </div>
        </div>
    )
}