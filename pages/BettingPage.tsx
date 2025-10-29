// BettingPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../src/firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp, where, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

// OLUŞTURDUĞUMUZ YENİ COMPONENTLERİ IMPORT EDİYORUZ
import GameIntroductionModal from "../components/GameIntroductionModal";

// Client-side game components with anti-cheat protection
import SlotMachineGame from "../components/SlotMachineGame_ClientSide";
import AdvancedDiceGame from "../src/components/AdvancedDiceGame";

// Ikonlar için
import { Wallet, Gem, Info, Dices } from 'lucide-react';

// Arayüz Tanımları (Interfaces)
interface Game {
  id: 'slot_machine' | 'advanced_dice';
  name: string;
  minBet: number;
  maxBet: number;
  odds: number;
  Icon: React.ElementType;
}

interface AnimationState {
    isActive: boolean;
    game: Game['id'] | null;
    result: 'won' | 'lost';
    payout: number;
    betAmount: number;
}

// Yeni eklenen arayüz
interface LeaderboardUser {
  uid: string;
  displayName: string;
  score: number;
  avatarUrl: string;
  profit?: number; // For investment leaderboard
  loss?: number;   // For biggest losers
}

const bettingGames: Game[] = [
  {
    id: 'slot_machine',
    name: 'Galaktik Ganimet',
    minBet: 5,
    maxBet: 500,
    odds: 2.0,
    Icon: Gem,
  },
  {
    id: 'advanced_dice',
    name: 'Şans Zarı',
    minBet: 10,
    maxBet: 1000,
    odds: 5.5,
    Icon: Dices,
  },
];

// Oyun tanıtımları
const gameIntroductions = {
  slot_machine: {
    id: 'slot_machine',
    name: 'Galaktik Ganimet',
    description: 'Klasik slot makinesi oyunu. Sembollerin hizalanmasına göre kazanç elde edersiniz.',
    rules: [
      'Bahis miktarınızı seçin',
      'Çevir butonuna tıklayın',
      'Slot sembollerinin hizalanmasını bekleyin',
      'Aynı sembollerin hizalanmasına göre kazanç elde edersiniz'
    ],
    tips: [
      'Nadir semboller daha yüksek kazanç sağlar',
      'Slot sonuçları tamamen rastgeledir'
    ]
  },
  advanced_dice: {
    id: 'advanced_dice',
    name: 'Şans Zarı',
    description: '1-6 arasında bir sayı seçin ve zar atın. Tahmininiz doğruysa kazanırsınız.',
    rules: [
      'Bahis miktarınızı seçin',
      '1-6 arasında bir sayı tahmin edin',
      'Zarı atın',
      'Tahmininiz doğruysa 5.5 katı kazanırsınız'
    ],
    tips: [
      'Kazanma şansı 1/6\'dır',
      'Yüksek bahisler yüksek kazanç sağlar ama aynı zamanda yüksek risk taşır'
    ]
  }
};

const BettingPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userScore, setUserScore] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameIntro, setShowGameIntro] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const [animationState, setAnimationState] = useState<AnimationState>({
      isActive: false, game: null, result: 'lost', payout: 0, betAmount: 0
  });

  // Yeni eklenen state'ler
  const [leaderboardFilter, setLeaderboardFilter] = useState<'richest' | 'topEarners' | 'biggestLosers'>('richest');
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);

  const navigate = useNavigate();

  const fetchUserScore = useCallback(async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserScore(userDoc.data().score || 0);
      }
    } catch (error) {
      console.error('Kullanıcı skoru çekilirken hata:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserScore(currentUser.uid);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate, fetchUserScore]);

  const handleGameSelect = (gameId: string) => {
    const game = bettingGames.find(g => g.id === gameId) || null;
    setSelectedGame(game);
    setBetAmount(0);
    setMessage(null);
    
    // Oyun tanıtımını göster
    if (game) {
      setShowGameIntro(true);
    }
  };
  
  // Game update handlers for new games
  const handleGameUpdate = async (change: number, messageText: string) => {
    if (!user) return;
    
    if (change !== 0) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { score: increment(change) });
      setUserScore(prev => prev + change);
    }
    
    // Set message based on change
    if (change > 0) {
      setMessage({ type: 'success', text: messageText });
    } else if (change < 0) {
      // Handle loss distribution (50% to admin)
      const lossAmount = Math.abs(change);
      const adminShare = Math.floor(lossAmount * 0.5);
      
      const adminQuery = query(collection(db, 'users'), where('username', '==', 'FaTaLRhymeR37'));
      const adminSnapshot = await getDocs(adminQuery);
      if (!adminSnapshot.empty) {
        await updateDoc(doc(db, 'users', adminSnapshot.docs[0].id), { score: increment(adminShare) });
      }
      
      setMessage({ type: 'error', text: messageText });
    } else {
      setMessage({ type: 'info', text: messageText });
    }
  };

  // Yeni eklenen useEffect for fetching leaderboard data
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        let usersQuery;
        
        switch (leaderboardFilter) {
          case 'richest':
            // En zenginler - users collection'ından ilk 5 kişi
            usersQuery = query(collection(db, 'users'), orderBy('score', 'desc'), limit(5));
            break;
            
          case 'topEarners':
            // En çok kazanan - investment_profits collection'ından (bu koleksiyonu oluşturmak gerek)
            try {
              usersQuery = query(collection(db, 'investment_profits'), orderBy('totalProfit', 'desc'), limit(5));
            } catch (e) {
              // Fallback to richest if collection doesn't exist
              usersQuery = query(collection(db, 'users'), orderBy('score', 'desc'), limit(5));
            }
            break;
            
          case 'biggestLosers':
            // En çok kaybeden - investment_losses collection'ından (bu koleksiyonu oluşturmak gerek)
            try {
              usersQuery = query(collection(db, 'investment_losses'), orderBy('totalLoss', 'desc'), limit(5));
            } catch (e) {
              // Fallback to richest if collection doesn't exist
              usersQuery = query(collection(db, 'users'), orderBy('score', 'desc'), limit(5));
            }
            break;
            
          default:
            usersQuery = query(collection(db, 'users'), orderBy('score', 'desc'), limit(5));
        }
        
        const usersSnapshot = await getDocs(usersQuery);
        const leaderboardData: LeaderboardUser[] = [];
        
        if (leaderboardFilter === 'richest') {
          // En zenginler için
          usersSnapshot.forEach((doc) => {
            const data = doc.data();
            leaderboardData.push({
              uid: doc.id,
              displayName: data.displayName || 'Anonim',
              score: data.score || 0,
              avatarUrl: data.avatarUrl || '',
            });
          });
        } else if (leaderboardFilter === 'topEarners') {
          // En çok kazananlar için
          usersSnapshot.forEach((doc) => {
            const data = doc.data();
            leaderboardData.push({
              uid: data.userId || doc.id,
              displayName: data.displayName || 'Anonim',
              score: data.totalProfit || 0,
              avatarUrl: data.avatarUrl || '',
              profit: data.totalProfit || 0,
            });
          });
        } else if (leaderboardFilter === 'biggestLosers') {
          // En çok kaybedenler için
          usersSnapshot.forEach((doc) => {
            const data = doc.data();
            leaderboardData.push({
              uid: data.userId || doc.id,
              displayName: data.displayName || 'Anonim',
              score: data.totalLoss || 0,
              avatarUrl: data.avatarUrl || '',
              loss: data.totalLoss || 0,
            });
          });
        }
        
        setLeaderboardUsers(leaderboardData);
      } catch (error) {
        console.error('Liderlik tablosu çekilirken hata:', error);
        // Fallback to richest users if there's an error
        if (leaderboardFilter !== 'richest') {
          try {
            const usersQuery = query(collection(db, 'users'), orderBy('score', 'desc'), limit(5));
            const usersSnapshot = await getDocs(usersQuery);
            const leaderboardData: LeaderboardUser[] = [];
            
            usersSnapshot.forEach((doc) => {
              const data = doc.data();
              leaderboardData.push({
                uid: doc.id,
                displayName: data.displayName || 'Anonim',
                score: data.score || 0,
                avatarUrl: data.avatarUrl || '',
              });
            });
            
            setLeaderboardUsers(leaderboardData);
          } catch (fallbackError) {
            console.error('Fallback liderlik tablosu çekilirken hata:', fallbackError);
          }
        }
      }
    };
    
    fetchLeaderboardData();
  }, [leaderboardFilter]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 font-sans">
        <div className="max-w-4xl mx-auto">
            <motion.h1 
            className="text-4xl md:text-5xl font-bold text-center mb-8 bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            >
            İnteraktif Bahis Arenası
            </motion.h1>

            {/* Bakiye */}
            <motion.div 
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 flex items-center justify-between"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            >
                 <h2 className="text-2xl font-bold flex items-center gap-3"><Wallet className="text-cyan-400" /> Bakiyeniz</h2>
                 <p className="text-3xl font-mono text-cyan-400">{userScore.toLocaleString()}</p>
            </motion.div>

            {/* Liderlik Tablosu Filtresi */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Bahis Liderlik Tablosu</h2>
              <p className="text-gray-400 mb-4">
                {leaderboardFilter === 'richest' && 'Platformdaki en zengin oyuncular'}
                {leaderboardFilter === 'topEarners' && 'Yatırımlarından en çok kâr eden oyuncular'}
                {leaderboardFilter === 'biggestLosers' && 'Yatırımlarında en çok kaybeden oyuncular'}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <button 
                  onClick={() => setLeaderboardFilter('richest')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    leaderboardFilter === 'richest' 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  En Zenginler
                </button>
                <button 
                  onClick={() => setLeaderboardFilter('topEarners')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    leaderboardFilter === 'topEarners' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  En Çok Kazananlar
                </button>
                <button 
                  onClick={() => setLeaderboardFilter('biggestLosers')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    leaderboardFilter === 'biggestLosers' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  En Çok Kaybedenler
                </button>
              </div>

              {/* Liderlik Tablosu */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
                <div className="space-y-3">
                  {leaderboardUsers.length > 0 ? (
                    leaderboardUsers.map((player, index) => (
                      <div 
                        key={player.uid} 
                        className="flex items-center p-3 bg-gray-900/50 rounded-lg"
                      >
                        <div className="w-8 text-center font-bold text-cyan-400">
                          {index + 1}.
                        </div>
                        <img 
                          src={player.avatarUrl || '/default-avatar.png'} 
                          alt={player.displayName} 
                          className="w-10 h-10 rounded-full mx-3 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default-avatar.png';
                          }}
                        />
                        <div className="flex-grow">
                          <span className="font-medium">{player.displayName}</span>
                        </div>
                        <div className="text-right">
                          {leaderboardFilter === 'richest' && (
                            <span className="font-mono text-cyan-400">{player.score?.toLocaleString() || 0} Puan</span>
                          )}
                          {leaderboardFilter === 'topEarners' && (
                            <span className="font-mono text-green-400">+{player.profit?.toLocaleString() || 0} Puan</span>
                          )}
                          {leaderboardFilter === 'biggestLosers' && (
                            <span className="font-mono text-red-400">-{player.loss?.toLocaleString() || 0} Puan</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      Veri bulunamadı. İlk yatırım yapan sen ol!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Oyun Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {bettingGames.map((game) => {
                const Icon = game.Icon;
                return (
                  <motion.div
                    key={game.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-lg cursor-pointer border-2 transition-all relative ${
                      selectedGame?.id === game.id
                        ? 'border-cyan-500 bg-cyan-900/30'
                        : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
                    }`}
                    onClick={() => handleGameSelect(game.id)}
                  >
                    <div className="absolute top-2 right-2">
                      <Info 
                        size={16} 
                        className="text-gray-400 hover:text-white cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGameIntro(true);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Icon className="text-cyan-400" size={24} />
                      <div>
                        <h3 className="font-bold">{game.name}</h3>
                        <p className="text-sm text-gray-400">
                          Bahis: {game.minBet} - {game.maxBet}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Oyun Alanı */}
            {selectedGame && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 shadow-lg shadow-purple-500/10 mb-8"
              >
                <h2 className="text-2xl font-bold mb-4">{selectedGame.name}</h2>
                
                {/* Slot Oyunu */}
                {selectedGame.id === 'slot_machine' && user && (
                  <SlotMachineGame 
                    userScore={userScore}
                    onUpdate={handleGameUpdate} 
                  />
                )}
                
                {/* Şans Zarı Oyunu */}
                {selectedGame.id === 'advanced_dice' && user && (
                  <AdvancedDiceGame 
                    userScore={userScore}
                    onGameUpdate={handleGameUpdate} 
                  />
                )}
              </motion.div>
            )}

            {/* Sonuç Mesajı */}
            {message && (
              <motion.div className={`mt-6 p-4 rounded-lg text-center font-semibold ${ message.type === 'success' ? 'bg-green-900/50 border-green-500 text-green-300' : 'bg-red-900/50 border-red-500 text-red-300'}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              > {message.text} </motion.div>
            )}
            
            {/* Oyun Tanıtımı Modalı */}
            <AnimatePresence>
              {showGameIntro && selectedGame && (
                <GameIntroductionModal 
                  game={gameIntroductions[selectedGame.id]} 
                  onClose={() => setShowGameIntro(false)} 
                />
              )}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default BettingPage;