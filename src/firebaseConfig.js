// Firebase setup
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCBv-S_G43Z_-ckt5h7qSnqT-ex0hQY2e0",
  authDomain: "hospital-9cf01.firebaseapp.com",
  projectId: "hospital-9cf01",
  storageBucket: "hospital-9cf01.appspot.com",  // ✅ FIXED
  messagingSenderId: "181950886937",
  appId: "1:181950886937:web:923c39d1dc9ce5afcb2688"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
