// DOSYA: components/Header.tsx

import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../src/firebase';
import { Shield } from 'lucide-react';

const Header: React.FC = () => {
  const { user, isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
        await signOut(auth);
        navigate('/'); 
    } catch(error) { console.error("Çıkış hatası:", error); }
  };

  const navItemVariants = {
    hover: {
      color: '#9F70FD', textShadow: '0 0 5px #9F70FD', scale: 1.1,
      transition: { duration: 0.2 },
    },
  };
  const activeStyle = { color: '#9F70FD', textShadow: '0 0 5px #9F70FD' };

  // === TÜM SORUNU ÇÖZEN DEĞİŞİKLİK BURADA ===
  // Karmaşık Firestore sorgusu yerine, doğrudan AuthContext'ten gelen veriyi kullanıyoruz.
  // Bu, INTERNAL ASSERTION FAILED hatasını %100 engeller.
  const hasUnreadMessages = userProfile?.unreadChats && userProfile.unreadChats.length > 0;

  return (
    <header className="sticky top-0 z-40 bg-dark-gray/70 backdrop-blur-sm border-b border-cyber-gray/50">
      <nav className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-2xl font-heading font-bold hover:text-electric-purple transition-colors">TTMTAL <span className="text-electric-purple">GAMES</span></Link>
        <ul className="flex items-center space-x-4 md:space-x-6 text-lg">
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/" style={({ isActive }) => (isActive ? activeStyle : {})}>Ana Sayfa</NavLink></motion.div></li>
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/all-users" style={({ isActive }) => (isActive ? activeStyle : {})}>Gezginler</NavLink></motion.div></li>
          {user && (<li><motion.div variants={navItemVariants} whileHover="hover" className="relative"><NavLink to="/dms" style={({ isActive }) => (isActive ? activeStyle : {})}>Mesajlar{hasUnreadMessages && (<span className="absolute -top-1 -right-2 block h-2.5 w-2.5 rounded-full ring-2 ring-dark-gray bg-red-500" title="Okunmamış mesajların var"></span>)}</NavLink></motion.div></li>)}
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/leaderboard" style={({ isActive }) => (isActive ? activeStyle : {})}>Skor Tablosu</NavLink></motion.div></li>
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/chat" style={({ isActive }) => (isActive ? activeStyle : {})}>Sohbet</NavLink></motion.div></li>
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/creator" style={({ isActive }) => (isActive ? activeStyle : {})}>Yapımcı</NavLink></motion.div></li>
           {isAdmin && (<li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/admin" style={({ isActive }) => (isActive ? activeStyle : {})}> <Shield size={18} className="inline-block mr-1 text-green-400" /> <span className="text-green-400">Panel</span></NavLink></motion.div></li>)}
           {user && userProfile ? (<li className="flex items-center gap-3"><Link to={`/profile/${user.uid}`} title="Profilini Görüntüle"><img src={userProfile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-cyber-gray hover:border-electric-purple transition-colors object-cover"/></Link></li>) : (<li><NavLink to="/login" className="bg-electric-purple text-white text-base py-2 px-4 rounded-md hover:bg-opacity-80 transition-all">Giriş Yap</NavLink></li>)}
        </ul>
      </nav>
    </header>
  );
};
export default Header;