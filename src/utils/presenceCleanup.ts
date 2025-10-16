import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ref, remove } from 'firebase/database';
import { dbRTDB } from '../firebase';

/**
 * Eski aktif kullanıcıları temizleyen fonksiyon
 * Firebase çökme durumunda "bugda" kalan kullanıcıları temizler
 */
export const cleanupStalePresence = async () => {
    try {
        console.log('Eski presence verileri temizleniyor...');

        // 15 dakikadan eski lastSeen alanlarını bul
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        const q = query(
            collection(db, 'users'),
            where('lastSeen', '<', Timestamp.fromDate(fifteenMinutesAgo))
        );

        const snapshot = await getDocs(q);
        const staleUsers: string[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.lastSeen) {
                staleUsers.push(doc.id);
            }
        });

        // Eski kullanıcıları temizle
        const cleanupPromises = staleUsers.map(async (userId) => {
            try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    lastSeen: null, // Eski veriyi temizle
                    lastOnlineCheck: null,
                    isOnline: false
                });

                // RTDB'den de temizle
                const connectionsRef = ref(dbRTDB, `users/${userId}/connections`);
                const lastOnlineRef = ref(dbRTDB, `users/${userId}/lastOnline`);
                await remove(connectionsRef);
                await remove(lastOnlineRef);

                console.log(`Kullanıcı ${userId} temizlendi`);
            } catch (error) {
                console.error(`Kullanıcı ${userId} temizlenirken hata:`, error);
            }
        });

        await Promise.all(cleanupPromises);
        console.log(`${staleUsers.length} eski kullanıcı temizlendi`);

    } catch (error) {
        console.error('Presence temizleme hatası:', error);
    }
};

/**
 * Periyodik temizlik sistemi
 * Her 30 dakikada bir çalışır
 */
export const startPeriodicCleanup = () => {
    // İlk temizlik
    cleanupStalePresence();

    // 30 dakikada bir temizlik
    setInterval(cleanupStalePresence, 30 * 60 * 1000);

    console.log('Periyodik presence temizleme sistemi başlatıldı');
};

