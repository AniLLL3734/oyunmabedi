// DOSYA: src/firebase.ts

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
  // Yeni eklenen Realtime Database URL'sini de buradan oku
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL, 
};

// Firebase uygulamasını bu yapılandırma bilgileriyle başlat
const app = initializeApp(firebaseConfig);

// Gerekli servisleri dışa aktararak diğer dosyalarda kullanılabilir yap
export const auth = getAuth(app);
export const db = getFirestore(app);

// getDatabase() fonksiyonunu doğrudan usePresence.ts içinde çağırarak,
// sadece ihtiyaç duyulduğunda bu servisi başlatmış olacağız. Bu daha modern bir yöntemdir.