import { createDefaultNews } from './newsService';

// Uygulama başlatıldığında varsayılan yenilikleri oluştur
export const initializeDefaultNews = async () => {
  try {
    await createDefaultNews();
    console.log('Varsayılan yenilikler başarıyla oluşturuldu');
  } catch (error) {
    console.error('Varsayılan yenilikler oluşturulurken hata:', error);
  }
};
