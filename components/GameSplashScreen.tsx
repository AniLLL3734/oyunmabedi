import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, LoaderCircle, Zap, Cpu, Wifi } from 'lucide-react';

interface GameSplashScreenProps {
  gameTitle: string;
  gameThumbnail: string;
  loadingProgress: number;
  isVisible: boolean;
  onComplete?: () => void;
  // YENİ PROP: Oyunun tipini bilmesi, nasıl davranacağını belirlemesi için gerekli.
  gameType: 'SWF' | 'HTML5' | string; 
}

const loadingSteps = [
  { icon: Wifi, text: "Sinyal alınıyor...", threshold: 0 },
  { icon: Cpu, text: "Oyun motoru başlatılıyor...", threshold: 25 },
  { icon: Gamepad2, text: "Kontroller yükleniyor...", threshold: 60 },
  { icon: Zap, text: "Simülasyon hazırlanıyor...", threshold: 90 },
];

const GameSplashScreen: React.FC<GameSplashScreenProps> = ({
  gameTitle,
  gameThumbnail,
  loadingProgress,
  isVisible,
  onComplete,
  gameType
}) => {
  // DEĞİŞİKLİK: Sahte (simüle edilmiş) progress için kendi state'ini tutacak.
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  // Gösterilecek olan progress, oyun tipine göre belirlenecek.
  // HTML5 ise dışarıdan gelen GERÇEK progress, SWF ise içerideki SAHTE progress.
  const displayProgress = gameType === 'SWF' ? simulatedProgress : loadingProgress;

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | undefined;
    
    // Eğer oyun SWF ise ve ekran görünürse, sahte progress'i başlat.
    if (isVisible && gameType === 'SWF') {
      // Yavaş yavaş %100'e giden bir animasyon yap.
      progressInterval = setInterval(() => {
        setSimulatedProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          // Yavaş başlayıp sona doğru hızlanan bir artış
          return prev + Math.max(1, (100 - prev) / 10);
        });
      }, 150);
    }
    
    // Yükleme %100'e ulaştığında tamamla.
    if (displayProgress >= 100) {
      const timer = setTimeout(() => {
          onComplete?.();
      }, 400); // 0.4 saniye sonra tamamla
      
      return () => {
          clearTimeout(timer);
          if (progressInterval) clearInterval(progressInterval);
      };
    }

    return () => {
        if (progressInterval) clearInterval(progressInterval);
    };

  }, [isVisible, gameType, displayProgress, onComplete]);


  const currentStepIndex = useMemo(() => {
    let activeStep = 0;
    for (let i = loadingSteps.length - 1; i >= 0; i--) {
      if (displayProgress >= loadingSteps[i].threshold) {
        activeStep = i;
        break;
      }
    }
    return activeStep;
  }, [displayProgress]);

  if (!isVisible) return null;

  const currentStepData = loadingSteps[currentStepIndex];
  const IconComponent = currentStepData?.icon || LoaderCircle;

  return (
    <AnimatePresence>
        {/* Component'in JSX kısmı tamamen aynı kalabilir, değişiklik yok. */}
      <motion.div
        className="fixed inset-0 bg-space-black flex flex-col justify-center items-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-electric-purple/10 via-transparent to-cyber-blue/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-purple/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyber-blue/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
          <motion.div className="mb-8" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
             <div className="relative w-48 h-32 mx-auto rounded-lg overflow-hidden border-2 border-electric-purple/30 shadow-2xl">
              <img src={gameThumbnail} alt={gameTitle} className="w-full h-full object-cover" loading="eager"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2"><h2 className="text-white font-bold text-lg truncate">{gameTitle}</h2></div>
            </div>
          </motion.div>
          <motion.div className="mb-8" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }}>
            <h1 className="text-3xl md:text-4xl font-heading font-black text-electric-purple tracking-widest">TTMTAL</h1>
            <h2 className="text-xl md:text-2xl font-heading font-bold text-ghost-white">GAMES</h2>
          </motion.div>
          <motion.div className="mb-8" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }}>
            <AnimatePresence mode="wait">
              <motion.div key={currentStepIndex} className="flex items-center justify-center gap-4 mb-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  <IconComponent size={32} className="text-electric-purple" />
                  <span className="text-ghost-white text-lg font-medium">{currentStepData.text}</span>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-between text-sm text-cyber-gray mt-4">
              <span>Adım {currentStepIndex + 1} / {loadingSteps.length}</span>
              <span>{Math.floor(displayProgress)}%</span>
            </div>
          </motion.div>
          <motion.div className="w-full max-w-md mx-auto" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }}>
            <div className="w-full bg-cyber-gray/30 rounded-full h-3 mb-2">
              <motion.div className="bg-gradient-to-r from-electric-purple via-cyber-blue to-electric-purple h-3 rounded-full relative overflow-hidden" initial={{ width: '0%' }} animate={{ width: `${displayProgress}%` }} transition={{ duration: 0.2, ease: "linear" }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </motion.div>
            </div>
            <div className="text-center text-cyber-gray text-sm">Simülasyon yükleniyor...</div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameSplashScreen;