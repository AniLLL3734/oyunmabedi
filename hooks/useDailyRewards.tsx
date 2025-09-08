// DOSYA: hooks/useDailyRewards.ts

import { useEffect } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { db } from "../src/firebase";
import { doc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Gift } from "lucide-react";

const isSameDay = (date1: Date, date2: Date) => {
    // Eğer tarihlerden biri null veya undefined ise, false dön.
    if (!date1 || !date2) return false;
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

export const useDailyRewards = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const checkDailyLogin = async () => {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) return;

            const userData = userSnap.data();
            const today = new Date();
            // Firestore'dan gelen tarihi güvenli bir şekilde Date objesine çevir.
            const lastLoginDate = userData.lastLogin?.toDate();
            
            // Kullanıcı bugün zaten giriş ödülü almamışsa devam et.
            if (!isSameDay(lastLoginDate, today)) {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                // Giriş serisini hesapla: eğer son giriş dündeyse seriyi artır, değilse 1 yap.
                const newStreak = (lastLoginDate && isSameDay(lastLoginDate, yesterday)) 
                                    ? (userData.loginStreak || 0) + 1 
                                    : 1;
                
                // Ödül miktarını seriye göre artır.
                const rewardAmount = 100 + (newStreak * 25); 

                await setDoc(userRef, {
                    score: increment(rewardAmount),
                    loginStreak: newStreak,
                    lastLogin: serverTimestamp() // Sunucu saatine göre bugünün tarihini kaydet.
                }, { merge: true });

                // Bildirimi göster.
                toast.custom((t) => (
                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} flex items-center gap-4 bg-dark-gray p-4 rounded-lg shadow-lg border border-yellow-400`}>
                        <Gift className="text-yellow-400" size={32}/>
                        <div>
                            <p className="font-bold text-ghost-white">Günlük Giriş Ödülü!</p>
                            <p className="text-cyber-gray">{newStreak} günlük seri için +{rewardAmount} skor kazandın!</p>
                        </div>
                    </div>
                ), { duration: 5000 });
            }
        };
        
        // Bu fonksiyon, kullanıcı giriş yaptıktan 3 saniye sonra bir kere çalışır.
        const timer = setTimeout(checkDailyLogin, 3000); 
        return () => clearTimeout(timer);

    }, [user]);
};