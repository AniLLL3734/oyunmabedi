
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
  PROFILE_ANIMATION = 'profile_animation',
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
  profileAnimations: string[];
  specialTitles: string[];
  temporaryAchievements: { id: string; expiresAt: Date }[];
  specialEmojis: string[];
  activeAvatarFrame?: string;
  activeProfileAnimation?: string;
  activeSpecialTitle?: string;
}

// === RAPORLAMA SİSTEMİ TYPES ===
export interface UserReport {
  id: string;
  reportedUserId: string;
  reporterUserId: string;
  reason: string;
  messageId?: string;
  createdAt: Date;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface UserReportStats {
  userId: string;
  reportCount: number;
  lastReportDate?: Date;
  mutedUntil?: Date;
  isMuted: boolean;
}

// === YENİLİKLER SİSTEMİ TYPES ===
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'update' | 'fix' | 'announcement';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  isActive: boolean;
  icon?: string;
}

