// DOSYA: data/shopItems.ts
// DÜKKAN ÜRÜNLERİ VERİTABANI

import { ShopItem, ShopItemType } from '../types';

export const shopItems: ShopItem[] = [
  // === AVATAR ÇERÇEVELERİ ===
  {
    id: 'neon_frame',
    name: 'Neon Çerçeve',
    description: 'Avatarınızı saran elektrikli neon ışıklar. Dijital evrende parlayan bir yıldız olun.',
    type: ShopItemType.AVATAR_FRAME,
    price: 2500,
    category: 'Görsel',
    rarity: 'rare',
    preview: 'neon-glow'
  },
  {
    id: 'hologram_frame',
    name: 'Hologram Çerçeve',
    description: 'Gelecekten gelen holografik çerçeve. Gerçeklik sınırlarını aşan bir görünüm.',
    type: ShopItemType.AVATAR_FRAME,
    price: 5000,
    category: 'Görsel',
    rarity: 'epic',
    preview: 'hologram-shimmer'
  },
  {
    id: 'golden_frame',
    name: 'Altın Çerçeve',
    description: 'Saf altından dökülmüş lüks çerçeve. Zenginliğin ve başarının simgesi.',
    type: ShopItemType.AVATAR_FRAME,
    price: 8000,
    category: 'Görsel',
    rarity: 'legendary',
    preview: 'golden-glow'
  },
  {
    id: 'matrix_frame',
    name: 'Matriks Çerçeve',
    description: 'Yeşil kod yağmuru içinde akan dijital çerçeve. Gerçekliğin arkasındaki sırları keşfedin.',
    type: ShopItemType.AVATAR_FRAME,
    price: 4000,
    category: 'Görsel',
    rarity: 'epic',
    preview: 'matrix-rain'
  },
  {
    id: 'fire_frame',
    name: 'Ateş Çerçeve',
    description: 'Sönmeyen alevlerle çevrili çerçeve. İçinizdeki tutkuyu dışa vurun.',
    type: ShopItemType.AVATAR_FRAME,
    price: 3500,
    category: 'Görsel',
    rarity: 'rare',
    preview: 'fire-dance'
  },

  // === PROFIL ANIMASYONLARI ===
  {
    id: 'neon_pulse_animation',
    name: 'Neon Nabız Animasyonu',
    description: 'Profiliniz kalp atışı gibi nabız atan neon ışıklarla canlanır. Hayat belirtisi gösteren dijital nabız.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 15000,
    category: 'Animasyon',
    rarity: 'epic',
    preview: 'neon-pulse'
  },
  {
    id: 'matrix_rain_animation',
    name: 'Matriks Yağmuru Animasyonu',
    description: 'Yeşil kod yağmuru profilinizi yıkar. Gerçekliğin ardındaki kodu görenlerin animasyonu.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 20000,
    category: 'Animasyon',
    rarity: 'legendary',
    preview: 'matrix-rain-fall'
  },
  {
    id: 'electric_arc_animation',
    name: 'Elektrik Arkı Animasyonu',
    description: 'Şimşek gibi elektrik arkları profil etrafında dans eder. Güç ve enerji dolu bir görünüm.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 18000,
    category: 'Animasyon',
    rarity: 'epic',
    preview: 'electric-arcs'
  },
  {
    id: 'hologram_glitch_animation',
    name: 'Hologram Glitch Animasyonu',
    description: 'Gelecekten gelen holografik glitch efektleri. Gerçeklik sınırlarını aşan bozulmalar.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 25000,
    category: 'Animasyon',
    rarity: 'legendary',
    preview: 'hologram-glitch'
  },
  {
    id: 'cosmic_particles_animation',
    name: 'Kozmik Parçacık Animasyonu',
    description: 'Evrenin parçacıkları profil etrafında döner. Kozmik enerjiyle dolu bir atmosfer.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 22000,
    category: 'Animasyon',
    rarity: 'legendary',
    preview: 'cosmic-particles'
  },
  {
    id: 'fire_particles_animation',
    name: 'Ateş Parçacıkları Animasyonu',
    description: 'Sönmeyen ateş parçacıkları profilinizi sarar. İç ateşinizi dışa vuran animasyon.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 17000,
    category: 'Animasyon',
    rarity: 'epic',
    preview: 'fire-particles'
  },
  {
    id: 'cyber_circuit_animation',
    name: 'Siber Devre Animasyonu',
    description: 'Dijital devreler profilinizde akar. Teknoloji ve zekanın birleşimi.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 16000,
    category: 'Animasyon',
    rarity: 'rare',
    preview: 'cyber-circuits'
  },
  {
    id: 'quantum_field_animation',
    name: 'Kuantum Alan Animasyonu',
    description: 'Kuantum parçacıklar gerçekliği büker. Bilim kurgunun en gelişmiş animasyonu.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 30000,
    category: 'Animasyon',
    rarity: 'legendary',
    preview: 'quantum-field'
  },

  // === FUTBOL TAKIMI ANIMASYONLARI ===
  {
    id: 'galatasaray_animation',
    name: 'Galatasaray Animasyonu',
    description: 'Sarı-kırmızı renklerde nabız atan, aslan gibi güçlü animasyon. Cimbom\'un ruhu profilinizde canlanır.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 12000,
    category: 'Animasyon',
    rarity: 'epic',
    preview: 'galatasaray-glow'
  },
  {
    id: 'fenerbahce_animation',
    name: 'Fenerbahçe Animasyonu',
    description: 'Sarı-lacivert dalgalarla akan, kanarya enerjisi dolu animasyon. Sarı Kanarya\'nın gücü profilinizde.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 12000,
    category: 'Animasyon',
    rarity: 'epic',
    preview: 'fenerbahce-waves'
  },
  {
    id: 'besiktas_animation',
    name: 'Beşiktaş Animasyonu',
    description: 'Siyah-beyaz kartal kanatları çırpan animasyon. Çarşı\'nın enerjisi ve kartal gücü profilinizde.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 12000,
    category: 'Animasyon',
    rarity: 'epic',
    preview: 'besiktas-wings'
  },
  {
    id: 'trabzonspor_animation',
    name: 'Trabzonspor Animasyonu',
    description: 'Bordo-mavi dalgalarla akan, Karadeniz fırtınası animasyonu. Bordo-mavi ruh profilinizde.',
    type: ShopItemType.PROFILE_ANIMATION,
    price: 12000,
    category: 'Animasyon',
    rarity: 'epic',
    preview: 'trabzonspor-storm'
  },

  // === ÖZEL UNVANLAR ===
  {
    id: 'score_hunter_title',
    name: 'Skor Avcısı',
    description: 'Skorların peşinde koşan avcı. Her puanın değerini bilen savaşçı.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 3000,
    category: 'Unvan',
    rarity: 'rare'
  },
  {
    id: 'time_master_title',
    name: 'Zaman Efendisi',
    description: 'Zamanın akışını kontrol eden efendi. Dakikaların efendisi.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 4000,
    category: 'Unvan',
    rarity: 'epic'
  },
  {
    id: 'pixel_master_title',
    name: 'Piksel Ustası',
    description: 'Piksellerin sırlarını bilen usta. Dijital sanatın efendisi.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 3500,
    category: 'Unvan',
    rarity: 'rare'
  },
  {
    id: 'digital_ghost_title',
    name: 'Dijital Hayalet',
    description: 'Sanal dünyada süzülen hayalet. Görünmez ama her yerde.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 2500,
    category: 'Unvan',
    rarity: 'common'
  },
  {
    id: 'cyber_legend_title',
    name: 'Siber Efsane',
    description: 'Dijital evrenin efsanesi. Hikayeleri anlatılan kahraman.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 6000,
    category: 'Unvan',
    rarity: 'legendary'
  },
  {
    id: 'code_breaker_title',
    name: 'Kod Kırıcı',
    description: 'En karmaşık kodları çözen deha. Sistemlerin korkulu rüyası.',
    type: ShopItemType.SPECIAL_TITLE,
    price: 4500,
    category: 'Unvan',
    rarity: 'epic'
  },

  // === GEÇİCİ BAŞARIMLAR ===
  {
    id: 'speed_demon_24h',
    name: 'Hız Şeytanı (24 Saat)',
    description: '24 saat boyunca 1.5x skor çarpanı. Hızınızla herkesi geçin.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 8000,
    category: 'Geçici',
    rarity: 'rare',
    duration: 1440 // 24 saat = 1440 dakika
  },
  {
    id: 'time_lord_29h',
    name: 'Zaman Lordu (29 Saat)',
    description: '29 saat boyunca 2x skor çarpanı. Zamanın efendisi olun.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 25000,
    category: 'Geçici',
    rarity: 'legendary',
    duration: 1740 // 29 saat = 1740 dakika
  },
  {
    id: 'afk_master_24h',
    name: 'AFK Ustası (24 Saat)',
    description: '24 saat boyunca AFK süresi 3 saate çıkar. Daha uzun süre pasif skor kazanın.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 1500,
    category: 'Geçici',
    rarity: 'common',
    duration: 1440
  },
  {
    id: 'lucky_charm_7d',
    name: 'Şans Tılsımı (7 Gün)',
    description: '7 gün boyunca günlük ödül 2x. Şansınızı artırın.',
    type: ShopItemType.TEMPORARY_ACHIEVEMENT,
    price: 5000,
    category: 'Geçici',
    rarity: 'epic',
    duration: 10080
  },

  // === ÖZEL EMOJİLER ===
  {
    id: 'cyber_emojis',
    name: 'Siber Emoji Seti',
    description: 'Dijital evrene özel emoji koleksiyonu. Sohbetinizi renklendirin.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 1000,
    category: 'Sohbet',
    rarity: 'common'
  },
  {
    id: 'space_emojis',
    name: 'Uzay Emoji Seti',
    description: 'Galaksiler arası emoji koleksiyonu. Uzayın derinliklerinden gelen ifadeler.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 1500,
    category: 'Sohbet',
    rarity: 'rare'
  },
  {
    id: 'matrix_emojis',
    name: 'Matriks Emoji Seti',
    description: 'Kod yağmuru emoji koleksiyonu. Gerçekliğin arkasındaki ifadeler.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 2000,
    category: 'Sohbet',
    rarity: 'epic'
  },
  {
    id: 'legendary_emojis',
    name: 'Efsanevi Emoji Seti',
    description: 'Sadece seçkinlere özel efsanevi emoji koleksiyonu. Nadir ve güçlü.',
    type: ShopItemType.SPECIAL_EMOJI,
    price: 3000,
    category: 'Sohbet',
    rarity: 'legendary'
  }
];

// Kategorilere göre gruplama
export const shopCategories = [
  { id: 'all', name: 'Tümü', icon: '🛒' },
  { id: 'Görsel', name: 'Görsel', icon: '🎨' },
  { id: 'Animasyon', name: 'Animasyon', icon: '✨' },
  { id: 'Unvan', name: 'Unvan', icon: '👑' },
  { id: 'Geçici', name: 'Geçici', icon: '⏰' },
  { id: 'Sohbet', name: 'Sohbet', icon: '💬' }
];

// Nadirliğe göre renkler
export const rarityColors = {
  common: 'text-gray-400 border-gray-400',
  rare: 'text-blue-400 border-blue-400',
  epic: 'text-purple-400 border-purple-400',
  legendary: 'text-yellow-400 border-yellow-400'
};

// Nadirliğe göre arka plan renkleri
export const rarityBgColors = {
  common: 'bg-gray-500/10',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-yellow-500/10'
};
