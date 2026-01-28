import INTERACTION_PDFPreview from "./INTERACTION_PDFPreview"
import INTERACTION_SidebarView from "./INTERACTION_SidebarView"
import INTERACTION_CanvasArea from "./INTERACTION_CanvasArea"
import '@react-pdf-viewer/core/lib/styles/index.css';

export default function INTERACTION_ContentArea() {
    return (
        <main>
            {/* CONTENT AREA */}
            <section data-section='PARENT:CONTENT_AREA' className='h-screen flex'>
                {/* SIDEBAR VIEW */}
                <INTERACTION_SidebarView />

                {/* CANVAS AREA */}
                <INTERACTION_CanvasArea />
            </section>
        </main>
    )
}