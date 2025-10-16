import { config } from 'dotenv';
// .env.local dosyasındaki çevre değişkenlerini yükle
config({ path: '.env.local' });
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';

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
async function updateAdminRole() {
  try {
    // Admin hesabının giriş bilgileri (örnek olarak FaTaLRhymeR37 kullanıyoruz, ama aslında herhangi bir admin ile giriş yapabiliriz)
    const email = 'fatalrhymer37@ttmtal.com';
    const password = 'Kastamonu37'; // Doğru şifre olduğundan emin olun

    console.log(`'${email}' ile giriş yapılıyor...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('Giriş başarılı! UID:', user.uid);

    // Güncellenecek kullanıcının displayName'i
    const targetDisplayName = 'Padişah2.admın';

    // Kullanıcıyı displayName ile bulmak için (alternatif olarak UID'yi doğrudan kullanabilirsiniz)
    // Önce tüm kullanıcıları çekmek yerine, eğer UID biliyorsanız doğrudan kullanın.
    // Burada örnek olarak displayName ile arayacağız, ama gerçekte UID daha güvenilir.

    // NOT: Firestore'da displayName ile sorgu yapmak için index gerekebilir.
    // Daha iyi yöntem: Kullanıcının UID'sini bilmek.

    // Eğer UID'yi biliyorsanız, doğrudan kullanın. Örneğin:
    // const targetUid = 'USER_UID_HERE';

    // Şimdilik, displayName ile bulmaya çalışalım (ama bu verimsiz ve index gerektirebilir)
    // Daha iyi: Kullanıcıyı manuel olarak Firebase Console'dan bulun ve UID'yi alın.

    // Örnek olarak, eğer UID'yi biliyorsanız:
    // const targetUid = 'WXdz4GWVqTb9SwihXFN9nh0LJVn2'; // Bu FaTaLRhymeR37 için, değiştirin

    // Kullanıcıdan UID'yi sormak yerine, script'i UID ile çalışacak şekilde düzenleyin.
    // Ama şimdilik, varsayalım ki UID'yi biliyoruz veya console'dan alacağız.

    // Alternatif: Tüm kullanıcıları çek ve displayName ile eşleştir (küçük veritabanı için)
    // Bu, production'da önerilmez.

    console.log(`Kullanıcı '${targetDisplayName}' için rol güncelleniyor...`);

    // Eğer UID'yi biliyorsanız, doğrudan kullanın.
    // Kullanıcıdan UID'yi alınması gerekiyor, ama script için placeholder.

    // Script'i UID ile çalışacak şekilde düzenleyelim.
    // Kullanıcıya UID'yi sormak yerine, Firebase Console'dan alın.

    // Placeholder: Kullanıcının UID'sini buraya koyun.
    // Padişah2.admın'ın UID'sini Firebase Console'dan alın.
    // Şimdilik, displayName ile arama yapalım (küçük DB için)

    // Tüm kullanıcıları çek ve displayName ile eşleştir
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    let targetUid = null;
    querySnapshot.forEach((doc) => {
      if (doc.data().displayName === targetDisplayName) {
        targetUid = doc.id;
      }
    });

    if (!targetUid) {
      console.error(`Kullanıcı '${targetDisplayName}' bulunamadı.`);
      return;
    }

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error('Kullanıcı bulunamadı:', targetUid);
      return;
    }

    const userData = userSnap.data();
    console.log('Mevcut kullanıcı verisi:', userData);

    // Rolü admin olarak güncelle
    await updateDoc(userRef, {
      role: 'admin',
      score: 99999, // Admin skoru
      achievements: [ // Tüm başarımları ver
        'first_login',
        'pixel_whisper',
        'chat_initiate',
        'frequency_echo',
        'interdimensional_traveler',
        'scholar_of_the_code',
        'time_lord',
        'void_caller',
        'legend_of_ttmtal',
        'architect_title'
      ]
    });

    console.log('----------------------------------------------------');
    console.log('✅ BAŞARILI: Kullanıcı rolü admin olarak güncellendi!');
    console.log('Firebase Konsolu\'ndan verileri kontrol edebilirsiniz.');
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('❌ HATA: İşlem sırasında bir sorun oluştu!');
    console.error('Hata Mesajı:', error.message);
  }
}

// Fonksiyonu çalıştır
updateAdminRole();
