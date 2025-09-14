
import React, { useState, useEffect } from 'react';

const commands = [
  { text: '> connect_to_source.sh', delay: 1000 },
  { text: '> Authenticating...', delay: 1000 },
  { text: '> Access Granted.', delay: 500 },
  { text: '> load --profile FaTaLRhymeR37', delay: 1500 },
  { text: 'Use code with caution.', delay: 200 },
];

const Terminal: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let timeoutId: number;
    // This effect types out the commands one by one with specified delays.
    const runCommands = () => {
      let currentDelay = 0;
      commands.forEach((command) => {
        currentDelay += command.delay;
        timeoutId = window.setTimeout(() => {
          setLines(prev => [...prev, command.text]);
        }, currentDelay - command.delay);
      });
    };
    
    runCommands();

    // Cleanup timeouts on component unmount
    return () => clearTimeout(timeoutId);
  }, []);
  
  // This effect creates the blinking cursor.
  useEffect(() => {
      const cursorInterval = setInterval(() => {
          setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="font-mono bg-space-black text-green-400 w-full h-screen p-4 flex flex-col justify-start items-start overflow-hidden">
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
      {showCursor && <span className="w-2 h-4 bg-green-400 inline-block"></span>}
      <div className="absolute inset-0 bg-black opacity-30 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-space-black"></div>
    </div>
  );
};

export default Terminal;
