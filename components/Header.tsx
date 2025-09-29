import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, UserProfileData } from '../src/contexts/AuthContext'; // UserProfile'ı UserProfileData olarak düzelttim, seninkine göre ayarla
import { signOut } from 'firebase/auth';
import { auth, db } from '../src/firebase';
import { collection, query, where, onSnapshot, doc, limit } from 'firebase/firestore';
import { Shield, MessagesSquare, MessageCircle, Mail, ShoppingBag } from 'lucide-react'; 

const Header: React.FC = () => {
  const { user, isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [hasUnreadAdminMessage, setHasUnreadAdminMessage] = useState(false);
  const [hasUnreadDmsForAdmin, setHasUnreadDmsForAdmin] = useState(false);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        navigate('/'); 
    } catch(error) { console.error("Çıkış hatası:", error); }
  };

  // ==============================================================================
  //                 İŞTE KRİTİK DÜZELTME BURADA
  // ==============================================================================
  useEffect(() => {
    // Aktif olan dinleyiciyi (unsubscribe fonksiyonunu) tutacak TEK bir değişken tanımla.
    let unsubscribe: (() => void) | null = null;
    
    if (user) {
        if (isAdmin) {
            // --- ADMİN DİNLEYİCİSİ ---
            const chatsRef = collection(db, 'chats');
            const q = query(
                chatsRef, 
                where('users', 'array-contains', user.uid), 
                where(`unreadBy.${user.uid}`, '==', true), 
                limit(1)
            );
            unsubscribe = onSnapshot(q, (snapshot) => {
                setHasUnreadDmsForAdmin(!snapshot.empty);
            }, (error) => {
                console.error("Admin DM dinleyicisinde hata:", error);
            });

        } else {
            // --- KULLANICI DİNLEYİCİSİ ---
            const userDocRef = doc(db, 'users', user.uid);
            unsubscribe = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data() as UserProfileData;
                    setHasUnreadAdminMessage(data?.unreadAdminMessage === true);
                }
            }, (error) => {
                console.error("Kullanıcı bildirim dinleyicisinde hata:", error);
            });
        }
    } else {
        // Kullanıcı yoksa tüm bildirimleri temizle.
        setHasUnreadAdminMessage(false);
        setHasUnreadDmsForAdmin(false);
    }
    
    // TEMİZLİK FONKSİYONU: useEffect'in sonunda SADECE BİR KERE çağrılır.
    // Component kaldırıldığında veya 'user'/'isAdmin' değiştiğinde,
    // HANGİ dinleyici aktif olursa olsun, bu fonksiyon onu kapatır.
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isAdmin]); // Bağımlılıklar doğru.

  // "Adminle Sohbet" butonu (kullanıcı için)
  const handleGoToAdminChat = () => {
    if (!user) return;
    const adminUid = "WXdz4GWVqTb9SwihXFN9nh0LJVn2";
    const chatId = [user.uid, adminUid].sort().join('_');
    navigate(`/dm/${chatId}`);
  };

  const navItemVariants = { hover: { color: '#9F70FD', textShadow: '0 0 5px #9F70FD', scale: 1.1, transition: { duration: 0.2 } } };
  const activeStyle = { color: '#9F70FD', textShadow: '0 0 5px #9F70FD' };

  return (
    <header className="sticky top-0 z-40 bg-dark-gray/70 backdrop-blur-sm border-b border-cyber-gray/50">
      <nav className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-2xl font-heading font-bold hover:text-electric-purple transition-colors">Oyun Mabedi</Link>
        
        <ul className="flex items-center space-x-4 md:space-x-6 text-lg">
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/" style={({ isActive }) => (isActive ? activeStyle : {})}>Ana Sayfa</NavLink></motion.div></li>
          
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
          {user && (
            <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/shop" style={({ isActive }) => (isActive ? activeStyle : {})} className="flex items-center gap-1">
              <ShoppingBag size={18} className="text-yellow-400" /> Siber Dükkan
            </NavLink></motion.div></li>
          )}

          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/creator" style={({ isActive }) => (isActive ? activeStyle : {})}>Yapımcı</NavLink></motion.div></li>
          
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
          
          {user && userProfile ? (
            <li className="flex items-center gap-3">
              <button onClick={handleLogout} className="text-sm text-cyber-gray hover:text-red-500 transition-colors">Çıkış Yap</button>
              <Link to={`/profile/${user.uid}`} title="Profilini Görüntüle">
                <div className="relative">
                  <img 
                    src={userProfile.avatarUrl} 
                    alt="Avatar" 
                    className={`w-10 h-10 rounded-full border-2 object-cover transition-all ${
                      userProfile.inventory?.activeAvatarFrame === 'neon_frame' 
                          ? 'border-cyan-400 ring-2 ring-cyan-400/50' 
                          : userProfile.inventory?.activeAvatarFrame === 'hologram_frame'
                          ? 'border-purple-400 ring-2 ring-purple-400/50'
                          : userProfile.inventory?.activeAvatarFrame === 'golden_frame'
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50'
                          : userProfile.inventory?.activeAvatarFrame === 'matrix_frame'
                          ? 'border-green-400 ring-2 ring-green-400/50'
                          : userProfile.inventory?.activeAvatarFrame === 'fire_frame'
                          ? 'border-red-400 ring-2 ring-red-400/50'
                          : 'border-cyber-gray hover:border-electric-purple'
                    }`}
                  />
                  {/* Aktif çerçeve efekti */}
                  {userProfile.inventory?.activeAvatarFrame && (
                    <div className={`absolute inset-0 rounded-full animate-pulse ${
                      userProfile.inventory.activeAvatarFrame === 'neon_frame' 
                          ? 'ring-1 ring-cyan-400/30' 
                          : userProfile.inventory.activeAvatarFrame === 'hologram_frame'
                          ? 'ring-1 ring-purple-400/30'
                          : userProfile.inventory.activeAvatarFrame === 'golden_frame'
                          ? 'ring-1 ring-yellow-400/30'
                          : userProfile.inventory.activeAvatarFrame === 'matrix_frame'
                          ? 'ring-1 ring-green-400/30'
                          : userProfile.inventory.activeAvatarFrame === 'fire_frame'
                          ? 'ring-1 ring-red-400/30'
                          : ''
                    }`} />
                  )}
                </div>
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