'use client';

import { useEffect } from 'react';

export default function Error({ error }: { error: Error & { digest?: string }; }) {
    const handleReset = () => {
        sessionStorage.clear();
    };
    useEffect(() => {
        console.error(error);
    }, [error]);
    return (
        <>
            <div className="relative">
                <nav className="select-none flex gap-2 justify-between bg-white p-2 px-8 items-center h-14">
                    <div className="w-4 h-full">
                        <button onClick={() => window.location.href = '/'} className="text-[24px] font-bold text-black hover:text-transparent hover:text-[28px] hover:[-webkit-text-stroke:1px_rgb(51.1_0.262_276.96)] transition-all cursor-pointer">ims</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { handleReset }} className="hidden bg-black p-1 px-4 rounded-md text-white hover:bg-white hover:text-indigo-700 hover:outline-2 hover:outline-indigo-500 transition-all cursor-pointer">Get Uploaded</button>
                    </div>
                </nav>
            </div>
            <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-6">
                <div className="text-center">
                    <h2 className="text-[24px] font-medium tracking-tight text-neutral-500">
                        ims crashed
                    </h2>
                    <button
                        onClick={() => { window.location.href = '/'; handleReset(); }}
                        className="mt-6 rounded-full outline-2 outline-neutral-900 hover:bg-neutral-200 px-5 py-2 text-sm font-medium text-neutral-900 transition-all active:scale-95 -translate-y-4 cursor-pointer">
                        Reset
                    </button>
                </div>
            </main>
        </>
    );
}