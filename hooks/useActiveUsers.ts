// src/hooks/useActiveUsers.ts

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface ActiveUser {
    uid: string;
    displayName: string;
    avatarUrl?: string;
    lastSeen: Timestamp;
    role?: string;
}

// Bu en doğru ve bütçe dostu versiyondur
export const useActiveUsers = () => {
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true; // Component'in bağlı olup olmadığını kontrol et

        const fetchActiveUsers = async () => {
            // Süreyi buradan kolayca değiştirebilirsin (5 dakika)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            const q = query(
                collection(db, 'users'),
                where('lastSeen', '>', Timestamp.fromDate(fiveMinutesAgo))
            );

            try {
                const snapshot = await getDocs(q);
                const users: ActiveUser[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    // lastSeen alanı var mı diye kontrol edelim
                    if (data.lastSeen) {
                         users.push({
                            uid: doc.id,
                            displayName: data.displayName || 'Anonim',
                            avatarUrl: data.avatarUrl,
                            lastSeen: data.lastSeen,
                            role: data.role,
                        });
                    }
                });
                
                users.sort((a, b) => b.lastSeen.toMillis() - a.lastSeen.toMillis());
                
                if (isMounted) {
                    setActiveUsers(users);
                }

            } catch (error) {
                console.error('Aktif kullanıcılar yüklenirken hata (İndeksi oluşturdun mu?):', error);
            } finally {
                if (isMounted && loading) {
                    setLoading(false);
                }
            }
        };

        fetchActiveUsers();
        
        // Her 1 dakikada bir listeyi tekrar çekerek güncelle
        const intervalId = setInterval(fetchActiveUsers, 60 * 1000); 

        // Bileşen kaldırıldığında interval'ı temizle
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [loading]); // `loading` bağımlılığını ekleyerek gereksiz tekrarları önle

    return { activeUsers, loading };
};