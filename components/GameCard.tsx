// DOSYA: components/GameCard.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Game } from '../types';

// Lazy Load için gerekli importlar
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface GameCardProps {
  game: Game;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
  return (
    <Link to={`/game/${game.id}`}>
      <motion.div
        className="bg-dark-gray rounded-lg overflow-hidden shadow-lg border border-cyber-gray/50 h-full flex flex-col group"
        whileHover={{
          y: -10,
          boxShadow: '0 0 15px #9F70FD, 0 0 5px #9F70FD',
          transition: { duration: 0.3 },
        }}
      >
        <div className="overflow-hidden">
          {/* Standart <img> etiketi yerine LazyLoadImage bileşenini kullanıyoruz. */}
          <LazyLoadImage
            alt={game.title}
            src={game.thumbnail} 
            // `effect="blur"`: Resim yüklenene kadar düşük çözünürlüklü, bulanık bir versiyonunu gösterir.
            effect="blur" 
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300" 
          />
        </div>
        <div className="p-6 flex flex-col flex-grow">
          <h3 className="text-2xl font-bold font-heading text-ghost-white">{game.title}</h3>
          <p className="text-cyber-gray mt-2 flex-grow">{game.description}</p>
          <div className="mt-4">
            <span className="inline-block bg-electric-purple/20 text-electric-purple rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2">
              {game.category}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default GameCard;