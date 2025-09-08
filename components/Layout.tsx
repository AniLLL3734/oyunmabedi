// DOSYA: components/Layout.tsx

import React from 'react';
import Header from './Header';
import { Toaster } from 'react-hot-toast'; // YENİ IMPORT

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default Layout;