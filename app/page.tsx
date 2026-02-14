"use client";

import Image from 'next/image';
import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import TEST from '@/public/images/CLASSIC_TOWING-images-0.jpg';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Page() {

    return (
        <main data-section="whole page" className="bg-white text-black h-screen">
            <section data-section="fun buttons" className="p-8">
                <section className="flex gap-8">
                    <button onClick={() => null} className="border-2 w-80 h-80 rounded-xl flex justify-center items-center text-lg hover:bg-black/5 hover:shadow-md cursor-pointer">hi</button>
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