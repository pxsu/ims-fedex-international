import { Dispatch, SetStateAction } from "react";
import { showNotification, Notification } from "@/app/handlers/notifications/notifcations";
import { convertFileToBase64 } from "./crossplatform";

// ! ----------------------------------------

// Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 20;
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

// ! ----------------------------------------

export const validateBundleItems = (
    setItems: Dispatch<SetStateAction<{
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null;
    }[]>>
) => {
    setItems(prev => {
        let updated = [...prev];
        const hasInvoice = updated.some(i => i.label === 'Invoice');
        const hasCoverSheet = updated.some(i => i.label === 'Cover Sheet');
        if (!hasInvoice) {
            updated = [{ position: '1', id: '1', label: 'Invoice', parent: true, size: 0, content: null }, ...updated];
        }
        if (!hasCoverSheet) {
            updated = [...updated, { position: '2', id: '2', label: 'Cover Sheet', parent: true, size: 0, content: null }];
        }
        return updated.map((item, i) => ({ ...item, position: String(i + 1) }));
    });
};
export const saveBundle = (
    items: any[],
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
) => {
    sessionStorage.setItem('savedBundle', JSON.stringify(items));
    showNotification('System', setNotifications, 'Saved bundle to browser', 'info')
}
export const getBundleStatus = (
    item: any,
) => {
    const savedBundle: any[] = JSON.parse(sessionStorage.getItem('savedBundle') || '[]');
    if (item.parent) return null;
    const inBundle = savedBundle.some(s => s.id === item.id && !s.parent && s.position === item.position);
    return inBundle ? 'saved' : 'not saved';
};
export const addToBundle = (
    items: any[],
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setItems: Dispatch<SetStateAction<{
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null;
    }[]>>,
) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
        const file = [(e.target as HTMLInputElement).files?.[0]].filter(Boolean) as File[];
        const errors: string[] = [];
        const validated = file.filter(file => {
            if (file.type !== 'application/pdf') {
                errors.push(`${file.name}: not a valid PDF`);
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: exceeds 10MB limit`);
                return false;
            }
            if (items.some(i => i.label === file.name)) {
                errors.push(`${file.name}: already in bundle`);
                return false;
            }
            return true;
        });
        if (items.length + validated.length > MAX_FILES) {
            errors.push(`Bundle cannot exceed ${MAX_FILES} files`);
            if (errors.length) showNotification('System', setNotifications, `addToBundle says ${errors}`, 'info');
            return;
        }
        const currentTotalSize = items.reduce((acc, i) => acc + (i.size || 0), 0);
        const incomingSize = validated.reduce((acc, f) => acc + f.size, 0);
        if (currentTotalSize + incomingSize > MAX_TOTAL_SIZE) {
            errors.push(`Bundle would exceed 50MB total size limit`);
            if (errors.length) showNotification('System', setNotifications, `addToBundle says ${errors}`, 'info');
            return;
        }
        if (errors.length) showNotification('System', setNotifications, `addToBundle says ${errors}`, 'info');
        const newItems = await Promise.all(validated.map(async (file, i) => ({
            id: String(items.length + i + 1),
            label: file.name,
            parent: false,
            size: file.size,
            position: String(items.length + i + 1),
            content: await convertFileToBase64(file)
        })));
        setItems(prev => [...prev, ...newItems]);
    };
    input.click();
};
export const removeItem = (
    position: string,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    setItems: Dispatch<SetStateAction<{
        position: string;
        id: string;
        label: string;
        parent: boolean;
        size: number;
        content: string | null;
    }[]>>,
    items: any[],
) => {
    const item = items.find(i => i.position === position);
    if (item?.parent) return showNotification('System', setNotifications, 'Cannot remove a parent item', 'error');
    setItems(prev => {
        const updated = prev.filter(item => item.position !== position).map((item, i) => ({ ...item, position: String(i + 1) }));
        sessionStorage.setItem('savedBundle', JSON.stringify(updated));
        return updated;
    });
};