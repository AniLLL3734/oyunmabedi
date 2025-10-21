// src/components/GameIntroductionModal.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface GameIntroductionModalProps {
  game: {
    id: string;
    name: string;
    description: string;
    rules: string[];
    tips?: string[];
  };
  onClose: () => void;
}

const GameIntroductionModal: React.FC<GameIntroductionModalProps> = ({ game, onClose }) => {
  return (
    <motion.div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{game.name}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Oyun Açıklaması</h3>
            <p className="text-gray-300">{game.description}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Nasıl Oynanır?</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-300">
              {game.rules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
          
          {game.tips && (
            <div>
              <h3 className="text-lg font-semibold mb-2">İpuçları</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                {game.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold transition-colors"
          >
            Anladım
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GameIntroductionModal;