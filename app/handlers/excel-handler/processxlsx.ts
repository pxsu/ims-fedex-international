import { Dispatch, SetStateAction } from "react";
import { convertFileToBase64 } from "@/app/utilities/crossplatform";
import * as XLSX from 'xlsx';
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations";
import { MAX_FILE_SIZE } from "@/app/utilities/bundle-sorter";
import { PDFDocument } from 'pdf-lib';

export interface ExcelRow {
    __EMPTY?: string;
    __EMPTY_1?: string | number;
    __EMPTY_3?: string | number;
    __EMPTY_10?: string | number;
    __EMPTY_4?: string | number;
    __EMPTY_5?: string | number;
    __EMPTY_12?: string;
    __EMPTY_13?: string;
}
export const handleExcelOver = (
    e: React.DragEvent<HTMLElement>,
    setIsDraggingExcel: Dispatch<SetStateAction<boolean>>
) => {
    e.preventDefault();
    setIsDraggingExcel(true);
};
export const handleExcelLeave = (
    e: React.DragEvent<HTMLElement>,
    setIsDraggingExcel: Dispatch<SetStateAction<boolean>>
) => {
    e.preventDefault();
    setIsDraggingExcel(false);
}
export const handleExcelDrop = (
    e: React.DragEvent<HTMLElement>,
    setIsDraggingExcel: Dispatch<SetStateAction<boolean>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setProcessedFileData: Dispatch<SetStateAction<any[]>>,
    setExcelModal: Dispatch<SetStateAction<boolean>>,
    setShowVendorModal: Dispatch<SetStateAction<boolean>>
) => {
    e.preventDefault();
    setIsDraggingExcel(false);
    const allFiles = Array.from(e.dataTransfer.files);
    const files = allFiles.filter(f =>
        f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    if (files.length === 0) {
        showNotification("System", setNotifications, `No Excel files detected`, "info");
    } else if (files.length === 1) {
        handleExcelFiles(files, setProcessedFileData, setNotifications);
        setExcelModal(true);
        setShowVendorModal(false);
    } else {
        handleExcelFiles(files, setProcessedFileData, setNotifications);
        setExcelModal(true);
        setShowVendorModal(false);
    }
};
export const handleExcelFiles = async (
    files: File[],
    setProcessedFileData: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
) => {
    const allFileData: any[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const base64 = await convertFileToBase64(file);
        const fileData = {
            index: i,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            data: base64,
            processed: false
        };
        allFileData.push(fileData);
        const processedResult = await processExcelData(arrayBuffer, setNotifications);
        allFileData[i] = {
            ...allFileData[i],
            processedData: processedResult,
            processed: true
        };
        setProcessedFileData([...allFileData]);
    }
}
export const processExcelData = async (
    arrayBuffer: ArrayBuffer,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
) => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet);
    const findRow = (text: string) => jsonData.find(row => row.__EMPTY?.includes(text));
    const vendorRow = findRow('VENDOR/EMP #:');
    const provinceRow = findRow('SELECT PROVINCE');
    const totalRow = jsonData.find(row => row.__EMPTY_3?.toString().trim() === 'Total');
    const relevant_gls = jsonData
        .filter(row => row.__EMPTY_3 && typeof row.__EMPTY_3 === 'number' && row.__EMPTY_5)
        .map(row => ({
            columns: {
                description: { label: 'DESCRIPTION / PURPOSE', value: row.__EMPTY?.toString() || null },
                gl_account: { label: 'GL ACCOUNT', value: row.__EMPTY_3?.toString() || null },
                cost_centre: { label: 'COST CENTRE', value: row.__EMPTY_4?.toString() || null },
            }
        }));
    const currency: 'CAD' | 'USD' | null = totalRow?.__EMPTY_5 ? 'CAD' : 'USD';
    return {
        vendorEmpNumber: {
            label: 'VENDOR NUMBER',
            values: vendorRow?.__EMPTY_1 ? Number(vendorRow.__EMPTY_1) : null
        },
        vendorEmpName: {
            label: 'VENDOR NAME',
            values: vendorRow?.__EMPTY_4?.toString() || null
        },
        relevant_gls: {
            label: 'GL ACCOUNTS',
            values: relevant_gls
        },
        taxValue: (() => {
            const province = provinceRow?.__EMPTY_1?.toString() || null;
            if (!province) return null;
            const tax = taxQuery(province, setNotifications);
            if (!tax) return null;
            return {
                label: 'PROVINCE & TAX CODES',
                province,
                ...tax
            };
        })(),
        costCentre: {
            label: 'COST CENTER',
            values: provinceRow?.__EMPTY_4 ? Number(provinceRow.__EMPTY_4) : null
        },
        currency: {
            label: 'CURRENCY',
            values: currency
        },
    };
};
export const taxQuery = (
    province: string,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
) => {
    const tax = taxRates[province];
    if (!tax) {
        showNotification("System", setNotifications, `No tax data found for province: ${province}`, "error");
        return null;
    }
    return {
        totalRate: tax.totalRate,
        gstType: tax.gstType,
        ...(tax.pstType && { pstType: tax.pstType })
    }
}
export const taxRates: { [key: string]: { totalRate: number, gstRate: number, gstType: string, pstRate?: number, pstType?: string } } = {
    'ON': { totalRate: 0.13, gstRate: 0.13, gstType: 'HST-122810' },
    'QC': { totalRate: 0.14975, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.09975, pstType: 'QST-122900' },
    'BC': { totalRate: 0.12, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.07, pstType: 'PST-122850' },
    'AB': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
    'SK': { totalRate: 0.11, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.06, pstType: 'PST-122850' },
    'MB': { totalRate: 0.12, gstRate: 0.05, gstType: 'GST-122800', pstRate: 0.07, pstType: 'PST-122850' },
    'NS': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
    'NB': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
    'NL': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
    'PE': { totalRate: 0.15, gstRate: 0.15, gstType: 'HST-122810' },
    'YT': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
    'NT': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' },
    'NU': { totalRate: 0.05, gstRate: 0.05, gstType: 'GST-122800' }
};
export const navigateExcelPage = (
    direction: 'left' | 'right',
    getCurrentExcelPage: number,
    setCurrentExcelPage: Dispatch<SetStateAction<number>>,
    getProcessedFileData: any[],
) => {
    if (direction === 'left' && getCurrentExcelPage > 0) {
        setCurrentExcelPage(getCurrentExcelPage - 1);
    } else if (direction === 'right' && getCurrentExcelPage < getProcessedFileData.length - 1) {
        setCurrentExcelPage(getCurrentExcelPage + 1);
    }
};
export const handleTemplate = async (
    getTemplate: Dispatch<SetStateAction<any[]>>,
    setTemplate: Dispatch<SetStateAction<any[]>>,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
) => {
    if (getTemplate.length >= 5) {
        showNotification('System', setNotifications, 'Maximum of 5 templates allowed', 'error');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
        try {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            if (file.type !== 'application/pdf') {
                showNotification('System', setNotifications, `${file.name} is not a valid PDF`, 'error');
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                showNotification('System', setNotifications, `${file.name} exceeds 10MB limit`, 'error');
                return;
            }
            const base64 = await convertFileToBase64(file);
            const id = `${file.name}-${Date.now()}`;
            const templateData = {
                id,
                name: file.name,
                size: file.size,
                type: file.type,
                data: base64,
                selected: false,
                uploadedAt: new Date().toISOString(),
            };
            const existing = JSON.parse(sessionStorage.getItem('pdfTemplates') || '[]');
            existing.push(templateData);
            sessionStorage.setItem('pdfTemplates', JSON.stringify(existing));
            setTemplate(prev => [...prev, templateData]);
            showNotification('System', setNotifications, `${file.name} set as template`, 'success');
        } catch (err) {
            showNotification('System', setNotifications, `handleTemplate says: ${err}`, 'error');
        }
    };
    input.click();
};
export const getSelectedTemplate = (
    getTemplate: any[],
) => {
    return getTemplate.find(t => t.selected === true);
};
export const selectTemplate = (
    file: any, 
    i: number,
    setTemplate: Dispatch<SetStateAction<any[]>>,
) => {
    setTemplate(prev => {
        const updated = prev.map((t, index) => ({
            ...t,
            selected: index === i ? !t.selected : false
        }));
        sessionStorage.setItem('pdfTemplates', JSON.stringify(updated));
        return updated;
    });
};
export const removeTemplate = (
    i: number,
    setTemplate: Dispatch<SetStateAction<any[]>>,
) => {
    setTemplate(prev => {
        const updated = prev.filter((_, index) => index !== i);
        sessionStorage.setItem('pdfTemplates', JSON.stringify(updated));
        return updated;
    });
};
export const generateTemplateSheet = async (
    file: any, 
    template: any,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setUploadedFiles: Dispatch<SetStateAction<any[]>>,
    getIsSelected: number[],
) => {
    const base64Data = template.replace(/^data:application\/pdf;base64,/, '');
    const templateData = await base64Data;
    let processedData: any;
    let vendorData: any;
    if (!templateData) {
        showNotification('System', setNotifications, 'No template selected', 'error');
        return;
    }
    try {
        processedData = file.processedData;
    } catch (err) {
        showNotification('System', setNotifications, `generateTemplateSheet says: ${err}`, 'error');
    }
    try {
        vendorData = file.vendorData
    } catch (err) {
        showNotification("System", setNotifications, `generateTemplateSheet says: ${err}`, "error")
    }
    const gLData = vendorData.relevant_gls.values;
    const currency = vendorData.currency.values;
    const pdfDoc = await PDFDocument.load(templateData);
    const form = pdfDoc.getForm()
    form.getFields().forEach((field) => {
        console.log(`${field.getName()} | Type: ${field.constructor.name}`);
    });
    const dateNow = `${new Date().getDate()}-${new Date()
        .toLocaleDateString("en-US", { month: "short" })
        .toUpperCase()}`
    const dataMap: Record<string, string> = {
        FIELD_vendorNumber: vendorData?.vendorEmpNumber?.values,
        FIELD_vendorName: vendorData?.vendorEmpName?.values,
        FIELD_invoiceDate: processedData["invoice_date"],
        FIELD_invoiceNumber: processedData["invoice_number"],
        FIELD_costCentre: vendorData?.costCentre?.values,
        FIELD_province: vendorData?.taxValue?.province,
        FIELD_subtotal: processedData["subtotal"],
        FIELD_primaryTax: vendorData?.taxValue?.gstType,
        FIELD_secondaryTax: vendorData?.taxValue?.pstType,
        FIELD_taxValue: (parseFloat(processedData["subtotal"].replace(/,/g, '')) * parseFloat(vendorData?.taxValue?.totalRate)).toFixed(2),
        FIELD_totalValue: (parseFloat(processedData["subtotal"].replace(/,/g, '')) * parseFloat(vendorData?.taxValue?.totalRate) + parseFloat(processedData["subtotal"].replace(/,/g, ''))).toFixed(2),
        // TODO: approvalDate doesn't work
        // ! FIELD_poValue: processedData["po_number"] needs human intervention + accuracy updates
    }
    form.getFields().forEach((field) => {
        const name = field.getName();
        if (dataMap[name]) {
            try {
                form.getTextField(name).setText(String(dataMap[name] ?? ''));
            } catch {
                try {
                    form.getDropdown(name).select(String(dataMap[name] ?? ''));
                } catch (err) {
                    showNotification('System', setNotifications, `Could not set field ${name}:`, 'error')
                    console.warn(`Could not set field ${name}:`, err);
                }
            }
        }
    });
    if (currency === 'CAD') {
        form.getCheckBox('CHECKBOX_cad').check();
    } else if (currency === 'USD') {
        form.getCheckBox('CHECKBOX_usd').check();
    }
    gLData.forEach((gl: any, index: number) => {
        const row = index + 1;
        const { description, gl_account, cost_centre } = gl.columns;
        form.getTextField(`GL_A${row}:A${row}`).setText(description.value ?? '');
        form.getTextField(`GL_A${row}:B${row}`).setText(gl_account.value ?? '');
        form.getTextField(`GL_A${row}:C${row}`).setText(cost_centre.value ?? '');
        form.getTextField(`GL_A${row}:D${row}`).setText(processedData["subtotal"] ?? '');
    });
    form.flatten()
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const generatedFileName = `${vendorData?.vendorEmpName?.values?.replace(/ /g, '_')}-${processedData["invoice_number"]}`;
    const base64 = await convertFileToBase64(new File([blob], generatedFileName, { type: 'application/pdf' }));
    const returnData = {
        finalDownload: {
            fileBlob: blob,
            generatedFileName,
            downloadReady: true
        }
    }
    setUploadedFiles(prev => {
        const updated = [...prev];
        updated[getIsSelected[0]] = {
            ...updated[getIsSelected[0]],
            returnData
        };
        const sessionData = [...updated];
        sessionData[getIsSelected[0]] = {
            ...sessionData[getIsSelected[0]],
            returnData
        };
        sessionStorage.setItem('uploadedFiles', JSON.stringify(sessionData));
        return updated;
    });
    return returnData;
};