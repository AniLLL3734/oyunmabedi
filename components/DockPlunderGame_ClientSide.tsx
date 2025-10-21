// src/components/DockPlunderGame_ClientSide.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Gem, Skull, Box } from 'lucide-react';

interface Cell {
  isOpen: boolean;
  isOfficer: boolean;
}

interface GameState {
  grid: Cell[];
  isOver: boolean;
  multiplier: number;
  betAmount: number;
}

interface DockPlunderProps {
  userScore: number;
  onGameUpdate: (change: number, message: string) => void;
}

// Bu basit bir "obfuscation" tekniğidir. Kodun okunmasını zorlaştırır.
const obscure = (str: string) => btoa(str); // Base64 encode
const reveal = (str: string) => atob(str); // Base64 decode

const DockPlunderGame: React.FC<DockPlunderProps> = ({ userScore, onGameUpdate }) => {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [officerCount, setOfficerCount] = useState<number>(3);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleStartGame = async () => {
    if (betAmount > userScore || betAmount <= 0) {
      onGameUpdate(0, "Yetersiz bakiye veya geçersiz bahis miktarı!");
      return;
    }
    
    setIsLoading(true);
    
    // Oyun mantığını şifrele
    const obscuredGameLogic = obscure(JSON.stringify({ 
      officerCount,
      gridSize: 25
    }));
    
    setTimeout(() => {
      const logic = JSON.parse(reveal(obscuredGameLogic));
      
      // Güvenli ızgara oluşturma
      const grid: Cell[] = Array(logic.gridSize).fill(null).map(() => ({
        isOpen: false,
        isOfficer: false
      }));
      
      // Gümrük memurlarını yerleştir
      const officerPositions = new Set<number>();
      while (officerPositions.size < logic.officerCount) {
        officerPositions.add(Math.floor(Math.random() * logic.gridSize));
      }
      
      officerPositions.forEach(pos => {
        grid[pos].isOfficer = true;
      });
      
      setGameState({
        grid,
        isOver: false,
        multiplier: 1,
        betAmount
      });
      
      onGameUpdate(-betAmount, `Bahis yapıldı: ${betAmount} puan`);
      setIsLoading(false);
    }, 500);
  };

  const handleRevealCell = async (index: number) => {
    if (isLoading || !gameState || gameState.grid[index].isOpen) return;
    
    setIsLoading(true);
    
    // Oyun durumunu şifrele
    const obscuredState = obscure(JSON.stringify(gameState));
    
    setTimeout(() => {
      const currentState = JSON.parse(reveal(obscuredState)) as GameState;
      const newGrid = [...currentState.grid];
      
      // Hücreyi aç
      newGrid[index].isOpen = true;
      
      // Hücrede gümrük memuru varsa oyun biter
      if (newGrid[index].isOfficer) {
        setGameState({
          ...currentState,
          grid: newGrid,
          isOver: true
        });
        onGameUpdate(0, `Gümrük memuruna yakalandın! ${currentState.betAmount} puan kaybettin.`);
        setIsLoading(false);
        return;
      }
      
      // Kazanç çarpanını güncelle
      const revealedCount = newGrid.filter(cell => cell.isOpen && !cell.isOfficer).length;
      const newMultiplier = 1 + (revealedCount * 0.2);
      
      setGameState({
        ...currentState,
        grid: newGrid,
        multiplier: newMultiplier
      });
      
      setIsLoading(false);
    }, 300);
  };

  const handleCashOut = async () => {
     if (isLoading || !gameState) return;
     setIsLoading(true);
     
     // Oyun durumunu şifrele
     const obscuredState = obscure(JSON.stringify(gameState));
     
     setTimeout(() => {
       const currentState = JSON.parse(reveal(obscuredState)) as GameState;
       const payout = Math.floor(currentState.betAmount * currentState.multiplier);
       
       onGameUpdate(payout, `Ganimet toplandı! Kazanç: ${payout} puan`);
       setGameState(null); // Oyunu sıfırla
       setIsLoading(false);
     }, 300);
  };

  const canCashOut = gameState && gameState.multiplier > 1;

  if (gameState) {
    return (
        <div className='p-6 bg-gray-800 rounded-lg'>
            <div className='grid grid-cols-5 gap-2 md:gap-4'>
                {gameState.grid.map((cell, index) => (
                    <motion.div key={index}
                        whileHover={{ scale: cell.isOpen ? 1 : 1.05 }}
                        onClick={() => !gameState.isOver && handleRevealCell(index)}
                        className={`aspect-square rounded-md flex items-center justify-center cursor-pointer transition-all
                        ${cell.isOpen ? (cell.isOfficer ? 'bg-red-500/80' : 'bg-green-500/70') : 'bg-yellow-800/60 hover:bg-yellow-700/80'}
                        ${gameState.isOver && !cell.isOpen ? 'opacity-50' : ''}`}
                    >
                        {cell.isOpen && (cell.isOfficer ? <Skull size={32} /> : <Gem size={32} />)}
                        {!cell.isOpen && <Box size={32} className='opacity-60' />}
                    </motion.div>
                ))}
            </div>
             <div className="mt-6 p-4 bg-gray-900/50 rounded-lg text-center">
                {gameState.isOver ? (
                     <>
                        <p className="text-2xl font-bold text-red-500">YAKALANDIN!</p>
                        <button onClick={() => setGameState(null)} className="mt-4 px-6 py-2 bg-cyan-600 rounded-lg font-bold">Yeni Oyun</button>
                    </>
                ) : (
                    <>
                         <p className="text-gray-300">Sıradaki Kazanç</p>
                         <p className="text-3xl font-bold text-yellow-400">
                             x{gameState.multiplier.toFixed(2)}
                         </p>
                         <button onClick={handleCashOut} disabled={!canCashOut || isLoading}
                           className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold disabled:bg-gray-600 disabled:cursor-not-allowed">
                             Ganimeti Topla ({ Math.floor(betAmount * gameState.multiplier) } Puan)
                         </button>
                    </>
                )}
             </div>
        </div>
    )
  }

  return (
    <div className='p-6 bg-gray-800 rounded-lg space-y-4'>
        <div>
            <label className='block text-gray-400 mb-2'>Bahis Miktarı</label>
            <input type="number" value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value, 10) || 0)} 
                className='w-full bg-gray-900 p-3 rounded-lg border border-gray-700'/>
        </div>
        <div>
            <label className='block text-gray-400 mb-2'>Zorluk (Gümrük Memuru Sayısı)</label>
            <div className='flex gap-2'>
                 {[1, 3, 5, 10].map(count => (
                     <button key={count} onClick={() => setOfficerCount(count)}
                       className={`flex-1 p-3 rounded-lg font-bold border-2 ${officerCount === count ? 'bg-purple-600 border-purple-400' : 'bg-gray-700 border-gray-600'}`}>
                       <ShieldAlert className="inline-block mr-2" size={16}/> {count}
                     </button>
                 ))}
            </div>
        </div>
        <button onClick={handleStartGame} disabled={isLoading} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-lg">
           Talanı Başlat
        </button>
    </div>
  );
};

export default DockPlunderGame;