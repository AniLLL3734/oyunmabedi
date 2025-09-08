
import React, { useEffect, useRef } from 'react';

interface RufflePlayerProps {
  swfUrl: string;
}

// Since we are loading Ruffle via a script tag, we need to declare it globally for TypeScript
// to avoid errors when accessing window.RufflePlayer.
declare global {
    interface Window {
        RufflePlayer: any;
    }
}

const RufflePlayer: React.FC<RufflePlayerProps> = ({ swfUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect runs when the component mounts or swfUrl changes.
    // Ruffle is loaded from the script in index.html and will be available on the window object.
    if (window.RufflePlayer && containerRef.current) {
      // Clear any previous instance to prevent duplicates.
      containerRef.current.innerHTML = '';
      
      // Create a new Ruffle player instance.
      const ruffle = window.RufflePlayer.newest();
      const player = ruffle.createPlayer();

      // Style the player to fit the container.
      player.style.width = '100%';
      player.style.height = '100%';

      // Append the player to our container div.
      containerRef.current.appendChild(player);

      // Load the SWF file into the player.
      // This is an asynchronous operation.
      player.load(swfUrl);
    } else {
        console.error("Ruffle.js is not loaded or container ref is not available.");
    }
    // The effect depends on swfUrl. If it changes, a new player will be created for the new URL.
  }, [swfUrl]);

  return <div ref={containerRef} className="w-full h-full"></div>;
};

export default RufflePlayer;
