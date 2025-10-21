// src/components/HorseRacingGame.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeDollarSign, Play, Zap, Star } from 'lucide-react';

// Atın özelliklerini tanımlayan arayüz
interface Horse {
  id: number;
  name: string;
  odds: number;
  color: string; // Tailwind rengi (örn: 'text-red-400')
  style: string; // Yarış stili hakkında ipucu
  power: number; // Gizli güç değeri (oranları ve performansı etkiler)
}

// Yarışın durumunu yönetmek için tip
type RaceStatus = 'betting' | 'racing' | 'finished';

const trackLength = 50; // Yarış pistinin uzunluğu (ASCII karakter sayısı)

// Bileşene dışarıdan verilecek props'lar
interface HorseRacingProps {
    userScore: number;
    // Yarış bittiğinde, bahis sonucunu ana sayfaya bildirmek için
    onRaceComplete: (payout: number) => void; 
}

// AT İSİMLERİ VE STİLLERİ
const horseNames = ["Şimşek", "Kasırga", "Gölge", "Yıldırım", "Fırtına", "Tayfun", "Rüzgar", "Volkan"];
const horseStyles = ["Hızlı Başlar", "Sondakikacı", "İstikrarlı", "Patlayıcı Güç", "Sabırlı Koşucu"];

const HorseRacingGame: React.FC<HorseRacingProps> = ({ userScore, onRaceComplete }) => {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [raceStatus, setRaceStatus] = useState<RaceStatus>('betting');
  
  // Yarış simülasyonu için state'ler
  const [raceLog, setRaceLog] = useState<string[]>([]);
  const [horsePositions, setHorsePositions] = useState<Record<number, number>>({});
  const [winner, setWinner] = useState<Horse | null>(null);
  const [payout, setPayout] = useState<number>(0);

  // Yeni bir yarış için atları oluşturan fonksiyon
  const generateHorses = useCallback(() => {
    let newHorses: Omit<Horse, 'odds'>[] = [];
    const availableNames = [...horseNames];
    const availableStyles = [...horseStyles];
    
    // 5 at oluştur
    for (let i = 1; i <= 5; i++) {
        const nameIndex = Math.floor(Math.random() * availableNames.length);
        const styleIndex = Math.floor(Math.random() * availableStyles.length);
        
        newHorses.push({
            id: i,
            name: availableNames.splice(nameIndex, 1)[0],
            style: availableStyles.splice(styleIndex, 1)[0],
            color: `text-${['cyan', 'red', 'green', 'yellow', 'purple'][i-1]}-400`,
            power: Math.floor(Math.random() * 50) + 50, // 50 ile 100 arası güç
        });
    }

    // Oranları hesapla
    const totalPower = newHorses.reduce((sum, h) => sum + h.power, 0);
    const horsesWithOdds = newHorses.map(horse => {
      // Güçlü atın oranı düşük, zayıf atın oranı yüksek olacak
      const odds = Math.max(1.8, parseFloat((((totalPower / horse.power) * 1.5)).toFixed(1)));
      return { ...horse, odds };
    });
    
    setHorses(horsesWithOdds);
  }, []);

  // Bileşen yüklendiğinde atları oluştur
  useEffect(() => {
    generateHorses();
  }, [generateHorses]);

  // Yarışı başlatan ana fonksiyon
  const startRace = () => {
    if (!selectedHorseId || betAmount <= 0 || betAmount > userScore) {
        // Hata yönetimi (örneğin bir mesaj gösterebilirsiniz)
        return;
    }
    
    // Bahis miktarını düş ve parent'a bildir. Parent (BettingPage) bu değeri alıp Firebase'i güncelleyecek.
    onRaceComplete(-betAmount);

    setRaceStatus('racing');
    setWinner(null);
    setPayout(0);
    setRaceLog(["YARIŞ BAŞLADI!"]);

    const initialPositions: Record<number, number> = {};
    horses.forEach(h => initialPositions[h.id] = 0);
    setHorsePositions(initialPositions);

    const raceInterval = setInterval(() => {
        let currentWinner: Horse | null = null;
        const newPositions = { ...initialPositions }; // Bu satırı döngü dışına taşıdık.
        setHorsePositions(prevPositions => {
            const updatedPositions = { ...prevPositions };
            let raceFinished = false;

            horses.forEach(horse => {
                if(raceFinished) return;
                // Her adımda atın ne kadar ilerleyeceğini hesapla: Güç + Şans
                const move = (horse.power / 25) + (Math.random() * 2);
                updatedPositions[horse.id] = Math.min(trackLength, (updatedPositions[horse.id] || 0) + move);
                
                // Bitiş çizgisini geçen ilk at kazanan olur
                if (updatedPositions[horse.id] >= trackLength) {
                    raceFinished = true;
                    currentWinner = horse;
                }
            });
            
            if (raceFinished && currentWinner) {
                clearInterval(raceInterval);
                setWinner(currentWinner);
                setRaceStatus('finished');

                // Kazancı hesapla
                if (currentWinner.id === selectedHorseId) {
                    const winnings = Math.floor(betAmount * currentWinner.odds);
                    setPayout(winnings);
                    onRaceComplete(winnings); // Kazanılan tutarı parent'a bildir.
                    setRaceLog(prev => [...prev, `🥇 ${currentWinner!.name} YARIŞI KAZANDI! TEBRİKLER!`]);
                } else {
                    setPayout(-betAmount); // Kayıp
                    setRaceLog(prev => [...prev, `🥇 ${currentWinner!.name} yarışı kazandı. Maalesef kaybettiniz.`]);
                }
            }
            
            return updatedPositions;
        });
        
    }, 400); // Yarış hızı
  };

  const resetRace = () => {
    generateHorses();
    setRaceStatus('betting');
    setSelectedHorseId(null);
    setBetAmount(0);
    setWinner(null);
    setRaceLog([]);
  };

  const renderTrack = (position: number, color: string) => {
    const pos = Math.floor(position);
    const before = '-'.repeat(pos);
    const after = '-'.repeat(Math.max(0, trackLength - pos - 1));
    const horseAscii = `>~o`;
    return (
        <span className={`font-mono ${color}`}>
            [{before}<span className='animate-pulse'>{horseAscii}</span>{after}]
        </span>
    );
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-900/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg shadow-purple-500/10">
        
      {/* BAŞLIK */}
      <div className="text-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
             Günün At Yarışı
          </h2>
          <p className="text-gray-400">Favorini seç ve zafere koş!</p>
      </div>

      {/* Bahis Ekranı */}
      <AnimatePresence>
        {raceStatus === 'betting' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    {horses.map(horse => (
                        <button key={horse.id} onClick={() => setSelectedHorseId(horse.id)}
                            className={`p-4 rounded-lg border-2 text-left transition ${selectedHorseId === horse.id ? 'border-cyan-400 bg-cyan-900/50' : 'border-gray-700 bg-gray-800/60 hover:border-cyan-500'}`}>
                           <p className={`font-bold text-lg ${horse.color}`}>{horse.name}</p>
                           <p className="text-sm text-gray-300">Oran: <span className="font-bold">{horse.odds}x</span></p>
                           <p className="text-xs text-gray-500 italic mt-2">{horse.style}</p>
                        </button>
                    ))}
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:w-1/2">
                         <BadgeDollarSign className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'/>
                         <input type="number" value={betAmount || ''} onChange={e => setBetAmount(Number(e.target.value))}
                            placeholder='Bahis Miktarı' disabled={!selectedHorseId}
                            className='w-full bg-gray-800 border border-gray-600 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50'/>
                    </div>
                   <button onClick={startRace} disabled={!selectedHorseId || betAmount <= 0 || betAmount > userScore}
                        className='w-full md:w-1/2 py-3 px-4 flex items-center justify-center gap-2 rounded-lg font-bold text-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed'>
                        <Play/> Yarışı Başlat
                   </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      
      {/* Yarış Ekranı */}
      <AnimatePresence>
        {(raceStatus === 'racing' || raceStatus === 'finished') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className='bg-gray-800/50 rounded-lg p-4 space-y-2'>
                    {horses.map(horse => (
                        <div key={horse.id} className='flex items-center gap-4'>
                            <span className={`w-20 font-bold truncate ${horse.color}`}>{horse.name}</span>
                            {renderTrack(horsePositions[horse.id] || 0, horse.color)}
                        </div>
                    ))}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sonuç Ekranı */}
      <AnimatePresence>
        {raceStatus === 'finished' && winner && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='text-center mt-6 p-6 bg-gray-800 rounded-lg'>
                <h3 className='text-2xl font-bold mb-2'>Yarış Sonuçlandı!</h3>
                <p className='text-lg mb-4'><Star className='inline-block text-yellow-400 mb-1'/> Kazanan: <span className={`font-bold ${winner.color}`}>{winner.name}</span></p>
                {payout > 0 ? (
                    <p className='text-xl text-green-400 font-bold'>TEBRİKLER! {payout.toLocaleString()} puan kazandınız!</p>
                ) : (
                    <p className='text-xl text-red-400 font-bold'>Maalesef bu sefer olmadı. {betAmount.toLocaleString()} puan kaybettiniz.</p>
                )}
                <button onClick={resetRace} className='mt-6 py-2 px-6 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold transition'>
                    Yeni Yarış
                </button>
             </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default HorseRacingGame;