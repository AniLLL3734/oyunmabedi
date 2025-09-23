// DOSYA: hooks/useScoreSystem.ts (ANTI-CHEAT + LİDER SEKME + AFK)

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { db, auth } from '../src/firebase';
import { doc, setDoc, increment, getDoc } from 'firebase/firestore';

// Ayarlar
const PASSIVE_SCORE_INTERVAL = 5 * 60 * 1000; // 5 Dakika

const AFK_TIMEOUT = 3 * 60 * 60 * 1000; // 3 Saat (3 saat * 60 dakika * 60 saniye * 1000 milisaniye)
const SCORE_AMOUNT = 500;                      // 125 Skor olarak güncellendi
// === AUTO CLICKER TESPİT AYARLARI ===
const MAX_CLICKS_PER_SECOND = 20;        // Saniyede izin verilen maksimum tıklama
const PERFECT_INTERVAL_STREAK_LIMIT = 5; // Makro tespiti için mükemmel aralıklı tıklama serisi limiti

// Sekmeler arası iletişim için kanal
const leaderChannel = new BroadcastChannel('score_system_leader_channel');

export const useScoreSystem = (): { isAfk: boolean, isBlocked: boolean } => {
  const { user } = useAuth();
  const [isAfk, setIsAfk] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  
  const scoreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const afkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaderPingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Her sekmeye benzersiz bir kimlik ata
  const tabId = useRef(Math.random().toString(36).substring(2, 9));
  
  // Anti-cheat için tıklama zaman damgalarını tut
  const clickTimestamps = useRef<number[]>([]);
  const lastClickInfo = useRef({ time: 0, interval: 0, streak: 0 });

  useEffect(() => {
    // Kullanıcı giriş yapmadıysa veya zaten engellenmişse sistemi çalıştırma
    if (!user || isBlocked) {
        return; 
    }

    // Vücuda (body) afk class'ı ekleyip çıkararak CSS ile stil vermeyi kolaylaştırır
    const setAfkStatus = (status: boolean) => {
        setIsAfk(status);
        if (status) {
            document.body.classList.add('user-is-afk');
        } else {
            document.body.classList.remove('user-is-afk');
        }
    };

    // Tüm zamanlayıcıları temizleyen merkezi fonksiyon
    const stopScoreAndAfkTimers = (reason: string) => {
        if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
        scoreIntervalRef.current = null;
        if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
        afkTimerRef.current = null;
        console.log(`[Sekme ID: ${tabId.current}] Skor ve AFK sayaçları durduruldu. Sebep: ${reason}`);
    };
    
    // Hile tespit edildiğinde kullanıcıyı engelle ve tüm sistemi durdur
    const blockUserAndStopSystem = (reason: string) => {
        console.error(`HİLE TESPİT EDİLDİ! Sebep: ${reason}. Sistem kullanıcı için tamamen durduruluyor.`);
        setIsBlocked(true);
        abdicateLeadership("Hile tespit edildi");
        leaderChannel.close(); // Bu sekmenin diğer sekmelerle iletişimini tamamen kes
    };

    // Geçici başarımları kontrol et ve skor çarpanını hesapla
    const getScoreMultiplier = async (): Promise<number> => {
        if (!user) return 1;
        
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) return 1;
            
            const userData = userSnap.data();
            const inventory = userData.inventory || {};
            const tempAchievements = inventory.temporaryAchievements || [];
            
            let multiplier = 1;
            const now = new Date();
            
            // Aktif geçici başarımları kontrol et
            for (const achievement of tempAchievements) {
                const expiresAt = achievement.expiresAt?.toDate ? achievement.expiresAt.toDate() : new Date(achievement.expiresAt);
                
                if (expiresAt > now) {
                    switch (achievement.id) {
                        case 'speed_demon_24h':
                            multiplier = Math.max(multiplier, 2); // 2x çarpan
                            break;
                        case 'time_lord_7d':
                            multiplier = Math.max(multiplier, 3); // 3x çarpan
                            break;
                    }
                }
            }
            
            return multiplier;
        } catch (error) {
            console.error("Skor çarpanı hesaplanırken hata:", error);
            return 1;
        }
    };

    // AFK süresini hesapla (geçici başarımlara göre)
    const getAfkTimeout = async (): Promise<number> => {
        if (!user) return AFK_TIMEOUT;
        
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) return AFK_TIMEOUT;
            
            const userData = userSnap.data();
            const inventory = userData.inventory || {};
            const tempAchievements = inventory.temporaryAchievements || [];
            
            let timeout = AFK_TIMEOUT; // Varsayılan 1 saat
            const now = new Date();
            
            // Aktif geçici başarımları kontrol et
            for (const achievement of tempAchievements) {
                const expiresAt = achievement.expiresAt?.toDate ? achievement.expiresAt.toDate() : new Date(achievement.expiresAt);
                
                if (expiresAt > now && achievement.id === 'afk_master_24h') {
                    timeout = 3 * 60 * 60 * 1000; // 3 saat
                    break;
                }
            }
            
            return timeout;
        } catch (error) {
            console.error("AFK süresi hesaplanırken hata:", error);
            return AFK_TIMEOUT;
        }
    };

    // Pasif skor kazandıran interval'i başlatan fonksiyon
    const startScoreInterval = () => {
        if (scoreIntervalRef.current) return; // Zaten çalışıyorsa tekrar başlatma

        console.log(`[Sekme ID: ${tabId.current}] Skor sayacı başladı. Her ${PASSIVE_SCORE_INTERVAL / 60000} dakikada bir skor verilecek.`);

        scoreIntervalRef.current = setInterval(async () => {
            if (!auth.currentUser) {
                stopScoreAndAfkTimers("Kullanıcı çıkış yapmış.");
                return;
            }
            
            const userRef = doc(db, 'users', auth.currentUser.uid);
            try {
                // Skor çarpanını hesapla
                const multiplier = await getScoreMultiplier();
                const finalScoreAmount = SCORE_AMOUNT * multiplier;

                // Mevcut skoru ve en yüksek skoru kontrol et
                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();
                const currentScore = (userData?.score || 0) + finalScoreAmount;
                
                // Güncellenecek verileri hazırla
                const updateData: any = { score: increment(finalScoreAmount) };
                
                // En yüksek skor güncellenmesi gerekiyorsa
                if (!userData?.highestScore || currentScore > userData.highestScore) {
                    updateData.highestScore = currentScore;
                }
                
                await setDoc(userRef, updateData, { merge: true });
                
                if (multiplier > 1) {
                    console.log(`%c[Sekme ID: ${tabId.current}] ${finalScoreAmount} skor verildi (${multiplier}x çarpan aktif).`, "color: #25D366;");
                } else {
                    console.log(`%c[Sekme ID: ${tabId.current}] ${finalScoreAmount} skor verildi.`, "color: #25D366;");
                }
            } catch (error) {
                console.error("Skor güncellenirken hata:", error);
            }
        }, PASSIVE_SCORE_INTERVAL);
    };
    
    // Kullanıcı aktivitesini dinleyip AFK sayacını sıfırlayan fonksiyon
    const resetAfkTimer = (event?: Event) => {
        if (isBlocked) return;

        // Anti-Cheat: Tıklama aktivitesini analiz et
        if (event && event.type === 'mousedown') {
            const now = Date.now();
            // Son 1 saniyedeki tıklamaları tut
            clickTimestamps.current = [...clickTimestamps.current, now].filter(t => now - t < 1000);

            // CPS (Click Per Second) kontrolü
            if (clickTimestamps.current.length > MAX_CLICKS_PER_SECOND) {
                blockUserAndStopSystem(`Anormal tıklama sıklığı (CPS > ${MAX_CLICKS_PER_SECOND}).`);
                return;
            }

            // Mükemmel aralıklı tıklama kontrolü (auto-clicker/macro tespiti)
            const newInterval = now - lastClickInfo.current.time;
            if (newInterval > 0 && newInterval < 100 && newInterval === lastClickInfo.current.interval) {
                lastClickInfo.current.streak++;
            } else {
                lastClickInfo.current.streak = 0;
            }
            lastClickInfo.current = { time: now, interval: newInterval, streak: lastClickInfo.current.streak };

            if (lastClickInfo.current.streak >= PERFECT_INTERVAL_STREAK_LIMIT) {
                blockUserAndStopSystem("Mükemmel tıklama aralığı serisi (Makro şüphesi).");
                return;
            }
        }
        
        // AFK durumundan çık ve sayaçları yeniden başlat/sıfırla
        if (isAfk) setAfkStatus(false);
        if (afkTimerRef.current) clearTimeout(afkTimerRef.current);

        // Eğer skor sayacı durmuşsa (örn. AFK sonrası ilk aktivite), yeniden başlat
        if (!scoreIntervalRef.current && isLeader) {
            startScoreInterval();
        }

        // AFK süresini dinamik olarak hesapla
        getAfkTimeout().then(timeout => {
            afkTimerRef.current = setTimeout(() => {
                stopScoreAndAfkTimers("AFK Zaman Aşımı");
                setAfkStatus(true);
            }, timeout);
        });
    };
    
    // Liderlikten çekilme fonksiyonu
    const abdicateLeadership = (reason: string) => {
        if (!isLeader) return;
        setIsLeader(false);
        stopScoreAndAfkTimers(reason); // Liderliği bırakınca sayaçları durdur
        if (leaderPingRef.current) clearInterval(leaderPingRef.current);
        leaderPingRef.current = null;

        // Lider olmadığı için aktivite dinleyicilerini kaldır
        const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        activityEvents.forEach(event => window.removeEventListener(event as any, resetAfkTimer));
        
        console.warn(`[Sekme ID: ${tabId.current}] Liderlikten çekildi. Sebep: ${reason}`);
    };

    // Lider olma fonksiyonu
    const becomeLeader = () => {
        if (isLeader || isBlocked) return;
        setIsLeader(true);
        console.log(`%c[Sekme ID: ${tabId.current}] Bu sekme lider oldu!`, "background: #222; color: #bada55");

        // Skor sayacını hemen başlat
        startScoreInterval();

        // Diğer sekmelere lider olduğunu bildirmek için periyodik "ping" gönder
        leaderPingRef.current = setInterval(() => {
            leaderChannel.postMessage({ type: 'ping', id: tabId.current });
        }, 2000);
        
        // Aktivite dinleyicilerini ekle
        const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        activityEvents.forEach(event => window.addEventListener(event as any, resetAfkTimer));
        
        resetAfkTimer(); // AFK sayacını başlat
    };

    // Başka bir sekmeden mesaj geldiğinde çalışacak fonksiyon
    const handleChannelMessage = (event: MessageEvent) => {
        // Eğer bu sekme lider değilse ve bir lider seçme çağrısı varsa (ki burada yok, sadece ping var)
        // ya da bu sekme liderse ve başka bir liderden ping gelirse
        if (event.data.type === 'ping' && event.data.id !== tabId.current && isLeader) {
            abdicateLeadership("Başka bir aktif lider algılandı");
        }
    };
    
    // Yeni bir lider seçmek için rastgele bir gecikme sonrası tekrar deneme mantığı
    const tryToBecomeLeader = () => {
        // Lider yoksa veya mevcut liderden 3 saniyedir haber alınamıyorsa lider olmaya çalış
        const leadershipTimeout = setTimeout(becomeLeader, 3000 + Math.random() * 1000);
        
        leaderChannel.onmessage = (event) => {
            // Liderlik denemesi sırasında başka bir liderden ping gelirse denemeyi iptal et
            if (event.data.type === 'ping') {
                clearTimeout(leadershipTimeout);
                // Ve bir sonraki denemeyi planla
                tryToBecomeLeader();
            }
        };
    };

    // İlk başta lider olmaya çalış
    tryToBecomeLeader();
    leaderChannel.addEventListener('message', handleChannelMessage);

    // Component unmount olduğunda (sekme kapandığında vb.) tüm dinleyicileri ve zamanlayıcıları temizle
    return () => {
        abdicateLeadership("Component temizleniyor");
        leaderChannel.removeEventListener('message', handleChannelMessage);
        leaderChannel.onmessage = null; // Eski stil dinleyiciyi de temizle
    };
    
  }, [user]); // Yalnızca kullanıcı değiştiğinde tüm bu mantığı yeniden kur

  return { isAfk, isBlocked };
};