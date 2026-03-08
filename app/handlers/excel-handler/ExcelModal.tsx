import { Dispatch, SetStateAction } from "react";
import { navigateExcelPage } from "./processxlsx";
import { submitToFirebase, getUploadBtnResponse } from "../server/server";
import { Notification } from "../notifications/notifcations";

interface ExcelProps {
    getProcessedFileData: any[],
    getCurrentExcelPage: number,
    navigateExcelPage: number,
    setCurrentExcelPage: Dispatch<SetStateAction<number>>,
    setExcelModal: Dispatch<SetStateAction<boolean>>,
    uploadStatus: 'idle' | 'uploading' | 'success' | 'error' | 'exists',
    setUploadStatus: Dispatch<SetStateAction<'idle' | 'uploading' | 'success' | 'error' | 'exists'>>,
    setSubmissionIndex: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setProcessedFileData: Dispatch<SetStateAction<any[]>>,
    getSubmissionIndex: any[],
}
export default function ExcelModal({
    getProcessedFileData,
    getCurrentExcelPage,
    setCurrentExcelPage,
    setExcelModal,
    uploadStatus,
    setUploadStatus,
    setSubmissionIndex,
    setNotifications,
    setProcessedFileData,
    getSubmissionIndex
}: ExcelProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]">
            <div className="fixed inset-0 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-xl w-144 min-h-96 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-1 justify-center items-center">
                                <div>Adding</div>
                                <span>"{(() => {
                                    const name = getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.values;
                                    return name?.length > 30 ? `${name.slice(0, 30)}...` : name;
                                })()}"</span>
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
                                <p className="text-xs text-gray-500">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpNumber.label}</p>
                                <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpNumber.values}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.label}</p>
                                <p className="font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.vendorEmpName.values}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.relevant_gls.label}</p>
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border p-2 text-left">DESCRIPTION / PURPOSE</th>
                                        <th className="border p-2 text-center">GL ACCOUNT</th>
                                        <th className="border p-2 text-center">COST CENTRE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getProcessedFileData[getCurrentExcelPage]?.processedData?.relevant_gls.values.map((gl: any, index: number) => (
                                        <tr key={index}>
                                            <td className="border p-2">{gl.columns.description.value || 'N/A'}</td>
                                            <td className="border p-2 text-center font-semibold">{gl.columns.gl_account.value || 'N/A'}</td>
                                            <td className="border p-2 text-center font-semibold">{gl.columns.cost_centre.value || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.label}</p>
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
                                        <td className="border p-2 font-semibold">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.province ?? 'N/A'}</td>
                                        <td className="border p-2">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.gstType ?? 'N/A'}</td>
                                        <td className="border p-2 text-gray-400">{getProcessedFileData[getCurrentExcelPage]?.processedData?.taxValue?.pstType ?? 'N/A'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">{getProcessedFileData[getCurrentExcelPage]?.processedData?.currency.label}</p>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency.values === 'CAD'} readOnly />
                                    <span>CAD</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="currency" checked={getProcessedFileData[getCurrentExcelPage]?.processedData?.currency.values === 'USD'} readOnly />
                                    <span>USD</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => { submitToFirebase(getProcessedFileData, "FedEx", setUploadStatus, setSubmissionIndex, setNotifications, setExcelModal, setProcessedFileData) }}
                                disabled={uploadStatus !== 'idle'}
                                className={getUploadBtnResponse(getSubmissionIndex, uploadStatus).className}>
                                {getUploadBtnResponse(getSubmissionIndex, uploadStatus).text}
                            </button>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { navigateExcelPage("left", getCurrentExcelPage, setCurrentExcelPage, getProcessedFileData) }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </button>
                                <div>Page {getCurrentExcelPage + 1}</div>
                                <button onClick={() => { navigateExcelPage("left", getCurrentExcelPage, setCurrentExcelPage, getProcessedFileData) }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}