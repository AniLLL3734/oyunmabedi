// DOSYA: index.tsx (Ana dizinde)

import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

// DÜZELTME: App dosyası zaten aynı dizinde olduğu için './App' kullanılır.
import App from './App';

// DÜZELTME: AuthProvider dosyası 'src/contexts' klasöründe olduğu için yol './src/contexts/AuthContext' olmalı.
import { AuthProvider } from './src/contexts/AuthContext';

// Import i18n configuration
import './src/i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Kök element bulunamadı. Dijital evrenin temeli sarsıldı.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
);