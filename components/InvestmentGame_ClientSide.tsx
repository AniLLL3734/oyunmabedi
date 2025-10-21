// src/components/InvestmentGame_ClientSide.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ArrowUpRight, ArrowDownRight, Clock, Activity } from 'lucide-react';

// FİKTİF ŞİRKETLER
const companies = [
  { ticker: 'NVA', name: 'Nova Dynamics', volatility: 'Orta', logoColor: 'text-cyan-400' },
  { ticker: 'CYB', name: 'CyberCore Inc.', volatility: 'Yüksek', logoColor: 'text-purple-400' },
  { ticker: 'SOL', name: 'Solara Enerji', volatility: 'Düşük', logoColor: 'text-yellow-400' },
  { ticker: 'QNT', name: 'Quantum Leap', volatility: 'Çok Yüksek', logoColor: 'text-red-400' },
];

interface Investment {
    id: string;
    companyTicker: string;
    investedAmount: number;
    purchasePrice: number;
    finalPrice?: number;
    status: 'active' | 'resolved';
    resolveTime: number; // timestamp
    payout?: number;
}

interface InvestmentGameProps {
    userScore: number;
    onUpdate: (change: number, message: string) => void;
}

// Bu basit bir "obfuscation" tekniğidir. Kodun okunmasını zorlaştırır.
const obscure = (str: string) => btoa(str); // Base64 encode
const reveal = (str: string) => atob(str); // Base64 decode

const InvestmentGame: React.FC<InvestmentGameProps> = ({ userScore, onUpdate }) => {
  const [investAmount, setInvestAmount] = useState<number>(100);
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeInvestments, setActiveInvestments] = useState<Investment[]>([]);
  const [time, setTime] = useState(Date.now());

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

    // Zamanlayıcı
    const timeInterval = setInterval(() => setTime(Date.now()), 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextmenu);
      document.removeEventListener('keydown', handleKeydown);
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  // Yatırım yap
  const handleInvest = async () => {
    if (investAmount > userScore || investAmount <= 0) {
      onUpdate(0, "Yetersiz bakiye veya geçersiz yatırım miktarı!");
      return;
    }
    
    setIsLoading(true);
    
    // Oyun mantığını şifrele
    const obscuredGameLogic = obscure(JSON.stringify({ 
      companies,
      selectedCompany,
      investAmount
    }));
    
    setTimeout(() => {
      const logic = JSON.parse(reveal(obscuredGameLogic));
      
      // Yatırım oluştur
      const newInvestment: Investment = {
        id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        companyTicker: logic.selectedCompany.ticker,
        investedAmount: logic.investAmount,
        purchasePrice: 100, // Başlangıç fiyatı
        status: 'active',
        resolveTime: Date.now() + 30000 // 30 saniye sonra çözülebilir
      };
      
      setActiveInvestments(prev => [...prev, newInvestment]);
      onUpdate(-logic.investAmount, `${logic.selectedCompany.ticker} için yatırım yapıldı.`);
      setInvestAmount(100);
      setIsLoading(false);
    }, 500);
  };
  
  // Yatırımı sonuçlandır
  const handleResolve = async (investmentId: string) => {
    setIsLoading(true);
    
    // Yatırım verisini şifrele
    const obscuredInvestments = obscure(JSON.stringify(activeInvestments));
    
    setTimeout(() => {
      const investments = JSON.parse(reveal(obscuredInvestments)) as Investment[];
      const investment = investments.find(inv => inv.id === investmentId);
      
      if (!investment) {
        onUpdate(0, "Yatırım bulunamadı!");
        setIsLoading(false);
        return;
      }
      
      // Fiyat değişimi hesapla (volatiliteye göre)
      const company = companies.find(c => c.ticker === investment.companyTicker);
      let volatilityFactor = 1;
      
      if (company) {
        switch (company.volatility) {
          case 'Düşük': volatilityFactor = 0.5; break;
          case 'Orta': volatilityFactor = 1; break;
          case 'Yüksek': volatilityFactor = 1.5; break;
          case 'Çok Yüksek': volatilityFactor = 2; break;
        }
      }
      
      // Rastgele fiyat değişimi (-%30 ile +%30 arası)
      const priceChange = 1 + (Math.random() * 0.6 - 0.3) * volatilityFactor;
      const finalPrice = investment.purchasePrice * priceChange;
      const payout = Math.floor(investment.investedAmount * (finalPrice / investment.purchasePrice));
      const profit = payout - investment.investedAmount;
      
      const message = profit > 0 ? 
        `Yatırım kârla sonuçlandı: +${profit}` : 
        `Yatırım zararla sonuçlandı: ${profit}`;
      
      onUpdate(payout, message);
      
      // Yatırımı kaldır
      setActiveInvestments(prev => prev.filter(inv => inv.id !== investmentId));
      setIsLoading(false);
    }, 500);
  };

  const getTimeLeft = (resolveTime: number) => {
      const secondsLeft = Math.floor((resolveTime - time) / 1000);
      if(secondsLeft <= 0) return "Hazır!";
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  return (
    <div className='space-y-6'>
        {/* Yatırım Yapma Paneli */}
        <div className='p-6 bg-gray-800 rounded-lg'>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Briefcase/> Yeni Yatırım Yap</h3>
            <div className="flex gap-2 mb-4">
                 {companies.map(c => (
                     <button key={c.ticker} onClick={() => setSelectedCompany(c)}
                         className={`flex-1 p-2 rounded-lg border-2 transition ${selectedCompany.ticker === c.ticker ? 'border-cyan-400 bg-cyan-900/50' : 'border-gray-700 bg-gray-800'}`}>
                         <span className={`${c.logoColor} font-bold`}>{c.ticker}</span>
                     </button>
                 ))}
            </div>
            <div className="flex gap-4">
                <input type="number" value={investAmount} onChange={(e) => setInvestAmount(Number(e.target.value))} className='w-full bg-gray-900 p-3 rounded-lg border border-gray-700' />
                <button onClick={handleInvest} disabled={isLoading} className='w-full py-3 bg-cyan-600 rounded-lg font-bold'>Yatırım Yap</button>
            </div>
        </div>

        {/* Aktif Yatırımlar */}
        {activeInvestments.length > 0 &&
         <div className='p-6 bg-gray-800 rounded-lg'>
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity/> Aktif Pozisyonlar</h3>
             <div className="space-y-3">
                 {activeInvestments.map(inv => {
                     const isReady = inv.resolveTime <= time;
                     return(
                         <div key={inv.id} className="p-3 bg-gray-900/50 rounded-lg flex justify-between items-center">
                            <div>
                               <p className='font-bold'>{inv.companyTicker} <span className='text-gray-400 text-sm'>- {inv.investedAmount} Puan</span></p>
                               <p className='text-xs text-gray-500 flex items-center gap-1'><Clock size={12}/> Vade: {getTimeLeft(inv.resolveTime)}</p>
                            </div>
                            <button onClick={() => handleResolve(inv.id)} disabled={!isReady || isLoading} className="px-4 py-2 bg-purple-600 rounded-lg font-bold disabled:bg-gray-600">
                                Sonuçlandır
                            </button>
                         </div>
                     )
                 })}
             </div>
        </div>}
    </div>
  )
};

export default InvestmentGame;