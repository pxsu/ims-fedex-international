import { useState } from 'react';
import { pdfjs } from "react-pdf";

{/* REQUIREMENT: GLOBAL WORKER */ }
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// * CHATGPT API CALL
export const useInvoiceProcessor = () => {
    const [getGptData, setGptData] = useState<any>(null);
    const processInvoice = async (base64: string) => {
        const pdfData = atob(base64.split(',')[1]);
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map((item: any) => item.str).join(' '));
        }
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `Extract from this invoice text. Return ONLY JSON, no explanation:
                        { "vendor_name": "", "invoice_number": "", "invoice_date": "", "po_number": "", "subtotal": "", "province", ""}
                        Invoice text: ${pages.join('\n')}`
                }]
            })
        });
        const data = await res.json();
        const cleanJson = data.choices[0].message.content.replace(/```json\n?|```\n?/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        setGptData(parsedData);
        return parsedData;
    };
    return { getGptData, processInvoice };
};