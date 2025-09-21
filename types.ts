
export enum GameType {
  SWF = 'SWF',
  HTML5 = 'HTML5',
}

export interface Game {
  id: string;
  title: string;
  description: string;
  type: GameType;
  url: string;
  thumbnail: string;
  category: string;
  tags: string[];
  controls: string;
}

// === DÜKKAN SİSTEMİ TYPES ===
export enum ShopItemType {
  AVATAR_FRAME = 'avatar_frame',
  COLOR_THEME = 'color_theme',
  SPECIAL_TITLE = 'special_title',
  TEMPORARY_ACHIEVEMENT = 'temporary_achievement',
  SPECIAL_EMOJI = 'special_emoji'
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ShopItemType;
  price: number;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  preview?: string; // Önizleme için
  duration?: number; // Geçici ürünler için süre (dakika)
  isActive?: boolean; // Aktif mi?
}

export interface UserInventory {
  avatarFrames: string[];
  colorThemes: string[];
  specialTitles: string[];
  temporaryAchievements: { id: string; expiresAt: Date }[];
  specialEmojis: string[];
  activeAvatarFrame?: string;
  activeColorTheme?: string;
  activeSpecialTitle?: string;
}

