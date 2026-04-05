import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// --- FIREBASE CONFIGURATION (실장님 고유 설정) ---
const firebaseConfig = {
  apiKey: "AIzaSyDZUOMmZZ4MhmqK_fQMSSK8-9Rb2MmOn9I",
  authDomain: "sylzang-talk-6bab7.firebaseapp.com",
  projectId: "sylzang-talk-6bab7",
  storageBucket: "sylzang-talk-6bab7.firebasestorage.app",
  messagingSenderId: "801090100229",
  appId: "1:801090100229:web:de85d91198cb76a81dd06c",
  measurementId: "G-K155EQ2NCV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

export { db, messaging };
