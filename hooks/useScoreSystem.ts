// hooks/useScoreSystem.ts

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext'; // AuthContext yolun doğru olduğundan emin ol
import { db } from '../src/firebase'; // firebase config yolun doğru olduğundan emin ol
import { updateDoc, increment, serverTimestamp, doc } from 'firebase/firestore';

// Ayarlar
const PASSIVE_SCORE_INTERVAL = 5 * 60 * 1000;  // 5 Dakika (İstemci tarafı zamanlayıcı)
const SCORE_AMOUNT = 125;                     // Verilecek temel skor miktarı
const MAX_CLICKS_PER_SECOND = 100;            // Basit tıklama koruması
const PERFECT_INTERVAL_STREAK_LIMIT = 10;     // Basit makro koruması

// Sekmeler arası iletişim için Broadcast Channel
// Bu, kullanıcının 10 sekme açıp 10 katı skor almasını engeller.
const leaderChannel = new BroadcastChannel('score_system_leader');

/**
 * Pasif skor kazanma, hile koruması ve sekmeler arası liderlik sistemini yöneten hook.
 * Yalnızca tek bir tarayıcı sekmesi "lider" olarak skor güncelleme isteklerini gönderir.
 * @returns { isBlocked: boolean } - Kullanıcının istemci tarafı hile tespitiyle engellenip engellenmediğini belirtir.
 */
