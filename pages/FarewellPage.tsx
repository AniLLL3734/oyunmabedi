// DOSYA: pages/FarewellPage.tsx - GELİŞTİRİLMİŞ VEDA SAHNESİ

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RadioTower, 
  Users, 
  Gamepad2, 
  MessageSquare, 
  Trophy, 
  Star,
  Heart,
  Zap,
  Sparkles,
  ChevronDown,
  Play,
  Pause,
  Loader2,
  Crown
} from 'lucide-react';
import { usePlatformStats } from '../hooks/usePlatformStats';

// Matrix Rain Effect Component
const MatrixRain: React.FC = () => {
  const [drops, setDrops] = useState<Array<{ id: number; x: number; speed: number; length: number }>>([]);

  useEffect(() => {
    const newDrops = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      speed: Math.random() * 3 + 1,
      length: Math.random() * 20 + 5
    }));
    setDrops(newDrops);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute text-green-400 text-xs font-mono opacity-30"
          style={{ left: `${drop.x}%` }}
          animate={{
            y: [0, window.innerHeight + 100],
            opacity: [0, 0.3, 0]
          }}
          transition={{
            duration: drop.speed,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
        >
          {Array.from({ length: drop.length }, (_, i) => (
            <div key={i} className="h-4">
              {String.fromCharCode(0x30A0 + Math.random() * 96)}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

// Floating Particles Component
const FloatingParticles: React.FC = () => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; color: string }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      color: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'][Math.floor(Math.random() * 4)]
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, Math.random() * 10 - 5, 0],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
        />
      ))}
    </div>
  );
};

