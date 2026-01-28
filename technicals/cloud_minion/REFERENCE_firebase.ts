import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "ims-fedex.firebaseapp.com",
    projectId: "ims-fedex",
    storageBucket: "ims-fedex.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const PSU_LOCATION_primaryDbLocation = getFirestore(app);
export const storage = getStorage(app);