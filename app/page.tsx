"use client";

import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const downloadImage = async () => {
    const templateUrl = '/template/TEMPLATE_v2.pdf';  // Note: starts with /
    const response = await fetch(templateUrl);
    const blob = await response.blob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TEMPLATE_v2.pdf';
    link.click();

    URL.revokeObjectURL(url);
}

export default function Page() {
    return (
        <main data-section="whole page" className="bg-white text-black h-screen">
            <section data-section="fun buttons" className="p-8">
                <section className="flex gap-8">
                    <button>hi</button>
                </section>
            </section>
        </main>
    )
}