// DOSYA: data/shopItems.ts
// YENİ, ERİŞİLEBİLİR VE DENGELİ FİYATLAR

import { ShopItem, ShopCategory, Rarity, ShopItemType } from '../types';

// Kategoriler, ShopPage.tsx filtresiyle uyumlu hale getirildi.
export const shopCategories: ShopCategory[] = [
    { id: 'all', name: 'Tümü', icon: '🛒' },
    { id: 'avatar_frames', name: 'Çerçeveler', icon: '🖼️' },
    { id: 'profile_animations', name: 'Animasyonlar', icon: '✨' },
    { id: 'special_titles', name: 'Unvanlar', icon: '👑' },
    { id: 'temporary_achievements', name: 'Geçici', icon: '⏰' },
    { id: 'special_emojis', name: 'Sohbet', icon: '💬' }
];

export const shopItems: ShopItem[] = [
  // === AVATAR ÇERÇEVELERİ ===
  {
    id: 'fire_frame',
    name: 'Ateş Çerçeve',
    description: 'Sönmeyen alevlerle çevrili çerçeve. İçinizdeki tutkuyu dışa vurun.',
    type: ShopItemType.AVATAR_FRAME,
    price: 3500, // Nadir - Birkaç saatlik birikim
    category: 'avatar_frames',
    rarity: 'rare',
    preview: 'fire-dance'
  },
  {
    id: 'neon_frame',
    name: 'Neon Çerçeve',
    description: 'Avatarınızı saran elektrikli neon ışıklar. Dijital evrende parlayan bir yıldız olun.',
    type: ShopItemType.AVATAR_FRAME,
    price: 4000, // Nadir
    category: 'avatar_frames',
    rarity: 'rare',
    preview: 'neon-glow'
  },
  {
    id: 'matrix_frame',
    name: 'Matriks Çerçeve',
    description: 'Yeşil kod yağmuru içinde akan dijital çerçeve. Gerçekliğin arkasındaki sırları keşfedin.',
    type: ShopItemType.AVATAR_FRAME,
    price: 8000, // Destansı - Birkaç günlük birikim
    category: 'avatar_frames',
    rarity: 'epic',
    preview: 'matrix-rain'
  },
  {
    id: 'hologram_frame',
    name: 'Hologram Çerçeve',
    description: 'Gelecekten gelen holografik çerçeve. Gerçeklik sınırlarını aşan bir görünüm.',
    type: ShopItemType.AVATAR_FRAME,
    price: 9000, // Destansı
    category: 'avatar_frames',
    rarity: 'epic',
    preview: 'hologram-shimmer'
  },
  {
    id: 'golden_frame',
    name: 'Altın Çerçeve',
    description: 'Saf altından dökülmüş lüks çerçeve. Zenginliğin ve başarının simgesi.',
    type: ShopItemType.AVATAR_FRAME,
    price: 20000, // Efsanevi - Adanmışlık gerektirir
    category: 'avatar_frames',
    rarity: 'legendary',
    preview: 'golden-glow'
  },

  // === PROFIL ANIMASYONLARI ===
  {
    id: 'cyber_circuit_animation',
    name: 'Siber Devre Animasyonu',
    description: 'Dijital devreler profilinizde akar. Teknoloji ve zekanın birleşimi.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 4500, // Nadir - İlk alınabilecek havalı animasyon
    category: 'profile_animations',
    rarity: 'rare',
    preview: 'cyber-circuits'
  },
  {
    id: 'neon_pulse_animation',
    name: 'Neon Nabız Animasyonu',
    description: 'Profiliniz kalp atışı gibi nabız atan neon ışıklarla canlanır.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 10000, // Destansı
    category: 'profile_animations',
    rarity: 'epic',
    preview: 'neon-pulse'
  },
  {
    id: 'fire_particles_animation',
    name: 'Ateş Parçacıkları Animasyonu',
    description: 'Sönmeyen ateş parçacıkları profilinizi sarar. İç ateşinizi dışa vuran animasyon.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 11000, // Destansı
    category: 'profile_animations',
    rarity: 'epic',
    preview: 'fire-particles'
  },
    {
    id: 'electric_arc_animation',
    name: 'Elektrik Arkı Animasyonu',
    description: 'Şimşek gibi elektrik arkları profil etrafında dans eder. Güç ve enerji dolu.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 12000, // Destansı
    category: 'profile_animations',
    rarity: 'epic',
    preview: 'electric-arcs'
  },
  {
    id: 'matrix_rain_animation',
    name: 'Matriks Yağmuru Animasyonu',
    description: 'Yeşil kod yağmuru profilinizi yıkar. Gerçekliğin ardındaki kodu görenlerin animasyonu.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 20000, // Efsanevi
    category: 'profile_animations',
    rarity: 'legendary',
    preview: 'matrix-rain-fall'
  },
  {
    id: 'cosmic_particles_animation',
    name: 'Kozmik Parçacık Animasyonu',
    description: 'Evrenin parçacıkları profil etrafında döner. Kozmik enerjiyle dolu bir atmosfer.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 22000, // Efsanevi
    category: 'profile_animations',
    rarity: 'legendary',
    preview: 'cosmic-particles'
  },
  {
    id: 'hologram_glitch_animation',
    name: 'Hologram Glitch Animasyonu',
    description: 'Gelecekten gelen holografik glitch efektleri. Gerçeklik sınırlarını aşan bozulmalar.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 25000, // Efsanevi
    category: 'profile_animations',
    rarity: 'legendary',
    preview: 'hologram-glitch'
  },
  {
    id: 'quantum_field_animation',
    name: 'Kuantum Alan Animasyonu',
    description: 'Kuantum parçacıklar gerçekliği büker. Bilim kurgunun en gelişmiş animasyonu.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 30000, // Efsanevi - Zirve ürün
    category: 'profile_animations',
    rarity: 'legendary',
    preview: 'quantum-field'
  },

  // === FUTBOL TAKIMI ANIMASYONLARI ===
  {
    id: 'galatasaray_animation',
    name: 'Galatasaray Animasyonu',
    description: 'Sarı-kırmızı renklerde nabız atan, aslan gibi güçlü animasyon. Cimbom\'un ruhu canlanır.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 9000, // Destansı - Popüler ve ulaşılabilir
    category: 'profile_animations',
    rarity: 'epic',
    preview: 'galatasaray-glow'
  },
  {
    id: 'fenerbahce_animation',
    name: 'Fenerbahçe Animasyonu',
    description: 'Sarı-lacivert dalgalarla akan, kanarya enerjisi dolu animasyon. Sarı Kanarya\'nın gücü.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 9000,
    category: 'profile_animations',
    rarity: 'epic',
    preview: 'fenerbahce-waves'
  },
  {
    id: 'besiktas_animation',
    name: 'Beşiktaş Animasyonu',
    description: 'Siyah-beyaz kartal kanatları çırpan animasyon. Çarşı\'nın enerjisi ve kartal gücü.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 9000,
    category: 'profile_animations',
    rarity: 'epic',
    preview: 'besiktas-wings'
  },
  {
    id: 'trabzonspor_animation',
    name: 'Trabzonspor Animasyonu',
    description: 'Bordo-mavi dalgalarla akan, Karadeniz fırtınası animasyonu. Bordo-mavi ruh.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 9000,
    category: 'profile_animations',
    rarity: 'epic',
    preview: 'trabzonspor-storm'
  },

  // === ÖZEL UNVANLAR ===
  {
    id: 'digital_ghost_title',
    name: 'Dijital Hayalet',
    description: 'Sanal dünyada süzülen hayalet. Görünmez ama her yerde.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 1000, // Sıradan - İlk unvan için ideal
    category: 'special_titles',
    rarity: 'common'
  },
  {
    id: 'score_hunter_title',
    name: 'Skor Avcısı',
    description: 'Skorların peşinde koşan avcı. Her puanın değerini bilen savaşçı.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 3000, // Nadir
    category: 'special_titles',
    rarity: 'rare'
  },
  {
    id: 'pixel_master_title',
    name: 'Piksel Ustası',
    description: 'Piksellerin sırlarını bilen usta. Dijital sanatın efendisi.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 3500, // Nadir
    category: 'special_titles',
    rarity: 'rare'
  },
  {
    id: 'time_master_title',
    name: 'Zaman Efendisi',
    description: 'Zamanın akışını kontrol eden efendi. Dakikaların efendisi.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 6000, // Destansı
    category: 'special_titles',
    rarity: 'epic'
  },
  {
    id: 'code_breaker_title',
    name: 'Kod Kırıcı',
    description: 'En karmaşık kodları çözen deha. Sistemlerin korkulu rüyası.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 7000, // Destansı
    category: 'special_titles',
    rarity: 'epic'
  },
  {
    id: 'cyber_legend_title',
    name: 'Siber Efsane',
    description: 'Dijital evrenin efsanesi. Hikayeleri anlatılan kahraman.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 18000, // Efsanevi - Gerçek bir başarı
    category: 'special_titles',
    rarity: 'legendary'
  },

  // === GEÇİCİ BAŞARIMLAR ===
   {
    id: 'afk_master_24h',
    name: 'AFK Ustası (24 Saat)',
    description: '24 saat boyunca AFK süresi 3 saate çıkar. Daha uzun süre pasif skor kazanın.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 1500, // Sıradan - Kullanışlı ve ucuz
    category: 'temporary_achievements',
    rarity: 'common',
    duration: 1440
  },
  {
    id: 'speed_demon_24h',
    name: 'Hız Canavarı (24 Saat)',
    description: '24 saat boyunca 1.5x skor çarpanı. Hızınızla herkesi geçin.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 4000, // Nadir - Stratejik bir yatırım
    category: 'temporary_achievements',
    rarity: 'rare',
    duration: 1440 
  },
  {
    id: 'lucky_charm_7d',
    name: 'Şans Tılsımı (7 Gün)',
    description: '7 gün boyunca günlük ödül 2x. Şansınızı artırın.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 6000, // Destansı - Uzun vadeli kazanç
    category: 'temporary_achievements',
    rarity: 'epic',
    duration: 10080
  },
  {
    id: 'time_lord_29h',
    name: 'Zaman Lordu (29 Saat)',
    description: '29 saat boyunca 2x skor çarpanı. Zamanın efendisi olun.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 25000, // Efsanevi - Yüksek risk, yüksek kazanç
    category: 'temporary_achievements',
    rarity: 'legendary',
    duration: 1740 
  },
  
  // === ÖZEL EMOJİLER ===
  {
    id: 'cyber_emojis',
    name: 'Siber Emoji Seti',
    description: 'Dijital evrene özel emoji koleksiyonu. Sohbetinizi renklendirin.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 500, // Sıradan - Çok ucuz, anında alım
    category: 'special_emojis',
    rarity: 'common'
  },
  {
    id: 'space_emojis',
    name: 'Uzay Emoji Seti',
    description: 'Galaksiler arası emoji koleksiyonu. Uzayın derinliklerinden gelen ifadeler.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 1500, // Nadir
    category: 'special_emojis',
    rarity: 'rare'
  },
  {
    id: 'matrix_emojis',
    name: 'Matriks Emoji Seti',
    description: 'Kod yağmuru emoji koleksiyonu. Gerçekliğin arkasındaki ifadeler.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 2500, // Destansı
    category: 'special_emojis',
    rarity: 'epic'
  },
  {
    id: 'legendary_emojis',
    name: 'Efsanevi Emoji Seti',
    description: 'Sadece seçkinlere özel efsanevi emoji koleksiyonu. Nadir ve güçlü.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 4000, // Efsanevi
    category: 'special_emojis',
    rarity: 'legendary'
  }
];

// Nadirliğe göre renkler
export const rarityColors: { [key in Rarity]: string } = {
  common: 'text-gray-400 border-gray-400',
  rare: 'text-blue-400 border-blue-400',
  epic: 'text-purple-400 border-purple-400',
  legendary: 'text-yellow-400 border-yellow-400'
};

// Nadirliğe göre arka plan renkleri
export const rarityBgColors: { [key in Rarity]: string } = {
  common: 'bg-gray-500/10',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-yellow-500/10'
};