// DOSYA: pages/BettingPage.tsx
// SKOR BAHİS SİSTEMİ - KAZANÇ VE RİSK DENGESİ

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../src/firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import {
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
  Coins,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  LoaderCircle,
  History,
  AlertTriangle,
  Crown,
  Star,
  Trophy,
  Wallet,
  Calendar,
  RotateCw
} from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Interfaces
interface BetHistory {
  id: string;
  game: string;
  amount: number;
  result: 'win' | 'lose';
  multiplier: number;
  timestamp: Date;
}

interface GameStats {
  totalBets: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  netProfit: number;
}

type GameType = 'dice' | 'coin' | 'color' | 'number';

// Oyun Ayarları (Risk-Kazanç Dengesi)
const GAME_CONFIG = {
  dice: { name: 'Zar Atışı', icon: Dice6, multiplier: 5.5 }, // 1/6 şans, ~%16.6
  coin: { name: 'Yazı Tura', icon: Coins, multiplier: 1.95 }, // ~1/2 şans, ~%50
  color: {
    name: 'Renk Oyunu',
    icon: Target,
    multipliers: {
      red: 2,   // %48.5 şans
      black: 2, // %48.5 şans
      green: 14 // %3 şans
    }
  },
  number: {
    name: 'Tek / Çift',
    icon: Star,
    multipliers: {
      even: 1.95, // ~%50
      odd: 1.95  // ~%50
    }
  }
};

