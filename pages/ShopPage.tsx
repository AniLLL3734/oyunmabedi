// DOSYA: pages/ShopPage.tsx
// SİBER DÜKKAN - DİJİTAL EVRENİN TİCARET MERKEZİ

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../src/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import {
  ShoppingBag,
  Filter,
  Search,
  Star,
  Clock,
  Crown,
  Palette,
  MessageSquare,
  LoaderCircle,
  Check,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { shopItems, shopCategories, rarityColors } from '../data/shopItems';
import { ShopItem, ShopItemType, UserInventory } from '../types';
import { toast } from 'react-hot-toast';

const ShopPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userInventory, setUserInventory] = useState<UserInventory>({
    avatarFrames: [],
    profileAnimations: [],
    profileBackgrounds: [], // Eklendi
    specialTitles: [],
    temporaryAchievements: [],
    specialEmojis: []
  });
  const [userScore, setUserScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserScore(userData.score || 0);
          const defaultInventory: UserInventory = {
            avatarFrames: [],
            profileAnimations: [],
            profileBackgrounds: [],
            specialTitles: [],
            temporaryAchievements: [],
            specialEmojis: []
          };
          setUserInventory({ ...defaultInventory, ...(userData.inventory || {}) });
        }
      } catch (error) { console.error('Kullanıcı verisi yüklenirken hata:', error); } 
      finally { setIsLoading(false); }
    };
    loadUserData();
  }, [user]);

  const filteredItems = shopItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const purchaseItem = async (item: ShopItem) => {
    if (!user) return;
    if (userScore < item.price) {
        toast.error('Yetersiz skor! Daha fazla zaman geçirerek skor kazanın.');
        return;
    }
    setPurchasing(item.id);

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setPurchasing(null);
        return;
      }

      const userData = userSnap.data();
      const currentInventory: UserInventory = {
        avatarFrames: userData.inventory?.avatarFrames || [],
        profileAnimations: userData.inventory?.profileAnimations || [],
        profileBackgrounds: userData.inventory?.profileBackgrounds || [],
        specialTitles: userData.inventory?.specialTitles || [],
        temporaryAchievements: userData.inventory?.temporaryAchievements || [],
        specialEmojis: userData.inventory?.specialEmojis || []
      };

      const newInventory = { ...currentInventory };
      
      switch (item.type) {
        case ShopItemType.AVATAR_FRAME:
          if (!newInventory.avatarFrames.includes(item.id)) newInventory.avatarFrames.push(item.id);
          break;
        case ShopItemType.PROFILE_ANIMATION:
          if (!newInventory.profileAnimations.includes(item.id)) newInventory.profileAnimations.push(item.id);
          break;
        case ShopItemType.PROFILE_BACKGROUND: // Düzeltme
          if (!newInventory.profileBackgrounds) newInventory.profileBackgrounds = [];
          if (!newInventory.profileBackgrounds.includes(item.id)) newInventory.profileBackgrounds.push(item.id);
          break;
        case ShopItemType.SPECIAL_TITLE:
          if (!newInventory.specialTitles.includes(item.id)) newInventory.specialTitles.push(item.id);
          break;
        case ShopItemType.TEMPORARY_ACHIEVEMENT:
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + (item.duration || 0));
          newInventory.temporaryAchievements.push({ id: item.id, expiresAt });
          break;
        case ShopItemType.SPECIAL_EMOJI:
          if (!newInventory.specialEmojis.includes(item.id)) newInventory.specialEmojis.push(item.id);
          break;
      }

      await updateDoc(userRef, {
        score: increment(-item.price),
        inventory: newInventory
      });
      setUserScore(prev => prev - item.price);
      setUserInventory(newInventory);
      toast.success(`${item.name} başarıyla satın alındı!`);
    } catch (error) { 
        console.error('Satın alma hatası:', error); 
        toast.error('Satın alma sırasında bir hata oluştu.'); 
    } finally { 
        setPurchasing(null); 
    }
  };

  const isOwned = (item: ShopItem): boolean => {
    switch (item.type) {
      case ShopItemType.AVATAR_FRAME: return userInventory.avatarFrames.includes(item.id);
      case ShopItemType.PROFILE_ANIMATION: return userInventory.profileAnimations.includes(item.id);
      case ShopItemType.PROFILE_BACKGROUND: return userInventory.profileBackgrounds?.includes(item.id) || false; // Düzeltme
      case ShopItemType.SPECIAL_TITLE: return userInventory.specialTitles.includes(item.id);
      case ShopItemType.SPECIAL_EMOJI: return userInventory.specialEmojis.includes(item.id);
      case ShopItemType.TEMPORARY_ACHIEVEMENT: return userInventory.temporaryAchievements.some(ta => ta.id === item.id);
      default: return false;
    }
  };
  
  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return '⚪';
      case 'rare': return '🔵';
      case 'epic': return '🟣';
      case 'legendary': return '🟡';
      case 'heritage': return '⚜️';
      default: return '⚪';
    }
  };

  const ProductCard: React.FC<{ item: ShopItem }> = ({ item }) => {
    const owned = isOwned(item);
    const canAfford = userScore >= item.price;
    const isPurchasing = purchasing === item.id;

    return (
      <motion.div
        className={`relative p-6 rounded-xl border-2 flex flex-col h-full transition-all duration-300 hover:scale-105 ${
            owned ? `border-green-400 bg-green-500/10` : 
            canAfford ? 'border-electric-purple bg-dark-gray/50 hover:border-electric-purple/80' : 
            'border-gray-600 bg-gray-800/50 opacity-60'}`}
        whileHover={{ y: -5 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute top-2 right-2 text-2xl">{getRarityIcon(item.rarity)}</div>
        
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-3">
            {item.type === ShopItemType.AVATAR_FRAME && <Crown className="text-yellow-400" size={24} />}
            {item.type === ShopItemType.PROFILE_ANIMATION && <Sparkles className="text-blue-400" size={24} />}
            {item.type === ShopItemType.PROFILE_BACKGROUND && <Palette className="text-green-400" size={24} />}
            {item.type === ShopItemType.SPECIAL_TITLE && <Star className="text-purple-400" size={24} />}
            {item.type === ShopItemType.TEMPORARY_ACHIEVEMENT && <Clock className="text-orange-400" size={24} />}
            {item.type === ShopItemType.SPECIAL_EMOJI && <MessageSquare className="text-green-400" size={24} />}
            <h3 className="text-xl font-bold text-ghost-white">{item.name}</h3>
          </div>
          <p className="text-cyber-gray mb-4 text-sm leading-relaxed h-12">{item.description}</p>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between">
             {item.price === 0 && item.rarity === 'heritage' ? (
                 <span className={`font-bold text-lg ${rarityColors.heritage}`}>MİRAS</span>
             ) : (
                <div className="flex items-center gap-2">
                  <Zap className="text-yellow-400" size={20} />
                  <span className="text-xl font-bold text-yellow-400">{item.price.toLocaleString()}</span>
                </div>
             )}

            {owned ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-md font-bold text-sm">
                <Check size={18} /><span>SATIN ALINDI</span>
              </div>
            ) : (
              <button
                onClick={() => purchaseItem(item)}
                disabled={!canAfford || isPurchasing}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${ canAfford && !isPurchasing ? 'bg-electric-purple hover:bg-electric-purple/80 text-ghost-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
                {isPurchasing ? (<LoaderCircle className="animate-spin" size={18} />) : ('Satın Al')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <LoaderCircle className="animate-spin text-electric-purple" size={48} />
        <p className="ml-4 text-cyber-gray">Dükkan yükleniyor...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-12">
        <motion.h1 className="text-5xl font-heading mb-4 flex justify-center items-center gap-4" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <ShoppingBag className="text-electric-purple" size={48} />
          <span className="bg-gradient-to-r from-electric-purple to-cyan-400 bg-clip-text text-transparent">Siber Dükkan</span>
          <Sparkles className="text-yellow-400" size={48} />
        </motion.h1>
        <p className="text-cyber-gray text-lg">Dijital evrenin ticaret merkezi. Skorlarınızla eşsiz deneyimler satın alın.</p>
        <div className="mt-6 p-4 bg-dark-gray/50 rounded-lg border border-electric-purple/30 inline-block">
          <div className="flex items-center gap-3">
            <Zap className="text-yellow-400" size={24} />
            <span className="text-2xl font-bold text-yellow-400">{userScore.toLocaleString()} Skor</span>
          </div>
        </div>
      </div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {shopCategories.map(category => (
              <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`px-4 py-2 rounded-lg font-bold transition-all ${ selectedCategory === category.id ? 'bg-electric-purple text-ghost-white' : 'bg-dark-gray/50 text-cyber-gray hover:bg-dark-gray hover:text-ghost-white' }`}>
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-gray" size={20} />
            <input type="text" placeholder="Ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-dark-gray/50 border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray focus:border-electric-purple focus:outline-none"/>
          </div>
        </div>
      </div>
      <AnimatePresence>
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" layout>
          {filteredItems.map((item, index) => (
            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
              <ProductCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      {filteredItems.length === 0 && (
        <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Search className="mx-auto text-cyber-gray mb-4" size={64} />
          <h3 className="text-2xl font-bold text-cyber-gray mb-2">Ürün Bulunamadı</h3>
          <p className="text-cyber-gray">Arama kriterlerinize uygun ürün bulunmuyor.</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ShopPage;