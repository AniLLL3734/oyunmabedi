// pages/ClansPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, serverTimestamp, writeBatch, where, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth } from '../src/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Users, ShieldPlus, Search, Trophy, Star, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clanEmblems, getClanIconComponent } from '../components/ClanIcons';
import { checkAndGrantAchievements } from '../src/utils/achievementService';

// =============================================================================
// TYPESCRIPT VERİ TİPLERİ
// =============================================================================
interface Clan {
  id: string;
  name: string;
  bio: string;
  emblem: string;
  totalScore: number;
  memberCount: number;
  level: number;
  experience: number;
  leaderId: string;
  createdAt: any;
}

// =============================================================================
// BİLEŞEN 1: ClanCard
// =============================================================================
const ClanCard: React.FC<{ clan: Clan; userClanId?: string | null; onJoin: (clanId: string) => void; isJoining: boolean; }> = ({ clan, userClanId, onJoin, isJoining }) => {
  const isMember = userClanId === clan.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`relative p-5 rounded-lg border-2 flex flex-col justify-between transition-all duration-300 ${
        isMember
          ? 'bg-electric-purple/10 border-electric-purple shadow-lg shadow-electric-purple/10'
          : 'bg-dark-gray/60 border-cyber-gray/20 hover:border-electric-purple/50'
      }`}
    >
      {isMember && (
        <div className="absolute top-2 right-2 bg-electric-purple text-white text-xs font-bold px-2 py-1 rounded-full">
          SENİN KLANIN
        </div>
      )}
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-2xl font-bold text-ghost-white truncate">{clan.name}</h3>
          <div className="w-12 h-12 bg-electric-purple/20 ring-2 ring-electric-purple/50 rounded-full flex items-center justify-center text-white flex-shrink-0">
            {getClanIconComponent(clan.emblem, { size: 28, className: "text-electric-purple" })}
          </div>
        </div>
        <div className="space-y-2 text-sm text-cyber-gray">
          <p className="flex items-center gap-2"><Users size={16} /> Üyeler: {clan.memberCount}</p>
          <p className="flex items-center gap-2"><Trophy size={16} /> Toplam Skor: {clan.totalScore.toLocaleString()}</p>
          <p className="flex items-center gap-2"><Star size={16} /> Seviye: {clan.level}</p>
          <p className="flex items-center gap-2"><Zap size={16} /> Tecrübe: {clan.experience?.toLocaleString() || '0'}</p>
        </div>
      </div>
      {isMember ? (
        <Link to={`/clan/${clan.id}`} className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 text-center block transition-all duration-200">
          Klanı Görüntüle
        </Link>
      ) : (
        <button
          onClick={() => onJoin(clan.id)}
          disabled={isJoining || !!userClanId}
          className={`mt-4 w-full px-4 py-2 rounded-md font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            !!userClanId ? 'bg-gray-800 text-gray-500' : 'bg-electric-purple text-white hover:bg-purple-700'
          }`}
        >
          {!!userClanId ? 'Klanın Var' : 'Katıl'}
        </button>
      )}
    </motion.div>
  );
};

