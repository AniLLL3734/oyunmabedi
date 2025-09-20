// DOSYA: hooks/useScoreSystem.ts

import { useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

// Skor kazanma ayarları
const SCORE_INTERVAL = 5 * 60 * 1000; // 5 Dakika (milisaniye cinsinden)
const SCORE_AMOUNT = 125;

export const useScoreSystem = () => {
  const { user } = useAuth();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const grantScore = async () => {
      if (!user) return; 

      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, { score: increment(SCORE_AMOUNT) }, { merge: true });
        console.log(`${user.displayName} kullanıcısı ${SCORE_AMOUNT} skor kazandı!`);
      } catch (error) {
        console.error("Skor güncellenirken hata oluştu:", error);
      }
    };

    if (user) {
      intervalId = setInterval(grantScore, SCORE_INTERVAL);
      console.log('Skor sistemi aktif. İlk skor 5 dakika içinde verilecek.');
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('Skor sistemi durduruldu.');
      }
    };

  }, [user]);
};