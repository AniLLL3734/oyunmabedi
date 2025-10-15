import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Terminal from '../components/Terminal';
import useMatrixRain from '../hooks/useMatrixRain';
import { Code, Cpu, Database, Brush, Instagram, Terminal as TerminalIcon } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { grantAchievement } from '../src/utils/grantAchievement';

const pageVariants = {
  initial: { opacity: 0, filter: 'blur(5px)' },
  in: { opacity: 1, filter: 'blur(0px)' },
  out: { opacity: 0, filter: 'blur(5px)' },
};

const pageTransition = {
  duration: 0.8,
  ease: 'easeInOut',
};

const skills = [
  { name: 'JavaScript (ES6+) & TypeScript', icon: <Code size={24} />, level: 95 },
  { name: 'React & Next.js Ekosistemi', icon: <Cpu size={24} />, level: 90 },
  { name: 'Tailwind CSS & Arayüz Sanatı', icon: <Brush size={24} />, level: 98 },
  { name: 'Node.js & Sunucu Mimarisi', icon: <Database size={24} />, level: 80 },
];

const CreatorPage: React.FC = () => {
  const [showTerminal, setShowTerminal] = useState(true);
  const canvasRef = useMatrixRain();
  const { user } = useAuth();

  useEffect(() => {
    // Terminal animasyonunun bitmesi için bir süre tanıyoruz.
    const timer = setTimeout(() => {
      setShowTerminal(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // Kullanıcı giriş yapmış ve terminal ekranı geçmişse başarım ver.
    if(user && !showTerminal) {
        grantAchievement(user.uid, 'scholar_of_the_code');
    }
  }, [user, showTerminal]);

  // Başlangıçta terminal ekranını göster.
  if (showTerminal) {
    return <Terminal />;
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="relative min-h-[80vh] flex items-center justify-center p-4"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-10 -z-10"></canvas>
      <div className="bg-dark-gray/80 backdrop-blur-md p-8 rounded-xl border border-cyber-gray/50 max-w-4xl w-full shadow-lg shadow-black/30">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          
          {/* --- SOL TARAF: KİMLİK --- */}
          <motion.div 
            className="md:col-span-1 flex flex-col items-center text-center"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <img 
              src="https://ttmtaldosyalar.netlify.app/thumbnails/indir_13_yzcypj.jpg"
              alt="Mimar FaTaLRhymeR"
              className="w-48 h-48 rounded-full border-4 border-electric-purple shadow-neon-purple object-cover mb-4"
            />
            <h1 className="text-4xl font-heading font-bold">FaTaLRhymeR37</h1>
            {/* DEĞİŞTİRİLDİ: Çok daha profesyonel ve havalı bir unvan. */}
            <h2 className="text-lg text-electric-purple tracking-wider">Dijital Dünyaların Zanaatkarı</h2>
          </motion.div>

          {/* --- SAĞ TARAF: MANİFESTO --- */}
          <motion.div 
            className="md:col-span-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            {/* DEĞİŞTİRİLDİ: Başlık artık daha tematik. */}
            <h3 className="flex items-center gap-2 text-2xl font-heading border-b-2 border-cyber-gray pb-2 mb-4">
              <TerminalIcon size={20} className="text-cyber-gray"/>
              Kök Dizine Erişim: /FaTaLRhymeR37
            </h3>
            {/* DEĞİŞTİRİLDİ: Metinler artık daha derin, felsefi ve "cringe" değil. */}
            <p className="text-ghost-white mb-4 leading-relaxed">
              Sıfırlar ve birler arasında bir melodi... Bu alan, sadece piksellerin değil, mantık ve hayallerin iç içe geçtiği dijital bir atölye.
            </p>
            <p className="text-cyber-gray mb-6 leading-relaxed">
              Bu satırlara ulaştıysan, muhtemelen sen de benim gibi dijital akıntılarda anlam arıyorsun. Hoş geldin. Unutma; en büyük maceralar, bir <code>init()</code> komutuyla başlar.
            </p>
            
            {/* DEĞİŞTİRİLDİ: İletişim bölümü daha şık ve tematik oldu. */}
            <div className="mt-6 border-t border-cyber-gray/30 pt-6">
              <p className="text-sm text-cyber-gray mb-3">Siber ağdaki yankılarım:</p>
              <a 
                href="https://www.instagram.com/func_tionexe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-space-black p-3 rounded-lg border border-transparent hover:border-electric-purple transition-all duration-300 group"
              >
                <span className="font-mono text-electric-purple text-lg">&gt;</span>
                <Instagram size={20} className="text-pink-400 group-hover:scale-110 transition-transform" />
                <span className="font-mono text-ghost-white tracking-wider">func_tionexe</span>
              </a>
            </div>

          </motion.div>
        </div>

        {/* --- ALT TARAF: YETENEK MATRİSİ --- */}
        <div className="mt-16">
            <h3 className="text-2xl font-heading text-center mb-8">Cephanelik</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {skills.map((skill, index) => (
                    <motion.div 
                      key={index} 
                      className="bg-space-black p-4 rounded-lg flex items-center gap-4 border border-cyber-gray/30 hover:border-cyber-gray/70 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    >
                        <div className="text-electric-purple p-2 bg-dark-gray rounded-md">{skill.icon}</div>
                        <div className="flex-grow">
                            <p className="font-bold text-ghost-white">{skill.name}</p>
                            <div className="w-full bg-cyber-gray/20 rounded-full h-2.5 mt-2 overflow-hidden">
                                <motion.div 
                                  className="bg-gradient-to-r from-electric-purple to-pink-500 h-2.5 rounded-full" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${skill.level}%` }}
                                  transition={{ duration: 1.5, delay: 1 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                ></motion.div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CreatorPage;