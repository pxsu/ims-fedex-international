import Image from 'next/image';
import { useState, useEffect } from 'react';

import ERROR_SessionCard from './ERROR_SessionCard';
import MODAL_SessionCardModal from './MODAL_SessionCardModal';

interface SessionCardArchitecture {
    // Identification
    userName: string;
    userID: string;

    // Data
    thumbnailUrl: string;
    thumbnailAlt?: string;
    date: string;
    fileSize: string;
    pageCount: number;
}

export function INTERACTION_SessionCard({
    thumbnailUrl,
    thumbnailAlt,
    date,
    fileSize,
    pageCount,
}: SessionCardArchitecture) {
    // MODAL INTEGRATION
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // PFL INTEGRATION
    const [imageState, setImageState] = useState<'loading' | 'error' | 'success'>('loading');
    useEffect(() => {
        if (!thumbnailUrl) {
            setImageState('error')
        } else {
            setImageState('success')
        }
    }, [thumbnailUrl])

    return (
        <>
            <main data-section="PARENT" className="relative lg:w-80 md:w-60 outline-4 outline-neutral-300 rounded-2xl transition duration-250 hover:-translate-y-2 hover:shadow-md hover:outline-indigo-600 cursor-pointer">
                <div data-section="SIBLING" className="rounded-t-2xl overflow-hidden">
                    <div data-section="IMAGE" className="relative w-full h-44 lg:h-84 bg-neutral-100">
                        {/* LOADING */}
                        {imageState === 'loading' && (
                            <div className="h-full flex items-center justify-center rounded-2xl">
                                loading
                            </div>
                        )}

                        {/* ERROR */}
                        {imageState === 'error' && (
                            <div className="h-full flex items-center justify-center bg-red-200 rounded-2xl">
                                error
                            </div>
                        )}

                        {/* SUCCESS */}
                        {imageState === 'success' && (
                            <Image
                                src={thumbnailUrl}
                                alt={thumbnailAlt || "An image preview of a previous session"}
                                fill
                                className={`object-cover ${imageState === 'success' ? 'opacity-100' : 'opacity-0'}`}
                                onLoadingComplete={() => setImageState('success')}
                                onError={() => setImageState('error')}
                            />
                        )}
                    </div>
                </div>
                <div data-section="SIBLING" className="rounded-b-2xl bg-neutral-100 px-4 py-4 border-t-4 border-neutral-300">
                    <div className="font-xl font-bold">{date}</div>
                    <div className="flex gap-2 justify-between items-center text-neutral-600">
                        <div className="flex gap-2">
                            <div className="p-1 px-2 rounded-lg bg-neutral-200">{fileSize}</div>
                            <div className="p-1 px-2 rounded-lg bg-neutral-200">{pageCount} pages</div>
                        </div>
                        <button onClick={() => setIsModalOpen(!isModalOpen)} className="hover:bg-neutral-200 transition-colors py-1 rounded-sm cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                            </svg>
                        </button>
                    </div>
                </div>
                {isModalOpen && (
                    <MODAL_SessionCardModal />
                )}
            </main>
        </>
    )
}