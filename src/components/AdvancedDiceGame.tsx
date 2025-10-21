// src/components/AdvancedDiceGame.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, ShieldCheck, ShieldX, CheckCircle, XCircle } from 'lucide-react';
import { nanoid } from 'nanoid'; // ID üretmek için: npm install nanoid

// --- ANTI-CHEAT MODÜLÜ BAŞLANGICI ---

// Katman 1: Sahte Değişkenler ve Tuzaklar (Honeypots)
// Bu objeler hilecinin dikkatini dağıtmak ve onları tuzağa düşürmek için var.
// ASLA AMA ASLA oyunun gerçek mantığında kullanılmazlar.
const fakeGlobals = {
    _GAME_STATE: { score: 1000, username: "Player123", isPremium: false },
    _CONFIG: { gameVersion: "1.0.0", debugMode: false },
    addScore: (amount: number) => { 
        console.warn("CHEAT ATTEMPT DETECTED: Direct score manipulation.");
        (window as any)._CHEATER_FLAG = true; 
    },
};
Object.assign(window, { ...fakeGlobals });

// Katman 2: Güvenli ve İzole Mantık
const createSecureGameEngine = () => {
    // Bu değerler, sadece bu fonksiyonun içinde yaşar ve dışarıdan doğrudan erişilemez.
    const SECRET_SEED = nanoid(32); // Her oyun oturumu için eşsiz bir "tohum".
    let integrityToken = '';

    // Değişkenlerin bütünlüğünü kontrol etmek için hash oluşturma (basit versiyon)
    const generateIntegrityToken = (...args: any[]) => {
        const dataString = args.join('|') + '|' + SECRET_SEED;
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; 
        }
        return btoa(String(hash)); // Okunmaz hale getir.
    };

    return {
        // Zar atma ve kazanç hesaplama mantığı burada, izole bir alanda çalışır.
        rollAndCalculate: (betAmount: number, guess: number, currentScore: number) => {
            // Güvenlik kontrolü: Bet amount'un değiştirilip değiştirilmediğini kontrol et
            if (integrityToken !== generateIntegrityToken(betAmount, guess, currentScore)) {
                console.error("INTEGRITY CHECK FAILED: Game state has been tampered with.");
                return { result: "lose", outcome: -1, winnings: -betAmount, tampered: true };
            }

            const roll = Math.floor(Math.random() * 6) + 1;
            const didWin = roll === guess;
            const winnings = didWin ? betAmount * 5.5 : -betAmount;

            return { result: didWin ? "win" : "lose", outcome: roll, winnings, tampered: false };
        },
        // Her bahis öncesi, değişkenlerin anlık durumuna göre bir token üretir.
        setIntegrityToken: (betAmount: number, guess: number, currentScore: number) => {
            integrityToken = generateIntegrityToken(betAmount, guess, currentScore);
        },
    };
};
// --- ANTI-CHEAT MODÜLÜ BİTİŞİ ---

interface DiceGameProps {
    userScore: number;
    onGameUpdate: (change: number, message: string) => void;
}

