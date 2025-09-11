import React, { useEffect, useRef } from 'react'; // --- HATA BURADAYDI, DÜZELTİLDİ ---

// Ruffle'ın `window` nesnesi üzerinde var olduğunu TypeScript'e bildiriyoruz.
declare global {
    interface Window {
        RufflePlayer: any;
    }
}

interface RufflePlayerProps {
  swfUrl: string;
}

const RufflePlayer: React.FC<RufflePlayerProps> = ({ swfUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ruffle script'i yüklendi mi ve container'ımız hazır mı diye kontrol et.
    if (!swfUrl || !window.RufflePlayer || !containerRef.current) {
      console.error("RufflePlayer başlatılamadı: Gerekli koşullar sağlanamadı.");
      return;
    }
    
    // Temizlik: Bir önceki Ruffle örneği varsa, DOM'dan tamamen kaldır.
    // Bu, sayfa geçişlerinde hafıza sızıntılarını önler.
    containerRef.current.innerHTML = '';
      
    // En yeni Ruffle motorunu kullanarak bir oynatıcı oluştur.
    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();

    // Oynatıcıyı container'a sığdır.
    player.style.width = '100%';
    player.style.height = '100%';

    // Oynatıcıyı DOM'a ekle.
    containerRef.current.appendChild(player);

    // SWF dosyasını, en agresif performans ayarlarıyla yükle.
    player.load({
      url: swfUrl,

      // === PERFORMANS AYARLARI ===

      // Grafik Kalitesi (En Büyük Etki): 'low' seçeneği, vektör yumuşatmayı kapatır
      // ve en düşük görsel kaliteyle en yüksek hızı sunar.
      quality: 'low',

      // Grafik İşleme Motoru: 'wgpu' veya 'webgl' yavaş bilgisayarlarda sürücü sorunları
      // yaşayabilir. 'canvas' ise en temel, en geniş uyumluluğa sahip ve genellikle
      // GPU'su zayıf sistemlerde en stabil çalışan motordur.
      graphicsBackend: 'canvas',
      
      // Mektup kutusu modunu kapatarak tam ekrana zorla. Bu, bazı durumlarda
      // ölçeklendirme hesaplamalarını basitleştirerek performansı artırabilir.
      letterbox: 'off',
      
      // Bonus Ayarlar
      autoplay: true, // Oyunu otomatik başlat
      unmuteOverlay: 'hidden', // "Sesi aç" uyarısını gizle
    });

  }, [swfUrl]);

  return <div ref={containerRef} className="w-full h-full bg-black"></div>;
};

export default RufflePlayer;