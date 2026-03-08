import { Dispatch, SetStateAction } from "react";

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export interface Notification {
    id: string;
    title: string;
    message?: string;
    type: NotificationType;
}
export const getNotificationStyles = (
    type: NotificationType
) => {
    switch (type) {
        case 'success':
            return 'bg-green-400 border-2 border-black';
        case 'error':
            return 'bg-red-400 border-2 border-black';
        case 'warning':
            return 'bg-orange-300 border-2 border-black ';
        case 'info':
            return 'bg-black/40 border-2 border-black';
        default:
            return 'bg-black/40 border-2 border-black';
    }
};
export const showNotification = (
    title: string,
    setNotifications: Dispatch<SetStateAction<Notification[]>>,
    message?: string,
    type: NotificationType = 'success'
) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
};