const AdvancedDiceGame: React.FC<DiceGameProps> = ({ userScore, onGameUpdate }) => {
    // useRef: Yeniden render'larda sıfırlanmayan ama state gibi çalışmayan referanslar için ideal.
    const gameEngine = useRef(createSecureGameEngine()).current;
    const cheaterFlag = useRef(false);

    const [betAmount, setBetAmount] = useState<number>(10);
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastResult, setLastResult] = useState<{ outcome: number; didWin: boolean } | null>(null);
    const [diceFace, setDiceFace] = useState<number>(1);
    
    // Katman 3: Sürekli Gözetim
    useEffect(() => {
        // F12, sağ tık vb. engelleme
        const handleContextmenu = (e: MouseEvent) => e.preventDefault();
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
                e.preventDefault();
            }
        };
        document.addEventListener('contextmenu', handleContextmenu);
        document.addEventListener('keydown', handleKeydown);

        // Anti-debugging & Fonksiyon bütünlüğü kontrolü
        let lastCheck = Date.now();
        const intervalId = setInterval(() => {
            // Anti-debugger
            // eslint-disable-next-line no-debugger
            debugger;

            // Zaman atlaması kontrolü (hileciler setTimeout'u hızlandırabilir)
            if(Date.now() - lastCheck < 900) { 
                console.error("CHEAT DETECTED: Timer manipulation.");
                cheaterFlag.current = true;
            }
            lastCheck = Date.now();

            // Tuzağa düştü mü kontrolü
            if ((window as any)._CHEATER_FLAG) {
                cheaterFlag.current = true;
            }
        }, 1000);
        
        return () => {
            document.removeEventListener('contextmenu', handleContextmenu);
            document.removeEventListener('keydown', handleKeydown);
            clearInterval(intervalId);
        };
    }, []);


    const handleBet = () => {
        if (!selectedNumber || isLoading || betAmount <= 0 || betAmount > userScore) return;
        
        // Hile tespiti durumunda, oyuncu hep kaybeder ama bunu çaktırmayız.
        if (cheaterFlag.current) {
            onGameUpdate(-betAmount, "Hile denemesi algılandı, bu bahis geçersiz sayıldı.");
            return;
        }

        setIsLoading(true);
        setLastResult(null);

        // Zar animasyonunu başlat
        const spinInterval = setInterval(() => {
            setDiceFace(Math.floor(Math.random() * 6) + 1);
        }, 80);
        
        // KRİTİK GÜVENLİK ADIMI
        // Bahis yapmadan HEMEN ÖNCE, o anki oyun durumunun bir "parmak izini" al.
        gameEngine.setIntegrityToken(betAmount, selectedNumber, userScore);

        setTimeout(() => {
            clearInterval(spinInterval);
            
            // Sonucu GÜVENLİ ve İZOLE alanda hesapla.
            const result = gameEngine.rollAndCalculate(betAmount, selectedNumber, userScore);
            
            // Eğer "parmak izi" eşleşmezse, oyuncu değişkenleri değiştirmiş demektir.
            if(result.tampered) {
                 onGameUpdate(-betAmount, "Oyun durumu hatası. Bahis iade edilmedi.");
                 setLastResult({ outcome: -1, didWin: false });
            } else {
                 onGameUpdate(result.winnings, `Zar: ${result.outcome}. Sonuç: ${result.winnings > 0 ? '+' : ''}${result.winnings}`);
                 setLastResult({ outcome: result.outcome, didWin: result.result === "win" });
            }
            
            setDiceFace(result.outcome);
            setIsLoading(false);
        }, 2000); // 2 saniyelik bekleme
    };

    // memo kullanarak gereksiz render'ları önle
    const diceDisplay = useMemo(() => (
        <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center text-7xl font-bold text-gray-800 shadow-lg">
            {diceFace}
        </div>
    ), [diceFace]);

    return (
        <div className='p-6 bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-700 w-full max-w-md mx-auto'>
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><Dices/> Şans Zarı</h3>
                {cheaterFlag.current 
                    ? <p className='text-red-500 font-bold mt-1 flex items-center justify-center gap-1'><ShieldX size={16}/> Güvenlik İhlali Algılandı</p>
                    : <p className='text-green-400 mt-1 flex items-center justify-center gap-1'><ShieldCheck size={16}/> Sistem Güvenli</p>
                }
            </div>

            <div className='flex justify-center items-center mb-6'>
                {diceDisplay}
            </div>
            
            <AnimatePresence>
                {lastResult && (
                    <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="text-center mb-4 p-3 rounded-lg flex items-center justify-center gap-2"
                        style={{backgroundColor: lastResult.didWin ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}}>
                        {lastResult.didWin 
                           ? <CheckCircle className="text-green-400"/> 
                           : <XCircle className="text-red-500"/>
                        }
                        <span className={`font-bold ${lastResult.didWin ? 'text-green-400' : 'text-red-500'}`}>
                             {lastResult.outcome === -1 ? "Hile Algılandı!" : `Zar ${lastResult.outcome} geldi. ${lastResult.didWin ? 'Kazandın!' : 'Kaybettin.'}`}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="mb-4">
                <p className="text-center text-gray-400 mb-2">Tahminin (1-6)</p>
                <div className="grid grid-cols-6 gap-2">
                    {[1,2,3,4,5,6].map(num => (
                        <button key={num} onClick={() => setSelectedNumber(num)}
                            className={`p-3 rounded-lg font-bold border-2 transition ${selectedNumber === num ? 'bg-cyan-600 border-cyan-400' : 'bg-gray-800 border-gray-600'}`}>
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-4 items-center">
                <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className='w-full bg-gray-800 p-3 rounded-lg border border-gray-600' />
                <button onClick={handleBet} disabled={isLoading || !selectedNumber} className='w-full py-3 bg-purple-600 rounded-lg font-bold text-lg disabled:bg-gray-700 disabled:cursor-not-allowed'>
                    Zarı At
                </button>
            </div>
        </div>
    );
};

export default AdvancedDiceGame;