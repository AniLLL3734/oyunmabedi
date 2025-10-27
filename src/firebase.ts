import { initializeApp, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// --- DEBUG BAŞLANGIÇ: Ortam Değişkenlerini Kontrol Et ---
// Bu bölüm, .env dosyasındaki değişkenlerin doğru okunup okunmadığını
// tarayıcı konsolunda (F12) görmenizi sağlar.

// --- DEBUG SONU ---


// --- MAIN APP CONFIG (For Leaderboards, User Profiles, etc.) ---
const mainConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// --- TEMPORARY CHAT APP CONFIG ---
const chatConfig = {
  apiKey: "AIzaSyBhxiksy2zvLv29B9UAk3_zlo8MU7seVtM",
  authDomain: "okul-sohbet-gecici.firebaseapp.com",
  projectId: "okul-sohbet-gecici",
  storageBucket: "okul-sohbet-gecici.firebasestorage.app",
  messagingSenderId: "1093715461759",
  appId: "1:1093715461759:web:5f9b1b55ebef205999614a",
  measurementId: "G-H29T8J4N9Q"
};

// Initialize main app (default)
let mainApp: FirebaseApp;
try {
  mainApp = getApp("default");
} catch (e) {
  mainApp = initializeApp(mainConfig, "default");
}

// Initialize chat app with a unique name
let chatApp: FirebaseApp;
try {
  chatApp = getApp("chat");
} catch (e) {
  chatApp = initializeApp(chatConfig, "chat");
}

// Main database and authentication services (remains connected to the main project)
const db = getFirestore(mainApp);
const auth = getAuth(mainApp);
const dbRTDB = getDatabase(mainApp);

// Database service for CHAT ONLY (connects to the temporary project)
const chatDb = getFirestore(chatApp);

// Export services
export {
    db,       // Main database (for profiles, scores, etc.)
    auth,     // Main authentication
    chatDb,   // CHAT database (for messages, presence, etc.)
    dbRTDB
};