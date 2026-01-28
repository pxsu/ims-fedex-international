{/* 1:PRIMARY */ }
export const PSU_OPERATION_fileObjInput = async (PSU_multipleInput: FileList) => {
    const PSU_OPERATION_fileObjInput_TO_usuableCloudArray = await Promise.all(
        Array.from(PSU_multipleInput).map(async (PSU_INPUT) => {
            const PSU_fileContext_TO_base64 = await PSU_CONVERSION_fileObjInput_TO_base64(PSU_INPUT);
            return {
                PSU_DEFINITION_fileName: PSU_INPUT.name,
                PSU_DEFINITION_fileSize: PSU_INPUT.size,
                PSU_DEFINITION_fileType: PSU_INPUT.type,
                PSU_DEFINITION_fileLastModified: PSU_INPUT.lastModified,
                PSU_CONTEXT: PSU_fileContext_TO_base64
            }
        })
    );
    return PSU_OPERATION_fileObjInput_TO_usuableCloudArray;
}

{/* 2:HELPER */ }
export const PSU_CONVERSION_fileObjInput_TO_base64 = (PSU_INPUT: File): Promise<string> => {
    return new Promise((PSU_RESOLVE, PSU_REJECT) => {
        const PSU_BROWSERAPI_fileReader = new FileReader();
        PSU_BROWSERAPI_fileReader.readAsDataURL(PSU_INPUT)
        PSU_BROWSERAPI_fileReader.onload = () => PSU_RESOLVE(PSU_BROWSERAPI_fileReader.result as string);
        PSU_BROWSERAPI_fileReader.onerror = (error) => PSU_REJECT(error);
    });
}