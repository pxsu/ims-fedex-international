import { Transition } from '@headlessui/react';
import { getNotificationStyles } from '@/app/handlers/notifications/notifcations';
interface Notification {
    id: string;
    title: string;
    message?: string;
    type: 'success' | 'error' | 'warning' | 'info';
}
interface NotificationProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}
export default function NotificationComponent({
    notifications,
    onDismiss,
}: NotificationProps) {
    return (
        <main className="flex flex-col items-center space-y-2 w-full max-w-sm">
            <div className="pointer-events-none fixed -inset-3 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[2000]">
                <div className="flex w-full flex-col items-center space-y-2">
                    {notifications.map(notification => (
                        <Transition
                            key={notification.id}
                            show={true}
                            enter="transform transition duration-300 ease-out"
                            enterFrom="translate-y-2 opacity-0"
                            enterTo="translate-y-0 opacity-100"
                            leave="transform transition duration-100 ease-in"
                            leaveFrom="translate-y-0 opacity-100"
                            leaveTo="translate-y-2 opacity-0">
                            <div className={`pointer-events-auto w-full max-w-sm rounded-xl text-white p-4 ${getNotificationStyles(notification.type)}`}>
                                <div className="flex items-start">
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-medium font-semibold">{notification.title}</p>
                                        {notification.message && (
                                            <p className="mt-1 text-sm -translate-y-1">{notification.message}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onDismiss(notification.id)}
                                        className="ml-4 text-white cursor-pointer">
                                        <div className="flex items-center gap-2 hover:text-red-200 rounded-md hover:outline-2 hover:outline-red-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </Transition>
                    ))}
                </div>
            </div>
        </main>
    )
}