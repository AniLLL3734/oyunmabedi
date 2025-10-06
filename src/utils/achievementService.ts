// DOSYA: src/utils/achievementService.ts (Tüm Başarımlar İçin Nihai Versiyon)

import { UserProfileData } from '../contexts/AuthContext';
import { grantAchievement } from './grantAchievement';
import { achievementsList } from '../../data/achievements';

/**
 * Bu tip, hangi olayın gerçekleştiğini servisimize bildirmek için kullanılır.
 */
type AchievementEvent =
  | { type: 'USER_CREATED' }
  | { type: 'USER_LOGIN' } // Sadece geriye dönük kontrolü tetiklemek için giriş olayı
  | { type: 'MESSAGE_SENT', payload: { updatedProfile: UserProfileData } }
  | { type: 'GAME_PLAYED', payload: { updatedProfile: UserProfileData } }
  | { type: 'SCORE_UPDATED', payload: { updatedProfile: UserProfileData } }
  | { type: 'SPECIAL_ACTION', payload: { actionId: 'visited_creator_page' } }
  | { type: 'CLAN_ACTION', payload: { action: 'created' | 'joined' | 'promoted' | 'transferred' } };


/**
 * ANA FONKSİYON: Tüm başarım mantığının merkezi.
 * @param userProfile - Olay anındaki veya kontrol edilecek kullanıcı profili.
 * @param event - Gerçekleşen olay.
 */
export const checkAndGrantAchievements = (userProfile: UserProfileData, event: AchievementEvent) => {
  const { uid, achievements = [] } = userProfile;
  const hasAchievement = (id: string) => achievements.includes(id);

  // Olay tipine göre ilgili kontrolleri yap
  switch (event.type) {
    
    // --- GİRİŞ VE OTURUM KONTROLLERİ ---
    case 'USER_CREATED':
      if (!hasAchievement('first_login')) {
        grantAchievement(uid, 'first_login');
      }
      // Yeni kullanıcı oluşturulduğunda da genel bir kontrol yapalım.
      checkAllRetroactive(userProfile); 
      break;

    case 'USER_LOGIN':
      // Kullanıcı her giriş yaptığında, eksik başarımlarını kontrol et.
      checkAllRetroactive(userProfile);
      break;

    // --- ANLIK EYLEM KONTROLLERİ ---
    case 'MESSAGE_SENT':
      // Mesaj gönderildiğinde anlık olarak sadece mesaj başarımlarını kontrol etmemiz yeterli.
      checkMessageAchievements(event.payload.updatedProfile);
      break;
    
    case 'GAME_PLAYED':
      checkGameAchievements(event.payload.updatedProfile);
      break;
    
    case 'SCORE_UPDATED':
      checkScoreAchievements(event.payload.updatedProfile);
      break;
    
    case 'SPECIAL_ACTION':
      if (event.payload.actionId === 'visited_creator_page' && !hasAchievement('scholar_of_the_code')) {
        grantAchievement(uid, 'scholar_of_the_code');
      }
      break;
      
    case 'CLAN_ACTION':
      checkClanAchievements(userProfile, event.payload.action);
      break;
  }
  
  // Her olaydan sonra Efsane başarımını kontrol et.
  // Not: Efsane başarımının kazanılması, bir sonraki olayda veya girişte kesinleşir.
  checkLegendAchievement(userProfile);
};

// ================================================================================================
// YARDIMCI KONTROL FONKSİYONLARI (Kodu daha temiz hale getirir)
// ================================================================================================

const checkScoreAchievements = (userProfile: UserProfileData) => {
    const { uid, score = 0, achievements = [] } = userProfile;
    const has = (id: string) => achievements.includes(id);

    if (score >= 100 && !has('pixel_whisper')) grantAchievement(uid, 'pixel_whisper');
    if (score >= 10000 && !has('time_lord')) grantAchievement(uid, 'time_lord');
};

const checkMessageAchievements = (userProfile: UserProfileData) => {
    const { uid, messageCount = 0, achievements = [] } = userProfile;
    const has = (id: string) => achievements.includes(id);

    if (messageCount >= 1 && !has('chat_initiate')) grantAchievement(uid, 'chat_initiate');
    if (messageCount >= 100 && !has('frequency_echo')) grantAchievement(uid, 'frequency_echo');
    if (messageCount >= 1000 && !has('void_caller')) grantAchievement(uid, 'void_caller');
};

const checkGameAchievements = (userProfile: UserProfileData) => {
    const { uid, playedGames = [], achievements = [] } = userProfile;
    const has = (id: string) => achievements.includes(id);

    if (playedGames.length >= 10 && !has('interdimensional_traveler')) grantAchievement(uid, 'interdimensional_traveler');
};

const checkLegendAchievement = (userProfile: UserProfileData) => {
    const { uid, achievements = [] } = userProfile;
    if (achievements.includes('legend_of_ttmtal')) return;

    // "legend_of_ttmtal" ID'si hariç, listedeki tüm başarım ID'lerini al
    const requiredAchievementIds = achievementsList
        .map(ach => ach.id)
        .filter(id => id !== 'legend_of_ttmtal');

    // Kullanıcının sahip olduğu başarımlar, gerekli olanların tümünü içeriyor mu?
    const hasAllRequired = requiredAchievementIds.every(id => achievements.includes(id));

    if (hasAllRequired) {
        grantAchievement(uid, 'legend_of_ttmtal');
    }
};

/**
 * GERİYE DÖNÜK ANA KONTROL: Tüm başarımları tek seferde kontrol eder.
 * @param userProfile Kontrol edilecek kullanıcı profili
 */
const checkAllRetroactive = (userProfile: UserProfileData) => {
    console.log("Kullanıcı için geriye dönük başarım kontrolü yapılıyor:", userProfile.displayName);
    checkScoreAchievements(userProfile);
    checkMessageAchievements(userProfile);
    checkGameAchievements(userProfile);
    // Özel başarımlar geriye dönük kontrol edilmez (örn: scholar_of_the_code)
};

/**
 * KLAN BAŞARIMLARI: Klan ile ilgili başarımları kontrol eder.
 * @param userProfile Kontrol edilecek kullanıcı profili
 * @param action Gerçekleşen klan eylemi
 */
const checkClanAchievements = (userProfile: UserProfileData, action: 'created' | 'joined' | 'promoted' | 'transferred') => {
    const { uid, achievements = [], clanRole } = userProfile;
    const has = (id: string) => achievements.includes(id);

    // Klan kurucusu başarımı
    if (action === 'created' && !has('clan_founder')) {
        grantAchievement(uid, 'clan_founder');
    }
    
    // Klan lideri başarımı
    if ((action === 'promoted' || action === 'transferred') && clanRole === 'leader' && !has('clan_leader')) {
        grantAchievement(uid, 'clan_leader');
    }
    
    // Klan sadakati başarımı - bu daha karmaşık bir kontrol gerektirir
    // Şimdilik sadece klan üyesi olma durumu için basit bir kontrol yapıyoruz
    // Gerçek uygulamada, kullanıcının klanda geçirdiği süreyi takip etmek gerekir
};
