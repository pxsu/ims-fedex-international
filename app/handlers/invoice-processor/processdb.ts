import { Dispatch, SetStateAction } from "react";
import { showNotification, Notification } from "../notifications/notifcations";

export const loadPdf = async (input: string) => {
    const { pdfjs } = await import('react-pdf');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const output = await pdfjs.getDocument({ data: input }).promise;
    return output
};
export const processInvoice = async (
    base64: string
) => {
    const pdfData = atob(base64.split(',')[1]);
    const pdf = await loadPdf(pdfData);
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((item: any) => item.str).join(' '));
    }

    // ! ONLY CONVERTS FIRST PAGE TO PNG FOR CONTEXT
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({
        canvas: canvas,
        viewport,
    }).promise;
    const pngBase64 = canvas.toDataURL('image/png');
    // ! ONLY CONVERTS FIRST PAGE TO PNG FOR CONTEXT

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
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: pngBase64 }
                    },
                    {
                        type: 'text',
                        text: `Extract from this invoice text. Return ONLY JSON, no explanation:
                        { 
                            "isInvoice": true
                            "vendor_name": "", 
                            "invoice_number": "", 
                            "invoice_date": "", 
                            "po_number": "", 
                            "subtotal1": "", 
                            "subtotal2": "",
                            "province": "",
                        }
                        Set isInvoice to true if the document appears to be an invoice, false otherwise.
                        Return invoice_date in the format "mm/dd/yyyy".
                        "po_number" are typically numeric strings found after "PO #", "PO#", "PO Number", or "Purchase Order #" on the invoice. They are usually 8 digits long. Extract only the numeric string, not the label. If no PO number is found, return null.
                        Set subtotal1 as the value before tax and fees.
                        Set subtotal2 as any value identified as: { "ONTARIO ECO FEE", "ECO FEE" }, otherwise "0".
                        Invoice text: ${pages.join('\n')}`
                    }
                ]
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
        processedInvoiceMap.set("isInvoice", gptInfo.isInvoice ?? false);
        processedInvoiceMap.set("vendor_name", gptInfo.vendor_name || "Unidentified");
        processedInvoiceMap.set("invoice_number", gptInfo.invoice_number || "Unidentified");
        processedInvoiceMap.set("invoice_date", gptInfo.invoice_date || "");
        processedInvoiceMap.set("po_number", gptInfo.po_number || "");
        processedInvoiceMap.set("subtotal1", gptInfo.subtotal1 || "");
        processedInvoiceMap.set("subtotal2", gptInfo.subtotal2 || "");
        processedInvoiceMap.set("province", gptInfo.province || "");
        return processedInvoiceMap;
    } catch (err) {
        showNotification("System", setNotifications, `Could not process file`, "info");
        throw err;
    }
}