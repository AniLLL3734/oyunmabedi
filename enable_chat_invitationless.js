import { config } from 'dotenv';
// .env.local dosyasındaki çevre değişkenlerini yükle
config({ path: '.env.local' });
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// .env.local dosyasından alınacak Firebase yapılandırması
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Asenkron ana fonksiyon
async function enableChatInvitationless() {
  try {
    // Admin hesabının giriş bilgileri
    const email = 'fatalrhymer37@ttmtal.com';
    const password = 'Kastamonu37';

    console.log(`'${email}' ile giriş yapılıyor...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('Giriş başarılı! UID:', user.uid);

    // Sohbet ayarlarını güncelle - davet olmadan girişi aç
    await setDoc(doc(db, 'chat_meta', 'settings'), {
      isChatInvitationless: true
    }, { merge: true });

    console.log('----------------------------------------------------');
    console.log('✅ BAŞARILI: Sohbet daveti olmadan giriş açıldı!');
    console.log('Artık herkes sohbete davet olmadan katılabilir.');
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('❌ HATA: İşlem sırasında bir sorun oluştu!');
    console.error('Hata Mesajı:', error.message);
  }
}

// Fonksiyonu çalıştır
enableChatInvitationless();
