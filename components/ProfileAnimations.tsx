import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animationVariants } from './animationVariants';
import MatrixRainAnimation from './MatrixRainAnimation'; // Matrix için özel bileşen
import './animations.css'; // Özel animasyonlar için CSS

// TypeScript arayüzü
interface ProfileAnimationProps {
  animationId: string;
  children: React.ReactNode;
  // Bazı animasyonların içeriği bozmaması için bir key prop'u eklemek iyidir
  key?: string | number;
}

const ProfileAnimation: React.FC<ProfileAnimationProps> = ({ animationId, children, key }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Background animation component based on type
  const renderBackground = () => {
    if (animationId === 'matrix_rain_animation') {
      return <MatrixRainAnimation />;
    }

    if (animationId === 'hologram_glitch_animation') {
      return (
        <motion.div
          className="absolute inset-0 hologram-glitch-container"
          variants={animationVariants.hologram_glitch_animation}
          initial="initial"
          animate="animate"
          style={{ zIndex: 0 }}
        />
      );
    }

    const selectedVariant = animationVariants[animationId as keyof typeof animationVariants] || {};
    let bgStyle: React.CSSProperties = { zIndex: 0 };

    if (animationId === 'cyber_circuit_animation') {
      const initialVariant = selectedVariant.initial as any;
      bgStyle = { 
        ...bgStyle,
        backgroundImage: initialVariant?.backgroundImage || '',
        backgroundSize: '200% 200%',
        border: '2px solid transparent'
      };
    }

    return (
      <motion.div
        className="absolute inset-0"
        variants={selectedVariant}
        initial="initial"
        animate="animate"
        exit="exit"
        style={bgStyle}
      />
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence>
        {renderBackground()}
      </AnimatePresence>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ProfileAnimation;
