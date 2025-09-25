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

export const useActiveUsers = () => {
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchActiveUsers = async () => {
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
                console.error('Failed to fetch active users (Did you create the Firestore index?):', error);
            } finally {
                if (isMounted && loading) {
                    setLoading(false);
                }
            }
        };

        fetchActiveUsers();
        
        const intervalId = setInterval(fetchActiveUsers, 60 * 1000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [loading]);

    return { activeUsers, loading };
};