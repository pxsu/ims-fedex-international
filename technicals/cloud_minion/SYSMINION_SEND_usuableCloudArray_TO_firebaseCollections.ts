import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PSU_LOCATION_primaryDbLocation } from './REFERENCE_firebase';

export const PSU_OPERATION_SET_usuableCloudArray = async (PSU_arrayInput: any[]) => {
    const PSU_OPERATION_shipData = {
        PSU_arrayInput: PSU_arrayInput,
        PSU_inputTimestamp: serverTimestamp(),
    };

    const PSU_SET_shipData = await addDoc(collection(PSU_LOCATION_primaryDbLocation, 'sessions'), PSU_OPERATION_shipData);
    return PSU_SET_shipData.id;
}