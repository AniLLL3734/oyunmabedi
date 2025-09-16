// DOSYA: App.tsx (Sohbet sayfaları entegre edilmiş tam sürüm)

import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Gerekli Bileşenler
import Layout from './components/Layout';
import { LoaderCircle } from 'lucide-react';
import PrivateRoute from './src/components/PrivateRoute'; // Bu yolun doğru olduğundan emin olun

// Hook'lar
import { useScoreSystem } from './hooks/useScoreSystem';
import { usePresence } from './hooks/usePresence';
import { useDailyRewards } from './hooks/useDailyRewards';

// Sayfaların Lazy Import Edilmesi
const HomePage = React.lazy(() => import('./pages/HomePage'));
const GamePage = React.lazy(() => import('./pages/GamePage'));
const CreatorPage = React.lazy(() => import('./pages/CreatorPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage')); // Genel Sohbet
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AllUsersPage = React.lazy(() => import('./pages/AllUsersPage'));
const EditProfilePage = React.lazy(() => import('./pages/EditProfilePage'));
const ChatRoomSelectionPage = React.lazy(() => import('./pages/ChatRoomSelectionPage'));
const AuthlessChatPage = React.lazy(() => import('./pages/AuthlessChatPage'));

// ======================= YENİ EKLENEN IMPORTLAR =======================
// Oluşturduğumuz özel mesajlaşma sayfalarını lazy import ediyoruz.
const DirectMessagesPage = React.lazy(() => import('./pages/DirectMessagesPage'));
const ChatRoomPage = React.lazy(() => import('./pages/ChatRoomPage'));
// ======================================================================


// Sayfa yüklenirken gösterilecek fallback bileşeni
const PageLoader = () => (
  <div className="flex justify-center items-center h-full py-20">
    <LoaderCircle className="animate-spin text-electric-purple" size={48} />
  </div>
);

const App: React.FC = () => {
  const location = useLocation();
  
  // Uygulama genelinde çalışacak custom hook'lar
  useScoreSystem();
  usePresence();
  useDailyRewards();

  // NOT: Uygulamanızda başlangıç yükleme ekranı (LoadingScreen) mantığı yoktu.
  // Bu yüzden o kısmı kaldırarak doğrudan Layout'u render ettim.
  // Eğer böyle bir mantık varsa, kendi kodunuzdaki gibi bırakabilirsiniz.

  return (
    <Layout>
       <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* Mevcut Sayfa Yollarınız */}
                <Route path="/" element={<HomePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile/:userId" element={<ProfilePage />} />
                <Route path="/game/:id" element={<GamePage />} />
                <Route path="/creator" element={<CreatorPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/all-users" element={<AllUsersPage />} />

                {/* Sadece Giriş Yapanların Girebileceği Sayfalar */}
                <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
                <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                <Route path="/chat-rooms" element={<PrivateRoute><ChatRoomSelectionPage /></PrivateRoute>} />
                <Route path="/chat/:serverId" element={<PrivateRoute><AuthlessChatPage /></PrivateRoute>} />

                {/* ======================= YENİ EKLENEN ÖZEL MESAJLAŞMA YOLLARI (ROUTES) ======================= */}
                
                {/* Bu yol, kullanıcının TÜM özel mesaj sohbetlerini listelediği sayfayı açar. (DirectMessagesPage.tsx) */}
                <Route path="/messages" element={<PrivateRoute><DirectMessagesPage /></PrivateRoute>} />
                
                {/* 
                  Bu yol, BELİRLİ BİR özel mesaj sohbet odasını açar. (ChatRoomPage.tsx)
                  :chatId kısmı URL'den dinamik olarak alınır ve AdminPage'den yönlendirildiğimizde
                  "adminUID_kullaniciUID" gibi bir değeri temsil eder.
                */}
                <Route path="/dm/:chatId" element={<PrivateRoute><ChatRoomPage /></PrivateRoute>} />
                
                {/* ========================================================================================= */}
            </Routes>
          </AnimatePresence>
        </Suspense>
    </Layout>
  );
};

export default App;