// =============================================================================
// BİLEŞEN 2: CreateClanModal
// =============================================================================
const CreateClanModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onCreate: (details: { clanName: string; clanBio: string; emblem: string; }) => Promise<void>; 
    isCreating: boolean; 
}> = ({ isOpen, onClose, onCreate, isCreating }) => {
  const [clanName, setClanName] = useState('');
  const [clanBio, setClanBio] = useState('');
  const [selectedEmblem, setSelectedEmblem] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clanName.trim().length < 3) { toast.error('Klan adı en az 3 karakter olmalıdır.'); return; }
    if (clanBio.trim().length < 10) { toast.error('Klan sloganı en az 10 karakter olmalıdır.'); return; }
    if (!selectedEmblem) { toast.error('Lütfen bir klan simgesi seçin.'); return; }

    onCreate({ clanName: clanName.trim(), clanBio: clanBio.trim(), emblem: selectedEmblem }).then(() => {
        setClanName('');
        setClanBio('');
        setSelectedEmblem(null);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        className="bg-dark-gray p-8 rounded-lg w-full max-w-lg border border-cyber-gray/30 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-cyber-gray hover:text-white"><X /></button>
        <h2 className="text-3xl font-bold mb-6 text-ghost-white">Yeni Klan Kur</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-cyber-gray mb-1">Klan Adı</label>
                <input type="text" placeholder="Örn: Kuzeyin Savaşçıları" value={clanName} onChange={(e) => setClanName(e.target.value)}
                    className="w-full p-3 bg-black/20 border-2 border-cyber-gray/30 rounded-md text-white focus:outline-none focus:border-electric-purple"
                    maxLength={24} required />
                <p className="text-xs text-cyber-gray mt-1 text-right">{clanName.length}/24</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-cyber-gray mb-1">Klan Sloganı / Biyografisi</label>
                <textarea placeholder="Klanınızın amacını ve ruhunu yansıtan kısa bir yazı..." value={clanBio} onChange={(e) => setClanBio(e.target.value)}
                    className="w-full p-3 bg-black/20 border-2 border-cyber-gray/30 rounded-md text-white focus:outline-none focus:border-electric-purple resize-none"
                    maxLength={150} rows={3} required />
                <p className="text-xs text-cyber-gray mt-1 text-right">{clanBio.length}/150</p>
            </div>
             <div>
                <label className="block text-sm font-medium text-cyber-gray mb-2">Klan Simgesi</label>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-3 bg-black/20 p-4 rounded-md">
                    {clanEmblems.map(emblem => (
                        <button type="button" key={emblem.name} onClick={() => setSelectedEmblem(emblem.name)}
                            className={`flex items-center justify-center w-full aspect-square rounded-lg border-2 transition-all duration-200 ${
                                selectedEmblem === emblem.name ? 'bg-electric-purple/30 border-electric-purple scale-110' : 'bg-cyber-gray/20 border-transparent hover:border-cyber-gray'
                            }`} >
                            <emblem.Component size={32} className={selectedEmblem === emblem.name ? 'text-white' : 'text-cyber-gray'} />
                        </button>
                    ))}
                </div>
            </div>
            <button type="submit" disabled={isCreating} className="w-full bg-electric-purple text-white py-3 rounded-md font-bold hover:bg-purple-700 transition-colors disabled:bg-purple-900 disabled:cursor-wait">
                {isCreating ? 'Oluşturuluyor...' : 'Klanı Kur'}
            </button>
        </form>
      </motion.div>
    </div>
  );
};

