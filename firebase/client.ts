// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp} from "firebase/app";
import {getAuth} from "@firebase/auth";
import {getFirestore} from "@firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD2Ql53EGK3odsWVx6s4F1eLtLGFN5n78Y",
    authDomain: "prepwise-3c605.firebaseapp.com",
    databaseURL: "https://prepwise-3c605-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "prepwise-3c605",
    storageBucket: "prepwise-3c605.firebasestorage.appspot.com",
    messagingSenderId: "172642770833",
    appId: "1:172642770833:web:c32218a0b3303f393cc430",
    measurementId: "G-84R2TDH1JK"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);