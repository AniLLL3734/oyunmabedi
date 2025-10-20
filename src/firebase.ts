// DOSYA: src/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// --- DEBUG BAŞLANGIÇ: Ortam Değişkenlerini Kontrol Et ---
// Bu bölüm, .env.local dosyasındaki değişkenlerin doğru okunup okunmadığını
// tarayıcı konsolunda (F12) görmenizi sağlar.
console.log("--- .env.local Değişkenleri Kontrol Ediliyor ---");
console.log("VITE_FIREBASE_API_KEY:", import.meta.env.VITE_FIREBASE_API_KEY);
console.log("VITE_FIREBASE_AUTH_DOMAIN:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log("VITE_FIREBASE_PROJECT_ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log("-----------------------------------------------");
// --- DEBUG SONU ---


// .env.local dosyasındaki değişkenleri import.meta.env üzerinden oku
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Gerekli servisleri dışa aktar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const dbRTDB = getDatabase(app);