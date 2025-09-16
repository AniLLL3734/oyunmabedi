// TAM VE EKSİKSİZ KOD: Yöntem 2 (Periyodik Kontrol) Aktif HomePage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameCard from '../components/GameCard';
import SearchBar from '../components/SearchBar';
import { games } from '../data/games';
import type { Game } from '../types';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth, UserProfile } from '../src/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { SendHorizonal, MessageSquare, CheckCircle, Gamepad2, TrendingUp, Compass, Sparkles, X, Mail } from 'lucide-react';

const shuffleArray = (array: Game[]): Game[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mostPlayed, setMostPlayed] = useState<Game[]>([]);
  const [newlyAdded, setNewlyAdded] = useState<Game[]>([]);
  const [shuffledGames, setShuffledGames] = useState<Game[]>([]);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showAdminMessagePopup, setShowAdminMessagePopup] = useState(false);

  // Popüler ve Yeni eklenen oyunları çekme fonksiyonu
  const fetchGameLists = useCallback(async () => {
    setNewlyAdded(games.slice(-4).reverse());
    try {
      const gamesRef = collection(db, 'games');
      const q = query(gamesRef, orderBy('playCount', 'desc'), limit(4));
      const querySnapshot = await getDocs(q);
      const playedGamesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Game));
      const playedGames = playedGamesData.map(pg => {
        const localGame = games.find(g => g.id === pg.id);
        return localGame ? { ...localGame, playCount: pg.playCount } : null;
      }).filter((g): g is Game => g !== null);
      setMostPlayed(playedGames);
    } catch (error) {
      console.error("En çok oynananlar çekilemedi:", error);
    }
  }, []);

  useEffect(() => {
    setShuffledGames(shuffleArray(games));
    fetchGameLists();
  }, [fetchGameLists]);

  // Bildirim Kontrolü useEffect'i - YÖNTEM 2 AKTİF
  useEffect(() => {
    if (user) {
      // YÖNTEM 2: 10 DAKİKADA BİR KONTROL (Daha az maliyetli)
      const checkNotifications = async () => {
        if (!user) return; // Kullanıcı çıkış yapmış olabilir, tekrar kontrol et
        console.log("Periyodik bildirim kontrolü yapılıyor...");
        const userDocRef = doc(db, 'users', user.uid);
        try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              // Sadece durum değişmişse state'i güncelle
              if(data?.unreadAdminMessage === true && !showAdminMessagePopup) {
                  setShowAdminMessagePopup(true);
              } else if (data?.unreadAdminMessage === false && showAdminMessagePopup) {
                  setShowAdminMessagePopup(false);
              }
            }
        } catch(error) {
            console.error("Bildirim kontrolü sırasında hata:", error);
        }
      };
      
      checkNotifications(); // Sayfa ilk açıldığında bir kere kontrol et
      
      // Her 10 dakikada bir (10 * 60 * 1000 milisaniye) tekrar kontrol etmesi için bir zamanlayıcı kur
      const intervalId = setInterval(checkNotifications, 10 * 60 * 1000); 
      
      // Bu çok önemlidir: Component sayfadan kaldırıldığında (kullanıcı başka sayfaya geçtiğinde)
      // bu zamanlayıcıyı temizle ki arka planda gereksiz yere çalışmaya devam etmesin.
      return () => clearInterval(intervalId);
    }
  }, [user, showAdminMessagePopup]); // showAdminMessagePopup'ı da bağımlılığa ekledik.
  
  const handleViewAdminMessage = async () => {
    if (!user) return;
    const adminUid = "WXdz4GWVqTb9SwihXFN9nh0LJVn2";

    setShowAdminMessagePopup(false);
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { unreadAdminMessage: false });
    
    const chatId = [user.uid, adminUid].sort().join('_');
    navigate(`/dm/${chatId}`);
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackMessage.trim() === '' || !user) return;
    setIsSending(true);
    try {
        await addDoc(collection(db, 'feedback'), {
            uid: user.uid,
            displayName: user.displayName || 'Anonim',
            message: feedbackMessage,
            isRead: false,
            createdAt: serverTimestamp(),
        });
        setFeedbackMessage('');
        setFeedbackSent(true);
        setTimeout(() => setFeedbackSent(false), 5000);
    } catch (error) {
        console.error("Geri bildirim gönderilemedi:", error);
    } finally {
        setIsSending(false);
    }
  };

  const filteredGames = shuffledGames.filter(game => {
    const matchesCategory = selectedCategory ? game.category === selectedCategory : true;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const allCategories = [...new Set(games.map(game => game.category))].filter(Boolean) as string[];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <AnimatePresence>
        {showAdminMessagePopup && (
            <motion.div
                initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0 }}
                className="fixed top-5 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-gradient-to-r from-dark-gray to-space-black border-2 border-electric-purple shadow-neon-purple rounded-b-2xl p-6 z-50 text-center"
            >
                <button onClick={() => setShowAdminMessagePopup(false)} className="absolute top-2 right-2 p-1 text-cyber-gray hover:text-white"><X size={20}/></button>
                <Mail size={40} className="mx-auto text-electric-purple mb-4 animate-pulse"/>
                <h2 className="text-2xl font-heading text-ghost-white mb-2">Mimar'dan Bir Sinyal Aldın!</h2>
                <p className="text-cyber-gray mb-6">Yönetici seninle özel bir görüşme başlatmak istiyor. Sinyali takip et.</p>
                <button onClick={handleViewAdminMessage} className="w-full bg-electric-purple text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-80 transition-transform hover:scale-105">
                    Görüşmeyi Başlat
                </button>
            </motion.div>
        )}
        </AnimatePresence>
        
        <div className="text-center my-12 md:my-16">
            <motion.h1 className="text-4xl md:text-6xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-r from-ghost-white to-electric-purple" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            Zil Çaldığında, Gerçeklik Bükülür.
            </motion.h1>
            <motion.p className="mt-4 mb-8 text-lg md:text-xl max-w-3xl mx-auto text-cyber-gray" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Aşağıdaki sanal evrenlerden birine bağlan.
            </motion.p>
            <SearchBar onSearch={setSearchQuery} />
        </div>

        {mostPlayed.length > 0 && (
            <section className="mb-16">
            <h2 className="text-3xl font-heading mb-6 border-l-4 border-electric-purple pl-4 flex items-center gap-2"><TrendingUp /> En Popüler Simülasyonlar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {mostPlayed.map((game, index) => (
                    <motion.div key={game.id} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                        <GameCard game={game} />
                    </motion.div>
                ))}
            </div>
            </section>
        )}

        {newlyAdded.length > 0 && (
            <section className="mb-16">
            <h2 className="text-3xl font-heading mb-6 border-l-4 border-electric-purple pl-4 flex items-center gap-2"><Sparkles /> En Son Eklenenler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {newlyAdded.map((game, index) => (
                    <motion.div key={game.id} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                        <GameCard game={game} />
                    </motion.div>
                ))}
            </div>
            </section>
        )}

        <section className="my-16 py-16 border-y-2 border-dashed border-cyber-gray/20">
            <h2 className="text-3xl font-heading mb-6 flex items-center justify-center gap-3 text-center"><MessageSquare className="text-electric-purple" /> Mimar'a Bir Not Bırak</h2>
            <p className="text-center text-cyber-gray max-w-2xl mx-auto mb-8">
                Bir fikrin mi var? Bulduğun bir hatayı mı bildirmek istiyorsun? Ya da sadece merhaba demek mi? Evrenin derinliklerinden gönderdiğin her sinyal değerlidir.
            </p>
            {user ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                    {feedbackSent ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-green-900/50 border border-green-700/50 rounded-lg text-green-300">
                            <CheckCircle size={48} className="mb-4" />
                            <h3 className="text-2xl font-bold">Sinyal Alındı!</h3>
                            <p>Mesajın evrenin mimarına başarıyla ulaştı. Teşekkürler.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSendFeedback} className="flex flex-col md:flex-row gap-4">
                            <textarea
                                value={feedbackMessage}
                                onChange={(e) => setFeedbackMessage(e.target.value)}
                                placeholder={`${user.displayName} olarak mesajını yaz...`}
                                className="flex-1 p-3 bg-space-black h-24 md:h-auto text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple"
                                required
                                maxLength={500}
                            />
                            <button type="submit" disabled={isSending} className="flex items-center justify-center gap-2 p-3 bg-electric-purple text-white font-bold rounded-md disabled:bg-cyber-gray">
                                {isSending ? 'Gönderiliyor...' : <>Sinyal Gönder <SendHorizonal size={18} /></>}
                            </button>
                        </form>
                    )}
                </motion.div>
            ) : (
                <div className="text-center">
                    <p className="text-cyber-gray mb-4">Mimar'a mesaj gönderebilmek için sisteme bağlı olmalısın.</p>
                    <Link to="/login" className="bg-electric-purple/80 text-white font-bold py-2 px-6 rounded-full">Sisteme Sız</Link>
                </div>
            )}
        </section>

        <section>
            <div className="flex flex-wrap items-center justify-between mb-6">
                <h2 className="text-3xl font-heading border-l-4 border-electric-purple pl-4 flex items-center gap-2"><Compass /> Tüm Simülasyonlar</h2>
                <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-sm font-semibold ${!selectedCategory ? 'bg-electric-purple' : 'bg-dark-gray'}`}>Tümü</button>
                    {allCategories.map(category => (
                        <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-sm font-semibold ${selectedCategory === category ? 'bg-electric-purple' : 'bg-dark-gray'}`}>{category}</button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredGames.map((game) => (
                    <motion.div key={game.id} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <GameCard game={game} />
                    </motion.div>
                ))}
            </div>
        </section>
    </motion.div>
  );
};

export default HomePage;