export const useScoreSystem = (): { isBlocked: boolean } => {
  const { user, userData } = useAuth(); // userData'yı da context'ten alıyoruz
  const [isLeader, setIsLeader] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Referanslar (re-render tetiklemez)
  const scoreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const leaderPingRef = useRef<NodeJS.Timeout | null>(null);
  const tabId = useRef(Date.now().toString(36) + Math.random().toString(36).substring(2)); // Daha benzersiz bir ID

  // Basit hile tespiti için referanslar
  const clickTimestamps = useRef<number[]>([]);
  const lastClickInfo = useRef({ time: 0, interval: 0, streak: 0 });

  // Liderlikten çekilme ve tüm zamanlayıcıları temizleme
  const abdicateLeadership = (reason: string) => {
    if (!isLeader) return;
    
    // Zamanlayıcıları temizle
    if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
    if (leaderPingRef.current) clearInterval(leaderPingRef.current);
    scoreIntervalRef.current = null;
    leaderPingRef.current = null;

    // Liderlik durumunu sıfırla
    setIsLeader(false);
    
    // Aktivite dinleyicilerini kaldır
    window.removeEventListener('mousedown', handleUserActivity);

    console.warn(`[Sekme ID: ${tabId.current}] Liderlikten çekildi. Sebep: ${reason}`);
  };

  // Skor güncelleme isteğini Firestore'a gönderen fonksiyon
  const requestScoreUpdate = async () => {
    // Kullanıcı yoksa veya bu sekme lider değilse işlemi anında iptal et
    if (!user || !isLeader) {
      stopScoreSystem("Kullanıcı veya liderlik durumu geçersiz.");
      return;
    }

    try {
      console.log(`%c[LİDER SEKME] Firestore'a skor güncellemesi gönderiliyor...`, "color: #007bff;");
      
      const userRef = doc(db, 'users', user.uid);
      
      // Firestore kuralının beklediği tüm alanları içeren payload
      const payload = {
        score: increment(SCORE_AMOUNT), // Skor artışı
        lastScoreGrantedAt: serverTimestamp() // Zaman damgası (kural bu alanı kontrol ediyor)
      };

      await updateDoc(userRef, payload);

      console.log(`%c[LİDER SEKME] Skor başarıyla güncellendi.`, "color: #25D366;");

    } catch (error: any) {
      console.error("[LİDER SEKME] Skor güncellenirken bir hata oluştu:", error.message);
      
      // Eğer hata "permission-denied" ise, bu Firestore kuralının bizi engellediği anlamına gelir.
      // Bu durum, kullanıcının başka bir cihazda veya hileyle zamanından önce skor almaya
      // çalıştığını gösterir. Bu sekmenin liderlikten çekilmesi en doğrusu olur.
      if (error.code === 'permission-denied') {
        abdicateLeadership("Anti-hile kuralları tarafından engellendi. Başka bir sekme/cihaz lider olabilir.");
      }
    }
  };

  // Skor kazanma interval'ini başlatan fonksiyon
  const startScoreInterval = () => {
    // Zaten çalışan bir interval varsa veya kullanıcı yoksa başlatma
    if (scoreIntervalRef.current || !user) return;

    console.log(`[LİDER SEKME] Skor sayacı başladı. Her ${PASSIVE_SCORE_INTERVAL / 60000} dakikada bir skor istenecek.`);
    
    // Önce bir kez hemen dene, sonra interval başlat
    requestScoreUpdate(); 
    scoreIntervalRef.current = setInterval(requestScoreUpdate, PASSIVE_SCORE_INTERVAL);
  };

  // Tüm skor sistemini durduran ana fonksiyon
  const stopScoreSystem = (reason: string) => {
    if (scoreIntervalRef.current) {
      clearInterval(scoreIntervalRef.current);
      scoreIntervalRef.current = null;
      console.log(`[Sekme ID: ${tabId.current}] Skor sistemi durduruldu. Sebep: ${reason}`);
    }
  };

  // Hile tespitinde sistemi kilitleyen ve liderlikten çeken fonksiyon
  const blockUserAndStopSystem = (reason: string) => {
    console.error(`İSTEMCİ TARAFLI HİLE TESPİTİ! Sebep: ${reason}. Sistem kilitlendi.`);
    setIsBlocked(true);
    if (isLeader) {
      abdicateLeadership("Hile tespit edildi");
    } else {
      stopScoreSystem("Hile tespit edildi");
    }
    // Hile yapan sekmenin diğer sekmelerle iletişimini kes
    leaderChannel.close();
  };

  // Basit düzeyde istemci tarafı aktivite denetimi
  const handleUserActivity = (event: MouseEvent) => {
    if (isBlocked) return;

    const now = Date.now();

    // 1. Anormal tıklama sıklığı kontrolü (CPS)
    clickTimestamps.current = [...clickTimestamps.current, now].filter(t => now - t < 1000);
    if (clickTimestamps.current.length > MAX_CLICKS_PER_SECOND) {
      blockUserAndStopSystem(`Anormal tıklama sıklığı (CPS > ${MAX_CLICKS_PER_SECOND}).`);
      return;
    }

    // 2. Mükemmel tıklama aralığı kontrolü (Makro/Auto-clicker şüphesi)
    const newInterval = now - lastClickInfo.current.time;
    if (newInterval > 0 && newInterval < 100 && newInterval === lastClickInfo.current.interval) {
      lastClickInfo.current.streak++;
    } else {
      lastClickInfo.current.streak = 0;
    }
    lastClickInfo.current = { time: now, interval: newInterval, streak: lastClickInfo.current.streak };

    if (lastClickInfo.current.streak >= PERFECT_INTERVAL_STREAK_LIMIT) {
      blockUserAndStopSystem("Mükemmel tıklama aralığı serisi (Makro şüphesi).");
    }
  };


  // --- LİDER SEÇME ve SİSTEMİ BAŞLATMA MEKANİZMASI ---
  useEffect(() => {
    // Kullanıcı giriş yapmadıysa veya sistem kilitlendiyse hiçbir şey yapma
    if (!user || isBlocked) {
      abdicateLeadership("Kullanıcı yok veya sistem kilitli.");
      return;
    }
    
    let leadershipTimeout: NodeJS.Timeout | null = null;
    
    // Bu sekme lider olabilir mi diye kontrol edip liderliği devralır
    const tryToBecomeLeader = () => {
      // Rastgele bir gecikmeyle lider olmaya çalışarak yarış durumunu engelle
      leadershipTimeout = setTimeout(() => {
        setIsLeader(true);
      }, 1000 + Math.random() * 1500);
    };

    // Diğer sekmelerden gelen mesajları dinle
    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data.type === 'ping') {
        // Eğer bu sekme liderse VE ping başka bir sekmeden geliyorsa, liderlikten çekil
        if (isLeader && event.data.id !== tabId.current) {
          abdicateLeadership("Başka bir aktif lider algılandı.");
        }
        // Lider olmaya çalışıyorduk ama başka lider ping attı, lider olma denemesini iptal et
        if (leadershipTimeout) {
          clearTimeout(leadershipTimeout);
          leadershipTimeout = null;
        }
      }
    };
    
    leaderChannel.addEventListener('message', handleChannelMessage);
    tryToBecomeLeader(); // Lider olma sürecini başlat

    // Component unmount edildiğinde temizlik yap
    return () => {
      abdicateLeadership("Component temizleniyor.");
      leaderChannel.removeEventListener('message', handleChannelMessage);
      if (leadershipTimeout) clearTimeout(leadershipTimeout);
    };
  }, [user, isBlocked]); // Sadece kullanıcı veya blok durumu değiştiğinde bu mantığı yeniden çalıştır

  // Liderlik durumu değiştiğinde sistemin durumunu yönet
  useEffect(() => {
    if (isLeader) {
      console.log(`%c[Sekme ID: ${tabId.current}] Bu sekme lider oldu! Skor sistemi aktif.`, "background: #222; color: #bada55");
      startScoreInterval(); // Skor sayacını başlat
      
      // Lider olduğunu diğer sekmelere düzenli olarak bildir
      leaderPingRef.current = setInterval(() => {
        leaderChannel.postMessage({ type: 'ping', id: tabId.current });
      }, 2000);

      // Lider sekme, hile tespiti için kullanıcı aktivitelerini dinler
      window.addEventListener('mousedown', handleUserActivity);

    } else {
      // Lider değilse, tüm sistemleri durdur ve dinleyicileri kaldır
      stopScoreSystem("Bu sekme lider değil.");
      if (leaderPingRef.current) clearInterval(leaderPingRef.current);
      leaderPingRef.current = null;
      window.removeEventListener('mousedown', handleUserActivity);
    }
  }, [isLeader]); // Sadece liderlik durumu değiştiğinde bu mantığı çalıştır


  return { isBlocked };
};