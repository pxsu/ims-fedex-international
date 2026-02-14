"use client";

import Image from 'next/image';
import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useState, useRef } from 'react';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {
    const [getSelectedFile, setSelectedFile] = useState<File | null>(null);
    const [getFileContent, setFileContent] = useState<string>("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const A01 = () => {
        fileInputRef.current?.click();
    }
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
        <main data-section="whole page" className="bg-white text-black h-screen">
            <section className='bg-neutral-200 p-4 flex justify-center'>
                <button
                    onClick={A01}
                    className='hover:underline cursor-pointer'>
                    select file
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={A02} />
            </section>
            <section data-section="fun buttons" className="p-8">
                <section className="flex gap-8">
                    <div onClick={() => null} className="border-2 w-80 h-80 rounded-xl flex flex-col justify-center items-left px-8 text-lg hover:bg-black/5 hover:shadow-md cursor-pointer">
                        <div>{getSelectedFile?.name || ''}</div>
                        <div>{((getSelectedFile?.size || 0) / 1024).toFixed(1)} KB</div>
                    </div>
                </section>
            </section>
        </main>
    )
}
