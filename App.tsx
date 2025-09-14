// DOSYA: App.tsx (Doğru import yolu ile güncellendi)

import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import { LoaderCircle } from 'lucide-react';
import { useScoreSystem } from './hooks/useScoreSystem';
import { usePresence } from './hooks/usePresence';
import { useDailyRewards } from './hooks/useDailyRewards';
// ======================= DEĞİŞİKLİK BURADA =======================
// Vite'a dosyanın doğru yerini (src klasörünün içi) gösteriyoruz.
import PrivateRoute from './src/components/PrivateRoute';
// =================================================================

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


const PageLoader = () => (
  <div className="flex justify-center items-center h-full py-20">
    <LoaderCircle className="animate-spin text-electric-purple" size={48} />
  </div>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  useScoreSystem();
  usePresence();
  useDailyRewards();

  useEffect(() => {
    const timer = setTimeout(() => { 
      setLoading(false); 
    }, 2000); 

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
                    <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
                    <Route path="/game/:id" element={<GamePage />} />
                    <Route path="/creator" element={<CreatorPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                    <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                    <Route path="/all-users" element={<AllUsersPage />} />
                    <Route path="/chat-rooms" element={<PrivateRoute><ChatRoomSelectionPage /></PrivateRoute>} />
                    <Route path="/chat/:serverId" element={<PrivateRoute><AuthlessChatPage /></PrivateRoute>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
        </Layout>
      )}
    </>
  );
};

export default App;