"use client";

import Image from 'next/image';
import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import TEST from '@/public/images/CLASSIC_TOWING-images-0.jpg';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {
    const convertPdfToImage = async () => {
        // Step 1: Fetch the PDF file
        const response = await fetch('@/public/images/TEMPLATE_v2.pdf');
        const arrayBuffer = await response.arrayBuffer();

        // Step 2: Convert to base64
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        const base64Data = `data:application/pdf;base64,${base64}`;

        // Step 3: Convert to image using pdf.js
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const pdfData = atob(base64Data.split(',')[1]);
        const pdfArray = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) {
            pdfArray[i] = pdfData.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument(pdfArray).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: canvas.getContext('2d')!,
            viewport
        }).promise;

        // Step 4: Download as image
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob!);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'TEMPLATE_v2.jpg';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg');
    };

    return (
        <main data-section="whole page" className="bg-white text-black h-screen">
            <section data-section="fun buttons" className="p-8">
                <section className="flex gap-8">
                    <button onClick={() => convertPdfToImage()} className="border-2 w-80 h-80 rounded-xl flex justify-center items-center text-lg hover:bg-black/5 hover:shadow-md cursor-pointer">hi</button>
                    <div className="border-2 w-80 h-80 rounded-xl flex justify-center items-center text-lg hover:bg-black/5 hover:shadow-md cursor-pointer">
                        <Image
                            src={TEST}
                            alt=""
                            width={230}
                            height={300}
                        />
                    </div>
                </section>
            </section>
        </main>
    )
}