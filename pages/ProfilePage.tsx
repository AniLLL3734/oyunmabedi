import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../src/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { LoaderCircle, Award, ArrowLeft, Edit, MessageSquare, Flame, CalendarDays, Shield } from 'lucide-react'; // Shield ikonu import edildi
import { achievementsList, adminTitle } from '../data/achievements';
import { useAuth } from '../src/contexts/AuthContext';
import AdminTag from '../components/AdminTag';

// Arayüz tanımlamaları
interface UserProfile {
    uid: string;
    displayName: string;
    score: number;
    achievements: string[];
    role?: 'admin' | 'user';
    bio?: string;
    avatarUrl?: string;
    selectedTitle?: string;
    joinDate?: Timestamp;
    messageCount?: number;
    loginStreak?: number;
    lastLogin?: Timestamp;
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

                 <img 
                     src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.displayName}&background=1a1a2e&color=ffffff`} 
                     alt={profile.displayName || 'Anonim'} 
                     className="w-24 h-24 rounded-full border-4 border-electric-purple shadow-neon-purple object-cover"
                 />
                 
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
                     <h1 className="text-4xl md:text-5xl font-heading mt-4">{profile.displayName || 'Anonim'}</h1>
                 )}

                 {profile.selectedTitle && titles[profile.selectedTitle] && (
                     <p className="text-lg text-electric-purple mt-2 font-bold tracking-widest">{titles[profile.selectedTitle]}</p>
                 )}
                 <p className="text-3xl md:text-4xl font-mono text-cyber-gray mt-2">{profile.score?.toLocaleString() || 0} SKOR</p>

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
        </motion.div>
    );
};

export default ProfilePage;