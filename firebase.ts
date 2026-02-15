'use client'

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
    apiKey: "AIzaSyCx1U7v_N4tjBJgaX27h09QvojldH3P3Hw",
    authDomain: "ims-fedex.firebaseapp.com",
    projectId: "ims-fedex",
    storageBucket: "ims-fedex.firebasestorage.app",
    messagingSenderId: "141882002996",
    appId: "1:141882002996:web:1c7ac4a8af29b7a6e74461",
    measurementId: "G-0HGPRVC8ZS"
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, "database-ims");