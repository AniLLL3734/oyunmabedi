import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GameCard from '../components/GameCard';
import SearchBar from '../components/SearchBar';
import { games } from '../data/games';
import type { Game } from '../types';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// DÜZELTME: Doğru yol '../src/firebase' olmalı
import { db } from '../src/firebase';


const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mostPlayed, setMostPlayed] = useState<Game[]>([]);

  useEffect(() => {
    const fetchMostPlayed = async () => {
      try {
        const gamesRef = collection(db, 'games');
        const q = query(gamesRef, orderBy('playCount', 'desc'), limit(4));
        const querySnapshot = await getDocs(q);
        const playedGamesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Game));

        const playedGames = playedGamesData.map(pg => {
          const localGame = games.find(g => g.id === pg.id);
          return localGame ? { ...localGame, playCount: pg.playCount } : null;
        }).filter(g => g !== null) as Game[];

        setMostPlayed(playedGames);

      } catch (error) {
        console.error("En çok oynananlar çekilemedi:", error);
      }
    };
    fetchMostPlayed();
  }, []);

  const filteredGames = games.filter(game => {
    const matchesCategory = selectedCategory ? game.category === selectedCategory : true;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const allCategories = [...new Set(games.map(game => game.category))];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
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
          Aşağıdaki Oyunlardan Birini Seç.
        </motion.p>
        <SearchBar onSearch={setSearchQuery} />
      </div>

      {mostPlayed.length > 0 && (
        <section className="mb-16">
          <h2 className="text-3xl font-heading mb-6 border-l-4 border-electric-purple pl-4">En Popüler Oyunlar</h2>
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

      <section>
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h2 className="text-3xl font-heading border-l-4 border-electric-purple pl-4">Tüm Simülasyonlar</h2>
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
              key={game.id}
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