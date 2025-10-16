import { useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { dbRTDB } from '../src/firebase';
import { ref, onValue, onDisconnect, set, off } from 'firebase/database';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebase';

export const usePresence = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const myConnectionsRef = ref(dbRTDB, `users/${user.uid}/connections`);
        const lastOnlineRef = ref(dbRTDB, `users/${user.uid}/lastOnline`);
        const connectedRef = ref(dbRTDB, '.info/connected');

        let connectionListener: any;
        let presenceListener: any;

        // Firebase bağlantısını dinle
        connectionListener = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // RTDB'de bağlantıyı işaretle
                set(myConnectionsRef, true);

                // Bağlantı kesildiğinde RTDB'den temizle ve lastOnline'ı güncelle
                onDisconnect(myConnectionsRef).remove();
                onDisconnect(lastOnlineRef).set(Date.now());

                // Firestore'da isOnline durumunu true yap
                const userDocRef = doc(db, 'users', user.uid);
                updateDoc(userDocRef, {
                    isOnline: true,
                    lastSeen: serverTimestamp()
                }).catch(error => console.error('Presence update error:', error));
            }
        });

        // RTDB'deki bağlantı değişikliklerini sürekli dinle ve Firestore'u güncelle
        presenceListener = onValue(myConnectionsRef, (snap) => {
            const isOnline = snap.val() === true;
            const userDocRef = doc(db, 'users', user.uid);
            updateDoc(userDocRef, {
                isOnline: isOnline,
                lastSeen: isOnline ? serverTimestamp() : serverTimestamp()
            }).catch(error => console.error('Presence sync error:', error));
        });

        // Cleanup function
        return () => {
            if (connectionListener) off(connectedRef, connectionListener);
            if (presenceListener) off(myConnectionsRef, presenceListener);
        };

    }, [user]);
};
