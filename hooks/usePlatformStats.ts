// DOSYA: hooks/usePlatformStats.ts - AdminPage'deki Gerçek İstatistik Sistemi

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  onSnapshot,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '../src/firebase';

export interface PlatformStats {
  totalUsers: number;
  totalGames: number;
  totalMessages: number;
  totalAchievements: number;
  totalScore: number;
  happyMemories: string;
  loading: boolean;
  error: string | null;
  topChatter?: {
    displayName: string;
    messageCount: number;
    uid: string;
  };
}

export const usePlatformStats = (): PlatformStats => {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalGames: 0,
    totalMessages: 0,
    totalAchievements: 0,
    totalScore: 0,
    happyMemories: '∞',
    loading: true,
    error: null
  });

  useEffect(() => {
    // Veda modunda Firebase bağlantısı olmayabilir, varsayılan değerleri kullan
    const loadStats = async () => {
      try {
        if (!db) {
          // Firebase bağlantısı yoksa gerçek değerleri kullan
          setStats({
            totalUsers: 369,
            totalGames: 1051,
            totalMessages: 4873,
            totalAchievements: 3421,
            totalScore: 1200000,
            happyMemories: '∞',
            loading: false,
            error: null,
            topChatter: {
              uid: 'default',
              displayName: 'FaTaLRhymeR37',
              messageCount: 641
            }
          });
          return;
        }

        // Firebase bağlantısı varsa gerçek verileri çek
        const unsubscribeUsers = onSnapshot(
          collection(db, 'users'), 
          (snapshot) => {
            setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
          },
          (error) => {
            console.warn('Kullanıcı verileri çekilemedi, varsayılan değer kullanılıyor:', error);
            setStats(prev => ({ ...prev, totalUsers: 369 }));
          }
        );

        const unsubscribeMessages = onSnapshot(
          collection(db, 'messages'), 
          async (snapshot) => {
            try {
              const now = new Date();
              const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
              
              const messagesLastHour = snapshot.docs.filter(doc => {
                const messageTime = doc.data().createdAt?.toDate();
                return messageTime && messageTime > oneHourAgo;
              }).length;

              // En çok mesaj atan kullanıcıyı bul
              const messageCountByUser = snapshot.docs.reduce((acc, doc) => {
                const uid = doc.data().uid;
                if (uid && uid !== 'system') {
                  acc[uid] = (acc[uid] || 0) + 1;
                }
                return acc;
              }, {} as { [key: string]: number });

              let topChatterId = '';
              let maxMessages = 0;

              Object.entries(messageCountByUser).forEach(([uid, count]) => {
                if (count > maxMessages) {
                  maxMessages = count;
                  topChatterId = uid;
                }
              });

              if (topChatterId) {
                try {
                  const userDoc = await getDoc(doc(db, 'users', topChatterId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setStats(prev => ({ 
                      ...prev, 
                      totalMessages: snapshot.size, 
                      topChatter: {
                        uid: topChatterId,
                        displayName: userData.displayName,
                        messageCount: maxMessages
                      }
                    }));
                    return;
                  }
                } catch (error) {
                  console.warn('Top chatter bilgisi alınamadı:', error);
                }
              }

              setStats(prev => ({ ...prev, totalMessages: snapshot.size }));
            } catch (error) {
              console.warn('Mesaj verileri işlenirken hata:', error);
              setStats(prev => ({ ...prev, totalMessages: 4873 }));
            }
          },
          (error) => {
            console.warn('Mesaj verileri çekilemedi, varsayılan değer kullanılıyor:', error);
            setStats(prev => ({ ...prev, totalMessages: 4873 }));
          }
        );

        const unsubscribeGames = onSnapshot(
          collection(db, 'games'), 
          (snapshot) => {
            try {
              const totalGamesPlayed = snapshot.docs.reduce((sum, doc) => sum + (doc.data().playCount || 0), 0);
              setStats(prev => ({ ...prev, totalGames: totalGamesPlayed }));
            } catch (error) {
              console.warn('Oyun verileri işlenirken hata:', error);
              setStats(prev => ({ ...prev, totalGames: 1051 }));
            }
          },
          (error) => {
            console.warn('Oyun verileri çekilemedi, varsayılan değer kullanılıyor:', error);
            setStats(prev => ({ ...prev, totalGames: 1051 }));
          }
        );

        // Kullanıcı skorlarını hesapla
        const unsubscribeUserScores = onSnapshot(
          collection(db, 'users'), 
          (snapshot) => {
            try {
              let totalScore = 0;
              let totalAchievements = 0;

              snapshot.docs.forEach(doc => {
                const userData = doc.data();
                if (userData.score) {
                  totalScore += userData.score;
                }
                if (userData.achievements && Array.isArray(userData.achievements)) {
                  totalAchievements += userData.achievements.length;
                }
              });

              setStats(prev => ({ 
                ...prev, 
                totalScore,
                totalAchievements,
                loading: false,
                error: null
              }));
            } catch (error) {
              console.warn('Skor verileri işlenirken hata:', error);
              setStats(prev => ({ 
                ...prev, 
                totalScore: 1200000,
                totalAchievements: 3421,
                loading: false,
                error: null
              }));
            }
          },
          (error) => {
            console.warn('Skor verileri çekilemedi, varsayılan değerler kullanılıyor:', error);
            setStats(prev => ({ 
              ...prev, 
              totalScore: 1200000,
              totalAchievements: 3421,
              loading: false,
              error: null
            }));
          }
        );

        return () => {
          unsubscribeUsers();
          unsubscribeMessages();
          unsubscribeGames();
          unsubscribeUserScores();
        };
      } catch (error) {
        console.error('İstatistikler yüklenirken genel hata:', error);
        // Hata durumunda gerçek değerleri kullan
        setStats({
          totalUsers: 369,
          totalGames: 1051,
          totalMessages: 4873,
          totalAchievements: 3421,
          totalScore: 1200000,
          happyMemories: '∞',
          loading: false,
          error: null,
          topChatter: {
            uid: 'default',
            displayName: 'FaTaLRhymeR37',
            messageCount: 641
          }
        });
      }
    };

    loadStats();
  }, []);

  return stats;
};
