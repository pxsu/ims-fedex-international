"use client";

import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {
    return (
        <main data-section="whole page" className="bg-white text-black h-screen">
            <section data-section="fun buttons" className="p-8">
                <section className="flex gap-8">
                   <div>hi</div>
                </section>
            </section>
        </main>
    )
}