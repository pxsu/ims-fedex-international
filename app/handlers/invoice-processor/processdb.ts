import { Dispatch, SetStateAction } from "react";
import { showNotification, Notification } from "../notifications/notifcations";
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const processInvoice = async (
    base64: string
) => {
    console.log(`BASE64 DATA: ${base64}`)
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
                content:
                    `Extract from this invoice text. Return ONLY JSON, no explanation:
                { 
                    "vendor_name": "", 
                    "invoice_number": "", 
                    "invoice_date": "", 
                    "po_number": "", 
                    "subtotal": "", 
                    "province", ""
                }
                Return invoice_date in the format "mm/dd/yyyy".
                Invoice text: ${pages.join('\n')}`
            }]
        })
    });
    const data = await res.json();
    const cleanJson = data.choices[0].message.content.replace(/```json\n?|```\n?/g, '').trim();
    const parsedData = JSON.parse(cleanJson);
    return parsedData;
};
export const processDbRequests = async (
    data: any,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
) => {
    const processedInvoiceMap = new Map<string, any>();
    let gptInfo;
    try {
        gptInfo = await processInvoice(data);
        processedInvoiceMap.set("vendor_name", gptInfo.vendor_name || "missing");
        processedInvoiceMap.set("invoice_number", gptInfo.invoice_number || "missing");
        processedInvoiceMap.set("invoice_date", gptInfo.invoice_date || "missing");
        processedInvoiceMap.set("po_number", gptInfo.po_number || "missing");
        processedInvoiceMap.set("subtotal", gptInfo.subtotal || "missing");
        processedInvoiceMap.set("province", gptInfo.province || "missing");
        return processedInvoiceMap;
    } catch (err) {
        showNotification("System", setNotifications, `Could not process file`, "info");
        throw err;
    }
}