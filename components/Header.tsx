import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, UserProfileData } from '../src/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../src/firebase';
import { collection, query, where, onSnapshot, doc, limit, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { Shield, MessagesSquare, MessageCircle, Mail, ShoppingBag, MessageSquare, X } from 'lucide-react'; 
import toast from 'react-hot-toast';

const Header: React.FC = () => {
  const { user, isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [hasUnreadAdminMessage, setHasUnreadAdminMessage] = useState(false);
  const [hasUnreadDmsForAdmin, setHasUnreadDmsForAdmin] = useState(false);
  const [hasPrivateChatNotification, setHasPrivateChatNotification] = useState(false);
  const [privateChatRoomId, setPrivateChatRoomId] = useState<string | null>(null);

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
    let notificationsUnsubscribe: (() => void) | null = null;
    
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
            unsubscribe = onSnapshot(userDocRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data() as UserProfileData;
                    setHasUnreadAdminMessage(data?.unreadAdminMessage === true);
                }
            }, (error) => {
                console.error("Kullanıcı bildirim dinleyicisinde hata:", error);
            });
            
            // --- ÖZEL SOHBET ODASI BİLDİRİMLERİ ---
            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                where('isRead', '==', false),
                where('type', 'in', ['private_chat_invite', 'private_chat_closed']),
                orderBy('createdAt', 'desc')
            );
            
            notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
                console.log('Notification snapshot:', snapshot.size, snapshot.docs.map(doc => doc.data()));
                
                if (!snapshot.empty) {
                    // Process all notifications, not just the first one
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const notification = change.doc.data();
                            console.log('Processing notification:', notification);
                            
                            setHasPrivateChatNotification(true);
                            setPrivateChatRoomId(notification.roomId);
                            
                            // Show toast notification
                            if (notification.type === 'private_chat_invite') {
                                const toastId = toast.custom((t) => (
                                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-dark-gray shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-electric-purple ring-opacity-5`}>
                                        <div className="flex-1 w-0 p-4">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 pt-0.5">
                                                    <MessageSquare className="h-6 w-6 text-electric-purple" />
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <p className="text-sm font-medium text-ghost-white">
                                                        {notification.title}
                                                    </p>
                                                    <p className="mt-1 text-sm text-cyber-gray">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex border-l border-cyber-gray/50">
                                            <button
                                                onClick={() => {
                                                    toast.dismiss(t.id);
                                                    // Mark as read and navigate to chat room
                                                    markNotificationAsRead(notification.roomId);
                                                    navigate(`/admin-chat/${notification.roomId}`);
                                                }}
                                                className="flex items-center justify-center px-4 py-4 rounded-r-lg text-sm font-medium text-electric-purple hover:text-electric-purple/80"
                                            >
                                                Katıl
                                            </button>
                                        </div>
                                    </div>
                                ), { duration: 10000 });
                                
                                // Automatically navigate to chat room after 3 seconds
                                const redirectTimer = setTimeout(() => {
                                    // Dismiss the toast and navigate
                                    toast.dismiss(toastId);
                                    markNotificationAsRead(notification.roomId);
                                    navigate(`/admin-chat/${notification.roomId}`);
                                }, 3000);
                                
                                // Clear the timer if the toast is dismissed manually
                                const clearTimer = () => clearTimeout(redirectTimer);
                                // Store timer ID for cleanup
                                (window as any).toastTimers = (window as any).toastTimers || {};
                                (window as any).toastTimers[toastId] = clearTimer;
                            } else if (notification.type === 'private_chat_closed') {
                                const toastId = toast.custom((t) => (
                                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-dark-gray shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-red-500 ring-opacity-5`}>
                                        <div className="flex-1 w-0 p-4">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 pt-0.5">
                                                    <X className="h-6 w-6 text-red-500" />
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <p className="text-sm font-medium text-ghost-white">
                                                        {notification.title}
                                                    </p>
                                                    <p className="mt-1 text-sm text-cyber-gray">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex border-l border-cyber-gray/50">
                                            <button
                                                onClick={() => {
                                                    toast.dismiss(t.id);
                                                    // Mark as read and navigate to home
                                                    markNotificationAsRead(notification.roomId);
                                                    navigate('/');
                                                }}
                                                className="flex items-center justify-center px-4 py-4 rounded-r-lg text-sm font-medium text-red-500 hover:text-red-400"
                                            >
                                                Tamam
                                            </button>
                                        </div>
                                    </div>
                                ), { duration: 10000 });
                                
                                // Automatically navigate to home after 3 seconds
                                const redirectTimer = setTimeout(() => {
                                    // Dismiss the toast and navigate
                                    toast.dismiss(toastId);
                                    markNotificationAsRead(notification.roomId);
                                    navigate('/');
                                }, 3000);
                                
                                // Clear the timer if the toast is dismissed manually
                                const clearTimer = () => clearTimeout(redirectTimer);
                                // Store timer ID for cleanup
                                (window as any).toastTimers = (window as any).toastTimers || {};
                                (window as any).toastTimers[toastId] = clearTimer;
                            }
                        }
                    });
                } else {
                    setHasPrivateChatNotification(false);
                    setPrivateChatRoomId(null);
                }
            }, (error) => {
                console.error("Özel sohbet bildirim dinleyicisinde hata:", error);
            });
        }
    } else {
        // Kullanıcı yoksa tüm bildirimleri temizle.
        setHasUnreadAdminMessage(false);
        setHasUnreadDmsForAdmin(false);
        setHasPrivateChatNotification(false);
        setPrivateChatRoomId(null);
    }
    
    // TEMİZLİK FONKSİYONU: useEffect'in sonunda SADECE BİR KERE çağrılır.
    // Component kaldırıldığında veya 'user'/'isAdmin' değiştiğinde,
    // HANGİ dinleyici aktif olursa olsun, bu fonksiyon onu kapatır.
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (notificationsUnsubscribe) {
        notificationsUnsubscribe();
      }
    };
  }, [user, isAdmin]); // Bağımlılıklar doğru.

  const markNotificationAsRead = async (roomId: string) => {
    if (!user) return;
    
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('roomId', '==', roomId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(notificationsQuery);
      const batch = writeBatch(db);
      
      snapshot.forEach((docSnapshot) => {
        batch.update(docSnapshot.ref, { isRead: true });
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Bildirim okundu olarak işaretlenirken hata:", error);
    }
  };

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
          
          {user && !isAdmin && hasPrivateChatNotification && (
             <li>
                <motion.div variants={navItemVariants} whileHover="hover" className="relative">
                  <button 
                    onClick={() => {
                      if (privateChatRoomId) {
                        markNotificationAsRead(privateChatRoomId);
                        navigate(`/admin-chat/${privateChatRoomId}`);
                      }
                    }}
                    className="flex items-center gap-1 hover:text-electric-purple transition-colors"
                  >
                      <MessageSquare size={18} /> Özel Sohbet
                      <span className="absolute -top-1 -right-2 flex h-3 w-3">
                        <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
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
          <li><motion.div variants={navItemVariants} whileHover="hover"><NavLink to="/clans" style={({ isActive }) => (isActive ? activeStyle : {})}>Klanlar</NavLink></motion.div></li>
          
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