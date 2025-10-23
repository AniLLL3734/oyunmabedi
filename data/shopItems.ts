// DOSYA: data/shopItems.ts
// NOT: Bu dosyayı kullanmadan önce types.ts dosyanızdaki 'Rarity' türüne 'heritage' eklemelisiniz.

import { ShopItem, ShopItemType } from '../types';

// Dükkan filtresinde kullanılacak kategoriler
export const shopCategories: { id: string; name: string; icon: string }[] = [
    { id: 'all', name: 'Tümü', icon: '🛒' },
    { id: 'profile_backgrounds', name: 'Arka Planlar', icon: '🌌' },
    { id: 'avatar_frames', name: 'Çerçeveler', icon: '🖼️' },
    { id: 'profile_animations', name: 'Animasyonlar', icon: '✨' },
    { id: 'special_titles', name: 'Unvanlar', icon: '👑' },
    { id: 'temporary_achievements', name: 'Geçici', icon: '⏰' },
    { id: 'special_emojis', name: 'Sohbet', icon: '💬' }
];

export const shopItems: ShopItem[] = [
  // === AVATAR ÇERÇEVELERİ ===
  { id: 'fire_frame', name: 'Ateş Çerçeve', description: 'Sönmeyen alevlerle çevrili çerçeve.', type: ShopItemType.AVATAR_FRAME, price: 3500, category: 'avatar_frames', rarity: 'rare' },
  { id: 'neon_frame', name: 'Neon Çerçeve', description: 'Avatarınızı saran elektrikli neon ışıklar.', type: ShopItemType.AVATAR_FRAME, price: 4000, category: 'avatar_frames', rarity: 'rare' },
  { id: 'matrix_frame', name: 'Matriks Çerçeve', description: 'Yeşil kod yağmuru içinde akan dijital çerçeve.', type: ShopItemType.AVATAR_FRAME, price: 8000, category: 'avatar_frames', rarity: 'epic' },
  { id: 'hologram_frame', name: 'Hologram Çerçeve', description: 'Gelecekten gelen holografik çerçeve.', type: ShopItemType.AVATAR_FRAME, price: 9000, category: 'avatar_frames', rarity: 'epic' },
  { id: 'golden_frame', name: 'Altın Çerçeve', description: 'Saf altından dökülmüş lüks çerçeve.', type: ShopItemType.AVATAR_FRAME, price: 20000, category: 'avatar_frames', rarity: 'legendary' },

  // === PROFIL ANIMASYONLARI ===
  { id: 'cyber_circuit_animation', name: 'Siber Devre Animasyonu', description: 'Dijital devreler profilinizde akar.', type: ShopItemType.PROFILE_ANIMATION, price: 4500, category: 'profile_animations', rarity: 'rare' },
  { id: 'neon_pulse_animation', name: 'Neon Nabız Animasyonu', description: 'Profiliniz kalp atışı gibi nabız atan neon ışıklarla canlanır.', type: ShopItemType.PROFILE_ANIMATION, price: 10000, category: 'profile_animations', rarity: 'epic' },
  { id: 'fire_particles_animation', name: 'Ateş Parçacıkları', description: 'Sönmeyen ateş parçacıkları profilinizi sarar.', type: ShopItemType.PROFILE_ANIMATION, price: 11000, category: 'profile_animations', rarity: 'epic' },
  { id: 'electric_arc_animation', name: 'Elektrik Arkı', description: 'Şimşek gibi elektrik arkları profil etrafında dans eder.', type: ShopItemType.PROFILE_ANIMATION, price: 12000, category: 'profile_animations', rarity: 'epic' },
  { id: 'matrix_rain_animation', name: 'Matriks Yağmuru', description: 'Yeşil kod yağmuru profilinizi yıkar.', type: ShopItemType.PROFILE_ANIMATION, price: 20000, category: 'profile_animations', rarity: 'legendary' },
  { id: 'cosmic_particles_animation', name: 'Kozmik Parçacıklar', description: 'Evrenin parçacıkları profil etrafında döner.', type: ShopItemType.PROFILE_ANIMATION, price: 22000, category: 'profile_animations', rarity: 'legendary' },
  { id: 'hologram_glitch_animation', name: 'Hologram Glitch', description: 'Gelecekten gelen holografik glitch efektleri.', type: ShopItemType.PROFILE_ANIMATION, price: 25000, category: 'profile_animations', rarity: 'legendary' },
  { id: 'quantum_field_animation', name: 'Kuantum Alanı', description: 'Kuantum parçacıklar gerçekliği büker.', type: ShopItemType.PROFILE_ANIMATION, price: 30000, category: 'profile_animations', rarity: 'legendary' },

  // === FUTBOL TAKIMI ANIMASYONLARI ===
  { id: 'galatasaray_animation', name: 'Galatasaray Animasyonu', description: 'Sarı-kırmızı renklerde nabız atan, aslan gibi güçlü animasyon.', type: ShopItemType.PROFILE_ANIMATION, price: 9000, category: 'profile_animations', rarity: 'epic' },
  { id: 'fenerbahce_animation', name: 'Fenerbahçe Animasyonu', description: 'Sarı-lacivert dalgalarla akan, kanarya enerjisi dolu animasyon.', type: ShopItemType.PROFILE_ANIMATION, price: 9000, category: 'profile_animations', rarity: 'epic' },
  { id: 'besiktas_animation', name: 'Beşiktaş Animasyonu', description: 'Siyah-beyaz kartal kanatları çırpan animasyon.', type: ShopItemType.PROFILE_ANIMATION, price: 9000, category: 'profile_animations', rarity: 'epic' },
  { id: 'trabzonspor_animation', name: 'Trabzonspor Animasyonu', description: 'Bordo-mavi dalgalarla akan, Karadeniz fırtınası animasyonu.', type: ShopItemType.PROFILE_ANIMATION, price: 9000, category: 'profile_animations', rarity: 'epic' },

  // === PROFIL ARKA PLANLARI ===
  { id: 'bg_galatasaray', name: 'Galatasaray Ruhu', description: 'Sarı-kırmızı dijital enerji ve soyut aslan silüeti.', type: ShopItemType.PROFILE_BACKGROUND, price: 15000, category: 'profile_backgrounds', rarity: 'epic', imageUrl: '/profile/galatasaray.png' },
  { id: 'bg_fenerbahce', name: 'Fenerbahçe Enerjisi', description: 'Sarı-lacivert veri akışları ve parlayan kanarya formu.', type: ShopItemType.PROFILE_BACKGROUND, price: 15000, category: 'profile_backgrounds', rarity: 'epic', imageUrl: '/profile/fenerbahce.png' },
  { id: 'bg_besiktas', name: 'Kara Kartalın Gölgesi', description: 'Siyah-beyaz dijital kodlardan oluşan kanatlarını açmış bir kartal.', type: ShopItemType.PROFILE_BACKGROUND, price: 15000, category: 'profile_backgrounds', rarity: 'epic', imageUrl: '/profile/besiktas.png' },
  { id: 'bg_trabzonspor', name: 'Karadeniz Fırtınası', description: 'Bordo-mavi şimşekler ve dijital parçacıklardan oluşan bir fırtına.', type: ShopItemType.PROFILE_BACKGROUND, price: 15000, category: 'profile_backgrounds', rarity: 'epic', imageUrl: '/profile/trabzonspor.png' },
  // PADİŞAH2.ADMIN için özel arka plan
  { id: 'bg_padisah2admin', name: 'Padishah2.Admin Özel Arka Planı', description: 'Padishah2.Admin kullanıcısına özel özel arka plan.', type: ShopItemType.PROFILE_BACKGROUND, price: 0, category: 'profile_backgrounds', rarity: 'legendary', imageUrl: '/profile/utku.jpg' },

  // === TARİHİ MİRAS ARKA PLANLARI (ÜCRETSİZ) ===
  {
    id: 'bg_fatih',
    name: 'Çağların Fatihi: Fatih',
    description: 'Bu miras paha biçilemez. Bir çağı kapatıp yenisini açan iradesi, İstanbul\'un surlarını aşan dijital bir silüetle simgeleniyor.',
    type: ShopItemType.PROFILE_BACKGROUND,
    price: 0,
    category: 'profile_backgrounds',
    rarity: 'heritage',
    imageUrl: '/profile/fatih.jpg'
},
  { id: 'bg_mustafa_kemal', name: 'Savaş Sanatı: Mustafa Kemal', description: 'Onun anısı, bedelsiz bir ilham kaynağıdır. Başkomutan, holografik bir strateji haritası üzerinde yükseliyor.', type: ShopItemType.PROFILE_BACKGROUND, price: 0, category: 'profile_backgrounds', rarity: 'heritage', imageUrl: '/profile/ataturk.png' },
  { id: 'bg_enver_pasa', name: 'Turan Rüyası: Enver Paşa', description: 'Tarihimizin bu parçası herkesin erişimine açıktır. Ufka bakan, vizyoner bir komutanın dijital yansıması.', type: ShopItemType.PROFILE_BACKGROUND, price: 0, category: 'profile_backgrounds', rarity: 'heritage', imageUrl: '/profile/enver.png' },

  // === ÖZEL UNVANLAR ===
  { id: 'digital_ghost_title', name: 'Dijital Hayalet', description: 'Sanal dünyada süzülen hayalet.', type: ShopItemType.SPECIAL_TITLE, price: 1000, category: 'special_titles', rarity: 'common' },
  { id: 'score_hunter_title', name: 'Skor Avcısı', description: 'Skorların peşinde koşan avcı.', type: ShopItemType.SPECIAL_TITLE, price: 3000, category: 'special_titles', rarity: 'rare' },
  { id: 'pixel_master_title', name: 'Piksel Ustası', description: 'Piksellerin sırlarını bilen usta.', type: ShopItemType.SPECIAL_TITLE, price: 3500, category: 'special_titles', rarity: 'rare' },
  { id: 'time_master_title', name: 'Zaman Efendisi', description: 'Zamanın akışını kontrol eden efendi.', type: ShopItemType.SPECIAL_TITLE, price: 6000, category: 'special_titles', rarity: 'epic' },
  { id: 'code_breaker_title', name: 'Kod Kırıcı', description: 'En karmaşık kodları çözen deha.', type: ShopItemType.SPECIAL_TITLE, price: 7000, category: 'special_titles', rarity: 'epic' },
  { id: 'cyber_legend_title', name: 'Siber Efsane', description: 'Dijital evrenin efsanesi.', type: ShopItemType.SPECIAL_TITLE, price: 18000, category: 'special_titles', rarity: 'legendary' },

  // === GEÇİCİ BAŞARIMLAR ===
  { id: 'afk_master_24h', name: 'AFK Ustası (24 Saat)', description: 'AFK süresini 3 saate çıkarır.', type: ShopItemType.TEMPORARY_ACHIEVEMENT, price: 1500, category: 'temporary_achievements', rarity: 'common', duration: 1440 },
  { id: 'lucky_charm_7d', name: 'Şans Tılsımı (7 Gün)', description: 'Günlük ödülü 2x yapar.', type: ShopItemType.TEMPORARY_ACHIEVEMENT, price: 6000, category: 'temporary_achievements', rarity: 'epic', duration: 10080 },

  // === ÖZEL EMOJİLER ===
  { id: 'cyber_emojis', name: 'Siber Emoji Seti', description: 'Dijital evrene özel emoji koleksiyonu.', type: ShopItemType.SPECIAL_EMOJI, price: 500, category: 'special_emojis', rarity: 'common' },
  { id: 'space_emojis', name: 'Uzay Emoji Seti', description: 'Galaksiler arası emoji koleksiyonu.', type: ShopItemType.SPECIAL_EMOJI, price: 1500, category: 'special_emojis', rarity: 'rare' },
  { id: 'matrix_emojis', name: 'Matriks Emoji Seti', description: 'Kod yağmuru emoji koleksiyonu.', type: ShopItemType.SPECIAL_EMOJI, price: 2500, category: 'special_emojis', rarity: 'epic' },
  { id: 'legendary_emojis', name: 'Efsanevi Emoji Seti', description: 'Sadece seçkinlere özel emoji koleksiyonu.', type: ShopItemType.SPECIAL_EMOJI, price: 4000, category: 'special_emojis', rarity: 'legendary' }
];

// Nadirliğe göre metin ve kenarlık renkleri
export const rarityColors: { [key: string]: string } = {
  common: 'text-gray-400 border-gray-400',
  rare: 'text-blue-400 border-blue-400',
  epic: 'text-purple-400 border-purple-400',
  legendary: 'text-yellow-400 border-yellow-400',
  heritage: 'text-amber-300 border-amber-300' // Tarihi miras için özel renk
};

// Nadirliğe göre yarı saydam arka plan renkleri
export const rarityBgColors: { [key: string]: string } = {
  common: 'bg-gray-500/10',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-yellow-500/10',
  heritage: 'bg-amber-500/10' // Tarihi miras için özel arka plan
};
