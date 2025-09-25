// DOSYA: hooks/useRealUserData.ts - Firebase'den Gerçek Kullanıcı Verilerini Çekme

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../src/firebase';
import { getChatDb } from '../src/firebase-servers';

export interface UserTestimonial {
  user: string;
  message: string;
  avatar: string;
  color: string;
  isReal: boolean;
}

export interface MemoryData {
  title: string;
  description: string;
  icon: string;
  color: string;
  count?: number;
}

export const useRealUserData = () => {
  const [testimonials, setTestimonials] = useState<UserTestimonial[]>([]);
  const [memories, setMemories] = useState<MemoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealUserData = async () => {
      try {
        setLoading(true);

        // Varsayılan veriler - Firebase bağlantısı olmasa bile çalışır
        const defaultTestimonials: UserTestimonial[] = [
          {
            user: "CyberGamer_2024",
            message: "Bu platform sayesinde harika arkadaşlıklar kurdum. Oyunlar süperdi!",
            avatar: "🎮",
            color: "from-blue-500 to-purple-500",
            isReal: false
          },
          {
            user: "PixelMaster",
            message: "Chat sistemi çok eğlenceliydi. Her gün buraya gelmek için sabırsızlanıyordum.",
            avatar: "💬",
            color: "from-green-500 to-cyan-500",
            isReal: false
          },
          {
            user: "ScoreHunter",
            message: "Skor sistemini aşmak için saatlerce uğraştım. En güzel anılarım burada!",
            avatar: "🏆",
            color: "from-yellow-500 to-orange-500",
            isReal: false
          },
          {
            user: "DigitalNomad",
            message: "Bu dijital evren gerçekten büyülüydü. Teşekkürler FaTaLRhymeR37!",
            avatar: "🌟",
            color: "from-pink-500 to-red-500",
            isReal: false
          }
        ];

        const defaultMemories: MemoryData[] = [
          { title: "İlk Giriş", description: "Platforma ilk adım atıldığı an", icon: "🚀", color: "border-blue-500", count: 2847 },
          { title: "İlk Oyun", description: "İlk oyun deneyimi", icon: "🎯", color: "border-green-500", count: 15432 },
          { title: "İlk Chat", description: "Toplulukla ilk sohbet", icon: "💭", color: "border-purple-500", count: 89156 },
          { title: "İlk Başarı", description: "İlk başarı rozeti", icon: "🏅", color: "border-yellow-500", count: 3421 },
          { title: "İlk Arkadaş", description: "İlk dijital arkadaşlık", icon: "🤝", color: "border-pink-500", count: 5694 },
          { title: "Son Anı", description: "Platformdaki son güzel anı", icon: "💝", color: "border-red-500", count: 1 }
        ];

        // Firebase bağlantısı yoksa varsayılan verileri kullan
        if (!db) {
          setTestimonials(defaultTestimonials);
          setMemories(defaultMemories);
          setLoading(false);
          return;
        }

        // Gerçek kullanıcı verilerini çek
        const realTestimonials: UserTestimonial[] = [];
        const realMemories: MemoryData[] = [];

        // Ana veritabanından kullanıcıları çek
        try {
          const usersQuery = query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          usersSnapshot.docs.forEach((doc, index) => {
            const userData = doc.data();
            if (userData.displayName && index < 4) {
              const colors = [
                "from-blue-500 to-purple-500",
                "from-green-500 to-cyan-500", 
                "from-yellow-500 to-orange-500",
                "from-pink-500 to-red-500"
              ];
              
              const avatars = ["🎮", "💬", "🏆", "🌟"];
              
              realTestimonials.push({
                user: userData.displayName,
                message: userData.bio || "Bu platformda harika zaman geçirdim!",
                avatar: avatars[index % avatars.length],
                color: colors[index % colors.length],
                isReal: true
              });
            }
          });
        } catch (error) {
          console.warn('Ana veritabanından kullanıcı verileri çekilemedi:', error);
        }

        // Sunuculardan mesaj verilerini çek
        const servers = ['server2', 'server3', 'server4'];
        let totalMessages = 0;
        let totalGames = 0;
        let totalAchievements = 0;

        for (const serverId of servers) {
          try {
            const serverDb = getChatDb(serverId);
            
            // Mesaj sayısını çek
            const messagesQuery = query(
              collection(serverDb, 'messages'),
              orderBy('timestamp', 'desc'),
              limit(100)
            );
            const messagesSnapshot = await getDocs(messagesQuery);
            totalMessages += messagesSnapshot.size;

            // Kullanıcı verilerini çek
            const usersQuery = query(
              collection(serverDb, 'users'),
              orderBy('totalScore', 'desc'),
              limit(50)
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            usersSnapshot.forEach(doc => {
              const userData = doc.data();
              if (userData.totalScore) {
                totalGames += Math.floor(userData.totalScore / 100); // Tahmini oyun sayısı
              }
              if (userData.achievements) {
                totalAchievements += userData.achievements.length;
              }
            });

          } catch (error) {
            console.warn(`${serverId} sunucusundan veri çekilemedi:`, error);
          }
        }

        // Anı verilerini oluştur
        realMemories.push(
          { title: "İlk Giriş", description: "Platforma ilk adım atıldığı an", icon: "🚀", color: "border-blue-500", count: realTestimonials.length || 2847 },
          { title: "İlk Oyun", description: "İlk oyun deneyimi", icon: "🎯", color: "border-green-500", count: totalGames || 15432 },
          { title: "İlk Chat", description: "Toplulukla ilk sohbet", icon: "💭", color: "border-purple-500", count: totalMessages || 89156 },
          { title: "İlk Başarı", description: "İlk başarı rozeti", icon: "🏅", color: "border-yellow-500", count: totalAchievements || 3421 },
          { title: "İlk Arkadaş", description: "İlk dijital arkadaşlık", icon: "🤝", color: "border-pink-500", count: (realTestimonials.length || 4) * 2 },
          { title: "Son Anı", description: "Platformdaki son güzel anı", icon: "💝", color: "border-red-500", count: 1 }
        );

        // Eğer gerçek veri yoksa varsayılan verileri kullan
        if (realTestimonials.length === 0) {
          setTestimonials(defaultTestimonials);
        } else {
          setTestimonials(realTestimonials);
        }

        setMemories(realMemories);
        setLoading(false);

      } catch (error) {
        console.error('Kullanıcı verileri çekilirken hata oluştu:', error);
        // Hata durumunda varsayılan verileri kullan
        setTestimonials([
          {
            user: "CyberGamer_2024",
            message: "Bu platform sayesinde harika arkadaşlıklar kurdum. Oyunlar süperdi!",
            avatar: "🎮",
            color: "from-blue-500 to-purple-500",
            isReal: false
          },
          {
            user: "PixelMaster",
            message: "Chat sistemi çok eğlenceliydi. Her gün buraya gelmek için sabırsızlanıyordum.",
            avatar: "💬",
            color: "from-green-500 to-cyan-500",
            isReal: false
          },
          {
            user: "ScoreHunter",
            message: "Skor sistemini aşmak için saatlerce uğraştım. En güzel anılarım burada!",
            avatar: "🏆",
            color: "from-yellow-500 to-orange-500",
            isReal: false
          },
          {
            user: "DigitalNomad",
            message: "Bu dijital evren gerçekten büyülüydü. Teşekkürler FaTaLRhymeR37!",
            avatar: "🌟",
            color: "from-pink-500 to-red-500",
            isReal: false
          }
        ]);
        setMemories([
          { title: "İlk Giriş", description: "Platforma ilk adım atıldığı an", icon: "🚀", color: "border-blue-500", count: 2847 },
          { title: "İlk Oyun", description: "İlk oyun deneyimi", icon: "🎯", color: "border-green-500", count: 15432 },
          { title: "İlk Chat", description: "Toplulukla ilk sohbet", icon: "💭", color: "border-purple-500", count: 89156 },
          { title: "İlk Başarı", description: "İlk başarı rozeti", icon: "🏅", color: "border-yellow-500", count: 3421 },
          { title: "İlk Arkadaş", description: "İlk dijital arkadaşlık", icon: "🤝", color: "border-pink-500", count: 5694 },
          { title: "Son Anı", description: "Platformdaki son güzel anı", icon: "💝", color: "border-red-500", count: 1 }
        ]);
        setLoading(false);
      }
    };

    fetchRealUserData();
  }, []);

  return { testimonials, memories, loading };
};
