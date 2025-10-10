import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp, deleteField, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase';
import { MicOff, UserX, UserCheck, Send, Eye, LoaderCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

// Use the same UserData interface as AdminPage
interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'user';
  mutedUntil?: Timestamp;
  score?: number;
  clanId?: string;
  clanRole?: string;
  messageCount?: number;
  bannedFromChat?: boolean;
  bannedReason?: string;
  bannedAt?: any;
}

interface AdminChatToolsProps {
  user: any;
  userProfile: any;
  selectedUser: UserData;
  users: UserData[];
  setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
  onClose: () => void;
  onUserUpdated: () => void;
}

const AdminChatTools: React.FC<AdminChatToolsProps> = ({ 
  user, 
  userProfile, 
  selectedUser, 
  users, 
  setUsers, 
  onClose,
  onUserUpdated
}) => {
  const [messageToUser, setMessageToUser] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'message'>('actions');

  // Enhanced mute function with better error handling
  const handleMuteUser = async (durationMs: number) => {
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      const expiryDate = durationMs > 0 ? Timestamp.fromDate(new Date(Date.now() + durationMs)) : null;
      
      await updateDoc(userRef, { 
        mutedUntil: durationMs > 0 ? expiryDate : deleteField()
      });
      
      // Update local state
      setUsers(users.map(u => u.uid === selectedUser.uid ? { 
        ...u, 
        mutedUntil: expiryDate || undefined 
      } : u));
      
      onUserUpdated();
      alert(`Kullanıcının susturma durumu güncellendi: ${durationMs > 0 ? (durationMs / 60000) + ' dakika' : 'Susturma kaldırıldı'}.`);
    } catch (error) {
      console.error("Kullanıcı susturulurken hata:", error);
      alert("Kullanıcı susturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };
  
  // Function to ban a user from chat permanently
  const handleBanUser = async () => {
    if (!window.confirm(`${selectedUser.displayName} adlı kullanıcıyı sohbetten kalıcı olarak yasaklamak istediğinizden emin misiniz?`)) {
      return;
    }
    
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { 
        bannedFromChat: true,
        bannedReason: "Yönetici tarafından kalıcı olarak yasaklandı",
        bannedAt: serverTimestamp()
      });
      
      // Update local state
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...u, bannedFromChat: true } : u));
      
      onUserUpdated();
      alert(`${selectedUser.displayName} sohbetten kalıcı olarak yasaklandı.`);
    } catch (error) {
      console.error("Kullanıcı yasaklanırken hata:", error);
      alert("Kullanıcı yasaklanırken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };
  
  // Function to unban a user
  const handleUnbanUser = async () => {
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { 
        bannedFromChat: deleteField(),
        bannedReason: deleteField(),
        bannedAt: deleteField()
      });
      
      // Update local state
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...u, bannedFromChat: undefined } : u));
      
      onUserUpdated();
      alert(`${selectedUser.displayName} sohbet yasağı kaldırıldı.`);
    } catch (error) {
      console.error("Kullanıcı yasağı kaldırılırken hata:", error);
      alert("Kullanıcı yasağı kaldırılırken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };
  
  // Function to reset user's message count
  const handleResetMessageCount = async () => {
    if (!window.confirm(`${selectedUser.displayName} adlı kullanıcının mesaj sayacını sıfırlamak istediğinizden emin misiniz?`)) {
      return;
    }
    
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { messageCount: 0 });
      
      // Update local state
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...u, messageCount: 0 } : u));
      
      onUserUpdated();
      alert(`${selectedUser.displayName} kullanıcısının mesaj sayacı sıfırlandı.`);
    } catch (error) {
      console.error("Mesaj sayacı sıfırlanırken hata:", error);
      alert("Mesaj sayacı sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };
  
  // Function to send a private message to a user
  const handleSendMessageToUser = async () => {
    if (!messageToUser.trim()) {
      alert("Lütfen göndermek için bir mesaj girin.");
      return;
    }
    
    if (!user) {
      alert("Yönetici oturumu bulunamadı.");
      return;
    }
    
    setIsSendingMessage(true);
    
    try {
      // Create a DM chat between admin and user if it doesn't exist
      const sortedUIDs = [user.uid, selectedUser.uid].sort();
      const chatId = sortedUIDs.join('_');
      
      // Add the message to the chat
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: `[YÖNETİCİ MESAJI] ${messageToUser}`,
        uid: user.uid,
        displayName: userProfile?.displayName || user.displayName,
        createdAt: serverTimestamp(),
        isSystemMessage: true
      });
      
      // Create a notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUser.uid,
        type: 'admin_message',
        title: 'Yöneticiden Mesaj',
        message: `Yöneticiden yeni bir mesaj aldınız: ${messageToUser.substring(0, 50)}${messageToUser.length > 50 ? '...' : ''}`,
        createdAt: serverTimestamp(),
        isRead: false,
        senderName: userProfile?.displayName || user.displayName
      });
      
      setMessageToUser('');
      alert("Mesaj başarıyla gönderildi.");
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      alert("Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const isMuted = selectedUser.mutedUntil && selectedUser.mutedUntil.toDate() > new Date();
  const isBanned = selectedUser.bannedFromChat;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-space-black p-6 rounded-lg border border-cyber-gray/50 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-heading text-electric-purple">Kullanıcı Yönetim Araçları</h3>
          <button onClick={onClose} className="text-cyber-gray hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="border-b border-cyber-gray/50 mb-6">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('actions')}
              className={`pb-2 px-1 font-bold ${activeTab === 'actions' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
            >
              İşlemler
            </button>
            <button 
              onClick={() => setActiveTab('message')}
              className={`pb-2 px-1 font-bold ${activeTab === 'message' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
            >
              Mesaj Gönder
            </button>
          </div>
        </div>
        
        {activeTab === 'actions' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark-gray/50 p-4 rounded-lg">
                <p className="text-cyber-gray text-sm">Kullanıcı Adı</p>
                <p className="font-bold text-lg">{selectedUser.displayName}</p>
              </div>
              <div className="bg-dark-gray/50 p-4 rounded-lg">
                <p className="text-cyber-gray text-sm">E-posta</p>
                <p className="font-bold text-lg">{selectedUser.email}</p>
              </div>
              <div className="bg-dark-gray/50 p-4 rounded-lg">
                <p className="text-cyber-gray text-sm">Rol</p>
                <p className="font-bold text-lg">{selectedUser.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</p>
              </div>
              <div className="bg-dark-gray/50 p-4 rounded-lg">
                <p className="text-cyber-gray text-sm">Mesaj Sayısı</p>
                <p className="font-bold text-lg">{selectedUser.messageCount || 0}</p>
              </div>
            </div>
            
            <div className="bg-dark-gray/50 p-4 rounded-lg">
              <p className="text-cyber-gray text-sm mb-2">Durum</p>
              <div className="flex flex-wrap gap-2">
                {isMuted && (
                  <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                    Susturuldu
                  </span>
                )}
                {isBanned && (
                  <span className="px-3 py-1 bg-red-700/20 text-red-300 rounded-full text-sm">
                    Yasaklandı
                  </span>
                )}
                {!isMuted && !isBanned && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                    Aktif
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-dark-gray/50 p-4 rounded-lg">
              <h4 className="font-heading text-lg mb-3">Yönetim İşlemleri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-cyber-gray text-sm">Susturma</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleMuteUser(5 * 60 * 1000)} // 5 minutes
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm transition-colors"
                    >
                      5dk
                    </button>
                    <button 
                      onClick={() => handleMuteUser(60 * 60 * 1000)} // 1 hour
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm transition-colors"
                    >
                      1sa
                    </button>
                    <button 
                      onClick={() => handleMuteUser(24 * 60 * 60 * 1000)} // 1 day
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm transition-colors"
                    >
                      1gün
                    </button>
                    <button 
                      onClick={() => handleMuteUser(0)} // Remove mute
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm transition-colors"
                      disabled={!isMuted}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-cyber-gray text-sm">Yasaklama</p>
                  <div className="flex gap-2">
                    {isBanned ? (
                      <button 
                        onClick={handleUnbanUser}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm transition-colors"
                      >
                        Yasaklamayı Kaldır
                      </button>
                    ) : (
                      <button 
                        onClick={handleBanUser}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm transition-colors"
                      >
                        Yasakla
                      </button>
                    )}
                    <button 
                      onClick={handleResetMessageCount}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition-colors"
                    >
                      Mesajları Sıfırla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-dark-gray/50 p-4 rounded-lg">
            <h4 className="font-heading text-lg mb-3">Kullanıcıya Mesaj Gönder</h4>
            <div className="space-y-3">
              <textarea
                value={messageToUser}
                onChange={(e) => setMessageToUser(e.target.value)}
                placeholder="Kullanıcıya özel mesaj yazın..."
                className="w-full p-3 bg-space-black border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray h-32 resize-y"
              />
              <button 
                onClick={handleSendMessageToUser}
                disabled={isSendingMessage || !messageToUser.trim()}
                className="w-full px-4 py-2 bg-electric-purple hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSendingMessage ? (
                  <>
                    <LoaderCircle className="animate-spin" size={18} />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Mesajı Gönder
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminChatTools;