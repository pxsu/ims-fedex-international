export default function INTERACTION_PDFPreview() {
    return (
        <div data-section='CHILD:PDF-VIEW' className='h-128 flex-shrink-0 w-full flex flex-col rounded-2xl outline-4 outline-neutral-300 rounded-2xl transition duration-250 hover:outline-indigo-600'>
            <div data-section='CHILD-PDF_CONTENT' className='flex flex-1 w-full items-center justify-center'>content</div>
            <div data-section='CHILD-PDF_SUB_SECTION' className='h-32 w-full flex gap-4 items-center bg-neutral-200 px-4 overflow-x-auto scrollbar-hide'>
                {Array.from({ length: 5 }).map((_, i) => 
                    <div key={i} data-section='CHILD-PDF_SUB_SECTION-PKGS' className='h-3/4 w-16 flex-shrink-0 rounded-xl outline-3 outline-neutral-300 bg-neutral-100 flex items-center justify-center hover:outline-indigo-600'>{i}</div>
                )}
            </div>
        </div>
    )
}