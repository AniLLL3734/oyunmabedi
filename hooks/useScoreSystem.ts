// DOSYA: hooks/useScoreSystem.ts (DEĞİŞKEN ADI HATASI DÜZELTİLMİŞ NİHAİ VERSİYON)

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

// Skor ve AFK ayarları (milisaniye cinsinden) - SENİN DÜZENLEDİĞİN DEĞERLERLE
const PASSIVE_SCORE_INTERVAL = 10 * 60 * 1000;  // 10 Dakika
const AFK_TIMEOUT = 5 * 60 * 1000;             // 5 Dakika
const SCORE_AMOUNT = 125;                      // 125 Skor

let isScoreSystemActive = false;

export const useScoreSystem = (): boolean => {
  const { user } = useAuth();
  const [isAfk, setIsAfk] = useState(false);
  const scoreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const afkTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && !isScoreSystemActive) {
        isScoreSystemActive = true;

        const setAfkStatus = (status: boolean) => {
            setIsAfk(status);
            if (status) {
                document.body.classList.add('user-is-afk');
            } else {
                document.body.classList.remove('user-is-afk');
            }
        };

        const stopScoreInterval = () => {
            if (scoreIntervalRef.current) {
                clearInterval(scoreIntervalRef.current);
                scoreIntervalRef.current = null;
            }
        };

        const startScoreInterval = () => {
            if (scoreIntervalRef.current) return;
            scoreIntervalRef.current = setInterval(async () => {
                if (document.hidden) return;
                const userRef = doc(db, 'users', user.uid);
                try {
                    await setDoc(userRef, { score: increment(SCORE_AMOUNT) }, { merge: true });
                    console.log(`[AKTİF & AFK DEĞİL] ${user.displayName} ${SCORE_AMOUNT} skor kazandı!`);
                } catch (error) {
                    console.error("Skor güncellenirken hata oluştu:", error);
                }
            // ==========================================================
            //                 İŞTE DÜZELTME BURADA
            // ==========================================================
            }, PASSIVE_SCORE_INTERVAL); // 'SCORE_INTERVAL' yerine 'PASSIVE_SCORE_INTERVAL' kullanıldı
            // ==========================================================
        };
        
        const resetAfkTimer = () => {
            setAfkStatus(false);
            if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
            if (!scoreIntervalRef.current && !document.hidden) {
                startScoreInterval();
                console.log('Kullanıcı aktivitesi algılandı. Skor sayacı başlatıldı.');
            }
            
            afkTimerRef.current = setTimeout(() => {
                stopScoreInterval();
                setAfkStatus(true);
                console.log('Kullanıcı AFK durumuna geçti. Skor sayacı durduruldu.');
            }, AFK_TIMEOUT);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopScoreInterval();
                if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
                setAfkStatus(false);
                console.log('Sekme arka plana alındı. Tüm sayaçlar durduruldu.');
            } else {
                console.log('Sekmeye geri dönüldü.');
                resetAfkTimer();
            }
        };
        
        const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

        if (!document.hidden) {
            resetAfkTimer();
        }
        
        activityEvents.forEach(event => window.addEventListener(event, resetAfkTimer));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopScoreInterval();
            if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
            activityEvents.forEach(event => window.removeEventListener(event, resetAfkTimer));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            isScoreSystemActive = false;
            setAfkStatus(false);
        };

    }
  }, [user]);

  return isAfk;
};