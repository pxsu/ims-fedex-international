/**
 * TODO: (1) ACCEPT:fileUpload
 * TODO: (2) VALIDATE:fileUpload
 * TODO: (3) EXTRACT:fileUpload --> metaDataArray
 * TODO: (4) EXTRACT:base64 FROM fileUpload
 * TODO: (5) UPLOAD:base64 --> Firebase 
 * TODO: (6) UPLOAD:firebaseReference --> metaDataArray
 * TODO: (7) UPLOAD:metaDataArray --> Firestore
 * 
 * * Accept files, take the original base64 context as well as any other meta data 
 * * and put it in array, which will be stored inside of a Firestore document
 * * to be accessed later.
 */

import { useState } from 'react'
import { PSU_OPERATION_fileObjInput } from '@/technicals/sys_minion/SYSMINION_INPUT_fileObj_TO_usuableCloudArray'

export default function INTERACTION_CanvasArea() {
    const [PSU_GET_draggingState, PSU_SET_draggingState] = useState(false);

    const PSU_INTERACTION_dragIN = (PSU_fileInput: React.DragEvent<HTMLDivElement>) => {
        PSU_fileInput.preventDefault();
        PSU_SET_draggingState(true);
    };
    const PSU_INTERACTION_dragOUT = (PSU_fileInput: React.DragEvent<HTMLDivElement>) => {
        PSU_fileInput.preventDefault();
        PSU_SET_draggingState(false);
    }
    const PSU_INTERACTION_whenINSIDE = (PSU_fileInput: React.DragEvent<HTMLDivElement>) => {
        PSU_fileInput.preventDefault();
        PSU_SET_draggingState(false);

        const PSU_FILE = PSU_fileInput.dataTransfer.files;
        if (PSU_FILE && PSU_FILE[0]) {
            const PSU_OPERATION_fileArray = PSU_OPERATION_fileObjInput(PSU_FILE);

            /**
            * TODO: MISSING_CLOUDFUNC
            */
        }
    }

    return (
        <main data-section='PARENT:CANVAS_AREA' className={`flex-1 bg-neutral-200`}>
            <div data-section='CHILD:CANVAS_AREA-INNER_CONTENT' className={`h-full flex flex-col items-center justify-center gap-2 transition-colors text-neutral-600`}>
                <div data-section="CHILD:CANVAS-UPLOAD_ICON" className='h-32 w-32'>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1"
                        stroke="currentColor"
                        className="w-full h-full">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                </div>

                <div data-section="CHILD:CANVAS_AREA-VISUAL_CONTEXT" className='flex gap-2 text-md'>
                    <div>No PDF uploaded</div>
                    <div> | </div>
                    <div>
                        <button className="hover:underline cursor-pointer">Select or drag a file inside</button>
                    </div>
                </div>
            </div>
        </main>
    )
}