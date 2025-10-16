// cleanOnlineStatus.js
const admin = require('firebase-admin');
const serviceAccount = require('C:\\Users\\Administrator\\Downloads\\ttmtal-7b139-firebase-adminsdk-fbsvc-f8c32f1a22.json'); // Firebase konsolundan indirdiğiniz yetki anahtarı

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanAllUsersOnlineStatus() {
  console.log("Temizlik işlemi başlıyor...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log("Hiç kullanıcı bulunamadı.");
    return;
  }

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    // Sadece isOnline alanı true ise güncelleme yap
    if (doc.data().isOnline === true) {
      const userDocRef = usersRef.doc(doc.id);
      batch.update(userDocRef, { isOnline: false });
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`${updateCount} kullanıcının durumu 'false' olarak güncellendi.`);
  } else {
    console.log("Güncellenecek (isOnline: true) kullanıcı bulunamadı.");
  }

  console.log("Temizlik işlemi tamamlandı.");
}

cleanAllUsersOnlineStatus().catch(console.error);
