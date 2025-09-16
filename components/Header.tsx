// TAM, EKSİKSİZ VE KESİN ÇÖZÜM KODU: components/Header.tsx

import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, UserProfile } from '../src/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../src/firebase';
import { collection, query, where, onSnapshot, doc, limit } from 'firebase/firestore';
import { Shield, MessagesSquare, MessageCircle, Mail } from 'lucide-react'; 

const Header: React.FC = () => {
  const { user, isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // State 1: Normal kullanıcı için okunmamış admin mesajı var mı?
  const [hasUnreadAdminMessage, setHasUnreadAdminMessage] = useState(false);
  // State 2: Admin için okunmamış herhangi bir DM var mı?
  const [hasUnreadDmsForAdmin, setHasUnreadDmsForAdmin] = useState(false);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        navigate('/'); 
    } catch(error) { console.error("Çıkış hatası:", error); }
  };

  // Bildirimleri dinleyen ana useEffect bloğu
  useEffect(() => {
    // 1. KULLANICI İÇİN BİLDİRİM DİNLEYİCİSİ (Admin olmayanlar)
    if (user && !isAdmin) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        const data = doc.data() as UserProfile;
        setHasUnreadAdminMessage(data?.unreadAdminMessage === true);
      });
      return () => unsubscribe(); // Dinleyiciyi temizle
    }
    
    // 2. ADMİN İÇİN BİLDİRİM DİNLEYİCİSİ (Admin olanlar)
    if (user && isAdmin) {
      const chatsRef = collection(db, 'chats');
      // Sorgu: Adminin dahil olduğu VE 'unreadBy' alanında adminin UID'si 'true' olan sohbetleri bul.
      const q = query(
        chatsRef, 
        where('users', 'array-contains', user.uid), 
        where(`unreadBy.${user.uid}`, '==', true), 
        limit(1) // Sadece 1 tane bulması yeterli, bu çok verimlidir.
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        // Eğer sorgu bir sonuç dönerse (snapshot boş değilse), okunmamış mesaj var demektir.
        setHasUnreadDmsForAdmin(!snapshot.empty);
      });
      return () => unsubscribe(); // Dinleyiciyi temizle
    }
    
    // Kullanıcı çıkış yaparsa tüm bildirimleri temizle
    if (!user) {
        setHasUnreadAdminMessage(false);
        setHasUnreadDmsForAdmin(false);
    }
  }, [user, isAdmin]);

  // "Adminle Sohbet" butonu (kullanıcı için)
  const handleGoToAdminChat = () => {
    if (!user) return;
    const adminUid = "WXdz4GWVqTb9SwihXFN9nh0LJVn2"; // Gerçek admin UID'niz
    const chatId = [user.uid, adminUid].sort().join('_');
    navigate(`/dm/${chatId}`);
  };

  const navItemVariants = { hover: { color: '#9F70FD', textShadow: '0 0 5px #9F70FD', scale: 1.1, transition: { duration: 0.2 } } };
  const activeStyle = { color: '#9F70FD', textShadow: '0 0 5px #9F70FD' };

  return (
    <header className="sticky top-0 z-40 bg-dark-gray/70 backdrop-blur-sm border-b border-cyber-gray/50">
      <nav className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-2xl font-heading font-bold hover:text-electric-purple transition-colors">TTMTAL <span className="text-electric-purple">GAMES</span></Link>
        
        {/* Navigasyon Linkleri */}
        <ul className="flex items-center space-x-4 md:space-x-6 text-lg">
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/" style={({ isActive }) => (isActive ? activeStyle : {})}>Ana Sayfa</NavLink></motion.div></li>
          
          {/* SADECE KULLANICILAR İÇİN GÖRÜNEN LİNK */}
          {user && !isAdmin && (
             <li>
                <motion.div variants={navItemVariants} whileHover="hover" className="relative">
                  <button onClick={handleGoToAdminChat} className="flex items-center gap-1 hover:text-electric-purple transition-colors">
                      <MessageCircle size={18} /> Adminle Sohbet
                      {hasUnreadAdminMessage && (
                        <span className="absolute -top-1 -right-2 flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-electric-purple opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-electric-purple"></span></span>
                      )}
                  </button>
                </motion.div>
             </li>
          )}
          
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/all-users" style={({ isActive }) => (isActive ? activeStyle : {})}>Gezginler</NavLink></motion.div></li>
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/leaderboard" style={({ isActive }) => (isActive ? activeStyle : {})}>Skor Tablosu</NavLink></motion.div></li>
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/chat" style={({ isActive }) => (isActive ? activeStyle : {})}>Ana Sohbet Odası</NavLink></motion.div></li>
          {user && (<li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/chat-rooms" style={({ isActive }) => (isActive ? activeStyle : {})}>
            <MessagesSquare size={18} className="inline-block mr-1"/><span className="hidden md:inline">Diğer Odalar</span></NavLink></motion.div></li>
          )}
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/creator" style={({ isActive }) => (isActive ? activeStyle : {})}>Yapımcı</NavLink></motion.div></li>
          
          {/* SADECE ADMİN İÇİN GÖRÜNEN LİNKLER */}
          {isAdmin && (
            <>
              <li>
                <motion.div variants={navItemVariants} whileHover="hover" className="relative">
                  <NavLink to="/messages" style={({ isActive }) => (isActive ? activeStyle : {})} className="flex items-center gap-1">
                      <Mail size={18} /> DM Gelen Kutusu
                      {hasUnreadDmsForAdmin && (
                        <span className="absolute -top-1 -right-2 flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                      )}
                  </NavLink>
                </motion.div>
              </li>
              <li>
                <motion.div variants={navItemVariants} whileHover="hover">
                    <NavLink to="/admin" style={({ isActive }) => (isActive ? activeStyle : {})}>
                        <Shield size={18} className="inline-block mr-1 text-green-400" /> 
                        <span className="text-green-400">Panel</span>
                    </NavLink>
                </motion.div>
              </li>
            </>
          )}
          
          {/* Giriş/Çıkış ve Profil Alanı */}
          {user && userProfile ? (
            <li className="flex items-center gap-3">
              <button onClick={handleLogout} className="text-sm text-cyber-gray hover:text-red-500 transition-colors">Çıkış Yap</button>
              <Link to={`/profile/${user.uid}`} title="Profilini Görüntüle">
                <img src={userProfile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-cyber-gray hover:border-electric-purple transition-colors object-cover"/>
              </Link>
            </li>
          ) : (
            <li><NavLink to="/login" className="bg-electric-purple text-white text-base py-2 px-4 rounded-md hover:bg-opacity-80 transition-all">Giriş Yap</NavLink></li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;