// src/components/CoinFlipAnimation_ClientSide.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CoinFlipAnimationProps {
  userChoice: 'yazi' | 'tura' | null;
  betAmount: number;
  userScore: number;
  onAnimationComplete: (result: 'won' | 'lost', payout: number) => void;
}

// Bu basit bir "obfuscation" tekniğidir. Kodun okunmasını zorlaştırır.
const obscure = (str: string) => btoa(str); // Base64 encode
const reveal = (str: string) => atob(str); // Base64 decode

const CoinFlipAnimation: React.FC<CoinFlipAnimationProps> = ({ 
  userChoice, 
  betAmount, 
  userScore,
  onAnimationComplete 
}) => {
  const [isFlipping, setIsFlipping] = useState(true);
  const [result, setResult] = useState<'yazi' | 'tura' | null>(null);

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

  useEffect(() => {
    if (userChoice) {
      // Oyun mantığını şifrele
      const obscuredGameLogic = obscure(JSON.stringify({ 
        userChoice,
        betAmount,
        userScore
      }));
      
      // Start the flip animation
      setIsFlipping(true);
      
      // After animation duration, show the result
      const flipTimer = setTimeout(() => {
        // Sonucu güvenli bir şekilde hesapla
        const logic = JSON.parse(reveal(obscuredGameLogic));
        const flipResult = Math.random() > 0.5 ? 'yazi' : 'tura';
        setResult(flipResult);
        setIsFlipping(false);
        
        // Kazanç hesapla
        const won = logic.userChoice === flipResult;
        const payout = won ? logic.betAmount : -logic.betAmount;
        
        // Auto close after 3 seconds from showing result
        const autoCloseTimer = setTimeout(() => {
          onAnimationComplete(won ? 'won' : 'lost', payout);
        }, 3000); // 3 seconds to show result

        return () => clearTimeout(autoCloseTimer);
      }, 2000);

      return () => clearTimeout(flipTimer);
    }
  }, [userChoice, betAmount, userScore, onAnimationComplete]);

  if (!userChoice) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative">
        <motion.div
          className="w-48 h-48"
          animate={{
            rotateY: isFlipping ? [0, 360 * 5] : result === 'yazi' ? 0 : 180,
          }}
          transition={{
            duration: isFlipping ? 2 : 0.5,
            ease: "easeOut"
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <div className="text-4xl font-bold text-yellow-900">
              {result === 'yazi' ? 'Y' : 'T'}
            </div>
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-600 to-yellow-800 flex items-center justify-center shadow-lg rotate-y-180">
            <div className="text-4xl font-bold text-yellow-900">
              {result === 'yazi' ? 'T' : 'Y'}
            </div>
          </div>
        </motion.div>
        
        {!isFlipping && result && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              {result === 'yazi' ? 'Yazı!' : 'Tura!'}
            </h3>
            <p className="text-gray-300">
              {userChoice === result ? 
                `Kazandınız! +${betAmount} puan` : 
                `Kaybettiniz! -${betAmount} puan`}
            </p>
            <p className="text-gray-300 mt-2">3 saniye içinde kapanacak...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CoinFlipAnimation;