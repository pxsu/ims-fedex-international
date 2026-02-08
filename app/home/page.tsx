/**
 * ? ISSUES:
 * * 1. NextJS reports that "DOMMatrix is not defined." This is only early in testing,
 * * all we have to do is move that component over to an independent component. 
 */

'use client';

import { useRef, useState, useEffect } from "react";
import { Document, Page as PDFPage, pdfjs } from "react-pdf";
import Split from "@uiw/react-split";
import { useForm } from 'react-hook-form';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {
    {/* SELECT FILE --> READ FILE */ }
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [getSelectedFile, setSelectedFile] = useState<File | null>(null);
    const [getFileContent, setFileContent] = useState<string>("");
    const [getPageNumber, setPageNumber] = useState<number>(0);
    const [getZoom, setZoom] = useState<number>(1.0);
    const { register, handleSubmit } = useForm();

    /**
     * ! IMPORTANT
     * * Primary function that handes the file click, event. 
     */
    const A01 = () => {
        fileInputRef.current?.click();
    }

    /**
     * ! IMPORTANT
     * * Helps build the "onChange" so it doesn't become messy
     */
    const A02 = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file)
        const reader = new FileReader();
        if (file) {
            reader.onload = (e) => setFileContent(e.target?.result as string);
            reader.readAsDataURL(file)
        }
        setSelectedFile(file);
    }

    return (
        <main data-section="PARENT" className="relative h-screen bg-neutral-900 overflow-hidden">
            {/* Choose file */}
            <nav className="relative sticky top-0 z-1000 w-full">
                <div className="flex justify-between p-4 px-4 bg-neutral-700">
                    <div className="">
                        <span>logo</span>
                    </div>
                    <div>
                        <button onClick={A01} className="cursor-pointer hover:underline">drop/select a file here</button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={A02} />
                    </div>
                    <div>
                        <span>profile</span>
                    </div>
                </div>
                <div className="flex justify-center gap-2 p-2 bg-neutral-800">
                    <button
                        onClick={() => setZoom(getZoom + 0.1)}
                        className="hover:underline p-1 px-2 bg-neutral-200 rounded-md text-black">
                        zoom +
                    </button>
                    <div className="p-1 px-2 bg-neutral-200 rounded-md text-black">
                        {`Z: ${Math.round(getZoom * 100)}%`}
                    </div>
                    <button
                        onClick={() => setZoom(getZoom - 0.1)}
                        className="hover:underline p-1 px-2 bg-neutral-200 rounded-md text-black">
                        zoom -
                    </button>
                </div>
            </nav>
            <section className="h-screen overflow-y-auto">
                {
                    /** 
                     * TODO: (1) --> redesign VISUALS
                     * TODO: (2) --> introduce SCROLL ✓
                     */
                }
                {getSelectedFile ? (
                    <>
                        <Split
                            className="flex"
                            style={{ height: '100%' }}
                            renderBar={({ onMouseDown, ...props }) => (
                                <div
                                    {...props}
                                    onMouseDown={onMouseDown}
                                    className="flex items-center justify-center w-1 bg-neutral-700"
                                    style={{ width: 8, cursor: 'col-resize' }}
                                >
                                    {/* Optional: Add icon/dots */}
                                    <div className="flex flex-col gap-1">
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                    </div>
                                </div>
                            )}
                        >
                            <div
                                data-section='RENDERER'
                                style={{ width: '50%', minWidth: 30 }}
                                className="text-black w-full flex flex-col items-center h-screen overflow-hidden overflow-y-scroll"
                            >
                                <Document
                                    file={getFileContent}
                                    className={"flex flex-col gap-2"}
                                    onLoadSuccess={({ numPages }) => setPageNumber(numPages)}>
                                    {
                                        Array.from(new Array(getPageNumber), (_, index) => (
                                            <PDFPage key={index} pageNumber={index + 1} scale={getZoom} />
                                        ))
                                    }
                                </Document>
                            </div>
                            <div
                                style={{ width: '50%', minWidth: 30 }}
                                data-section='EDITOR'
                                className="w-full h-screen bg-neutral-900 flex flex-col h-screen overflow-hidden overflow-y-scroll mt-4 px-12"
                            >
                                <h1 className="font-bold text-[24px]">Canadian Invoice Approval</h1>
                                {/* HEADER */}
                                <div data-section="HEADER" className="space-y-4 overflow-y-scroll">
                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="vendorEmpNum" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            VENDOR/EMP #
                                        </label>
                                        <input {...register('vendorEmpNum', { required: 'required' })}
                                            placeholder="Enter vendor/employee number"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="date" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            DATE
                                        </label>
                                        <input {...register('date', { required: 'required' })}
                                            type="date"
                                            placeholder="mm/dd/yyyy"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="vendorEmpName" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            VENDOR/EMP NAME
                                        </label>
                                        <input {...register('vendorEmpName', { required: 'required' })}
                                            placeholder="Enter vendor/employee name"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="invoiceNum" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            INVOICE #
                                        </label>
                                        <input {...register('invoiceNum', { required: 'required' })}
                                            placeholder="Enter invoice number"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* BODY */}
                                <div data-section="BODY" className="space-y-4 mt-4">
                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="vendorOutsideLabor" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            VENDOR OUTSIDE LABOR
                                        </label>
                                        <input {...register('vendorOutsideLabor')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="vendorSuppliedParts" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            VENDOR SUPPLIED PARTS
                                        </label>
                                        <input {...register('vendorSuppliedParts')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="fedexParts" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            FEDEX PARTS
                                        </label>
                                        <input {...register('fedexParts')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="fedexAccidentDamage" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            FEDEX ACCIDENT DAMAGE
                                        </label>
                                        <input {...register('fedexAccidentDamage')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="rentalAccidentDamage" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            RENTAL ACCIDENT DAMAGE
                                        </label>
                                        <input {...register('rentalAccidentDamage')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="gseParts" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            GSE PARTS
                                        </label>
                                        <input {...register('gseParts')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="gseLabor" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            GSE LABOR
                                        </label>
                                        <input {...register('gseLabor')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="vehicleTires" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            VEHICLE TIRES
                                        </label>
                                        <input {...register('vehicleTires')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="bodyMaintenance" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            BODY MAINTENANCE
                                        </label>
                                        <input {...register('bodyMaintenance')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="shopSupplies" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            SHOP SUPPLIES
                                        </label>
                                        <input {...register('shopSupplies')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="towing" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            TOWING
                                        </label>
                                        <input {...register('towing')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="defFluid" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            DEF FLUID
                                        </label>
                                        <input {...register('defFluid')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="environmental" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            ENVIRONMENTAL
                                        </label>
                                        <input {...register('environmental')}
                                            placeholder="GL Account / Cost Centre / Amount"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div data-section="FOOTER" className="space-y-4 mt-4">
                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="province" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            SELECT PROVINCE
                                        </label>
                                        <select {...register('province', { required: 'required' })}
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                                        >
                                            <option value="">Select province</option>
                                            <option value="ON">ON</option>
                                            <option value="BC">BC</option>
                                            <option value="AB">AB</option>
                                            <option value="SK">SK</option>
                                            <option value="MB">MB</option>
                                            <option value="QC">QC</option>
                                            <option value="NB">NB</option>
                                            <option value="NS">NS</option>
                                            <option value="PE">PE</option>
                                            <option value="NL">NL</option>
                                            <option value="YT">YT</option>
                                            <option value="NT">NT</option>
                                            <option value="NU">NU</option>
                                        </select>
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="poNumber" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            PO #
                                        </label>
                                        <input {...register('poNumber')}
                                            placeholder="Enter PO number"
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                                        />
                                    </div>

                                    <div data-section="INPUT-ITEM">
                                        <label htmlFor="currency" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                                            CURRENCY
                                        </label>
                                        <select {...register('currency', { required: 'required' })}
                                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                                        >
                                            <option value="">Select currency</option>
                                            <option value="CAD">CAD</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </Split>
                    </>
                ) : (
                    <>
                        <section className="text-black flex justify-center items-center h-screen">
                            <p>nothing selected, yet</p>
                        </section>
                    </>
                )}
            </section>
        </main>
    );
}