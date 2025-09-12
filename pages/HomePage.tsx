import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GameCard from '../components/GameCard';
import SearchBar from '../components/SearchBar';
import { games } from '../data/games';
import type { Game } from '../types';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth } from '../src/contexts/AuthContext';
import { Link } from 'react-router-dom';
// YENİ EKLENEN OYUNLAR İÇİN KULLANACAĞIMIZ İKONU BURADA İÇERİ ALIYORUZ
import { SendHorizonal, MessageSquare, CheckCircle, Gamepad2, TrendingUp, Compass, Sparkles } from 'lucide-react';

// DÜZELTME 1: Diziyi karıştırmak için bir yardımcı fonksiyon oluşturuyoruz.
// Bu fonksiyon Fisher-Yates (aka Knuth) Shuffle algoritmasını kullanır, en verimli ve doğru karıştırma yöntemidir.
const shuffleArray = (array: Game[]): Game[] => {
  const shuffled = [...array]; // Orijinal diziyi değiştirmemek için bir kopyasını oluştur
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Elemanların yerini değiştir
  }
  return shuffled;
};

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mostPlayed, setMostPlayed] = useState<Game[]>([]);
  // YENİ EKLEME 1: En son eklenen oyunları tutmak için yeni bir state oluşturuyoruz.
  const [newlyAdded, setNewlyAdded] = useState<Game[]>([]);
  
  // DÜZELTME 2: Oyun listesini state'te tutuyoruz ve başlangıçta bir kere karıştırıyoruz.
  const [shuffledGames, setShuffledGames] = useState<Game[]>([]);

  const { user } = useAuth();
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    // Oyun listesini sayfa ilk yüklendiğinde bir kere karıştır ve state'e ata
    setShuffledGames(shuffleArray(games));

    // YENİ EKLEME 2: En son eklenen oyunları alıp state'e atıyoruz.
    // games.ts'den son 4 oyunu alıp ters çevirerek en yeniyi başa getiriyoruz.
    const lastFourGames = games.slice(-4).reverse();
    setNewlyAdded(lastFourGames);


    const fetchMostPlayed = async () => {
      try {
        const gamesRef = collection(db, 'games');
        const q = query(gamesRef, orderBy('playCount', 'desc'), limit(4));
        const querySnapshot = await getDocs(q);
        const playedGamesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Game));

        const playedGames = playedGamesData.map(pg => {
          const localGame = games.find(g => g.id === pg.id);
          return localGame ? { ...localGame, playCount: pg.playCount } : null;
        }).filter(Boolean) as Game[];

        setMostPlayed(playedGames);
      } catch (error) {
        console.error("En çok oynananlar çekilemedi:", error);
      }
    };
    fetchMostPlayed();
  }, []); // Bağımlılık dizisi boş olduğu için bu useEffect sadece ilk render'da çalışır.

  const handleSendFeedback = async (e: React.FormEvent) => {
      e.preventDefault();
      if (feedbackMessage.trim() === '' || !user) return;
      setIsSending(true);
      try {
          await addDoc(collection(db, 'feedback'), {
              uid: user.uid,
              displayName: user.displayName,
              message: feedbackMessage,
              isRead: false,
              createdAt: serverTimestamp(),
          });
          setFeedbackMessage('');
          setFeedbackSent(true);
          setTimeout(() => setFeedbackSent(false), 5000);
      } catch (error) {
          console.error("Geri bildirim gönderilemedi:", error);
          alert("Mesajınız gönderilirken bir hata oluştu.");
      } finally {
          setIsSending(false);
      }
  };

  // DÜZELTME 3: Filtrelemeyi orijinal 'games' dizisi yerine, karıştırılmış 'shuffledGames' üzerinden yapıyoruz.
  const filteredGames = shuffledGames.filter(game => {
    const matchesCategory = selectedCategory ? game.category === selectedCategory : true;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const allCategories = [...new Set(games.map(game => game.category))].filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* ===== Üst Başlık Bölümü (Değişiklik yok) ===== */}
      <div className="text-center my-12 md:my-16">
        <motion.h1
          className="text-4xl md:text-6xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-r from-ghost-white to-electric-purple"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Zil Çaldığında, Gerçeklik Bükülür.
        </motion.h1>
        <motion.p
          className="mt-4 mb-8 text-lg md:text-xl max-w-3xl mx-auto text-cyber-gray"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Aşağıdaki sanal evrenlerden birine bağlan.
        </motion.p>
        <SearchBar onSearch={setSearchQuery} />
      </div>

      {/* ===== En Popüler Simülasyonlar (Değişiklik yok) ===== */}
      {mostPlayed.length > 0 && (
        <section className="mb-16">
          <h2 className="text-3xl font-heading mb-6 border-l-4 border-electric-purple pl-4 flex items-center gap-2"><TrendingUp /> En Popüler Simülasyonlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mostPlayed.map((game, index) => (
              <motion.div
                key={`most-played-${game.id}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GameCard game={game} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* YENİ EKLEME 3: "EN SON EKLENENLER" BÖLÜMÜ */}
      {newlyAdded.length > 0 && (
        <section className="mb-16">
          <h2 className="text-3xl font-heading mb-6 border-l-4 border-electric-purple pl-4 flex items-center gap-2"><Sparkles /> En Son Eklenenler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {newlyAdded.map((game, index) => (
              <motion.div
                key={`newly-added-${game.id}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GameCard game={game} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ===== Mesaj Gönderme Bölümü (Değişiklik yok) ===== */}
      <section className="my-16 py-16 border-y-2 border-dashed border-cyber-gray/20">
          <h2 className="text-3xl font-heading mb-6 flex items-center justify-center gap-3 text-center">
              <MessageSquare className="text-electric-purple" /> Mimar'a Bir Not Bırak
          </h2>
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
                              className="flex-1 p-3 bg-space-black h-24 md:h-auto text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none transition-all"
                              required
                              maxLength={500}
                          />
                          <button type="submit" disabled={isSending} className="flex items-center justify-center gap-2 p-3 bg-electric-purple text-white font-bold rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray">
                              {isSending ? 'Gönderiliyor...' : <>Sinyal Gönder <SendHorizonal size={18} /></>}
                          </button>
                      </form>
                  )}
              </motion.div>
          ) : (
              <div className="text-center">
                   <p className="text-cyber-gray mb-4">Mimar'a mesaj gönderebilmek için sisteme bağlı olmalısın.</p>
                   <Link to="/login" className="bg-electric-purple/80 text-white font-bold py-2 px-6 rounded-full hover:bg-electric-purple transition-all">Sisteme Sız</Link>
              </div>
          )}
      </section>

      {/* ===== Tüm Simülasyonlar (Değişiklik var) ===== */}
      <section>
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h2 className="text-3xl font-heading border-l-4 border-electric-purple pl-4 flex items-center gap-2"><Compass /> Tüm Simülasyonlar</h2>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!selectedCategory ? 'bg-electric-purple text-white' : 'bg-dark-gray text-cyber-gray hover:bg-electric-purple/50'}`}>Tümü</button>
            {allCategories.map(category => (
              <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === category ? 'bg-electric-purple text-white' : 'bg-dark-gray text-cyber-gray hover:bg-electric-purple/50'}`}>{category}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGames.map((game, index) => (
            <motion.div
              key={game.id} // Animasyonun ve sıralamanın doğru çalışması için `key` kritik
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GameCard game={game} />
            </motion.div>
          ))}
        </div>
        {filteredGames.length === 0 && (
          <p className="text-center col-span-full text-cyber-gray text-lg mt-8">Aradığın kriterlere uygun simülasyon bulunamadı. Filtreleri sıfırlamayı dene.</p>
        )}
      </section>
    </motion.div>
  );
};

export default HomePage;