// =============================================================================
// YARDIMCI HOOK: useDebounce
// =============================================================================
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// =============================================================================
// ANA BİLEŞEN: ClansPage
// =============================================================================
const ClansPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [clans, setClans] = useState<Clan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchClans();
  }, []);
  
  const fetchClans = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'clans'));
      const querySnapshot = await getDocs(q);
      const clanList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clan));
      setClans(clanList.sort((a,b) => b.memberCount - a.memberCount));
    } catch (err) {
      toast.error('Klanlar yüklenirken bir hata oluştu.');
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleCreateClan = async (details: { clanName: string; clanBio: string; emblem: string; }) => {
    const { clanName, clanBio, emblem } = details;
    if (!user || !userProfile) {
        toast.error('Klan kurmak için giriş yapmalı ve profiliniz yüklenmiş olmalı.');
        return;
    }
    if (userProfile.clanId) {
        toast.error('Zaten bir klanda olduğunuz için yeni klan kuramazsınız.');
        return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Klan oluşturuluyor...');
    
    try {
      const nameCheckQuery = query(collection(db, "clans"), where("name_lowercase", "==", clanName.toLowerCase()));
      const nameCheckSnapshot = await getDocs(nameCheckQuery);
      if (!nameCheckSnapshot.empty) { throw new Error("Bu klan adı zaten kullanımda!"); }
      
      const newClanData = {
        name: clanName,
        name_lowercase: clanName.toLowerCase(),
        bio: clanBio,
        emblem: emblem,
        totalScore: userProfile.score || 0,
        memberCount: 1,
        level: 1,
        experience: 0,
        leaderId: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid]
      };
      
      const batch = writeBatch(db);
      const clanRef = doc(collection(db, 'clans'));
      batch.set(clanRef, newClanData);
      
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, { clanId: clanRef.id, clanRole: 'leader' });
      
      await batch.commit();
      
      // Trigger clan founder achievement
      if (userProfile) {
        checkAndGrantAchievements(userProfile, { type: 'CLAN_ACTION', payload: { action: 'created' } });
      }
      
      setClans(prev => [{ id: clanRef.id, ...newClanData } as Clan, ...prev]);

      // refreshUserProfile not available

      setIsModalOpen(false);
      toast.success(`'${clanName}' klanı başarıyla kuruldu!`, { id: loadingToast });

    } catch (err: any) {
      toast.error(err.message || 'Klan oluşturulamadı.', { id: loadingToast });
      console.error("Klan Oluşturma Hatası:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleJoinClan = async (clanId: string) => {
    if (!user || !userProfile || userProfile.clanId) {
        toast.error('Önce giriş yapmalı ve bir klanda olmamalısınız.');
        return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Klana katılım işleniyor...');

    try {
      const batch = writeBatch(db);
      const clanRef = doc(db, 'clans', clanId);
      batch.update(clanRef, {
          members: arrayUnion(user.uid),
          memberCount: increment(1),
          totalScore: increment(userProfile.score || 0)
      });

      const userRef = doc(db, 'users', user.uid);
      const clanRole = 'member';
      batch.update(userRef, { clanId, clanRole });

      await batch.commit();

      setClans(prev => prev.map(c => c.id === clanId ? {...c, memberCount: c.memberCount + 1 } : c));

      // refreshUserProfile not available

      toast.success('Klana başarıyla katıldın!', { id: loadingToast });
    } catch (err) {
      toast.error('Klana katılamadın.', { id: loadingToast });
      console.error("Klana Katılma Hatası:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClans = useMemo(() =>
    clans.filter(clan => clan.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())),
    [clans, debouncedSearchTerm]
  );
  
  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }}/>
      <AnimatePresence>
        <CreateClanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateClan} isCreating={isSubmitting}/>
      </AnimatePresence>

      <motion.div className="container mx-auto px-4 py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center mb-8">
            <h1 className="text-5xl font-heading mb-2">Klanlar Diyarı</h1>
            <p className="text-lg text-cyber-gray">Bir klana katıl veya kendi klanını kurarak gücünü göster.</p>
        </div>
        <div className="mb-8 p-4 bg-dark-gray/50 rounded-lg flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-gray" size={20}/>
                <input type="text" placeholder="Klan ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/20 p-3 pl-10 border-2 border-transparent rounded-md text-white focus:outline-none focus:border-electric-purple transition-colors"/>
            </div>
            <button onClick={() => setIsModalOpen(true)} disabled={!!userProfile?.clanId}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-electric-purple text-white px-6 py-3 rounded-md font-bold hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0">
                <ShieldPlus size={20} /> Klan Kur
            </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-56 bg-dark-gray/40 rounded-lg animate-pulse"></div>)}
          </div>
        ) : (
          <AnimatePresence>
            {filteredClans.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                  <p className="text-cyber-gray">Aradığınız kriterlere uygun bir klan bulunamadı.</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClans.map(clan => (
                    <ClanCard key={clan.id} clan={clan} userClanId={userProfile?.clanId} onJoin={handleJoinClan} isJoining={isSubmitting}/>
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </>
  );
};

export default ClansPage;