import { Dispatch, SetStateAction } from 'react';

export default function MultipleFileModal({
    setMultiFileState,
}: {
    setMultiFileState: Dispatch<SetStateAction<boolean>>;
}) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000]">
            <div className="bg-white p-2 rounded-xl w-3/4 h-96 flex flex-col">
                <div className="items-center hover:text-red-600 cursor-pointer">
                    <svg onClick={() => { null }}
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={2} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </div>
            </div>
        </div>
    )
}