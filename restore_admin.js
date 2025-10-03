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
async function restoreAdminAccount() {
  try {
    // 1. ADIM: Admin hesabının giriş bilgileri
    const email = 'fatalrhymer37@ttmtal.com';
    const password = 'Kastamonu37'; // Lütfen doğru şifre olduğundan emin olun

    console.log(`'${email}' ile giriş yapılıyor...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const uid = user.uid; // Giriş yapılan kullanıcının UID'si

    console.log('Giriş başarılı! UID:', uid);
    // Ekran görüntünüzdeki UID ile aynı olmalı: WXdz4GWVqTb9SwihXFN9nh0LJVn2

    // 2. ADIM: Geri yüklenmesini istediğimiz tüm başarımlar
    const allAchievements = [
      'first_login',
      'pixel_whisper',
      'chat_initiate',
      'frequency_echo',
      'interdimensional_traveler',
      'scholar_of_the_code',
      'time_lord',
      'void_caller',
      'legend_of_ttmtal',
      'architect_title' // Admin unvanı
    ];

    // 3. ADIM: Hesabın olması gereken ideal profilini oluştur
    const adminProfile = {
      // Temel bilgiler
      uid: uid,
      displayName: 'FaTaLRhymeR37',
      email: email,
      role: 'admin',
      bio: 'Bu dijital evrenin yaratıcısı. Kurallar benim tarafından yazılır.',
      avatarUrl: '/avatars/varsayilan.jpg', // Dilerseniz özel bir admin avatarı yapabilirsiniz

      // Skor ve Başarımlar
      score: 405000,
      highestScore: 405000,
      achievements: allAchievements,
      level: 100,
      experience: 1000000,

      // Aktivite
      messageCount: 5000,
      playedGames: ['game1', 'game2'],
      totalPlayTime: 100000,
      favoriteGame: 'Retro Games',
      lastLogin: new Date(),

      // Tarihler
      createdAt: new Date('2023-01-01'), // Hesabı "eski" göstermek için
      updatedAt: new Date(),
      joinDate: new Date('2023-01-01'),

      // Diğer alanlar (Eğer varsa ve varsayılan değerde kalmayacaksa)
      isOnline: false,
      friends: [],
      blockedUsers: [],
      notificationsEnabled: true,
      theme: 'dark',
      language: 'tr',
      // Eğer veritabanınızda bu alanlar varsa ekleyebilirsiniz
      // gender: 'male', 
      // clanId: null,
      // mutedUntil: null
    };

    console.log('Oluşturulan yeni profil verisi:', adminProfile);
    console.log('Bu veri Firestore\'a yazılacak...');

    // 4. ADIM: Firestore'daki veriyi bu yeni profille tamamen GÜNCELLE
    // setDoc komutu, users koleksiyonunda belirtilen UID'li belgeyi bulur ve
    // içeriğini tamamen adminProfile nesnesiyle değiştirir.
    await setDoc(doc(db, 'users', uid), adminProfile);

    console.log('----------------------------------------------------');
    console.log('✅ BAŞARILI: Admin hesabı başarıyla geri yüklendi!');
    console.log('Firebase Konsolu\'ndan verileri kontrol edebilirsiniz.');
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('❌ HATA: İşlem sırasında bir sorun oluştu!');
    console.error('Hata Mesajı:', error.message);
    if (error.code === 'auth/wrong-password') {
        console.error('-> Şifre yanlış olabilir. Lütfen kontrol edin.');
    } else if (error.code === 'auth/user-not-found') {
        console.error('-> Bu e-posta adresi ile bir kullanıcı bulunamadı.');
    }
  }
}

// Fonksiyonu çalıştır
restoreAdminAccount();