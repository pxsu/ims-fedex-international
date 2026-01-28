export default function INTERACTION_NavigationRibbon() {
    return (
        <main>
            {/* NAVIGATION RIBBON */}
            <nav className='bg-[#F1F1F1] flex justify-between items-center px-4 py-2 sticky top-0 z-1000 border-b-4 border-neutral-200'>
                <div data-section='PARENT' className='flex justify-between items-center'>
                    <button data-section='INDIVIDUAL-BTN' className='hover:bg-neutral-200 text-black cursor-pointer w-12 py-2 flex items-center justify-center rounded-lg'>
                        <svg
                            width={24}
                            height={24}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                    </button>
                    <div data-section='CHILD-DOCUMENT-DETAILS' className='flex text-black'>
                        <div data-section='CHILD-DOCUMENT-TITLE' className='font-semibold hover:outline-2 outline-black/60 px-2 rounded-sm mr-2'>DATA:fileName</div>
                        <div data-section='CHILD-DOCUMENT-DATE' className='text-black/60 -translate-x-2'>DATA:dateValue</div>
                    </div>
                </div>
                <div data-section='PARENT' className='flex gap-2'>
                    <div data-section='CHILD-EDITORIAL-BUTTONS' className='flex gap-1'>
                        <button data-section='INDIVIDUAL-BTN' className='hover:bg-neutral-200 cursor-pointer w-12 flex items-center justify-center rounded-lg'>
                            <svg
                                width={24}
                                height={24}
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path d="M3.12944 8.19105V5.90909H13.8809V8.19105H9.87305V19H7.13725V8.19105H3.12944ZM20.8226 9.18182V11.2273H14.91V9.18182H20.8226ZM16.2523 6.82955H18.9753V15.983C18.9753 16.2344 19.0137 16.4304 19.0904 16.571C19.1671 16.7074 19.2736 16.8033 19.41 16.8587C19.5506 16.9141 19.7125 16.9418 19.8958 16.9418C20.0236 16.9418 20.1515 16.9311 20.2793 16.9098C20.4071 16.8842 20.5051 16.8651 20.5733 16.8523L21.0016 18.8786C20.8652 18.9212 20.6735 18.9702 20.4263 19.0256C20.1792 19.0852 19.8787 19.1214 19.525 19.1342C18.8688 19.1598 18.2935 19.0724 17.7992 18.8722C17.3091 18.6719 16.9277 18.3608 16.655 17.9389C16.3823 17.517 16.248 16.9844 16.2523 16.3409V6.82955Z" fill="black" />
                            </svg>
                        </button>
                        <button data-section='INDIVIDUAL-BTN' className='hover:bg-neutral-200 cursor-pointer w-12 flex items-center justify-center rounded-lg'>
                            <svg
                                width={24}
                                height={24}
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 20V22H4V20H20ZM20 4H4V22C2.96435 22 2.113 21.2128 2.01074 20.2041L2 20V4C2 2.89543 2.89543 2 4 2H20L20.2041 2.01074C21.2128 2.113 22 2.96435 22 4V20L21.9893 20.2041C21.8938 21.1457 21.1457 21.8938 20.2041 21.9893L20 22V4Z" fill="black" />
                            </svg>
                        </button>
                        <button data-section='INDIVIDUAL-BTN' className='hover:bg-neutral-200 cursor-pointer w-12 flex items-center justify-center rounded-lg'>
                            <svg
                                width={24}
                                height={24}
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.021 4.29251C17.4115 3.90199 18.0447 3.90199 18.4352 4.29251C18.8257 4.68303 18.8257 5.3162 18.4352 5.70672L5.70726 18.4346C5.31673 18.8252 4.68357 18.8252 4.29304 18.4346C3.90252 18.0441 3.90252 17.411 4.29304 17.0204L17.021 4.29251Z" fill="black" />
                            </svg>
                        </button>
                    </div>
                    <button type="button" className="rounded-full cursor-pointer bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500">
                        Download
                    </button>
                </div>
            </nav>
        </main>
    )
}