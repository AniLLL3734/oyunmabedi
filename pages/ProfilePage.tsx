import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../src/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { LoaderCircle, Award, ArrowLeft, Edit, MessageSquare, Flame, CalendarDays, Shield, ShoppingBag, Crown, Palette, Star, Clock, MessageSquare as MessageSquareIcon } from 'lucide-react'; // Shield ikonu import edildi
import { achievementsList, adminTitle } from '../data/achievements';
import { shopItems } from '../data/shopItems';
import { useAuth } from '../src/contexts/AuthContext';
import AdminTag from '../components/AdminTag';

// Arayüz tanımlamaları
interface UserProfile {
    uid: string;
    displayName: string;
    score: number;
    highestScore?: number;
    achievements: string[];
    role?: 'admin' | 'user';
    bio?: string;
    avatarUrl?: string;
    selectedTitle?: string;
    joinDate?: Timestamp;
    messageCount?: number;
    loginStreak?: number;
    lastLogin?: Timestamp;
    gender?: 'male' | 'female' | 'unspecified' | string;
    inventory?: {
        avatarFrames: string[];
        colorThemes: string[];
        specialTitles: string[];
        temporaryAchievements: { id: string; expiresAt: Date }[];
        specialEmojis: string[];
        activeAvatarFrame?: string;
        activeColorTheme?: string;
        activeSpecialTitle?: string;
    };
}

const titles: { [key: string]: string } = {
    first_login: 'Sinyal Alan',
    pixel_whisper: 'Piksel Fısıldayan',
    chat_initiate: 'Terminal Acemisi',
    frequency_echo: 'Frekansın Yankısı',
    interdimensional_traveler: 'Evrenler Arası Gezgin',
    scholar_of_the_code: 'Kodun Alimi',
    time_lord: 'Zaman Lordu',
    void_caller: 'Boşluğun Çağrısı',
    legend_of_ttmtal: 'TTMTAL Efsanesi',
    architect_title: 'Mimar'
};

const ProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- DÜZELTİLMİŞ BÖLÜM ---
    // Veri çekme mantığı, `authLoading` durumuna bağlanarak sonsuz döngü sorunu giderildi.
    useEffect(() => {
        // Auth durumu netleşmeden veya bir userId olmadan veri çekme.
        if (authLoading || !userId) {
            return;
        }

        let isMounted = true; // Component'in unmount olması durumunda state güncellemesini engellemek için

        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);

                // Component hala render ediliyorsa ve veri mevcutsa state'i güncelle
                if (isMounted && userSnap.exists()) {
                    setProfile(userSnap.data() as UserProfile);
                } else if (isMounted) {
                    setProfile(null); // Kullanıcı bulunamadıysa profili null yap
                }
            } catch (error) {
                console.error("Profil verisi çekilirken hata oluştu:", error);
                if (isMounted) {
                    setProfile(null);
                }
            } finally {
                // Her durumda (hata olsa da olmasa da) yüklenme durumunu bitir
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();

        // Cleanup fonksiyonu: Component DOM'dan kaldırıldığında çalışır
        // Bu sayede, işlem bitmeden sayfadan ayrılırsan hata almazsın.
        return () => {
            isMounted = false;
        };
    }, [userId, authLoading]); // Bağımlılıklar: Sadece userId veya authLoading değiştiğinde çalışır.
    // --- DÜZELTME SONU ---


    const handleSelectTitle = async (achievementId: string) => {
        if (!currentUser || currentUser.uid !== userId) return;
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { selectedTitle: achievementId });
            setProfile(prev => prev ? { ...prev, selectedTitle: achievementId } : null);
        } catch (error) {
            console.error("Unvan güncellenirken bir hata oluştu:", error);
        }
    };

    // Dükkan ürünlerini aktif etme/etmeme fonksiyonları
    const handleEquipShopItem = async (itemType: 'avatarFrame' | 'colorTheme' | 'specialTitle', itemId: string) => {
        if (!currentUser || currentUser.uid !== userId || !profile?.inventory) return;
        
        try {
            const userRef = doc(db, 'users', userId);
            const updateData: any = {};
            
            // Mevcut aktif ürünü kaldır ve yenisini ekle
            switch (itemType) {
                case 'avatarFrame':
                    updateData['inventory.activeAvatarFrame'] = itemId;
                    break;
                case 'colorTheme':
                    updateData['inventory.activeColorTheme'] = itemId;
                    break;
                case 'specialTitle':
                    updateData['inventory.activeSpecialTitle'] = itemId;
                    break;
            }
            
            await updateDoc(userRef, updateData);
            
            // Local state'i güncelle
            setProfile(prev => {
                if (!prev || !prev.inventory) return prev;
                return {
                    ...prev,
                    inventory: {
                        ...prev.inventory,
                        [`active${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`]: itemId
                    }
                };
            });
        } catch (error) {
            console.error("Ürün aktif edilirken hata:", error);
        }
    };

    const handleUnequipShopItem = async (itemType: 'avatarFrame' | 'colorTheme' | 'specialTitle') => {
        if (!currentUser || currentUser.uid !== userId || !profile?.inventory) return;
        
        try {
            const userRef = doc(db, 'users', userId);
            const updateData: any = {};
            
            // Aktif ürünü kaldır
            switch (itemType) {
                case 'avatarFrame':
                    updateData['inventory.activeAvatarFrame'] = null;
                    break;
                case 'colorTheme':
                    updateData['inventory.activeColorTheme'] = null;
                    break;
                case 'specialTitle':
                    updateData['inventory.activeSpecialTitle'] = null;
                    break;
            }
            
            await updateDoc(userRef, updateData);
            
            // Local state'i güncelle
            setProfile(prev => {
                if (!prev || !prev.inventory) return prev;
                return {
                    ...prev,
                    inventory: {
                        ...prev.inventory,
                        [`active${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`]: undefined
                    }
                };
            });
        } catch (error) {
            console.error("Ürün kaldırılırken hata:", error);
        }
    };
    
    // Yüklenme durumu (hem authentication hem de profil verisi için)
    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full py-20">
                <LoaderCircle className="animate-spin text-electric-purple" size={48} />
            </div>
        );
    }
    
    // Profil bulunamadıysa gösterilecek ekran
    if (!profile) {
        return (
            <div className="text-center py-20">
                <h1 className="text-4xl font-heading">Sinyal Kesildi</h1>
                <p className="mt-4 text-cyber-gray">Bu gezginin koordinatları evrende bulunamadı.</p>
                <Link to="/" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">
                    Ana Üsse Dön
                </Link>
            </div>
        );
    }
    
    // Adminse tüm başarımları, değilse standart başarımları göster
    const allAchievements = profile.role === 'admin' ? [...achievementsList, adminTitle] : achievementsList;
    const earnedAchievements = profile.achievements || [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <Link to="/leaderboard" className="inline-flex items-center gap-2 text-cyber-gray hover:text-electric-purple mb-8 transition-colors">
                 <ArrowLeft size={20} />
                 <span>Liderlik Tablosuna Dön</span>
             </Link>
             
             <div className="relative flex flex-col items-center text-center p-8 bg-dark-gray/50 border border-cyber-gray/50 rounded-lg">
                {currentUser && currentUser.uid === userId && (
                    <Link to="/edit-profile" title="Profilini Düzenle" className="absolute top-4 right-4 text-cyber-gray hover:text-electric-purple p-2 rounded-full hover:bg-space-black transition-colors">
                        <Edit />
                    </Link>
                )}

                 <div className="relative">
                     <img 
                         src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.displayName}&background=1a1a2e&color=ffffff`} 
                         alt={profile.displayName || 'Anonim'} 
                         className={`w-24 h-24 rounded-full border-4 object-cover ${
                             profile.inventory?.activeAvatarFrame === 'neon_frame' 
                                 ? 'border-electric-purple shadow-neon-purple ring-4 ring-cyan-400/50' 
                                 : profile.inventory?.activeAvatarFrame === 'hologram_frame'
                                 ? 'border-purple-400 shadow-purple-400 ring-4 ring-purple-400/50'
                                 : profile.inventory?.activeAvatarFrame === 'golden_frame'
                                 ? 'border-yellow-400 shadow-yellow-400 ring-4 ring-yellow-400/50'
                                 : profile.inventory?.activeAvatarFrame === 'matrix_frame'
                                 ? 'border-green-400 shadow-green-400 ring-4 ring-green-400/50'
                                 : profile.inventory?.activeAvatarFrame === 'fire_frame'
                                 ? 'border-red-400 shadow-red-400 ring-4 ring-red-400/50'
                                 : 'border-electric-purple shadow-neon-purple'
                         }`}
                     />
                     {/* Aktif çerçeve efekti */}
                     {profile.inventory?.activeAvatarFrame && (
                         <div className={`absolute inset-0 rounded-full animate-pulse ${
                             profile.inventory.activeAvatarFrame === 'neon_frame' 
                                 ? 'ring-2 ring-cyan-400/30' 
                                 : profile.inventory.activeAvatarFrame === 'hologram_frame'
                                 ? 'ring-2 ring-purple-400/30'
                                 : profile.inventory.activeAvatarFrame === 'golden_frame'
                                 ? 'ring-2 ring-yellow-400/30'
                                 : profile.inventory.activeAvatarFrame === 'matrix_frame'
                                 ? 'ring-2 ring-green-400/30'
                                 : profile.inventory.activeAvatarFrame === 'fire_frame'
                                 ? 'ring-2 ring-red-400/30'
                                 : ''
                         }`} />
                     )}
                 </div>
                 
                 {profile.role === 'admin' ? (
                     <div className="text-center w-full">
                         <AdminTag name={profile.displayName || 'Anonim'} className="text-4xl md:text-5xl font-heading mt-4" variant="crown" />
                         <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-2 md:gap-4">
                             <span className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/50 rounded-full text-yellow-300 text-sm font-bold animate-admin-pulse">
                                 👑 MİMAR
                             </span>
                             <span className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/50 rounded-full text-purple-300 text-sm font-bold animate-admin-float">
                                 ⚡ SİSTEM YÖNETİCİSİ
                             </span>
                         </div>
                     </div>
                 ) : (
                    <h1 className="text-4xl md:text-5xl font-heading mt-4 flex items-center justify-center gap-3">
                        {profile.displayName || 'Anonim'}
                        {profile.gender === 'male' && <span title="Erkek" className="text-blue-400 text-2xl">♂</span>}
                        {profile.gender === 'female' && <span title="Kadın" className="text-pink-400 text-2xl">♀</span>}
                    </h1>
                 )}

                 {/* Aktif Unvanlar */}
                 {profile.selectedTitle && titles[profile.selectedTitle] && (
                     <p className="text-lg text-electric-purple mt-2 font-bold tracking-widest">{titles[profile.selectedTitle]}</p>
                 )}
                 {profile.inventory?.activeSpecialTitle && (
                     <p className="text-lg text-purple-400 mt-2 font-bold tracking-widest">
                         {shopItems.find(item => item.id === profile.inventory?.activeSpecialTitle)?.name}
                     </p>
                 )}
                 <div className="flex items-center justify-center gap-4">
                    <p className="text-3xl md:text-4xl font-mono text-cyber-gray mt-2">{profile.score?.toLocaleString() || 0} SKOR</p>
                    <div className="border-l border-cyber-gray/20 pl-4 mt-2">
                        <p className="text-2xl md:text-3xl font-mono text-yellow-400">
                            {profile.highestScore?.toLocaleString() || profile.score?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-cyber-gray uppercase">En Yüksek Skor</p>
                    </div>
                 </div>

                {/* İstatistikler Bölümü */}
                <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-6 border-t border-cyber-gray/20 pt-6 w-full">
                    <div className="flex flex-col items-center min-w-[80px]">
                        <MessageSquare className="text-electric-purple" />
                        <span className="text-2xl font-bold mt-1">{profile.messageCount || 0}</span>
                        <span className="text-xs text-cyber-gray uppercase">Mesaj</span>
                    </div>
                    <div className="flex flex-col items-center min-w-[80px]">
                        <Flame className="text-electric-purple" />
                        <span className="text-2xl font-bold mt-1">{profile.loginStreak || 0}</span>
                        <span className="text-xs text-cyber-gray uppercase">Seri</span>
                    </div>
                    <div className="flex flex-col items-center min-w-[80px]">
                        <CalendarDays className="text-electric-purple" />
                        <span className="text-xl font-bold mt-1">
                            {profile.joinDate ? profile.joinDate.toDate().toLocaleDateString('tr-TR') : 'N/A'}
                        </span>
                        <span className="text-xs text-cyber-gray uppercase">Katılım</span>
                    </div>
                </div>

                 {profile.bio && <p className="text-cyber-gray mt-6 max-w-lg italic">"{profile.bio}"</p>}
                 
                 {/* Admin Paneli */}
                 {profile.role === 'admin' && currentUser?.uid === userId && (
                     <div className="mt-8 p-6 w-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-lg">
                         <h3 className="text-2xl font-heading mb-4 flex items-center justify-center gap-2 text-yellow-300">
                             <Shield size={24} />
                             Admin Paneli
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <Link 
                                 to="/admin" 
                                 className="p-4 bg-dark-gray/50 hover:bg-electric-purple/20 rounded-lg border border-cyber-gray/50 hover:border-electric-purple/50 transition-all group"
                             >
                                 <div className="flex items-center gap-3">
                                     <Shield className="text-electric-purple group-hover:text-yellow-400" size={20} />
                                     <div>
                                         <p className="font-bold text-ghost-white">Yönetim Paneli</p>
                                         <p className="text-sm text-cyber-gray">Kullanıcıları yönet</p>
                                     </div>
                                 </div>
                             </Link>
                             <Link 
                                 to="/chat" 
                                 className="p-4 bg-dark-gray/50 hover:bg-green-500/20 rounded-lg border border-cyber-gray/50 hover:border-green-500/50 transition-all group"
                             >
                                 <div className="flex items-center gap-3">
                                     <MessageSquare className="text-green-400 group-hover:text-green-300" size={20} />
                                     <div>
                                         <p className="font-bold text-ghost-white">Sohbet Komutları</p>
                                         <p className="text-sm text-cyber-gray">Admin komutları kullan</p>
                                     </div>
                                 </div>
                             </Link>
                             <div className="p-4 bg-dark-gray/50 rounded-lg border border-cyber-gray/50">
                                 <div className="flex items-center gap-3">
                                     <Award className="text-yellow-400" size={20} />
                                     <div>
                                         <p className="font-bold text-ghost-white">Moderasyon</p>
                                         <p className="text-sm text-cyber-gray">Otomatik aktif</p>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
             </div>
             
             {/* Koleksiyon Bölümü */}
             <div className="mt-12">
                 <h2 className="text-3xl font-heading mb-6 flex items-center">
                    <Award className="inline-block mr-3 text-yellow-400" />Koleksiyon ve Unvanlar
                </h2>
                 <p className="text-cyber-gray mb-6">Kazanılan başarımlara tıklayarak unvanını değiştirebilirsin.</p>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {allAchievements.map((achievement, index) => {
                         const isEarned = earnedAchievements.includes(achievement.id);
                         const isSelected = profile.selectedTitle === achievement.id;
                         const Icon = achievement.icon; // Icon component'ini değişkene atıyoruz.
                         return (
                            <motion.div 
                                key={achievement.id}
                                title={isEarned && currentUser?.uid === userId ? `"${titles[achievement.id] || achievement.name}" unvanını seç` : `${achievement.name}\n${achievement.description}`}
                                className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 aspect-square border transition-all ${isEarned && currentUser?.uid === userId ? 'cursor-pointer' : ''} ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400 bg-dark-gray' : isEarned ? 'border-electric-purple bg-dark-gray' : 'border-dashed border-cyber-gray/20 bg-space-black'}`}
                                initial={{ opacity: 0.5, scale: 0.8 }}
                                animate={{ opacity: isEarned ? 1 : 0.3, scale: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.05}}
                                onClick={() => isEarned && currentUser?.uid === userId && handleSelectTitle(achievement.id)}
                            >
                                <Icon size={40} className={isEarned ? achievement.color : 'text-cyber-gray/30'} />
                                <span className={`font-bold text-center text-xs ${isEarned ? 'text-ghost-white' : 'text-cyber-gray/50'}`}>{isEarned ? (titles[achievement.id] || achievement.name) : '???'}</span>
                            </motion.div>
                         );
                     })}
                 </div>
             </div>

             {/* Dükkan Koleksiyonu Bölümü */}
             {profile.inventory && (
                 <div className="mt-12">
                     <h2 className="text-3xl font-heading mb-6 flex items-center">
                        <ShoppingBag className="inline-block mr-3 text-yellow-400" />Dükkan Koleksiyonu
                    </h2>
                     <p className="text-cyber-gray mb-6">Siber dükkandan satın alınan eşsiz ürünler.</p>
                     
                     {/* Avatar Çerçeveleri */}
                     {profile.inventory.avatarFrames && profile.inventory.avatarFrames.length > 0 && (
                         <div className="mb-8">
                             <h3 className="text-xl font-bold text-ghost-white mb-4 flex items-center gap-2">
                                 <Crown className="text-yellow-400" size={20} />
                                 Avatar Çerçeveleri
                             </h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {profile.inventory.avatarFrames.map(frameId => {
                                     const frame = shopItems.find(item => item.id === frameId);
                                     if (!frame) return null;
                                     const isActive = profile.inventory?.activeAvatarFrame === frameId;
                                     const canInteract = currentUser?.uid === userId;
                                     
                                     return (
                                         <motion.div 
                                             key={frameId}
                                             className={`p-4 rounded-lg border text-center transition-all ${
                                                 isActive 
                                                     ? 'border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400/50' 
                                                     : 'border-electric-purple bg-dark-gray/50'
                                             }`}
                                             whileHover={{ scale: canInteract ? 1.05 : 1 }}
                                         >
                                             <Crown className={`mx-auto mb-2 ${isActive ? 'text-yellow-400' : 'text-electric-purple'}`} size={24} />
                                             <p className="text-sm font-bold text-ghost-white mb-2">{frame.name}</p>
                                             {canInteract && (
                                                 <button
                                                     onClick={() => isActive 
                                                         ? handleUnequipShopItem('avatarFrame')
                                                         : handleEquipShopItem('avatarFrame', frameId)
                                                     }
                                                     className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                                         isActive
                                                             ? 'bg-red-500 hover:bg-red-600 text-white'
                                                             : 'bg-electric-purple hover:bg-electric-purple/80 text-white'
                                                     }`}
                                                 >
                                                     {isActive ? 'Çıkar' : 'Tak'}
                                                 </button>
                                             )}
                                         </motion.div>
                                     );
                                 })}
                             </div>
                         </div>
                     )}

                     {/* Renk Temaları */}
                     {profile.inventory.colorThemes && profile.inventory.colorThemes.length > 0 && (
                         <div className="mb-8">
                             <h3 className="text-xl font-bold text-ghost-white mb-4 flex items-center gap-2">
                                 <Palette className="text-blue-400" size={20} />
                                 Renk Temaları
                             </h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {profile.inventory.colorThemes.map(themeId => {
                                     const theme = shopItems.find(item => item.id === themeId);
                                     if (!theme) return null;
                                     const isActive = profile.inventory?.activeColorTheme === themeId;
                                     const canInteract = currentUser?.uid === userId;
                                     
                                     return (
                                         <motion.div 
                                             key={themeId}
                                             className={`p-4 rounded-lg border text-center transition-all ${
                                                 isActive 
                                                     ? 'border-blue-400 bg-blue-400/10 ring-2 ring-blue-400/50' 
                                                     : 'border-blue-400 bg-dark-gray/50'
                                             }`}
                                             whileHover={{ scale: canInteract ? 1.05 : 1 }}
                                         >
                                             <Palette className={`mx-auto mb-2 ${isActive ? 'text-blue-400' : 'text-blue-400'}`} size={24} />
                                             <p className="text-sm font-bold text-ghost-white mb-2">{theme.name}</p>
                                             {canInteract && (
                                                 <button
                                                     onClick={() => isActive 
                                                         ? handleUnequipShopItem('colorTheme')
                                                         : handleEquipShopItem('colorTheme', themeId)
                                                     }
                                                     className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                                         isActive
                                                             ? 'bg-red-500 hover:bg-red-600 text-white'
                                                             : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                     }`}
                                                 >
                                                     {isActive ? 'Çıkar' : 'Uygula'}
                                                 </button>
                                             )}
                                         </motion.div>
                                     );
                                 })}
                             </div>
                         </div>
                     )}

                     {/* Özel Unvanlar */}
                     {profile.inventory.specialTitles && profile.inventory.specialTitles.length > 0 && (
                         <div className="mb-8">
                             <h3 className="text-xl font-bold text-ghost-white mb-4 flex items-center gap-2">
                                 <Star className="text-purple-400" size={20} />
                                 Özel Unvanlar
                             </h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {profile.inventory.specialTitles.map(titleId => {
                                     const title = shopItems.find(item => item.id === titleId);
                                     if (!title) return null;
                                     const isActive = profile.inventory?.activeSpecialTitle === titleId;
                                     const canInteract = currentUser?.uid === userId;
                                     
                                     return (
                                         <motion.div 
                                             key={titleId}
                                             className={`p-4 rounded-lg border text-center transition-all ${
                                                 isActive 
                                                     ? 'border-purple-400 bg-purple-400/10 ring-2 ring-purple-400/50' 
                                                     : 'border-purple-400 bg-dark-gray/50'
                                             }`}
                                             whileHover={{ scale: canInteract ? 1.05 : 1 }}
                                         >
                                             <Star className={`mx-auto mb-2 ${isActive ? 'text-purple-400' : 'text-purple-400'}`} size={24} />
                                             <p className="text-sm font-bold text-ghost-white mb-2">{title.name}</p>
                                             {canInteract && (
                                                 <button
                                                     onClick={() => isActive 
                                                         ? handleUnequipShopItem('specialTitle')
                                                         : handleEquipShopItem('specialTitle', titleId)
                                                     }
                                                     className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                                         isActive
                                                             ? 'bg-red-500 hover:bg-red-600 text-white'
                                                             : 'bg-purple-500 hover:bg-purple-600 text-white'
                                                     }`}
                                                 >
                                                     {isActive ? 'Çıkar' : 'Seç'}
                                                 </button>
                                             )}
                                         </motion.div>
                                     );
                                 })}
                             </div>
                         </div>
                     )}

                     {/* Geçici Başarımlar */}
                     {profile.inventory.temporaryAchievements && profile.inventory.temporaryAchievements.length > 0 && (
                         <div className="mb-8">
                             <h3 className="text-xl font-bold text-ghost-white mb-4 flex items-center gap-2">
                                 <Clock className="text-orange-400" size={20} />
                                 Geçici Başarımlar
                             </h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {profile.inventory.temporaryAchievements.map(achievement => {
                                     const tempAchievement = shopItems.find(item => item.id === achievement.id);
                                     if (!tempAchievement) return null;
                                     const isExpired = new Date(achievement.expiresAt) < new Date();
                                     return (
                                         <motion.div 
                                             key={achievement.id}
                                             className={`p-4 rounded-lg border text-center ${
                                                 isExpired 
                                                     ? 'border-gray-600 bg-gray-800/50 opacity-60' 
                                                     : 'border-orange-400 bg-dark-gray/50'
                                             }`}
                                             whileHover={{ scale: 1.05 }}
                                         >
                                             <Clock className={`mx-auto mb-2 ${isExpired ? 'text-gray-500' : 'text-orange-400'}`} size={24} />
                                             <p className={`text-sm font-bold ${isExpired ? 'text-gray-500' : 'text-ghost-white'}`}>
                                                 {tempAchievement.name}
                                             </p>
                                             {!isExpired && (
                                                 <p className="text-xs text-orange-400 mt-1">
                                                     {new Date(achievement.expiresAt).toLocaleDateString('tr-TR')}
                                                 </p>
                                             )}
                                         </motion.div>
                                     );
                                 })}
                             </div>
                         </div>
                     )}

                     {/* Özel Emojiler */}
                     {profile.inventory.specialEmojis && profile.inventory.specialEmojis.length > 0 && (
                         <div className="mb-8">
                             <h3 className="text-xl font-bold text-ghost-white mb-4 flex items-center gap-2">
                                 <MessageSquareIcon className="text-green-400" size={20} />
                                 Özel Emojiler
                             </h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {profile.inventory.specialEmojis.map(emojiId => {
                                     const emoji = shopItems.find(item => item.id === emojiId);
                                     if (!emoji) return null;
                                     return (
                                         <motion.div 
                                             key={emojiId}
                                             className="p-4 rounded-lg border border-green-400 bg-dark-gray/50 text-center"
                                             whileHover={{ scale: 1.05 }}
                                         >
                                             <MessageSquareIcon className="text-green-400 mx-auto mb-2" size={24} />
                                             <p className="text-sm font-bold text-ghost-white">{emoji.name}</p>
                                         </motion.div>
                                     );
                                 })}
                             </div>
                         </div>
                     )}

                     {/* Koleksiyon boşsa */}
                     {(!profile.inventory.avatarFrames || profile.inventory.avatarFrames.length === 0) &&
                      (!profile.inventory.colorThemes || profile.inventory.colorThemes.length === 0) &&
                      (!profile.inventory.specialTitles || profile.inventory.specialTitles.length === 0) &&
                      (!profile.inventory.temporaryAchievements || profile.inventory.temporaryAchievements.length === 0) &&
                      (!profile.inventory.specialEmojis || profile.inventory.specialEmojis.length === 0) && (
                         <div className="text-center py-12">
                             <ShoppingBag className="mx-auto text-cyber-gray mb-4" size={64} />
                             <h3 className="text-2xl font-bold text-cyber-gray mb-2">Koleksiyon Boş</h3>
                             <p className="text-cyber-gray mb-4">Henüz dükkandan hiçbir ürün satın alınmamış.</p>
                             {currentUser?.uid === userId && (
                                 <Link 
                                     to="/shop" 
                                     className="inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all"
                                 >
                                     Siber Dükkana Git
                                 </Link>
                             )}
                         </div>
                     )}
                 </div>
             )}
        </motion.div>
    );
};

export default ProfilePage;