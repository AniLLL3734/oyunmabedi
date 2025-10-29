// DOSYA: App.tsx

import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';
import Layout from './components/Layout';
import { LoaderCircle, AlertTriangle, MousePointer, Ban } from 'lucide-react';
import PrivateRoute from './src/components/PrivateRoute';
import { useScoreSystem } from './hooks/useScoreSystem';
import { usePresence } from './hooks/usePresence';
import { useDailyRewards } from './hooks/useDailyRewards';

// Sayfaların Lazy Import'ları (ClanDetailPage buraya eklendi)
const HomePage = React.lazy(() => import('./pages/HomePage'));
const GamePage = React.lazy(() => import('./pages/GamePage'));
const CreatorPage = React.lazy(() => import('./pages/CreatorPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AllUsersPage = React.lazy(() => import('./pages/AllUsersPage'));
const EditProfilePage = React.lazy(() => import('./pages/EditProfilePage'));
const ChatRoomSelectionPage = React.lazy(() => import('./pages/ChatRoomSelectionPage'));
const AuthlessChatPage = React.lazy(() => import('./pages/AuthlessChatPage'));
const DirectMessagesPage = React.lazy(() => import('./pages/DirectMessagesPage'));
const ChatRoomPage = React.lazy(() => import('./pages/ChatRoomPage'));
const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const ClanPage = React.lazy(() => import('./pages/ClanPage'));
// DÜZELTME 1: ClanDetailPage de lazy import ile yüklenecek
const ClanDetailPage = React.lazy(() => import('./pages/ClanDetailPage'));
// Admin Chat Page
const AdminChatPage = React.lazy(() => import('./pages/AdminChatPage'));
// Betting Page
const BettingPage = React.lazy(() => import('./pages/BettingPage'));


const PageLoader = () => (
  <div className="flex justify-center items-center h-full min-h-screen">
    <LoaderCircle className="animate-spin text-electric-purple" size={48} />
  </div>
);

const AfkWarning = ({ onUserActive }: { onUserActive: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number>(30); // 30 seconds countdown
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-logout after 30 seconds
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div 
        id="afk-warning-overlay" 
        className="fixed inset-0 bg-space-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 z-[9998]"
    >
        <AlertTriangle size={64} className="text-yellow-400 mb-6 animate-pulse" />
        <h2 className="text-4xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-400 mb-3">Zaman Akışında Bir Duraksama...</h2>
        <p className="text-lg text-cyber-gray max-w-lg mb-6">Görünüşe göre sinyal zayıfladı. Evren, yalnızca onu deneyimleyenler için genişler. Sen yokken skor kazanımı duraklatıldı.</p>
        
        <div className="bg-dark-gray/50 border border-cyber-gray/30 rounded-lg p-6 mb-6">
          <p className="text-electric-purple font-bold mb-2">Otomatik Çıkış</p>
          <p className="text-3xl font-mono text-yellow-400 mb-4">{timeLeft}s</p>
          <p className="text-sm text-cyber-gray">Herhangi bir aktivite algılanmazsa sistemden otomatik çıkılacak</p>
        </div>
        
        <button 
          onClick={onUserActive}
          className="px-6 py-3 bg-electric-purple hover:bg-purple-600 text-white font-bold rounded-lg transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <MousePointer size={20} />
          Devam Et
        </button>
        
        <div className="mt-8 flex items-center justify-center gap-4 text-white font-semibold text-xl tracking-wider">
            <div className="animate-pulse"><MousePointer size={28} /></div>
            Varlığını kanıtla.
        </div>
    </div>
  );
};




const App: React.FC = () => {
  const location = useLocation();
  const { isBlocked } = useScoreSystem(); 
  usePresence();
  useDailyRewards();
  useScoreSystem();

  return (
    <>
        <Layout>
            <Suspense fallback={<PageLoader />}>
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="/profile/:userId" element={<ProfilePage />} />
                        <Route path="/game/:id" element={<GamePage />} />
                        <Route path="/creator" element={<CreatorPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/all-users" element={<AllUsersPage />} />

                        {/* Giriş Gerektiren Sayfalar (Private Routes) */}
                        <Route path="/shop" element={<PrivateRoute><ShopPage /></PrivateRoute>} />
                        <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
                        <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                        <Route path="/chat-rooms" element={<PrivateRoute><ChatRoomSelectionPage /></PrivateRoute>} />
                        <Route path="/chat/:serverId" element={<PrivateRoute><AuthlessChatPage /></PrivateRoute>} />
                        <Route path="/messages" element={<PrivateRoute><DirectMessagesPage /></PrivateRoute>} />
                        <Route path="/dm/:chatId" element={<PrivateRoute><ChatRoomPage /></PrivateRoute>} />
                        <Route path="/clans" element={<PrivateRoute><ClanPage /></PrivateRoute>} />
                        <Route path="/admin-chat/:roomId" element={<PrivateRoute><AdminChatPage /></PrivateRoute>} />
                        <Route path="/betting" element={<PrivateRoute><BettingPage /></PrivateRoute>} />
                        
                        {/* DÜZELTME 2: /clan/:clanId için eksik olan rota eklendi. */}
                        {/* Klanları görmek için giriş yapmak gerektiğinden bunu da PrivateRoute içine alıyoruz. */}
                        <Route path="/clan/:clanId" element={<PrivateRoute><ClanDetailPage /></PrivateRoute>} />

                    </Routes>
                </AnimatePresence>
            </Suspense> 
        </Layout>
        

    </>
  );
};

export default App;