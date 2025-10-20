// DOSYA: App.tsx

import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
const BettingPage = React.lazy(() => import('./pages/BettingPage'));
const ClanPage = React.lazy(() => import('./pages/ClanPage'));
// DÜZELTME 1: ClanDetailPage de lazy import ile yüklenecek
const ClanDetailPage = React.lazy(() => import('./pages/ClanDetailPage'));
// Admin Chat Page
const AdminChatPage = React.lazy(() => import('./pages/AdminChatPage'));


const PageLoader = () => (
  <div className="flex justify-center items-center h-full min-h-screen">
    <LoaderCircle className="animate-spin text-electric-purple" size={48} />
  </div>
);

const AfkWarning = () => (
    <motion.div 
        id="afk-warning-overlay" 
        className="fixed inset-0 bg-space-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-[9998]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
        <AlertTriangle size={64} className="text-yellow-400 mb-6 animate-pulse" />
        <h2 className="text-4xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-400 mb-3">Zaman Akışında Bir Duraksama...</h2>
        <p className="text-lg text-cyber-gray max-w-lg">Görünüşe göre sinyal zayıfladı. Evren, yalnızca onu deneyimleyenler için genişler. Sen yokken skor kazanımı duraklatıldı.</p>
        <p className="mt-8 flex items-center justify-center gap-4 text-white font-semibold text-xl tracking-wider">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><MousePointer size={28} /></motion.div>
            Varlığını kanıtla.
        </p>
    </motion.div>
);

const BlockedWarning = () => (
    <motion.div 
        className="fixed inset-0 bg-red-900/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 z-[9999]"
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
    >
        <Ban size={72} className="text-red-400 mb-6" />
        <h2 className="text-5xl font-black font-heading text-red-300 mb-3">Anomali Tespit Edildi</h2>
        <p className="text-xl text-red-200 max-w-lg">Sistem, adil olmayan bir avantaj elde etmeye yönelik bir aktivite algıladı. Bu oturum için tüm dinamik özellikler durduruldu. Sayfayı yenilemek gerekebilir.</p>
    </motion.div>
);


const App: React.FC = () => {
  const location = useLocation();
  const { isAfk, isBlocked } = useScoreSystem(); 
  usePresence();
  useDailyRewards();

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
                        
                        {/* DÜZELTME 2: /clan/:clanId için eksik olan rota eklendi. */}
                        {/* Klanları görmek için giriş yapmak gerektiğinden bunu da PrivateRoute içine alıyoruz. */}
                        <Route path="/clan/:clanId" element={<PrivateRoute><ClanDetailPage /></PrivateRoute>} />
                        <Route path="/betting" element={<PrivateRoute><BettingPage /></PrivateRoute>} />

                    </Routes>
                </AnimatePresence>
            </Suspense> 
        </Layout>
        
        <AnimatePresence>
            {isAfk && !isBlocked && <AfkWarning />}
            {isBlocked && <BlockedWarning />}
        </AnimatePresence>
    </>
  );
};

export default App;