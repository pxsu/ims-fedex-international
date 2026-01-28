import INTERACTION_PDFPreview from "./INTERACTION_PDFPreview"

export default function INTERACTION_SidebarView() {
    return (
        <main>
            {/* SIDEBAR VIEW */}
            <section data-section='PARENT:SIDEBAR VIEW' className='h-full flex flex-col gap-4 overflow-hidden overflow-y-scroll w-100 bg-neutral-100 px-6 py-6'>
                {Array.from({ length: 4 }).map((_, i) =>
                    <INTERACTION_PDFPreview key={i} />
                )}
            </section>
        </main>
    )
}