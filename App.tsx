// DOSYA: App.tsx (VEDA MODU AKTİF)

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// YENİ VEDA SAYFASINI IMPORT EDİYORUZ
import FarewellPage from './pages/FarewellPage';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import ChatRoomPage from './pages/ChatRoomPage';
import DirectMessagesPage from './pages/DirectMessagesPage';
import AdminPage from './pages/AdminPage';
import CreatorPage from './pages/CreatorPage';

// UYGULAMANIN DİĞER HOOK'LARINI VEYA BİLEŞENLERİNİ IMPORT ETMEYE GEREK YOK!
// ÖRN: import { useScoreSystem } from './hooks/useScoreSystem';  <-- BUNLARIN HEPSİ KALKACAK

const App: React.FC = () => {
  // ARTIK HİÇBİR HOOK ÇAĞIRMIYORUZ, TÜM ESKİ MANTIK DEVRE DIŞI
  // const location = useLocation();
  // const { isAfk, isBlocked } = useScoreSystem();
  // usePresence();
  // useDailyRewards();

  // Gizli erişim kontrolü - sekme kapatılınca sıfırlanır
  const secretAccess = sessionStorage.getItem('secretAccess') === 'true';

  // VEDA MODU: Sadece FarewellPage'i render ediyoruz, gizli erişim yoksa
  // Router zaten index.tsx'te mevcut, burada tekrar kullanmaya gerek yok
  if (secretAccess) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chatroom" element={<ChatRoomPage />} />
        <Route path="/dm/:chatId" element={<DirectMessagesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/creator" element={<CreatorPage />} />
      </Routes>
    );
  }

  return <FarewellPage />;
};

export default App;