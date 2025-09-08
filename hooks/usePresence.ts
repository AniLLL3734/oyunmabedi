import { useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { getDatabase, ref, onValue, onDisconnect, set } from 'firebase/database';
import { auth } from '../src/firebase';

export const usePresence = () => {
    const { user } = useAuth();
    
    useEffect(() => {
        if (!user) return;
        
        const db = getDatabase();
        const myConnectionsRef = ref(db, `users/${user.uid}/connections`);
        const lastOnlineRef = ref(db, `users/${user.uid}/lastOnline`);
        const connectedRef = ref(db, '.info/connected');

        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                const con = set(myConnectionsRef, true);
                
                onDisconnect(myConnectionsRef).remove();
                onDisconnect(lastOnlineRef).set(Date.now());
            }
        });
    }, [user]);
};