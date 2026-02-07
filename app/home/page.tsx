/**
 * ? ISSUES:
 * * 1. NextJS reports that "DOMMatrix is not defined." This is only early in testing,
 * * all we have to do is move that component over to an independent component. 
 */

'use client';

import { useRef, useState, useMemo } from "react";
import { Document, Page as PDFPage, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {
    {/* SELECT FILE --> READ FILE */ }
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [getSelectedFile, setSelectedFile] = useState<File | null>(null);
    const [getFileContent, setFileContent] = useState<string>("");

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


    /**
     * ! -----------------------------------------------------
     */


    {/* READ FILE --> DISPLAY FILE */ }
    const [getPageNumber, setPageNumber] = useState<number>(0);

    {/* ZOOM FUNCTIONALITY */ }
    const [getZoom, setZoom] = useState<number>(1.0);

    {/* FLICKER WHEN ZOOMING FIX */ }
    const pageDisplayed = useMemo(() => {
        return Array.from(new Array(getPageNumber), (_, index) => (
            <PDFPage key={index} pageNumber={index + 1} scale={getZoom} loading="eager" />
        ))
    }, [getZoom])

    return (
        <main data-section="PARENT" className="relative h-screen bg-neutral-200 overflow-hidden">
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
                        {`${Math.round(getZoom * 100)}%`}
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
                     * TODO: (3) --> introduce PAGE NUMBERING
                     * TODO: (4) --> introduce ROTATION
                     */
                }
                {getSelectedFile ? (
                    <>
                        <section
                            className="overflow-hidden text-black flex flex-col items-center justify-center"
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
                        </section>
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