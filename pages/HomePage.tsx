import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameCard from '../components/GameCard';
import SearchBar from '../components/SearchBar';
import { games } from '../data/games';
import type { Game } from '../types';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth } from '../src/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
// YENİ: Megaphone (anons) ikonu eklendi, MessageSquare anlık olarak bu bileşenden kaldırıldı
import { SendHorizonal, CheckCircle, TrendingUp, Compass, Sparkles, X, Mail, AlertTriangle, UserPlus, LogIn, ShoppingBag, Crown, Star, Search, Megaphone, MessageSquare } from 'lucide-react';

// AdminNote interface tanımı (değişiklik yok)
interface AdminNote {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  updatedAt: any;
}

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
  const [mostPlayed, setMostPlayed] = useState<(Game & { playCount: number })[]>([]);
  const [newlyAdded, setNewlyAdded] = useState<Game[]>([]);
  const [shuffledGames, setShuffledGames] = useState<Game[]>([]);
  
  // YENİ: Sadece tek ve en güncel admin notunu tutmak için state
  const [adminNote, setAdminNote] = useState<AdminNote | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [showAdminMessagePopup, setShowAdminMessagePopup] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  // Popüler ve Yeni eklenen oyunları çekme fonksiyonu
  const fetchGameLists = useCallback(async () => {
    setNewlyAdded(games.slice(-4).reverse());
    try {
      const gamesRef = collection(db, 'games');
      const q = query(gamesRef, orderBy('playCount', 'desc'), limit(4));
      const querySnapshot = await getDocs(q);
      const playedGamesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Game & { playCount: number }));
      const playedGames = playedGamesData.map(pg => {
        const localGame = games.find(g => g.id === pg.id);
        return localGame ? { ...localGame, playCount: pg.playCount } : null;
      }).filter((g): g is Game & { playCount: number } => g !== null);
      setMostPlayed(playedGames);
    } catch (error) {
      console.error("En çok oynananlar çekilemedi:", error);
    }
  }, []);

  useEffect(() => {
    setShuffledGames(shuffleArray(games));
    fetchGameLists();
    
    // YENİ: Sadece en son admin notunu verimli bir şekilde çekme
    const fetchAdminNote = async () => {
      try {
        const q = query(collection(db, 'admin_notes'), orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const latestNoteDoc = querySnapshot.docs[0];
          setAdminNote({ id: latestNoteDoc.id, ...latestNoteDoc.data() } as AdminNote);
        } else {
          setAdminNote(null); // Not bulunamazsa state'i temizle
        }
      } catch (error) {
        console.error("Admin notu çekilirken hata:", error);
      }
    };
    
    fetchAdminNote();
    
    // Giriş yapmayan kullanıcılar için uyarı göster
    if (!user) {
      const timer = setTimeout(() => {
        setShowGuestWarning(true);
      }, 3000); // 3 saniye sonra uyarı göster
      
      return () => clearTimeout(timer);
    }
  }, [fetchGameLists, user]);

  // Bildirim Kontrolü useEffect'i
  useEffect(() => {
    if (user) {
      const checkNotifications = async () => {
        if (!user) return;
        console.log("Periyodik bildirim kontrolü yapılıyor...");
        const userDocRef = doc(db, 'users', user.uid);
        try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
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
      
      checkNotifications();
      const intervalId = setInterval(checkNotifications, 10 * 60 * 1000); 
      return () => clearInterval(intervalId);
    }
  }, [user, showAdminMessagePopup]);
  
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
    setFeedbackError('');
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
        setFeedbackError('Geri bildirim gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
        setIsSending(false);
    }
  };

  const filteredGames = shuffledGames.filter(game => {
    const matchesCategory = selectedCategory ? game.category === selectedCategory : true;
    const isSearchQueryActive = searchQuery.trim().toLowerCase();
    const matchesSearch = isSearchQueryActive ? game.title.toLowerCase().includes(isSearchQueryActive) : true;
    return matchesCategory && matchesSearch;
  });

  const allCategories = [...new Set(games.map(game => game.category))].filter(Boolean) as string[];
  const isSearching = searchQuery.trim() !== '';

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

        {/* ======================================================================= */}
        {/* YENİ: HAVALI VE ANİMASYONLU ADMİN NOTU ÇERÇEVESİ                      */}
        {/* ======================================================================= */}
        <AnimatePresence>
          {adminNote && (
            <motion.section
              layout
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="mb-16 p-6 md:p-8 rounded-2xl border-2 border-electric-purple/50 bg-gradient-to-br from-dark-gray via-space-black to-dark-gray shadow-lg shadow-electric-purple/20 overflow-hidden relative"
            >
              {/* Arkaplan Işık Efekti */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-electric-purple/30 rounded-full blur-3xl opacity-50"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                  <div className="p-3 bg-electric-purple/20 rounded-full border border-electric-purple/30">
                    <Megaphone className="text-electric-purple animate-pulse" size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-heading text-ghost-white tracking-wide">Sessizliği Bozan Bir Not</h2>
                     <span className="text-xs text-cyber-gray">
                      {adminNote.createdAt?.toDate().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-cyber-gray/20 pt-4">
                  <h3 className="text-xl font-bold text-electric-purple mb-2">{adminNote.title}</h3>
                  <p className="text-cyber-gray whitespace-pre-wrap text-base leading-relaxed">{adminNote.content}</p>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ARAMA SONUÇLARI BÖLÜMÜ */}
        {isSearching && (
            <section className="mb-16">
                <h2 className="text-3xl font-heading mb-6 border-l-4 border-electric-purple pl-4 flex items-center gap-2"><Search /> Arama Sonuçları</h2>
                {filteredGames.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {filteredGames.map((game, index) => (
                            <motion.div key={game.id} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                                <GameCard game={game} />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-dark-gray/50 rounded-lg">
                        <p className="text-cyber-gray text-lg">Aradığın kriterlere uygun simülasyon bulunamadı.</p>
                    </div>
                )}
            </section>
        )}

        {/* Sadece arama yapılmadığında gösterilecek bölümler */}
        {!isSearching && (
            <>
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
            </>
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
                        <>
                            {feedbackError && (
                                <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-red-300 mb-4">
                                    <p>{feedbackError}</p>
                                </div>
                            )}
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
                        </>
                    )}
                </motion.div>
            ) : (
                <div className="text-center">
                    <p className="text-cyber-gray mb-4">Mimar'a mesaj gönderebilmek için sisteme bağlı olmalısın.</p>
                    <Link to="/login" className="bg-electric-purple/80 text-white font-bold py-2 px-6 rounded-full">Sisteme Sız</Link>
                </div>
            )}
        </section>

        {!isSearching && (
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
        )}
        
        <AnimatePresence>
          {showGuestWarning && !user && (
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-dark-gray border-2 border-electric-purple rounded-xl p-8 max-w-2xl w-full text-center relative"
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
              >
                <button
                  onClick={() => setShowGuestWarning(false)}
                  className="absolute top-4 right-4 text-cyber-gray hover:text-ghost-white transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="mb-6">
                  <AlertTriangle className="mx-auto text-yellow-400" size={64} />
                </div>

                <h2 className="text-3xl font-heading mb-4 text-ghost-white">
                  Dijital Evrene Hoş Geldin, Misafir!
                </h2>
                <div className="text-cyber-gray mb-8 space-y-4">
                  <p className="text-lg">
                    Şu anda sadece oyunları oynayabiliyorsun, ama çok daha fazlası seni bekliyor!
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="bg-space-black/50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <ShoppingBag className="text-yellow-400" size={20} />
                        <span className="font-bold text-ghost-white">Siber Dükkan</span>
                      </div>
                      <p className="text-sm">Avatar çerçeveleri, renk temaları, özel unvanlar ve daha fazlası!</p>
                    </div>
                    
                    <div className="bg-space-black/50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="text-green-400" size={20} />
                        <span className="font-bold text-ghost-white">Sohbet Sistemi</span>
                      </div>
                      <p className="text-sm">Diğer oyuncularla sohbet et, deneyimlerini paylaş!</p>
                    </div>
                    
                    <div className="bg-space-black/50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Crown className="text-purple-400" size={20} />
                        <span className="font-bold text-ghost-white">Başarım Sistemi</span>
                      </div>
                      <p className="text-sm">Özel başarımlar kazan, unvanlar elde et!</p>
                    </div>
                    
                    <div className="bg-space-black/50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Star className="text-orange-400" size={20} />
                        <span className="font-bold text-ghost-white">Skor Sistemi</span>
                      </div>
                      <p className="text-sm">Pasif skor kazan, liderlik tablosunda yer al!</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/signup"
                    className="px-6 py-3 bg-electric-purple hover:bg-electric-purple/80 text-ghost-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus size={20} />
                    Kayıt Ol
                  </Link>
                  
                  <Link
                    to="/login"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-ghost-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn size={20} />
                    Giriş Yap
                  </Link>
                  
                  <button
                    onClick={() => setShowGuestWarning(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-ghost-white font-bold rounded-lg transition-all"
                  >
                    İstemiyorum
                  </button>
                </div>
                <p className="text-xs text-cyber-gray mt-6">
                  Kayıt olmak tamamen ücretsizdir ve sadece birkaç saniye sürer.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </motion.div>
  );
};

export default HomePage;