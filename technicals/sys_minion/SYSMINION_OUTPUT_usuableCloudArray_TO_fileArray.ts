{/* 0:DATA-OUTLINE */}
interface ARCHITECTURE_fileArray {
    PSU_OUTPUT_fileName: string;
    PSU_OUTPUT_fileSize: number;
    PSU_OUTPUT_fileType: string;
    PSU_OUTPUT_fileLastModified: number;
    PSU_OUTPUT_fileUrl: string;
}

{/* 1:PRIMARY */ }
export const PSU_OPERATION_usuableArrayOutput = async (PSU_multipleInput: ARCHITECTURE_fileArray[]) => {
    return PSU_multipleInput.map((PSU_singleInput) => ({
        PSU_OUTPUT_fileName: PSU_singleInput.PSU_OUTPUT_fileName,
        PSU_OUTPUT_fileSize: PSU_singleInput.PSU_OUTPUT_fileSize,
        PSU_OUTPUT_fileType: PSU_singleInput.PSU_OUTPUT_fileType,
        PSU_OUTPUT_fileUrl: PSU_singleInput.PSU_OUTPUT_fileUrl
    }));
}