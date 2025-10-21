// src/components/SlotMachineGame.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../src/firebase';
import { Gem, Star, Bomb, Rocket } from 'lucide-react';

const functions = getFunctions(app);
const playSlots = httpsCallable(functions, 'playSlots');

const SYMBOLS: {[key: string]: React.ReactNode} = {
  'GEM': <Gem className='text-cyan-400' size="100%" />,
  'STAR': <Star className='text-yellow-400' size="100%" />,
  'BOMB': <Bomb className='text-red-500' size="100%" />,
  'ROCKET': <Rocket className='text-purple-400' size="100%" />,
};

interface SlotMachineProps {
  onUpdate: (change: number, message: string) => void;
}

const SlotMachineGame: React.FC<SlotMachineProps> = ({ onUpdate }) => {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [reels, setReels] = useState<string[]>(['GEM', 'STAR', 'ROCKET']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const handleSpin = async () => {
    setIsSpinning(true);
    setResultMessage('');
    try {
        onUpdate(-betAmount, `Slot çevrildi: ${betAmount}`);
        const result = await playSlots({ betAmount });
        // @ts-ignore
        const { finalReels, payout } = result.data;
        
        // Sunucudan sonuç geldikten sonra animasyonu bitirip sonucu göster
        setTimeout(() => {
            setReels(finalReels);
            setIsSpinning(false);
            if (payout > 0) {
                onUpdate(payout, `Slot kazandırdı!`);
                setResultMessage(`KAZANDIN: ${payout} PUAN`);
            }
        }, 2000); // 2 saniyelik görsel spin efekti
    } catch (error: any) {
        setIsSpinning(false);
        onUpdate(betAmount, "Hata oluştu, bahis iade edildi."); // İade mantığı
        setResultMessage(error.message);
    }
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