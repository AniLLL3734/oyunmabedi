// DOSYA: hooks/useScoreSystem.ts (HİLEYE KARŞI GÜVENLİ VERSİYON)

import { useEffect, useRef } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

// Skor kazanma ayarları
const SCORE_INTERVAL = 5 * 60 * 1000; // 5 Dakika
const SCORE_AMOUNT = 125;

export const useScoreSystem = () => {
  const { user } = useAuth();
  // `intervalId`'yi useRef ile saklamak, render'lar arasında kaybolmasını engeller.
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Sadece kullanıcı giriş yapmışsa sistemi çalıştır
    if (user) {
        
        // Skor verme işlemini başlatan fonksiyon
        const startScoreInterval = () => {
            // Eğer zaten çalışan bir zamanlayıcı varsa, tekrar başlatma (önlem amaçlı)
            if (intervalIdRef.current) return;

            // Zamanlayıcıyı başlat ve referansını sakla
            intervalIdRef.current = setInterval(async () => {
                const userRef = doc(db, 'users', user.uid);
                try {
                    // merge:true yerine doğrudan increment kullanmak daha verimlidir.
                    // setDoc yerine updateDoc daha uygun olabilir ama increment ile setDoc de çalışır.
                    await setDoc(userRef, { score: increment(SCORE_AMOUNT) }, { merge: true });
                    console.log(`AKTİF KULLANICI ${user.displayName} ${SCORE_AMOUNT} skor kazandı!`);
                } catch (error) {
                    console.error("Skor güncellenirken hata oluştu:", error);
                }
            }, SCORE_INTERVAL);
            console.log('Kullanıcı sekmeye aktif. Skor sistemi başlatıldı/devam ediyor.');
        };

        // Skor verme işlemini durduran fonksiyon
        const stopScoreInterval = () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null; // Referansı temizle
                console.log('Kullanıcı sekmeden ayrıldı veya aktif değil. Skor sistemi durduruldu.');
            }
        };

        // Tarayıcının sekme görünürlüğü değiştiğinde bu fonksiyon çalışacak
        const handleVisibilityChange = () => {
            // Eğer sekme GİZLENDİYSE (kullanıcı başka sekmeye geçtiyse veya tarayıcıyı küçülttüyse)
            if (document.hidden) {
                stopScoreInterval();
            } 
            // Eğer sekme GÖRÜNÜR OLDUYSA
            else {
                startScoreInterval();
            }
        };

        // Başlangıçta, eğer sayfa zaten görünürse zamanlayıcıyı başlat
        if (!document.hidden) {
            startScoreInterval();
        }

        // Sekme görünürlüğü değiştiğinde `handleVisibilityChange` fonksiyonunu dinle
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Component DOM'dan kaldırıldığında (kullanıcı çıkış yaptığında vb.)
        // hem zamanlayıcıyı hem de dinleyiciyi temizle. Bu ÇOK ÖNEMLİDİR!
        return () => {
            stopScoreInterval();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };

    }
  }, [user]); // Bu useEffect sadece kullanıcı durumu değiştiğinde yeniden çalışır
};