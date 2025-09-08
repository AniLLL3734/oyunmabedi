// DOSYA: pages/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../src/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { LoaderCircle, Award, ArrowLeft, Edit } from 'lucide-react';
import { getAchievementById, achievementsList, adminTitle } from '../data/achievements';
import { useAuth } from '../src/contexts/AuthContext';
import AdminTag from '../components/AdminTag'; // AdminTag bileşenini import et

interface UserProfile {
    uid: string;
    displayName: string;
    score: number;
    achievements: string[];
    role?: 'admin' | 'user';
    bio?: string;
    avatarUrl?: string;
    selectedTitle?: string;
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

    useEffect(() => {
        if (!userId) { setIsLoading(false); return; }
        const fetchProfile = async () => {
            setIsLoading(true);
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) setProfile(userSnap.data() as UserProfile);
            setIsLoading(false);
        };
        fetchProfile();
    }, [userId]);

    const handleSelectTitle = async (achievementId: string) => {
        if (!currentUser || currentUser.uid !== userId) return;
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { selectedTitle: achievementId });
        setProfile(prev => prev ? { ...prev, selectedTitle: achievementId } : null);
    };
    
    if (isLoading || authLoading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    
    if (!profile) return <div className="text-center py-20"><h1 className="text-4xl font-heading">Sinyal Kesildi</h1><p className="mt-4 text-cyber-gray">Bu gezginin koordinatları evrende bulunamadı.</p><Link to="/" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">Ana Üsse Dön</Link></div>
    
    const allAchievements = profile.role === 'admin' ? [...achievementsList, adminTitle] : achievementsList;
    const earnedAchievements = profile.achievements || [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <Link to="/leaderboard" className="inline-flex items-center gap-2 text-cyber-gray hover:text-electric-purple mb-8 transition-colors"><ArrowLeft size={20} /><span>Liderlik Tablosuna Dön</span></Link>
             <div className="relative flex flex-col items-center text-center p-8 bg-dark-gray/50 border border-cyber-gray/50 rounded-lg">
                {currentUser && currentUser.uid === userId && (<Link to="/edit-profile" title="Profilini Düzenle" className="absolute top-4 right-4 text-cyber-gray hover:text-electric-purple p-2 rounded-full hover:bg-space-black transition-colors"><Edit /></Link>)}
                 <img src={profile.avatarUrl} alt={profile.displayName} className="w-24 h-24 rounded-full border-4 border-electric-purple shadow-neon-purple object-cover"/>
                 
                 {profile.role === 'admin' ? (
                     <AdminTag name={profile.displayName} className="text-6xl font-heading mt-4" />
                 ) : (
                     <h1 className="text-6xl font-heading mt-4">{profile.displayName}</h1>
                 )}

                 {profile.selectedTitle && titles[profile.selectedTitle] && <p className="text-lg text-electric-purple mt-2 font-bold tracking-widest">{titles[profile.selectedTitle]}</p>}
                 <p className="text-4xl font-mono text-cyber-gray">{profile.score?.toLocaleString() || 0} SKOR</p>
                 {profile.bio && <p className="text-cyber-gray mt-4 max-w-lg italic">"{profile.bio}"</p>}
             </div>
             
             <div className="mt-12">
                 <h2 className="text-3xl font-heading mb-6"><Award className="inline-block mr-3 text-yellow-400" />Koleksiyon ve Unvanlar</h2>
                 <p className="text-cyber-gray mb-6">Kazanılan başarımlara tıklayarak unvanını değiştirebilirsin.</p>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {allAchievements.map((achievement, index) => {
                         const isEarned = earnedAchievements.includes(achievement.id);
                         const isSelected = profile.selectedTitle === achievement.id;
                         const Icon = achievement.icon;
                         return (
                            <motion.div 
                                key={achievement.id}
                                title={isEarned ? `"${titles[achievement.id]}" unvanını seçmek için tıkla` : `${achievement.name}\n${achievement.description}`}
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