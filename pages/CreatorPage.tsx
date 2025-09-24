import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Terminal from '../components/Terminal';
import useMatrixRain from '../hooks/useMatrixRain';
import { Code, Cpu, Database, Brush, Instagram } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { grantAchievement } from '../src/utils/grantAchievement';

const pageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};
const pageTransition = {
  duration: 0.5,
};

const skills = [
  { name: 'JavaScript (ES6+)', icon: <Code size={24} />, level: 95 },
  { name: 'React & Next.js', icon: <Cpu size={24} />, level: 90 },
  { name: 'Tailwind CSS', icon: <Brush size={24} />, level: 98 },
  { name: 'Node.js & Backend', icon: <Database size={24} />, level: 80 },
];

const CreatorPage: React.FC = () => {
  const [showTerminal, setShowTerminal] = useState(true);
  const canvasRef = useMatrixRain();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTerminal(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if(user && !showTerminal) {
        grantAchievement(user.uid, 'scholar_of_the_code');
    }
  }, [user, showTerminal]);

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
      <div className="bg-dark-gray/80 backdrop-blur-sm p-8 rounded-lg border border-cyber-gray/50 max-w-4xl w-full">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <motion.div 
            className="md:col-span-1 flex flex-col items-center"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <img 
              src="https://ttmtaldosyalar.netlify.app/thumbnails/indir_13_yzcypj.jpg"
              alt="Mimar FaTaLRhymeR"
              className="w-48 h-48 rounded-full border-4 border-electric-purple shadow-neon-purple object-cover"
            />
            <h1 className="text-4xl font-heading font-bold mt-4">FaTaLRhymeR37</h1>
            <h2 className="text-lg text-electric-purple">Bu Dijital Evrenin Mimarı</h2>
          </motion.div>

          <motion.div 
            className="md:col-span-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <h3 className="text-2xl font-heading border-b-2 border-cyber-gray pb-2 mb-4">GİRİŞ: FaTaLRhymeR37</h3>
            <p className="text-ghost-white mb-6">
              Her kod bir büyüdür ve her satır bir dua. Bu sığınağı, teneffüslerin sıkıcı boşluğunda kaybolan ruhlar için piksellerden ve hayallerden inşa ettim.
            </p>
            <p className="text-cyber-gray mb-6">
              Eğer bu satırları okuyorsan, sen de bu evrenin bir parçasısın demektir. Unutma, en büyük macera <code>main()</code> fonksiyonunu çağırmakla başlar.
            </p>
            
            {/* --- GÜNCELLENMİŞ İLETİŞİM BÖLÜMÜ --- */}
            <div className="mt-6 border-t border-cyber-gray/30 pt-4">
              <p className="text-sm text-cyber-gray mb-2">Sinyallerimi buradan takip et:</p>
              <div className="flex items-center gap-3 bg-space-black p-3 rounded-lg w-fit">
                <Instagram size={20} className="text-pink-400" />
                <span className="font-mono text-ghost-white tracking-wider">func_tionexe</span>
              </div>
            </div>

          </motion.div>
        </div>

        <div className="mt-12">
            <h3 className="text-2xl font-heading text-center mb-6">Cephanelik</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {skills.map((skill, index) => (
                    <div key={index} className="bg-space-black p-4 rounded-lg flex items-center gap-4 border border-cyber-gray/30">
                        <div className="text-electric-purple">{skill.icon}</div>
                        <div className="flex-grow">
                            <p className="font-bold">{skill.name}</p>
                            <div className="w-full bg-cyber-gray rounded-full h-2.5 mt-1">
                                <motion.div 
                                  className="bg-electric-purple h-2.5 rounded-full" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${skill.level}%` }}
                                  transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: 'easeOut' }}
                                ></motion.div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CreatorPage;