// DOSYA: components/Layout.tsx

import React, { useEffect, useState } from 'react';
import Header from './Header';
import { Toaster } from 'react-hot-toast'; // YENİ IMPORT
import { useAuth } from '../src/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chatInput, setChatInput] = useState('');

  const handleChatInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && chatInput.trim().toUpperCase() === 'SOHBET') {
      navigate('/chat');
      setChatInput('');
    }
  };

  // Aktif renk temasını body'ye uygula
  useEffect(() => {
    const body = document.body;
    
    // Önceki tema sınıflarını kaldır
    body.classList.remove(
      'theme-cyber-blue',
      'theme-neon-green', 
      'theme-electric-blue',
      'theme-blood-red',
      'theme-cosmic-rainbow'
    );

    // Aktif tema varsa uygula
    if (userProfile?.inventory?.activeColorTheme) {
      const themeClass = `theme-${userProfile.inventory.activeColorTheme.replace('_theme', '')}`;
      body.classList.add(themeClass);
    }
  }, [userProfile?.inventory?.activeColorTheme]);

  return (
    <div className="min-h-screen bg-space-black text-ghost-white font-sans">
      {/* BİLDİRİM SİSTEMİ BURADA AKTİF EDİLİYOR */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1E1E24',
            color: '#F0F0F8',
            border: '1px solid #9F70FD',
          },
        }}
      />
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-8">{children}</main>

      {/* Hidden Chat Access Textbox - Only on Homepage */}
      {location.pathname === '/' && (
        <div className="fixed bottom-2 right-4 z-40 opacity-60 hover:opacity-100 transition-opacity">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatInputKeyDown}
            placeholder="..."
            className="w-48 p-2 text-xs bg-dark-gray/80 text-ghost-white rounded-md border border-cyber-gray/30 focus:ring-1 focus:ring-electric-blue focus:outline-none placeholder-cyber-gray/50 backdrop-blur-sm"
          />
        </div>
      )}
    </div>
  );
};

export default Layout;