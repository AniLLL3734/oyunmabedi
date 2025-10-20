import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, functions } from '../src/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Coins, Zap, Target, LoaderCircle,
  History, Crown, Star, Trophy, Wallet, Calendar, Rocket, Swords,
  Heart, Club, Diamond, Spade
} from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { toast } from 'react-hot-toast';

// === Arayüzler ve Tipler ===
interface BetHistory {
  id: string;
  game: string;
  amount: number;
  result: 'win' | 'lose';
  multiplier: number;
  timestamp: Date;
  outcome: any;
}

type Suit = '♣' | '♦' | '♥' | '♠';
interface Card {
  value: number;
  suit: Suit;
}

type GameType = 'dice' | 'coin' | 'color' | 'number' | 'card' | 'rocket';

// === Oyun Ayarları (Sadece Arayüz İçin) ===
const GAME_CONFIG = {
  dice: { name: 'Zar Atışı', icon: Dice6 },
  coin: { name: 'Yazı Tura', icon: Coins },
  color: { name: 'Renk Oyunu', icon: Target },
  number: { name: 'Tek / Çift', icon: Star },
  card: { name: 'Yüksek/Alçak', icon: Swords},
  rocket: { name: 'Roket', icon: Rocket }
};

const BettingPage: React.FC = () => {
  const { user } = useAuth();
  const [userScore, setUserScore] = useState(0);
  const [betAmount, setBetAmount] = useState(100);
  const [selectedGame, setSelectedGame] = useState<GameType>('dice');
  const [isBetting, setIsBetting] = useState(false);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [dailyBetLimit] = useState(100000);
  const [todayBets, setTodayBets] = useState(0);

  const [gameOutcome, setGameOutcome] = useState<any>(null);

  const [diceGuess, setDiceGuess] = useState(1);
  const [coinGuess, setCoinGuess] = useState<'heads' | 'tails'>('heads');
  const [colorGuess, setColorGuess] = useState<'red' | 'black' | 'green'>('red');
  const [numberGuess, setNumberGuess] = useState<'even' | 'odd'>('even');
  const [cardGuess, setCardGuess] = useState<'high' | 'low' | 'same'>('high');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [rocketTarget, setRocketTarget] = useState(2.0);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('tr-TR'), []);

  const generateNewCard = useCallback(() => {
    const suits: Suit[] = ["♣", "♦", "♥", "♠"];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    setCurrentCard({
      value: values[Math.floor(Math.random() * values.length)],
      suit: suits[Math.floor(Math.random() * suits.length)],
    });
  }, []);
    
  const loadUserData = useCallback(async () => {
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
          setTodayBets(0);
        } else {
          setTodayBets(userData.todayBets || 0);
        }
      }
    } catch (error) {
      console.error('Kullanıcı verisi yüklenirken hata:', error);
      toast.error('Kullanıcı verileri yüklenemedi.');
    }
  }, [user]);

  const loadBetHistory = useCallback(async () => {
    if (!user) return;
    try {
      const betsRef = collection(db, 'users', user.uid, 'bets');
      const q = query(betsRef, orderBy('timestamp', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);
      const history: BetHistory[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp) {
             history.push({
                id: doc.id,
                game: data.game,
                amount: data.amount,
                result: data.result,
                multiplier: data.multiplier,
                outcome: data.outcome,
                timestamp: data.timestamp.toDate()
             });
        }
      });
      setBetHistory(history);
    } catch (error) {
      console.error('Bahis geçmişi yüklenirken hata:', error);
      toast.error('Bahis geçmişi yüklenemedi.');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadUserData();
    loadBetHistory();
    if (!currentCard) {
      generateNewCard();
    }
  }, [user, loadUserData, loadBetHistory, generateNewCard, currentCard]);


  const resetGameStates = () => {
      setGameOutcome(null);
      if(selectedGame === 'card' || !currentCard) generateNewCard();
  }

  const handleBet = async () => {
    if (!user || isBetting || !functions) return;
    if (betAmount <= 0 || !Number.isInteger(betAmount)) { toast.error('Bahis miktarı pozitif bir tamsayı olmalı.'); return; }
    if (betAmount > userScore) { toast.error('Yetersiz bakiye!'); return; }
    if (todayBets + betAmount > dailyBetLimit) { toast.error(`Günlük bahis limitini aştınız.`); return; }
    setIsBetting(true);
    setGameOutcome(null);
    let guessPayload: any;
    switch (selectedGame) {
      case 'dice': guessPayload = { value: diceGuess }; break;
      case 'coin': guessPayload = { value: coinGuess }; break;
      case 'color': guessPayload = { value: colorGuess }; break;
      case 'number': guessPayload = { value: numberGuess }; break;
      case 'card': guessPayload = { choice: cardGuess, currentCardValue: currentCard!.value }; break;
      case 'rocket': guessPayload = { value: rocketTarget }; break;
      default: toast.error("Geçersiz oyun seçimi."); setIsBetting(false); return;
    }
    try {
      const placeBetFunction = httpsCallable(functions, 'placeBet');
      const response: any = await placeBetFunction({ game: selectedGame, amount: betAmount, guess: guessPayload });
      const result = response.data;
      setGameOutcome(result.outcome);
      setTimeout(() => {
        if (result.result === 'win') {
          toast.success(`Kazandınız! +${numberFormatter.format(result.netGain)}`);
        } else {
          toast.error(`Kaybettiniz! ${numberFormatter.format(result.netGain)}`);
        }
        setUserScore(result.newScore);
        loadUserData();
        loadBetHistory();
        if (selectedGame === 'card') {
          setCurrentCard(result.outcome as Card);
        }
      }, 1500);
    } catch (error: any) {
      console.error("Bahis Hatası:", error);
      toast.error(error.message || "Bilinmeyen bir hata oluştu.");
      await loadUserData();
    } finally {
       setTimeout(() => setIsBetting(false), 2000);
    }
  };
  
  const renderGameControls = () => {
    switch(selectedGame) {
      case 'dice': return (
        <div className="flex justify-center space-x-2 my-4">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button key={num} onClick={() => setDiceGuess(num)} className={`p-3 rounded-lg border-2 ${diceGuess === num ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}`}>{num}</button>
            ))}
        </div>);
      case 'coin': return (
        <div className="flex justify-center space-x-4 my-4">
            <button onClick={() => setCoinGuess('heads')} className={`px-6 py-3 font-bold rounded-lg border-2 ${coinGuess === 'heads' ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}`}>YAZI</button>
            <button onClick={() => setCoinGuess('tails')} className={`px-6 py-3 font-bold rounded-lg border-2 ${coinGuess === 'tails' ? 'bg-cyan-500' : 'bg-gray-700 hover:bg-gray-600'}`}>TURA</button>
        </div>);
      case 'color': return (
        <div className="flex justify-center space-x-2 my-4">
            <button onClick={() => setColorGuess('red')} className={`px-4 py-2 font-bold rounded-lg border-2 ${colorGuess === 'red' ? 'bg-red-600 ring-2 ring-white' : 'bg-red-500'}`}>KIRMIZI (2x)</button>
            <button onClick={() => setColorGuess('black')} className={`px-4 py-2 font-bold rounded-lg border-2 ${colorGuess === 'black' ? 'bg-gray-800 ring-2 ring-white' : 'bg-black'}`}>SİYAH (2x)</button>
            <button onClick={() => setColorGuess('green')} className={`px-4 py-2 font-bold rounded-lg border-2 ${colorGuess === 'green' ? 'bg-green-600 ring-2 ring-white' : 'bg-green-500'}`}>YEŞİL (14x)</button>
        </div>);
      case 'number': return (
         <div className="flex justify-center space-x-4 my-4">
            <button onClick={() => setNumberGuess('even')} className={`px-6 py-3 font-bold rounded-lg border-2 ${numberGuess === 'even' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}>ÇİFT</button>
            <button onClick={() => setNumberGuess('odd')} className={`px-6 py-3 font-bold rounded-lg border-2 ${numberGuess === 'odd' ? 'bg-purple-500' : 'bg-gray-700 hover:bg-gray-600'}`}>TEK</button>
        </div>);
      case 'card': return (
        <div className="flex flex-col items-center my-4">
            <p className='text-sm text-gray-400 mb-2'>Sıradaki kart daha mı...</p>
            <div className='flex justify-center space-x-4'>
                <button onClick={() => setCardGuess('high')} className={`px-6 py-3 font-bold rounded-lg border-2 ${cardGuess === 'high' ? 'bg-green-500' : 'bg-gray-700'}`}>YÜKSEK</button>
                <button onClick={() => setCardGuess('low')} className={`px-6 py-3 font-bold rounded-lg border-2 ${cardGuess === 'low' ? 'bg-red-500' : 'bg-gray-700'}`}>ALÇAK</button>
                <button onClick={() => setCardGuess('same')} className={`px-6 py-3 font-bold rounded-lg border-2 ${cardGuess === 'same' ? 'bg-yellow-500' : 'bg-gray-700'}`}>AYNI (8x)</button>
            </div>
        </div>);
      case 'rocket':
        const targets = [1.5, 2.0, 3.0, 5.0, 10.0];
        return (
          <div className="flex flex-col items-center my-4">
            <p className='text-sm text-gray-400 mb-2'>Hedef Çarpan Seç</p>
             <div className="flex justify-center space-x-2">
                {targets.map(target => ( <button key={target} onClick={() => setRocketTarget(target)} className={`p-3 rounded-lg border-2 ${rocketTarget === target ? 'bg-purple-600' : 'bg-gray-700'}`}>{target.toFixed(1)}x</button>))}
            </div>
          </div>);
      default: return null;
    }
  }

  const renderGameResult = () => {
    const diceIcons = [
        <Dice1 size={64}/>, <Dice2 size={64}/>, <Dice3 size={64}/>, 
        <Dice4 size={64}/>, <Dice5 size={64}/>, <Dice6 size={64}/>
    ];

    const ResultWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-24 w-full flex items-center justify-center">{children}</motion.div>
    );

    if (isBetting && !gameOutcome) return <div className="h-24 flex items-center justify-center"><LoaderCircle size={48} className="animate-spin text-yellow-400" /></div>;
    if (!gameOutcome && selectedGame !== 'card') return <div className="h-24 flex items-center justify-center text-gray-500"><Trophy size={48}/></div>;

    switch(selectedGame) {
        case 'dice': return gameOutcome && <ResultWrapper>{diceIcons[gameOutcome-1]}</ResultWrapper>;
        case 'coin': return gameOutcome && <ResultWrapper><Coins size={64} className={gameOutcome === 'heads' ? 'text-yellow-400' : 'text-cyan-400'} /></ResultWrapper>;
        case 'color': return gameOutcome && <ResultWrapper><div className={`w-20 h-20 rounded-full bg-${gameOutcome}-500`} /></ResultWrapper>;
        case 'number': return gameOutcome && <ResultWrapper><span className="text-6xl font-bold">{gameOutcome}</span></ResultWrapper>;
        case 'card':
            if (!currentCard) return <div className="h-24 flex items-center justify-center"><LoaderCircle className="animate-spin" /></div>;

            const suitIcons = {'♥':<Heart fill='red'/>, '♦':<Diamond fill='red'/>, '♠':<Spade fill='white'/>, '♣':<Club fill='white'/>};
            const cardValue = (v: number) => ({11:'J',12:'Q',13:'K',14:'A'}[v] || v);

            const CardComponent = ({ card }: { card: Card }) => (
              <div className="w-20 h-28 bg-white rounded-lg p-1 text-red-500 flex flex-col justify-between font-bold text-lg relative">
                <div className="flex items-center">{cardValue(card.value)} {React.cloneElement(suitIcons[card.suit], { className: "w-5 h-5" })}</div>
                <div className="self-center text-3xl">{React.cloneElement(suitIcons[card.suit], { className: "w-10 h-10" })}</div>
                <div className="flex items-center self-end transform rotate-180">{cardValue(card.value)} {React.cloneElement(suitIcons[card.suit], { className: "w-5 h-5" })}</div>
              </div>
            );
            return (
              <div className='flex items-center justify-center space-x-4 min-h-[140px]'>
                  <div className='flex flex-col items-center'><p className='text-sm text-gray-400 mb-1'>Mevcut Kart</p><CardComponent card={currentCard} /></div>
                  <AnimatePresence>
                  {gameOutcome && (
                     <motion.div initial={{ opacity:0, x:-20}} animate={{opacity:1, x:0}} className='flex flex-col items-center'>
                       <p className='text-sm text-gray-400 mb-1'>Sonuç</p>
                       <CardComponent card={gameOutcome} />
                     </motion.div>
                  )}
                  </AnimatePresence>
              </div>);
        case 'rocket':
             return (
                 <div className="h-24 w-full flex flex-col items-center justify-center text-4xl font-bold">
                     {gameOutcome ? <span className={gameOutcome >= rocketTarget ? 'text-green-400' : 'text-red-400'}>Patlama: {gameOutcome}x</span>
                                  : <div><p className='text-lg font-normal text-gray-400 text-center'>Hedef</p><p>{rocketTarget.toFixed(1)}x</p></div>}
                 </div>);
        default: return <div className="h-24"/>;
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center space-x-3 bg-gray-900 p-3 rounded-lg w-full sm:w-auto">
                    <Wallet size={32} className="text-green-400" />
                    <div><p className="text-sm text-gray-400">Bakiyeniz</p><p className="text-2xl font-bold">{numberFormatter.format(userScore)}</p></div>
                </div>
                <div className="flex items-center space-x-3 bg-gray-900 p-3 rounded-lg w-full sm:w-auto">
                    <Calendar size={32} className="text-blue-400" />
                    <div className='flex-grow'><p className="text-sm text-gray-400">Günlük Harcama</p><p className="text-xl font-bold">{numberFormatter.format(todayBets)} / {numberFormatter.format(dailyBetLimit)}</p>
                         <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (todayBets / dailyBetLimit) * 100)}%` }}></div></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                {Object.entries(GAME_CONFIG).map(([key, { name, icon: Icon }]) => (
                    <button key={key} onClick={() => { setSelectedGame(key as GameType); resetGameStates(); }} 
                            className={`p-3 flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-200 ${selectedGame === key ? 'bg-yellow-500 border-yellow-300 text-black' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                        <Icon size={24} className="mb-1"/><span className="font-semibold text-xs text-center">{name}</span>
                    </button>
                ))}
            </div>

            <div className="bg-gray-900/50 rounded-lg min-h-[140px] flex items-center justify-center mb-4 p-2">{renderGameResult()}</div>
            <div>{renderGameControls()}</div>
            
            <div className="bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                    <Coins className="text-yellow-400" size={24}/>
                    <input type="number" value={betAmount} onChange={e => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))} disabled={isBetting} className="w-full bg-transparent text-xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                    <button onClick={() => setBetAmount(prev => prev + 100)} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md disabled:opacity-50">+100</button>
                    <button onClick={() => setBetAmount(prev => Math.floor(prev / 2))} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md disabled:opacity-50">1/2</button>
                    <button onClick={() => setBetAmount(prev => prev * 2)} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md disabled:opacity-50">x2</button>
                    <button onClick={() => setBetAmount(userScore)} disabled={isBetting} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md disabled:opacity-50">MAX</button>
                </div>
            </div>

            <button onClick={handleBet} disabled={isBetting || betAmount <= 0 || betAmount > userScore} className="w-full mt-4 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-4 rounded-lg text-xl flex items-center justify-center transition-all duration-300 hover:from-green-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100">
                {isBetting ? <LoaderCircle className="animate-spin" size={28}/> : <><Zap size={24} className="mr-2"/> Bahis Yap</>}
            </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center"><Crown className="mr-2 text-yellow-400"/> İstatistikler</h2>
            <div className="text-center py-4 text-gray-500">
                <p>İstatistikler yakında eklenecektir.</p>
            </div>
            
            <h2 className="text-xl font-bold mt-6 mb-4 flex items-center"><History className="mr-2 text-blue-400"/> Bahis Geçmişi</h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
               {betHistory.length > 0 ? betHistory.map(bet => {
                   const { icon: Icon } = GAME_CONFIG[bet.game as GameType] || { icon: Star };
                   const netGain = bet.result === 'win' ? (bet.amount * bet.multiplier) - bet.amount : -bet.amount;
                   return (
                     <motion.div key={bet.id} layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                                 className={`flex items-center justify-between p-3 rounded-lg ${bet.result === 'win' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="flex items-center space-x-3">
                           <Icon size={20} className={bet.result === 'win' ? 'text-green-400' : 'text-red-400'}/>
                           <div><p className="font-semibold">{GAME_CONFIG[bet.game as GameType]?.name}</p><p className="text-xs text-gray-400">{bet.timestamp.toLocaleString('tr-TR')}</p></div>
                        </div>
                        <div className="text-right">
                           <p className={`font-bold ${netGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{netGain >= 0 ? `+${numberFormatter.format(netGain)}` : numberFormatter.format(netGain)}</p>
                           <p className="text-xs text-gray-400">@{bet.multiplier.toFixed(2)}x</p>
                        </div>
                     </motion.div>
                   )
               }) : <div className="text-center py-8 text-gray-500">Henüz bahis yapılmadı.</div>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BettingPage;