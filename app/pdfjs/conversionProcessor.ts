import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// * CONVERT PDF TO IMAGE
export const convertPdfToImage = async (base64Data: string): Promise<Blob> => {
    const pdfData = atob(base64Data.split(',')[1]);
    const pdfArray = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
        pdfArray[i] = pdfData.charCodeAt(i);
    }
    const pdf = await pdfjs.getDocument(pdfArray).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ 
        canvasContext: canvas.getContext('2d')!, 
        viewport,
        canvas
    }).promise;
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg');
    });
};

export const downloadBlob = (blob: Blob, fileName: string = 'page.jpg') => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
};