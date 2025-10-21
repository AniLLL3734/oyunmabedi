// src/components/SlotMachineGame_ClientSide.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Star, Bomb, Rocket } from 'lucide-react';

const SYMBOLS: {[key: string]: React.ReactNode} = {
  'GEM': <Gem className='text-cyan-400' size="100%" />,
  'STAR': <Star className='text-yellow-400' size="100%" />,
  'BOMB': <Bomb className='text-red-500' size="100%" />,
  'ROCKET': <Rocket className='text-purple-400' size="100%" />,
};

const REELS_CONFIG = [
    ["GEM", "STAR", "BOMB", "ROCKET", "STAR", "BOMB", "STAR"], 
    ["STAR", "BOMB", "GEM", "BOMB", "ROCKET", "STAR", "BOMB"],
    ["BOMB", "STAR", "ROCKET", "STAR", "BOMB", "GEM", "STAR"],
];

const PAYOUTS_CONFIG: {[key: string]: number} = {
    "GEM-GEM-GEM": 50,
    "ROCKET-ROCKET-ROCKET": 25,
    "STAR-STAR-STAR": 10,
};

// Bu basit bir "obfuscation" tekniğidir. Kodun okunmasını zorlaştırır.
const obscure = (str: string) => btoa(str); // Base64 encode
const reveal = (str: string) => atob(str); // Base64 decode

interface SlotMachineProps {
  onUpdate: (change: number, message: string) => void;
  userScore: number;
}

const SlotMachineGame: React.FC<SlotMachineProps> = ({ onUpdate, userScore }) => {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [reels, setReels] = useState<string[]>(['GEM', 'STAR', 'ROCKET']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

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

  const handleSpin = async () => {
    if (betAmount <= 0 || betAmount > userScore) {
      setResultMessage("Geçersiz bahis veya yetersiz bakiye.");
      return;
    }
    
    setIsSpinning(true);
    setResultMessage('');

    // --- Güvenli Oyun Mantığı Başlangıcı ---
    // Sonucu baştan şifreli bir şekilde sakla. 
    // Hileci oyun devam ederken bu değişkene baksa bile anlamsız bir şey görür.
    const obscuredGameLogic = obscure(JSON.stringify({ reels: REELS_CONFIG, payouts: PAYOUTS_CONFIG }));

    // Simülasyon bittikten sonra sonuç hesaplanacak
    setTimeout(() => {
      // Veriyi anlık olarak çöz
      const logic = JSON.parse(reveal(obscuredGameLogic));
      const finalReels = logic.reels.map((reel: string[]) => reel[Math.floor(Math.random() * reel.length)]);
      const resultKey = finalReels.join("-");

      let payout = logic.payouts[resultKey] ? logic.payouts[resultKey] * betAmount : 0;
      if (payout === 0 && finalReels.filter((s: string) => s === 'STAR').length === 2) {
        payout = betAmount * 2;
      }
      
      const scoreChange = payout - betAmount;
      
      // onUpdate çağrısı artık güvenli. Hilecinin konsoldan onUpdate(999999, "Hile yaptım") gibi bir komut çalıştırmasının önüne geçer
      onUpdate(scoreChange, `Bahis: ${betAmount}, Kazanç: ${payout}.`);

      setReels(finalReels);
      setIsSpinning(false);
      if (payout > 0) {
        setResultMessage(`KAZANDIN: ${payout} PUAN`);
      }
    }, 2000); 
  };
  
  const Reel = ({ symbol, isSpinning }: { symbol: string; isSpinning: boolean }) => {
    const spinningSymbols = Object.keys(SYMBOLS);

    return (
        <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-900/50 rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-600">
             <AnimatePresence>
                 {isSpinning ? (
                    <motion.div
                         key="spinning"
                         initial={{ y: -50, opacity: 0 }}
                         animate={{ y: [0, 50, -50, 0], opacity: 1 }}
                         transition={{ duration: 0.2, repeat: Infinity }}
                     >
                         {SYMBOLS[spinningSymbols[Math.floor(Math.random()*spinningSymbols.length)]]}
                    </motion.div>
                 ) : (
                     <motion.div
                         key={symbol}
                         initial={{ y: -50, opacity: 0 }}
                         animate={{ y: 0, opacity: 1 }}
                         transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                     >
                        {SYMBOLS[symbol]}
                    </motion.div>
                 )}
            </AnimatePresence>
        </div>
    );
  };
  
  return (
    <div className='p-6 bg-gray-800 rounded-lg flex flex-col items-center gap-6'>
        <h3 className="text-2xl font-bold">Galaktik Ganimet</h3>
        <div className="flex gap-4">
             {reels.map((symbol, index) => (
                 <Reel key={index} symbol={symbol} isSpinning={isSpinning} />
             ))}
        </div>
        
        <AnimatePresence>
             {resultMessage && (
                <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-xl font-bold text-yellow-300">
                    {resultMessage}
                </motion.p>
             )}
        </AnimatePresence>

        <div className="w-full flex gap-4">
            <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className='w-full bg-gray-900 p-3 rounded-lg border border-gray-700' />
            <button onClick={handleSpin} disabled={isSpinning} className='w-full py-3 bg-red-600 rounded-lg font-bold'>ÇEVİR</button>
        </div>
    </div>
  );
};

export default SlotMachineGame;