
import { useRef, useEffect } from 'react';

const useMatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const columns = Math.floor(width / 20);
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    const characters = 'TTMTALGAMES0123456789';
    const charArray = characters.split('');
    let frameId: number;

    const draw = () => {
      // Use the theme's background color with low opacity to create a fading trail effect
      ctx.fillStyle = 'rgba(11, 10, 14, 0.05)'; 
      ctx.fillRect(0, 0, width, height);
      // Use the theme's primary color for the falling characters
      ctx.fillStyle = '#9F70FD'; 
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        ctx.fillText(text, i * 20, drops[i] * 20);

        // Reset drop to the top randomly to make the rain uneven
        if (drops[i] * 20 > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    const animate = () => {
        draw();
        frameId = requestAnimationFrame(animate);
    }
    
    animate();

    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', handleResize);

    // Cleanup function to cancel animation frame and remove event listener
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return canvasRef;
};

export default useMatrixRain;
