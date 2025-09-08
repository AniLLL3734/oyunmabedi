// DOSYA: App.tsx

import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import { LoaderCircle } from 'lucide-react';
import { useScoreSystem } from './hooks/useScoreSystem';
import { usePresence } from './hooks/usePresence';
import { useDailyRewards } from './hooks/useDailyRewards.tsx';

// Rota Bazlı Kod Bölümleme (Performans için)
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
const DirectMessagesPage = React.lazy(() => import('./pages/DirectMessagesPage'));
const PrivateChatPage = React.lazy(() => import('./pages/PrivateChatPage'));
const EditProfilePage = React.lazy(() => import('./pages/EditProfilePage'));


// Tembel yüklenen sayfalar için yedek bileşen
const PageLoader = () => (
  <div className="flex justify-center items-center h-full py-20">
    <LoaderCircle className="animate-spin text-electric-purple" size={48} />
  </div>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  // Arka plan sistemlerini başlat
  useScoreSystem();
  usePresence();
  useDailyRewards();

  useEffect(() => {
    const timer = setTimeout(() => { 
      setLoading(false); 
    }, 3000); 

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen key="loading" />}
      </AnimatePresence>
      
      {!loading && (
        <Layout>
           <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/profile/:userId" element={<ProfilePage />} />
                    <Route path="/edit-profile" element={<EditProfilePage />} />
                    <Route path="/game/:id" element={<GamePage />} />
                    <Route path="/creator" element={<CreatorPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/all-users" element={<AllUsersPage />} />
                    <Route path="/dms" element={<DirectMessagesPage />} />
                    <Route path="/dm/:recipientId" element={<PrivateChatPage />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
        </Layout>
      )}
    </>
  );
};

export default App;