// DOSYA: src/firebase.ts (Sinyal Mekanizması İçin Sadeleştirilmiş Hali)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// .env.local dosyasındaki değişkenleri import.meta.env üzerinden oku
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // databaseURL'ye artık ihtiyacımız yok, silebilirsin veya kalabilir, zararı yok.
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL, 
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Gerekli servisleri dışa aktar
export const auth = getAuth(app);
export const db = getFirestore(app); // Sadece Firestore kullanacağız.