const BettingPage: React.FC = () => {
  const { user } = useAuth();
  const [userScore, setUserScore] = useState(0);
  const [betAmount, setBetAmount] = useState(100);
  const [selectedGame, setSelectedGame] = useState<GameType>('dice');
  const [isBetting, setIsBetting] = useState(false);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalBets: 0,
    totalWon: 0,
    totalLost: 0,
    winRate: 0,
    netProfit: 0
  });
  const [dailyBetLimit] = useState(100000); // Sabit günlük limit
  const [todayBets, setTodayBets] = useState(0);

  // Oyun sonuç durumları
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [colorResult, setColorResult] = useState<'red' | 'black' | 'green' | null>(null);
  const [numberResult, setNumberResult] = useState<number | null>(null);

  // Kullanıcı tahminleri
  const [diceGuess, setDiceGuess] = useState<number>(1);
  const [coinGuess, setCoinGuess] = useState<'heads' | 'tails'>('heads');
  const [colorGuess, setColorGuess] = useState<'red' | 'black' | 'green'>('red');
  const [numberGuess, setNumberGuess] = useState<'even' | 'odd'>('even');

  // Memoized hook for number formatting to avoid re-creation on re-renders
  const numberFormatter = useMemo(() => new Intl.NumberFormat('tr-TR'), []);


  useEffect(() => {
    if (!user) return;
    const loadAllData = async () => {
      await loadUserData();
      await loadBetHistory();
    }
    loadAllData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserScore(userData.score || 0);

        const today = new Date().toDateString();
        const lastBetDate = userData.lastBetDate;
        if (lastBetDate !== today) {
          await updateDoc(userRef, { todayBets: 0, lastBetDate: today });
          setTodayBets(0);
        } else {
          setTodayBets(userData.todayBets || 0);
        }
      }
    } catch (error) {
      console.error('Kullanıcı verisi yüklenirken hata:', error);
      toast.error('Kullanıcı verileri yüklenemedi.');
    }
  };

  const loadBetHistory = async () => {
    if (!user) return;
    try {
      const betsRef = collection(db, 'users', user.uid, 'bets');
      const q = query(betsRef, orderBy('timestamp', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);

      const history: BetHistory[] = [];
      let totalBets = 0, totalWonAmount = 0, wins = 0;

      querySnapshot.forEach(doc => {
        const data = doc.data();
        history.push({
          id: doc.id,
          game: data.game,
          amount: data.amount,
          result: data.result,
          multiplier: data.multiplier,
          timestamp: data.timestamp.toDate()
        });

        totalBets++;
        if (data.result === 'win') {
          wins++;
          totalWonAmount += (data.amount * data.multiplier) - data.amount;
        } else {
          totalWonAmount -= data.amount;
        }
      });
      
      setBetHistory(history);
      
      const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
      setGameStats({
        totalBets: history.length, // Sadece yüklenen son 20'nin istatistiği
        totalWon: history.filter(b => b.result === 'win').reduce((acc, b) => acc + (b.amount * b.multiplier), 0),
        totalLost: history.filter(b => b.result === 'lose').reduce((acc, b) => acc + b.amount, 0),
        winRate: winRate,
        netProfit: totalWonAmount
      });

    } catch (error) {
      console.error('Bahis geçmişi yüklenirken hata:', error);
      toast.error('Bahis geçmişi yüklenemedi.');
    }
  };
  
  const resetGameResults = () => {
      setDiceResult(null);
      setCoinResult(null);
      setColorResult(null);
      setNumberResult(null);
  }

  const handleBet = async () => {
    if (!user || isBetting) return;

    if (betAmount <= 0) {
      toast.error('Bahis miktarı 0\'dan büyük olmalı.');
      return;
    }

    if (betAmount > userScore) {
      toast.error('Yetersiz bakiye!');
      return;
    }

    if (todayBets + betAmount > dailyBetLimit) {
      toast.error(`Günlük bahis limitini (${numberFormatter.format(dailyBetLimit)}) aştınız.`);
      return;
    }

    setIsBetting(true);
    resetGameResults();
    const userRef = doc(db, 'users', user.uid);
    let win = false;
    let multiplier = 0;
    
    // Anlık olarak puanı düşür
    setUserScore(prev => prev - betAmount);
    await updateDoc(userRef, { score: increment(-betAmount) });

    // 2 saniye sonra sonucu göster
    setTimeout(async () => {
      try {
        let outcome: any;

        switch(selectedGame) {
          case 'dice': {
            const roll = Math.floor(Math.random() * 6) + 1;
            setDiceResult(roll);
            win = roll === diceGuess;
            multiplier = GAME_CONFIG.dice.multiplier;
            break;
          }
          case 'coin': {
            const flip = Math.random() < 0.5 ? 'heads' : 'tails';
            setCoinResult(flip);
            win = flip === coinGuess;
            multiplier = GAME_CONFIG.coin.multiplier;
            break;
          }
          case 'color': {
              const roll = Math.random() * 100;
              let resultColor: 'red' | 'black' | 'green';
              if (roll < 3) resultColor = 'green';
              else if (roll < 51.5) resultColor = 'red';
              else resultColor = 'black';
              
              setColorResult(resultColor);
              win = resultColor === colorGuess;
              multiplier = GAME_CONFIG.color.multipliers[colorGuess];
              break;
          }
          case 'number': {
              const num = Math.floor(Math.random() * 100) + 1;
              setNumberResult(num);
              const resultType = num % 2 === 0 ? 'even' : 'odd';
              win = resultType === numberGuess;
              multiplier = GAME_CONFIG.number.multipliers[numberGuess];
              break;
          }
        }

        const winnings = win ? betAmount * multiplier : 0;

        if (win) {
          toast.success(`Kazandınız! +${numberFormatter.format(winnings - betAmount)}`);
          await updateDoc(userRef, { score: increment(winnings) });
          setUserScore(prev => prev + winnings);
        } else {
          toast.error('Kaybettiniz!');
        }
        
        // Bahsi kaydet
        const betsRef = collection(db, 'users', user.uid, 'bets');
        await addDoc(betsRef, {
          game: selectedGame,
          amount: betAmount,
          result: win ? 'win' : 'lose',
          multiplier,
          timestamp: serverTimestamp()
        });

        // Günlük limiti güncelle
        const today = new Date().toDateString();
        await updateDoc(userRef, {
          todayBets: increment(betAmount),
          lastBetDate: today,
        });

        // Verileri yeniden yükle
        await loadUserData();
        await loadBetHistory();
      } catch (error) {
          console.error("Bahis işlenirken hata:", error);
          toast.error("Bir hata oluştu, puanınız iade ediliyor.");
          // Hata durumunda puanı iade et
          await updateDoc(userRef, { score: increment(betAmount) });
          await loadUserData();
      } finally {
        setIsBetting(false);
      }
    }, 2000);
  };
  
  // Render Fonksiyonları
  const renderGameControls = () => {
    switch(selectedGame) {
      case 'dice':
        return (
          <div className="flex justify-center space-x-2 my-4">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button key={num} onClick={() => setDiceGuess(num)} className={`p-3 rounded-lg border-2 transition-all ${diceGuess === num ? 'bg-yellow-500 border-yellow-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                {num}
              </button>
            ))}
          </div>
        );
      case 'coin':
        return (
          <div className="flex justify-center space-x-4 my-4">
            <button onClick={() => setCoinGuess('heads')} className={`px-6 py-3 rounded-lg border-2 transition-all font-bold ${coinGuess === 'heads' ? 'bg-yellow-500 border-yellow-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>YAZI</button>
            <button onClick={() => setCoinGuess('tails')} className={`px-6 py-3 rounded-lg border-2 transition-all font-bold ${coinGuess === 'tails' ? 'bg-cyan-500 border-cyan-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>TURA</button>
          </div>
        );
      case 'color':
        return (
            <div className="flex justify-center space-x-2 my-4">
                <button onClick={() => setColorGuess('red')} className={`px-4 py-2 rounded-lg text-white font-bold transition-all border-2 ${colorGuess === 'red' ? 'bg-red-600 border-red-400 ring-2 ring-white' : 'bg-red-500 border-transparent'}`}>
                    KIRMIZI (2x)
                </button>
                 <button onClick={() => setColorGuess('black')} className={`px-4 py-2 rounded-lg text-white font-bold transition-all border-2 ${colorGuess === 'black' ? 'bg-gray-800 border-gray-600 ring-2 ring-white' : 'bg-black border-transparent'}`}>
                    SİYAH (2x)
                </button>
                <button onClick={() => setColorGuess('green')} className={`px-4 py-2 rounded-lg text-white font-bold transition-all border-2 ${colorGuess === 'green' ? 'bg-green-600 border-green-400 ring-2 ring-white' : 'bg-green-500 border-transparent'}`}>
                    YEŞİL (14x)
                </button>
            </div>
        )
      case 'number':
          return (
             <div className="flex justify-center space-x-4 my-4">
                <button onClick={() => setNumberGuess('even')} className={`px-6 py-3 rounded-lg border-2 transition-all font-bold ${numberGuess === 'even' ? 'bg-blue-500 border-blue-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>ÇİFT</button>
                <button onClick={() => setNumberGuess('odd')} className={`px-6 py-3 rounded-lg border-2 transition-all font-bold ${numberGuess === 'odd' ? 'bg-purple-500 border-purple-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>TEK</button>
          </div>
          )
    }
  }

  const renderGameResult = () => {
    const diceIcons = [<Dice1 size={64}/>, <Dice2 size={64}/>, <Dice3 size={64}/>, <Dice4 size={64}/>, <Dice5 size={64}/>, <Dice6 size={64}/>];

    const ResultWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AnimatePresence>
            <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="h-24 w-full flex items-center justify-center"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );

    if (isBetting && !diceResult && !coinResult && !colorResult && !numberResult) {
      return (
          <div className="h-24 w-full flex items-center justify-center">
            <LoaderCircle size={48} className="animate-spin text-yellow-400" />
          </div>
      )
    }
    
    if (diceResult) return <ResultWrapper>{diceIcons[diceResult-1]}</ResultWrapper>;
    if (coinResult) return <ResultWrapper><Coins size={64} className={coinResult === 'heads' ? 'text-yellow-400' : 'text-cyan-400'} /></ResultWrapper>;
    if (colorResult) return <ResultWrapper><div className={`w-20 h-20 rounded-full bg-${colorResult}-500`} /></ResultWrapper>;
    if (numberResult) return <ResultWrapper><span className="text-6xl font-bold">{numberResult}</span></ResultWrapper>;

    return <div className="h-24 w-full flex items-center justify-center text-gray-500"><Trophy size={48}/></div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Ana Bahis Alanı */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
            {/* Bakiye ve Limit */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <div className="flex items-center space-x-3 bg-gray-900 p-3 rounded-lg">
                    <Wallet size={32} className="text-green-400" />
                    <div>
                        <p className="text-sm text-gray-400">Bakiyeniz</p>
                        <p className="text-2xl font-bold">{numberFormatter.format(userScore)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 bg-gray-900 p-3 rounded-lg mt-4 sm:mt-0">
                    <Calendar size={32} className="text-blue-400" />
                    <div>
                        <p className="text-sm text-gray-400">Günlük Harcama</p>
                        <p className="text-xl font-bold">{numberFormatter.format(todayBets)} / {numberFormatter.format(dailyBetLimit)}</p>
                         <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (todayBets / dailyBetLimit) * 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Oyun Seçimi */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(GAME_CONFIG).map(([key, { name, icon: Icon }]) => (
                    <button key={key} onClick={() => { setSelectedGame(key as GameType); resetGameResults(); }} 
                            className={`p-4 flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-200 ${selectedGame === key ? 'bg-yellow-500 border-yellow-300 text-black' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                        <Icon size={24} className="mb-2"/>
                        <span className="font-semibold text-sm">{name}</span>
                    </button>
                ))}
            </div>

            {/* Sonuç Ekranı */}
            <div className="bg-gray-900/50 rounded-lg min-h-[120px] flex items-center justify-center mb-4">
                {renderGameResult()}
            </div>
            
            {/* Oyun Kontrolleri */}
            <div>{renderGameControls()}</div>
            
            {/* Bahis Miktarı ve Buton */}
            <div className="bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                    <Coins className="text-yellow-400" size={24}/>
                    <input 
                        type="number"
                        value={betAmount}
                        onChange={e => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        disabled={isBetting}
                        className="w-full bg-transparent text-xl font-bold outline-none"
                    />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                    <button onClick={() => setBetAmount(prev => prev + 100)} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md transition-colors">+100</button>
                    <button onClick={() => setBetAmount(prev => Math.floor(prev / 2))} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md transition-colors">1/2</button>
                    <button onClick={() => setBetAmount(prev => prev * 2)} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md transition-colors">x2</button>
                    <button onClick={() => setBetAmount(userScore)} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md transition-colors">MAX</button>
                </div>
            </div>

            <button 
                onClick={handleBet}
                disabled={isBetting || betAmount <= 0 || betAmount > userScore}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-4 rounded-lg text-xl flex items-center justify-center
                           transition-all duration-300 ease-in-out hover:from-green-600 hover:to-teal-600
                           disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:text-gray-400
                           transform hover:scale-105 active:scale-100"
            >
                {isBetting ? <LoaderCircle className="animate-spin" size={28}/> : (
                    <>
                        <Zap size={24} className="mr-2"/> Bahis Yap
                    </>
                )}
            </button>
        </div>

        {/* İstatistikler ve Geçmiş */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
             {/* İstatistikler */}
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center"><Crown className="mr-2 text-yellow-400"/> Son 20 Bahis İstatistiği</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-700 p-3 rounded-lg">
                        <p className="text-gray-400 flex items-center"><RotateCw size={14} className="mr-1"/> Toplam Bahis</p>
                        <p className="font-bold text-lg">{gameStats.totalBets}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg">
                        <p className="text-gray-400 flex items-center"><TrendingUp size={14} className="mr-1 text-green-400"/> Kazanma Oranı</p>
                        <p className="font-bold text-lg text-green-400">{gameStats.winRate.toFixed(1)}%</p>
                    </div>
                     <div className="bg-gray-700 p-3 rounded-lg col-span-2">
                        <p className={`text-gray-400 flex items-center`}>
                           {gameStats.netProfit >= 0 ? <TrendingUp size={14} className="mr-1 text-green-400"/> : <TrendingDown size={14} className="mr-1 text-red-400" />} 
                           Net Kâr/Zarar
                        </p>
                        <p className={`font-bold text-lg ${gameStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{numberFormatter.format(gameStats.netProfit)}</p>
                    </div>
                </div>
            </div>

            {/* Bahis Geçmişi */}
            <div>
                 <h2 className="text-xl font-bold mb-4 flex items-center"><History className="mr-2 text-blue-400"/> Bahis Geçmişi</h2>
                 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {betHistory.length > 0 ? betHistory.map(bet => {
                        const gameConfig = GAME_CONFIG[bet.game as GameType];
                        const Icon = gameConfig ? gameConfig.icon : AlertTriangle;
                        
                        return (
                            <motion.div
                                key={bet.id}
                                layout
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-center justify-between p-3 rounded-lg ${bet.result === 'win' ? 'bg-green-500/10' : 'bg-red-500/10'}`}
                            >
                               <div className="flex items-center space-x-3">
                                  <Icon size={20} className={bet.result === 'win' ? 'text-green-400' : 'text-red-400'}/>
                                  <div>
                                     <p className="font-semibold capitalize">{gameConfig.name}</p>
                                     <p className="text-xs text-gray-400">{bet.timestamp.toLocaleString('tr-TR')}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                   <p className={`font-bold ${bet.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                       {bet.result === 'win' ? `+${numberFormatter.format(bet.amount * bet.multiplier - bet.amount)}` : `-${numberFormatter.format(bet.amount)}`}
                                   </p>
                                   <p className="text-xs text-gray-400">@{bet.multiplier}x</p>
                               </div>
                            </motion.div>
                        )
                    }) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>Henüz bahis yapılmadı.</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BettingPage;