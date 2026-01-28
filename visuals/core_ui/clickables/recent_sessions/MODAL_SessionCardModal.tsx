export default function MODAL_SessionCardModal() {
    return (
        <main data-section="MODAL" className="absolute right-0 shadow-md z-1000 w-60 mt-2 flex py-2 bg-white rounded-xl">
            <div className="w-full flex flex-col">
                <div data-section="SELECTION" className="w-full flex px-4 py-2 gap-4 justify-start hover:bg-neutral-100">
                    <div>icon</div>
                    <div>Selection 1</div>
                </div>
                <div data-section="SELECTION" className="w-full flex px-4 py-2 gap-4 justify-start hover:bg-neutral-100">
                    <div>icon</div>
                    <div>Selection 2</div>
                </div>
            </div>
        </main>
    )
}