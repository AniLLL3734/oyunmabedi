// DOSYA: data/specialEmojis.ts
// ÖZEL EMOJİ SİSTEMİ

export interface SpecialEmoji {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
}

// Siber Emoji Seti
export const cyberEmojis: SpecialEmoji[] = [
  { id: 'cyber_1', name: 'Siber Güç', emoji: '⚡', description: 'Elektrik gücü', category: 'cyber' },
  { id: 'cyber_2', name: 'Dijital Kalp', emoji: '💚', description: 'Dijital sevgi', category: 'cyber' },
  { id: 'cyber_3', name: 'Kod Yağmuru', emoji: '🌧️', description: 'Kod yağmuru', category: 'cyber' },
  { id: 'cyber_4', name: 'Siber Kılıç', emoji: '⚔️', description: 'Dijital savaş', category: 'cyber' },
  { id: 'cyber_5', name: 'Hack', emoji: '🔓', description: 'Sistem kırıldı', category: 'cyber' },
  { id: 'cyber_6', name: 'Siber Kalkan', emoji: '🛡️', description: 'Dijital koruma', category: 'cyber' }
];

// Uzay Emoji Seti
export const spaceEmojis: SpecialEmoji[] = [
  { id: 'space_1', name: 'Galaksi', emoji: '🌌', description: 'Uzayın derinlikleri', category: 'space' },
  { id: 'space_2', name: 'UFO', emoji: '🛸', description: 'Uzaylı aracı', category: 'space' },
  { id: 'space_3', name: 'Yıldız', emoji: '⭐', description: 'Parlayan yıldız', category: 'space' },
  { id: 'space_4', name: 'Roket', emoji: '🚀', description: 'Uzaya yolculuk', category: 'space' },
  { id: 'space_5', name: 'Ay', emoji: '🌙', description: 'Gece ışığı', category: 'space' },
  { id: 'space_6', name: 'Güneş', emoji: '☀️', description: 'Enerji kaynağı', category: 'space' }
];

// Matriks Emoji Seti
export const matrixEmojis: SpecialEmoji[] = [
  { id: 'matrix_1', name: 'Kod', emoji: '💻', description: 'Dijital kod', category: 'matrix' },
  { id: 'matrix_2', name: 'Veri', emoji: '📊', description: 'Veri akışı', category: 'matrix' },
  { id: 'matrix_3', name: 'Ağ', emoji: '🕸️', description: 'Dijital ağ', category: 'matrix' },
  { id: 'matrix_4', name: 'Şifre', emoji: '🔐', description: 'Gizli şifre', category: 'matrix' },
  { id: 'matrix_5', name: 'Algoritma', emoji: '🧮', description: 'Hesaplama', category: 'matrix' },
  { id: 'matrix_6', name: 'Sistem', emoji: '⚙️', description: 'Dijital sistem', category: 'matrix' }
];

// Efsanevi Emoji Seti
export const legendaryEmojis: SpecialEmoji[] = [
  { id: 'legend_1', name: 'Taç', emoji: '👑', description: 'Efsanevi taç', category: 'legendary' },
  { id: 'legend_2', name: 'Ejder', emoji: '🐉', description: 'Efsanevi yaratık', category: 'legendary' },
  { id: 'legend_3', name: 'Kılıç', emoji: '🗡️', description: 'Efsanevi kılıç', category: 'legendary' },
  { id: 'legend_4', name: 'Mücevher', emoji: '💎', description: 'Değerli taş', category: 'legendary' },
  { id: 'legend_5', name: 'Yıldırım', emoji: '⚡', description: 'Güçlü enerji', category: 'legendary' },
  { id: 'legend_6', name: 'Alev', emoji: '🔥', description: 'Efsanevi ateş', category: 'legendary' }
];

// Tüm özel emojiler
export const allSpecialEmojis: SpecialEmoji[] = [
  ...cyberEmojis,
  ...spaceEmojis,
  ...matrixEmojis,
  ...legendaryEmojis
];

// Emoji setlerini ID'ye göre grupla
export const emojiSets: { [key: string]: SpecialEmoji[] } = {
  'cyber_emojis': cyberEmojis,
  'space_emojis': spaceEmojis,
  'matrix_emojis': matrixEmojis,
  'legendary_emojis': legendaryEmojis
};

// Emoji ID'sine göre emoji bulma fonksiyonu
export const getEmojiById = (id: string): SpecialEmoji | undefined => {
  return allSpecialEmojis.find(emoji => emoji.id === id);
};

// Kullanıcının sahip olduğu emojileri getir
export const getUserEmojis = (userInventory: any): SpecialEmoji[] => {
  if (!userInventory?.specialEmojis) return [];
  
  const userEmojis: SpecialEmoji[] = [];
  
  userInventory.specialEmojis.forEach((emojiSetId: string) => {
    const emojiSet = emojiSets[emojiSetId];
    if (emojiSet) {
      userEmojis.push(...emojiSet);
    }
  });
  
  return userEmojis;
};
