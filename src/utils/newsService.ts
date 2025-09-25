import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { NewsItem } from '../../types';

// Aktif yenilikleri getir
export const getActiveNews = async (limitCount: number = 5): Promise<NewsItem[]> => {
  try {
    const newsQuery = query(
      collection(db, 'news'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const newsSnapshot = await getDocs(newsQuery);
    return newsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as NewsItem[];
  } catch (error) {
    console.error('Yenilikler alınırken hata:', error);
    return [];
  }
};

// Varsayılan yenilikleri oluştur (ilk kurulum için)
export const createDefaultNews = async (): Promise<void> => {
  try {
    const defaultNews: Omit<NewsItem, 'id'>[] = [
      {
        title: 'Kullanıcı Raporlama Sistemi',
        description: 'Artık uygunsuz davranış sergileyen kullanıcıları rapor edebilirsiniz. 5 rapor alan kullanıcılar 10 dakika susturulur. Admin panelinde raporları yönetebilirsiniz.',
        type: 'feature',
        priority: 'high',
        createdAt: new Date(),
        isActive: true,
        icon: '🚨'
      },
      {
        title: 'Yenilikler Paneli',
        description: 'Sohbet odasının yanında yeni özellikler ve güncellemeler hakkında bilgi alabilirsiniz. Gerçek zamanlı güncellemeler ve önemli duyurular burada görüntülenir.',
        type: 'feature',
        priority: 'medium',
        createdAt: new Date(),
        isActive: true,
        icon: '📢'
      },
      {
        title: 'Gelişmiş Moderasyon',
        description: 'Otomatik moderasyon sistemi güçlendirildi. Spam ve uygunsuz içerik daha etkili şekilde engelleniyor. Yapay zeka destekli içerik analizi aktif.',
        type: 'update',
        priority: 'medium',
        createdAt: new Date(),
        isActive: true,
        icon: '🛡️'
      },
      {
        title: 'Admin Rapor Yönetimi',
        description: 'Admin panelinde yeni raporlar bölümü eklendi. Tüm kullanıcı raporlarını görüntüleyebilir, durumlarını güncelleyebilir ve yönetebilirsiniz.',
        type: 'feature',
        priority: 'high',
        createdAt: new Date(),
        isActive: true,
        icon: '⚡'
      },
      {
        title: 'Gelişmiş Rapor Sistemi',
        description: 'Rapor gönderirken detaylı sebep seçimi ve açıklama yazabilirsiniz. Daha kapsamlı rapor kategorileri ve otomatik moderasyon entegrasyonu.',
        type: 'update',
        priority: 'medium',
        createdAt: new Date(),
        isActive: true,
        icon: '📋'
      },
      {
        title: 'Sohbet Deneyimi İyileştirmeleri',
        description: 'Sohbet arayüzü yenilendi. Daha hızlı mesaj gönderimi, gelişmiş emoji sistemi ve kullanıcı dostu tasarım güncellemeleri.',
        type: 'update',
        priority: 'low',
        createdAt: new Date(),
        isActive: true,
        icon: '💬'
      },
      {
        title: 'Güvenlik Güncellemeleri',
        description: 'Sistem güvenliği artırıldı. Gelişmiş spam koruması, otomatik bot tespiti ve güvenli mesajlaşma protokolleri aktif.',
        type: 'update',
        priority: 'high',
        createdAt: new Date(),
        isActive: true,
        icon: '🔒'
      },
      {
        title: 'Performans İyileştirmeleri',
        description: 'Sistem performansı optimize edildi. Daha hızlı sayfa yükleme, gelişmiş önbellekleme ve düşük gecikme süreleri.',
        type: 'update',
        priority: 'medium',
        createdAt: new Date(),
        isActive: true,
        icon: '⚡'
      }
    ];

    // Her bir yenilik için doküman oluştur
    for (const news of defaultNews) {
      const { createdAt, ...newsData } = news;
      await addDoc(collection(db, 'news'), {
        ...newsData,
        createdAt: serverTimestamp()
      });
    }

    console.log('Varsayılan yenilikler oluşturuldu');
  } catch (error) {
    console.error('Varsayılan yenilikler oluşturulurken hata:', error);
  }
};
