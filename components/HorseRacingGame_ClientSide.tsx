// src/components/HorseRacingGame_ClientSide.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Horse {
  id: number;
  name: string;
  color: string;
  odds: number;
  position: number;
  speed: number;
  isFinished: boolean;
  style: string; // Stil bilgisi eklendi
  power: number; // Güç değeri eklendi
}

interface Bet {
  horseId: number;
  amount: number;
}

interface HorseRacingProps {
    userScore: number;
    onRaceComplete: (payout: number) => void; 
}

// AT İSİMLERİ VE STİLLERİ
const horseNames = ["Şimşek", "Kasırga", "Gölge", "Yıldırım", "Fırtına", "Tayfun", "Rüzgar", "Volkan"];
const horseStyles = ["Hızlı Başlar", "Sondakikacı", "İstikrarlı", "Patlayıcı Güç", "Sabırlı Koşucu"];

// Bu basit bir "obfuscation" tekniğidir. Kodun okunmasını zorlaştırır.
const obscure = (str: string) => btoa(str); // Base64 encode
const reveal = (str: string) => atob(str); // Base64 decode

const HorseRacingGame: React.FC<HorseRacingProps> = ({ userScore, onRaceComplete }) => {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [raceStatus, setRaceStatus] = useState<'betting' | 'racing' | 'finished'>('betting');
  
  // Yarış simülasyonu için state'ler
  const [raceLog, setRaceLog] = useState<string[]>([]);
  const [horsePositions, setHorsePositions] = useState<Record<number, number>>({});
  const [winner, setWinner] = useState<Horse | null>(null);
  const [payout, setPayout] = useState<number>(0);

  // 1. Sağ Tık ve Geliştirici Araçları Engelleyici
  useEffect(() => {
    const handleContextmenu = (e: MouseEvent) => e.preventDefault();
    const handleKeydown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U engelleme
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('contextmenu', handleContextmenu);
    document.addEventListener('keydown', handleKeydown);
    
    // 2. Anti-Debugging Tekniği
    const interval = setInterval(() => {
      // Bir hileci debugger'ı açarsa, bu kod onu sürekli durdurarak sinir eder.
      // Kodu analiz etmesini çok yavaşlatır.
      // eslint-disable-next-line no-debugger
      debugger;
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextmenu);
      document.removeEventListener('keydown', handleKeydown);
      clearInterval(interval);
    };
  }, []);

  // Yeni bir yarış için atları oluşturan fonksiyon
  const generateHorses = () => {
    let newHorses: Omit<Horse, 'odds' | 'position' | 'speed' | 'isFinished'>[] = [];
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
            power: 70 + Math.floor(Math.random() * 30) // 70-100 arası gizli güç
        });
    }
    
    // Oranları güç değerlerine göre hesapla
    const horsesWithOdds: Horse[] = newHorses.map(horse => {
        // Güç değerine göre oran hesapla (daha güçlü atlar daha az oran verir)
        const odds = (150 - horse.power) / 20;
        return {
            ...horse,
            odds: parseFloat(odds.toFixed(1)),
            position: 0,
            speed: 0,
            isFinished: false
        };
    });
    
    setHorses(horsesWithOdds);
    setSelectedHorseId(null);
    setBetAmount(0);
    setRaceStatus('betting');
    setWinner(null);
    setPayout(0);
  };

  // Component ilk yüklendiğinde atları oluştur
  useEffect(() => {
    generateHorses();
  }, []);

  // Bahis yap
  const placeBet = () => {
    if (betAmount <= 0) {
      alert("Geçerli bir miktar girin");
      return;
    }
    
    if (betAmount > userScore) {
      alert("Yeterli bakiyeniz yok");
      return;
    }
    
    if (!selectedHorseId) {
      alert("Bir at seçin");
      return;
    }
    
    setRaceStatus('racing');
  };

  // Yarışı başlat
  const startRace = () => {
    if (raceStatus !== 'betting' || !selectedHorseId || betAmount <= 0) return;
    
    setRaceStatus('racing');
    
    // Oyun mantığını şifrele
    const obscuredGameLogic = obscure(JSON.stringify({ 
      horses,
      selectedHorseId,
      betAmount
    }));
    
    setTimeout(() => {
      const logic = JSON.parse(reveal(obscuredGameLogic));
      
      // Yarış simülasyonu
      const interval = setInterval(() => {
        setHorses(prevHorses => {
          const updatedHorses = [...prevHorses];
          let finishedCount = 0;
          let raceWinner: Horse | undefined;
          
          // Her atın pozisyonunu güncelle
          updatedHorses.forEach(horse => {
            if (!horse.isFinished) {
              // Hız faktörü (atın stiline ve güce göre)
              const styleFactor = getStyleFactor(horse);
              const powerFactor = horse.power / 100;
              const speedFactor = (0.5 + Math.random() * 0.5) * styleFactor * powerFactor;
              
              horse.position += horse.speed * speedFactor;
              
              // At bitiş çizgisine ulaştı mı?
              if (horse.position >= 100) {
                horse.position = 100;
                horse.isFinished = true;
                if (!raceWinner) {
                  raceWinner = horse;
                  setWinner(horse);
                }
              }
            } else {
              finishedCount++;
            }
          });
          
          // Yarış devam eden atlara rastgele hız ver
          updatedHorses
            .filter(horse => !horse.isFinished)
            .forEach(horse => {
              horse.speed = 1 + Math.random() * 3;
            });
          
          // Yarış bitti mi?
          if (finishedCount === updatedHorses.length) {
            clearInterval(interval);
            setRaceStatus('finished');
            
            // Kazanç hesapla
            const selectedHorse = updatedHorses.find(h => h.id === logic.selectedHorseId);
            if (raceWinner && selectedHorse && logic.selectedHorseId === raceWinner.id) {
              const payout = Math.floor(logic.betAmount * raceWinner.odds);
              setPayout(payout);
              onRaceComplete(payout); // Pozitif ödeme kazanç
            } else {
              setPayout(-logic.betAmount);
              onRaceComplete(-logic.betAmount); // Negatif ödeme kayıp
            }
          }
          
          return updatedHorses;
        });
      }, 100);
      
      // Temizlik
      return () => clearInterval(interval);
    }, 500);
  };
  
  // Atın stil faktörünü hesapla
  const getStyleFactor = (horse: Horse) => {
    if (horse.style.includes("Hızlı")) return 1.2;
    if (horse.style.includes("Sondakikacı")) return 1.3;
    if (horse.style.includes("Patlayıcı")) return 1.1;
    if (horse.style.includes("Sabırlı")) return 0.9;
    return 1.0;
  };
  
  // ASCII görselleştirme için at karakteri
  const renderHorseAscii = (horse: Horse, position: number) => {
    const trackLength = 50;
    const pos = Math.floor((position / 100) * trackLength);
    const before = ".".repeat(pos);
    const horseAscii = "🐎";
    const after = ".".repeat(Math.max(0, trackLength - pos - 1));
    
    return (
        <span className={`font-mono text-sm ${horse.color}`}>
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
      {raceStatus === 'betting' && (
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
      )}
      
      {raceStatus === 'betting' && (
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:w-1/2">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</div>
                 <input type="number" value={betAmount || ''} onChange={e => setBetAmount(Number(e.target.value))}
                    placeholder='Bahis Miktarı' disabled={!selectedHorseId}
                    className='w-full bg-gray-800 border border-gray-600 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50'/>
            </div>
           <button onClick={startRace} disabled={!selectedHorseId || betAmount <= 0 || betAmount > userScore}
                className='w-full md:w-1/2 py-3 px-4 flex items-center justify-center gap-2 rounded-lg font-bold text-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed'>
               <span>Yarışı Başlat</span>
           </button>
        </div>
      )}

      {/* Yarış Pisti */}
      {raceStatus !== 'betting' && (
        <div className="mb-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4 font-mono text-sm">
                {horses.map(horse => (
                    <div key={horse.id} className="mb-2 last:mb-0">
                        {renderHorseAscii(horse, horse.position)}
                    </div>
                ))}
            </div>
            
            {/* Bitiş çizgisi */}
            <div className="flex justify-end">
                <div className="h-6 w-1 bg-gradient-to-b from-red-500 to-yellow-500 rounded-full"></div>
            </div>
        </div>
      )}

      {/* Kazanan */}
      {raceStatus === 'finished' && winner && (
        <div className="text-center py-6">
            <h3 className="text-2xl font-bold mb-2">Yarış Bitti!</h3>
            <p className={`text-xl font-bold ${winner.color}`}>{winner.name} Kazandı!</p>
            <p className="mt-2">
                {selectedHorseId === winner.id 
                  ? `Tebrikler! ${payout} puan kazandınız!` 
                  : `Maalesef kaybettiniz: ${Math.abs(payout)} puan`}
            </p>
            <button 
                onClick={generateHorses}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg font-bold hover:opacity-90">
                Yeni Yarış
            </button>
        </div>
      )}

      {/* Oranlar Tablosu */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">At Oranları</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {horses.map(horse => (
                <div key={horse.id} className="bg-gray-800/50 p-3 rounded-lg text-center border border-gray-700">
                    <p className={`font-bold ${horse.color}`}>{horse.name}</p>
                    <p className="text-cyan-400 text-lg">{horse.odds}x</p>
                    <p className="text-xs text-gray-500 mt-1">{horse.style}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HorseRacingGame;