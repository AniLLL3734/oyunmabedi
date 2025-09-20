// DOSYA: App.tsx (Koşullu render ve düzeltilmiş AfkWarning ile tam sürüm)

import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import { LoaderCircle, AlertTriangle, MousePointer } from 'lucide-react';
import PrivateRoute from './src/components/PrivateRoute';
import { useScoreSystem } from './hooks/useScoreSystem';
import { usePresence } from './hooks/usePresence';
import { useDailyRewards } from './hooks/useDailyRewards';

// Sayfaların Lazy Import'ları
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

// Sayfa yüklenirken gösterilecek fallback bileşeni
const PageLoader = () => (
  <div className="flex justify-center items-center h-full py-20">
    <LoaderCircle className="animate-spin text-electric-purple" size={48} />
  </div>
);

// AFK Uyarı Ekranı Component'i
const AfkWarning = () => {
    return (
        <motion.div 
            id="afk-warning-overlay" 
            className="fixed inset-0 bg-space-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <AlertTriangle size={64} className="text-yellow-400 mb-6 animate-pulse" />
            
            <h2 className="text-4xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-400 mb-3">
                Zaman Akışında Bir Duraksama...
            </h2>
            
            <p className="text-lg text-cyber-gray max-w-lg">
                Görünüşe göre sinyal zayıfladı. Evren, yalnızca onu deneyimleyenler için genişler. Sen yokken skor kazanımı duraklatıldı.
            </p>

            <p className="mt-8 flex items-center justify-center gap-4 text-white font-semibold text-xl tracking-wider">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <MousePointer size={28} />
                </motion.div>
                Varlığını kanıtla.
            </p>
        </motion.div>
    );
};

const App: React.FC = () => {
  const location = useLocation();
  
  // Hook'lardan gelen veriyi alıyoruz
  const isUserAfk = useScoreSystem(); 
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

                        <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
                        <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                        <Route path="/chat-rooms" element={<PrivateRoute><ChatRoomSelectionPage /></PrivateRoute>} />
                        <Route path="/chat/:serverId" element={<PrivateRoute><AuthlessChatPage /></PrivateRoute>} />

                        <Route path="/messages" element={<PrivateRoute><DirectMessagesPage /></PrivateRoute>} />
                        <Route path="/dm/:chatId" element={<PrivateRoute><ChatRoomPage /></PrivateRoute>} />
                    </Routes>
                </AnimatePresence>
            </Suspense>
        </Layout>
        
        <AnimatePresence>
            {isUserAfk && <AfkWarning />}
        </AnimatePresence>
    </>
  );
};

export default App;