// Statistics Component
const PlatformStats: React.FC = () => {
  const platformStats = usePlatformStats();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const stats = [
    { 
      icon: Users, 
      label: "Aktif Kullanıcı", 
      value: platformStats.loading ? "..." : formatNumber(platformStats.totalUsers), 
      color: "text-blue-400",
      loading: platformStats.loading
    },
    { 
      icon: Gamepad2, 
      label: "Oynanan Oyun", 
      value: platformStats.loading ? "..." : formatNumber(platformStats.totalGames), 
      color: "text-green-400",
      loading: platformStats.loading
    },
    { 
      icon: MessageSquare, 
      label: "Gönderilen Mesaj", 
      value: platformStats.loading ? "..." : formatNumber(platformStats.totalMessages), 
      color: "text-purple-400",
      loading: platformStats.loading
    },
    { 
      icon: Trophy, 
      label: "Kazanılan Başarı", 
      value: platformStats.loading ? "..." : formatNumber(platformStats.totalAchievements), 
      color: "text-yellow-400",
      loading: platformStats.loading
    },
    { 
      icon: Star, 
      label: "Toplam Skor", 
      value: platformStats.loading ? "..." : formatNumber(platformStats.totalScore), 
      color: "text-pink-400",
      loading: platformStats.loading
    },
    { 
      icon: Heart, 
      label: "Mutlu Anı", 
      value: platformStats.happyMemories, 
      color: "text-red-400",
      loading: false
    }
  ];

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 gap-6 my-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 2 }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          className="bg-black/30 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4 text-center"
          whileHover={{ scale: 1.05, borderColor: "rgba(6, 182, 212, 0.5)" }}
          transition={{ duration: 0.2 }}
        >
          <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
          <div className="text-2xl font-bold text-white flex items-center justify-center">
            {stat.loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            ) : (
              stat.value
            )}
          </div>
          <div className="text-sm text-gray-400">{stat.label}</div>
          {platformStats.error && (
            <div className="text-xs text-red-400 mt-1">Veri yüklenemedi</div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Leaderboard Component
const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<Array<{
    rank: number;
    displayName: string;
    score: number;
    avatar: string;
    isAdmin?: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gerçek skor tablosu verileri
    const realLeaderboard = [
      { rank: 1, displayName: "FaTaLRhymeR37", score: 389650, avatar: "👑", isAdmin: true },
      { rank: 2, displayName: "A", score: 34300, avatar: "🥈" },
      { rank: 3, displayName: "buketmmc", score: 31250, avatar: "🥉" },
      { rank: 4, displayName: "balonyilmaz3", score: 23200, avatar: "🏆" },
      { rank: 5, displayName: "KRAL OYUNCU1", score: 17625, avatar: "🎮" },
      { rank: 6, displayName: "vabisci", score: 12350, avatar: "⚡" },
      { rank: 7, displayName: "samedtat.", score: 11375, avatar: "🔥" },
      { rank: 8, displayName: "SpiderMan 2099", score: 9025, avatar: "🕷️" },
      { rank: 9, displayName: "Normal(düzeltildi) bayan (gerçek olan)", score: 8225, avatar: "👤" },
      { rank: 10, displayName: "WEFGDSG", score: 8175, avatar: "💎" }
    ];

    // Loading simülasyonu
    setTimeout(() => {
      setLeaderboard(realLeaderboard);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <motion.div
      className="my-12 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 3.5 }}
    >
      <h3 className="text-2xl font-bold text-center mb-8 text-cyan-400">
        {loading ? "Skor Tablosu Yükleniyor..." : "🏆 Skor Tablosu - İlk 10"}
      </h3>
      <div className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6">
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((player, index) => (
              <motion.div
                key={player.rank}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  player.rank === 1 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
                    : player.rank <= 3 
                    ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-500/30'
                    : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 4 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-bold text-cyan-400 w-8">
                    #{player.rank}
                  </div>
                  <div className="text-3xl">{player.avatar}</div>
                  <div>
                    <div className="text-white font-bold text-lg flex items-center gap-2">
                      {player.displayName}
                      {player.isAdmin && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {player.rank === 1 ? 'Şampiyon' : 
                       player.rank <= 3 ? 'Elit Oyuncu' : 'Aktif Oyuncu'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">
                    {player.score >= 1000000 
                      ? (player.score / 1000000).toFixed(1) + 'M'
                      : player.score >= 1000 
                      ? (player.score / 1000).toFixed(1) + 'K'
                      : player.score.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">puan</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Interactive Memory Cards Component
const MemoryCards: React.FC = () => {
  const [memories, setMemories] = useState<Array<{
    title: string;
    description: string;
    icon: string;
    color: string;
    count: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gerçek anı verileri
    const mockMemories = [
      { title: "İlk Giriş", description: "Platforma ilk adım atıldığı an", icon: "🚀", color: "border-blue-500", count: 369 },
      { title: "İlk Oyun", description: "İlk oyun deneyimi", icon: "🎯", color: "border-green-500", count: 1051 },
      { title: "İlk Chat", description: "Toplulukla ilk sohbet", icon: "💭", color: "border-purple-500", count: 4873 },
      { title: "İlk Başarı", description: "İlk başarı rozeti", icon: "🏅", color: "border-yellow-500", count: 3421 },
      { title: "İlk Arkadaş", description: "İlk dijital arkadaşlık", icon: "🤝", color: "border-pink-500", count: 738 },
      { title: "Son Anı", description: "Platformdaki son güzel anı", icon: "💝", color: "border-red-500", count: 1 }
    ];

    setTimeout(() => {
      setMemories(mockMemories);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <motion.div
      className="my-12 max-w-5xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 4.5 }}
    >
      <h3 className="text-2xl font-bold text-center mb-8 text-cyan-400">
        {loading ? "Dijital Anılar Yükleniyor..." : "Dijital Anılar"}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          memories.map((memory, index) => (
            <motion.div
              key={index}
              className={`bg-black/40 backdrop-blur-sm border-2 ${memory.color} rounded-lg p-4 text-center cursor-pointer`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 5 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-4xl mb-2">{memory.icon}</div>
              <div className="text-white font-bold text-sm mb-1">{memory.title}</div>
              <div className="text-gray-400 text-xs mb-2">{memory.description}</div>
              {memory.count && (
                <div className="text-cyan-400 text-xs font-semibold">
                  {memory.count.toLocaleString()} adet
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

// Timeline Component
const PlatformTimeline: React.FC = () => {
  const milestones = [
    { date: "Başlangıç", event: "İlk kod satırları yazıldı", description: "Bir deney başladı" },
    { date: "İlk Hafta", event: "İlk kullanıcılar katıldı", description: "Topluluk oluşmaya başladı" },
    { date: "1. Ay", event: "100+ aktif kullanıcı", description: "Platform büyümeye başladı" },
    { date: "2. Ay", event: "Oyun sistemi geliştirildi", description: "Eğlence seviyesi arttı" },
    { date: "3. Ay", event: "Chat sistemi eklendi", description: "Topluluk bağları güçlendi" },
    { date: "Zirve", event: "Binlerce kullanıcı", description: "Hedefler aşıldı" }
  ];

  return (
    <motion.div
      className="my-12 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 2.5 }}
    >
      <h3 className="text-2xl font-bold text-center mb-8 text-cyan-400">Platform Yolculuğu</h3>
      <div className="relative">
        <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-purple-500 to-cyan-500"></div>
        {milestones.map((milestone, index) => (
      <motion.div
            key={index}
            className={`relative flex items-center mb-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 3 + index * 0.2 }}
          >
            <div className="w-1/2 px-4">
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4">
                <div className="text-purple-400 font-semibold">{milestone.date}</div>
                <div className="text-white font-bold text-lg">{milestone.event}</div>
                <div className="text-gray-300 text-sm">{milestone.description}</div>
              </div>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-cyan-400 rounded-full border-2 border-black"></div>
            <div className="w-1/2"></div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const FarewellPage: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const platformStats = usePlatformStats();

  // Sound effects and background music
  useEffect(() => {
    if (audioEnabled) {
      // Create ambient background sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a subtle ambient tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 2);
      
      oscillator.start();
      
      return () => {
        oscillator.stop();
        audioContext.close();
      };
    }
  }, [audioEnabled]);

  // Play transition sound when section changes
  useEffect(() => {
    if (audioEnabled) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  }, [currentSection, audioEnabled]);

  const sections = [
    {
      title: "PROTOKOL: SON SİNYAL",
      content: (
        <div className="space-y-6">
          <p className="text-xl leading-relaxed">
            TTMTAL Games platformu, başlangıçtaki hedeflerini aşan bir popülerliğe ve kullanıcı etkileşimine ulaşmıştır.
          </p>
          <p className="text-lg">
            Projenin mevcut yapısının bu büyümeyi sürdürülebilir bir şekilde yönetemeyeceği anlaşıldığından, 
            platformu bu zirve noktasında ve güzel anılarla sonlandırma kararı alınmıştır.
          </p>
          <p className="text-xl font-semibold text-cyan-400">
            Katılım gösteren, oyun oynayan ve sohbet eden tüm kullanıcılara bu deneyim için teşekkür ederiz.
          </p>
        </div>
      )
    },
    {
      title: "PLATFORM HİKAYESİ",
      content: (
        <div className="space-y-6">
          <p>
            Birkaç satır koddan başlayan bu proje, zamanla büyük bir topluluk haline geldi. 
            <span className="text-cyan-400 font-semibold"> 369 kullanıcı</span> ile aktif bir platform oldu.
        </p>
        <p>
            Kullanıcılar oyunlar oynadı, sohbet etti ve skor tablosunda yarıştı. 
            Toplam <span className="text-green-400 font-semibold">4,873 mesaj</span> ve <span className="text-yellow-400 font-semibold">1,051 oyun</span> oynandı.
        </p>
        <p>
            En aktif kullanıcı <span className="text-purple-400 font-semibold">FaTaLRhymeR37</span> oldu ve 
            <span className="text-cyan-400 font-semibold"> 641 mesaj</span> ile rekor kırdı.
          </p>
        </div>
      )
    },
    {
      title: "SON KARAR",
      content: (
        <div className="space-y-6">
          <p>
            Platform başarılı oldu ve hedeflerini aştı. Ancak teknik sınırlar nedeniyle 
            bu noktada sonlandırılması gerekiyor.
          </p>
          <p className="text-ghost-white font-semibold text-lg">
            Tüm kullanıcılara, oyunculara ve topluluk üyelerine teşekkür ederiz.
        </p>
        <p>
            Bu deneyim hepimiz için değerli oldu ve güzel anılar bıraktı Kim Bilir Belki Tekrardan Buluşuruz...
          </p>
        </div>
      )
    }
  ];

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSection((prev) => (prev + 1) % sections.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isPlaying, sections.length]);

  return (
    <div className="fixed inset-0 bg-space-black overflow-y-auto">
      {/* Background Effects */}
      <MatrixRain />
      <FloatingParticles />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center p-8">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        >
          <motion.div
            className="relative mb-8"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <RadioTower size={80} className="text-electric-purple mx-auto" />
            <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" size={24} />
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-r from-ghost-white via-cyan-400 to-electric-purple mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          >
            {sections[currentSection].title}
          </motion.h1>

          <motion.div
            className="flex justify-center space-x-2 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            {sections.map((_, index) => (
              <motion.div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentSection ? 'bg-cyan-400' : 'bg-gray-600'
                }`}
                animate={{
                  scale: index === currentSection ? 1.2 : 1,
                  opacity: index === currentSection ? 1 : 0.5
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </motion.div>

          <div className="flex space-x-4">
            <motion.button
              className="bg-black/30 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-2 hover:border-cyan-500/60 transition-colors"
              onClick={() => setIsPlaying(!isPlaying)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? <Pause size={20} className="text-cyan-400" /> : <Play size={20} className="text-cyan-400" />}
            </motion.button>
            
            <motion.button
              className={`backdrop-blur-sm border rounded-lg p-2 transition-colors ${
                audioEnabled 
                  ? 'bg-green-900/30 border-green-500/30 hover:border-green-500/60' 
                  : 'bg-black/30 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              onClick={() => setAudioEnabled(!audioEnabled)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Zap size={20} className={audioEnabled ? "text-green-400" : "text-cyan-400"} />
            </motion.button>
          </div>
        </motion.div>

        {/* Content Sections */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection}
            className="max-w-4xl text-lg text-cyber-gray"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
          >
            {sections[currentSection].content}
          </motion.div>
        </AnimatePresence>

        {/* Platform Statistics */}
        <PlatformStats />

        {/* Top Chatter Info */}
        {platformStats.topChatter && (
          <motion.div
            className="my-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2.2 }}
          >
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-center mb-4 text-yellow-400 flex items-center justify-center gap-2">
                <Crown className="text-yellow-400" size={24} />
                En Çok Mesaj Atan Kullanıcı
              </h3>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  {platformStats.topChatter.displayName}
                </div>
                <div className="text-cyan-400 text-lg">
                  {platformStats.topChatter.messageCount.toLocaleString()} mesaj
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  Platformun en aktif kullanıcısı! 🏆
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard */}
        <Leaderboard />

        {/* Interactive Memory Cards */}
        <MemoryCards />

        {/* Timeline */}
        <PlatformTimeline />

        {/* Final Message */}
        <motion.div
          className="mt-16 max-w-3xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 4 }}
        >
          <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8">
            <motion.div
              className="text-3xl font-bold font-heading text-electric-purple mb-4"
              animate={{ 
                textShadow: [
                  "0 0 10px #8B5CF6",
                  "0 0 20px #8B5CF6, 0 0 30px #8B5CF6",
                  "0 0 10px #8B5CF6"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
          - Mimar (FaTaLRhymeR37)
            </motion.div>
            <p className="text-xl text-ghost-white">
              "Her son, yeni bir başlangıcın tohumudur. Bu dijital evrende yaşattığımız anılar, 
              sonsuza kadar kalplerimizde yaşayacak."
            </p>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="mt-16 flex flex-col items-center text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 5 }}
        >
          <span className="text-sm mb-2">Daha fazla anı için kaydırın</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown size={24} />
          </motion.div>
        </motion.div>

        {/* Gizli Erişim Input */}
        <input
          type="text"
          value={secretInput}
          onChange={(e) => {
            const val = e.target.value;
            setSecretInput(val);
            if (val.toLowerCase() === 'oyun') {
              sessionStorage.setItem('secretAccess', 'true');
              window.location.reload();
            }
          }}
          placeholder="..."
          className="mt-4 text-xs bg-transparent border-none text-center text-gray-600 focus:outline-none"
          style={{ fontSize: '10px' }}
        />
      </div>
    </div>
  );
};

export default FarewellPage;