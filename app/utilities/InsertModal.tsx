import { Dispatch, SetStateAction } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Notification } from '@/app/handlers/notifications/notifcations';
import { validateBundleItems, addToBundle, saveBundle } from './bundle-sorter';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { removeItem } from "./bundle-sorter";
import { CSS } from '@dnd-kit/utilities';

interface InsertModalProps {
    setInsertModal: Dispatch<SetStateAction<boolean>>;
    setNotifications: Dispatch<SetStateAction<Notification[]>>;
    items: any[];
    setItems: Dispatch<SetStateAction<any[]>>;
}
export default function InsertModal({
    setInsertModal,
    setNotifications,
    items,
    setItems,
}: InsertModalProps) {
    const sensors = useSensors(useSensor(PointerSensor));
    function Row({ id, label, parent, position }: { id: string; label: string; parent: boolean, position: string }) {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
        return (
            <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }} className={`bg-neutral-200 rounded-xl p-2 px-4 w-full flex gap-2 items-center border-2 ${parent ? 'border-indigo-400 text-indigo-600 bg-violet-200' : 'border-transparent'}`}>
                <svg {...attributes} {...listeners} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 cursor-grab shrink-0 outline-none focus:outline-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <div className="flex justify-between w-full">
                    <span className="">{label}</span>
                    <span className="">{position}</span>
                </div>
                <div className="flex justify-between items-center">
                    {!parent ? (
                        <div className="items-center hover:text-red-600 cursor-pointer">
                            <svg onClick={() => { removeItem(position, setNotifications, setItems, items) }}
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                strokeWidth={2} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </div>
                    ) : (
                        <div className="items-center hover:text-red-600 cursor-pointer">
                            <div className='w-6 h-6'></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000]">
            <div className="bg-white p-2 rounded-xl w-144 h-96 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div className="items-center hover:text-red-600 hover:outline-red-600 cursor-pointer">
                        <svg
                            onClick={() => setInsertModal(false)}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div className="flex gap-3">
                        <div
                            className="flex items-center justify-center text-black transition-all cursor-pointer hover:text-black/40"
                            onClick={() => validateBundleItems(setItems)}>
                            Reset
                        </div>
                        <div
                            className="bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:outline-2 hover:text-indigo-500 hover:outline-indigo-500 transition-all cursor-pointer"
                            onClick={() => addToBundle(items, setNotifications, setItems)}>
                            Add File
                        </div>
                    </div>
                </div>
                <section className="flex flex-col flex-1 min-h-0 rounded-lg">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={({ active, over }) => {
                            if (active.id !== over?.id) {
                                setItems(prev =>
                                    arrayMove(
                                        prev,
                                        prev.findIndex(i => i.id === active.id),
                                        prev.findIndex(i => i.id === over!.id)
                                    ).map((item, i) => ({ ...item, position: String(i + 1) }))
                                );
                            }
                        }}>
                        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="flex flex-col gap-2 w-full overflow-hidden h-full p-1">
                                {items.map(item => (
                                    <Row
                                        key={item.id}
                                        {...item}
                                        items={items}
                                        setItems={setItems}
                                        setNotifications={setNotifications}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </section>
                <div className="w-full flex justify-end">
                    <div
                        className="p-1 px-4 rounded-md text-black cursor-pointer hover:text-black/40"
                        onClick={() => saveBundle(items, setNotifications)}>
                        Save
                    </div>
                </div>
            </div>
        </div>
    );
}