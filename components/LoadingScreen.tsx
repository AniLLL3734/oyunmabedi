
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const loadingTexts = [
  "Pikseller hizalanıyor...",
  "Nöral ağlar senkronize ediliyor... Hoş geldin, gezgin.",
  "Sinyal güçlendiriliyor. Teneffüse bir portal açılıyor...",
  "0 ve 1'lerin sessiz dansı sona eriyor. Hazır ol.",
  "Gerçeklik matrisi derleniyor...",
];

const LoadingScreen: React.FC = () => {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prevIndex) => (prevIndex + 1) % loadingTexts.length);
    }, 2000); // Change text every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 bg-space-black flex flex-col justify-center items-center z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-center"
        animate={{ scale: [1, 1.05, 1]}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <h1 className="text-4xl md:text-6xl font-heading font-black text-electric-purple tracking-widest">
          Oyun Mabedi
        </h1>
      </motion.div>
      <motion.p
        key={textIndex}
        className="text-ghost-white mt-8 text-lg font-sans"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {loadingTexts[textIndex]}
      </motion.p>
    </motion.div>
  );
};

export default LoadingScreen;
