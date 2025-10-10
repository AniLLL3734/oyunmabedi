import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp, deleteField, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase';
import { MicOff, UserX, UserCheck, Send, Eye, LoaderCircle, X, Ban, VolumeX, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Define the UserData interface with the same types as AdminPage
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
  lastActive?: any;
  bannedFromChat?: boolean;
  bannedReason?: string;
  bannedAt?: any;
  joinDate?: any;
  lastLogin?: any;
}

interface EnhancedAdminChatControlsProps {
  user: any;
  userProfile: any;
  selectedUser: UserData;
  users: UserData[];
  setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
  onClose: () => void;
  onUserUpdated: () => void;
}

const EnhancedAdminChatControls: React.FC<EnhancedAdminChatControlsProps> = ({ 
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
  const [activeTab, setActiveTab] = useState<'moderation' | 'communication' | 'stats'>('moderation');
  const [tempMuteDuration, setTempMuteDuration] = useState(30); // minutes

  // Enhanced mute function with better error handling
  const handleMuteUser = async (durationMinutes: number) => {
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      const expiryDate = durationMinutes > 0 ? 
        Timestamp.fromDate(new Date(Date.now() + durationMinutes * 60 * 1000)) : null;
      
      await updateDoc(userRef, { 
        mutedUntil: durationMinutes > 0 ? expiryDate : deleteField()
      });
      
      // Update local state
      setUsers(users.map(u => u.uid === selectedUser.uid ? { 
        ...u, 
        mutedUntil: expiryDate || undefined 
      } : u));
      
      onUserUpdated();
      alert(`Kullanıcının susturma durumu güncellendi: ${durationMinutes > 0 ? durationMinutes + ' dakika' : 'Susturma kaldırıldı'}.`);
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
        className="bg-space-black p-6 rounded-lg border border-cyber-gray/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-heading text-electric-purple">Gelişmiş Kullanıcı Yönetim Araçları</h3>
          <button onClick={onClose} className="text-cyber-gray hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="border-b border-cyber-gray/50 mb-6">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('moderation')}
              className={`pb-2 px-1 font-bold ${activeTab === 'moderation' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
            >
              Moderasyon
            </button>
            <button 
              onClick={() => setActiveTab('communication')}
              className={`pb-2 px-1 font-bold ${activeTab === 'communication' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
            >
              İletişim
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`pb-2 px-1 font-bold ${activeTab === 'stats' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
            >
              İstatistikler
            </button>
          </div>
        </div>
        
        {activeTab === 'moderation' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-dark-gray/50 p-4 rounded-lg">
                <h4 className="font-heading text-lg mb-3 flex items-center gap-2">
                  <MicOff className="text-yellow-400" /> Susturma
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tempMuteDuration}
                      onChange={(e) => setTempMuteDuration(Number(e.target.value))}
                      className="w-20 p-2 bg-space-black border border-cyber-gray/50 rounded-md text-ghost-white"
                      min="1"
                    />
                    <span>dakika</span>
                    <button 
                      onClick={() => handleMuteUser(tempMuteDuration)}
                      className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm transition-colors"
                    >
                      Uygula
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleMuteUser(5)} // 5 minutes
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm transition-colors"
                    >
                      5dk
                    </button>
                    <button 
                      onClick={() => handleMuteUser(30)} // 30 minutes
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm transition-colors"
                    >
                      30dk
                    </button>
                    <button 
                      onClick={() => handleMuteUser(60)} // 1 hour
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm transition-colors"
                    >
                      1sa
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
              </div>
              
              <div className="bg-dark-gray/50 p-4 rounded-lg">
                <h4 className="font-heading text-lg mb-3 flex items-center gap-2">
                  <Ban className="text-red-400" /> Yasaklama
                </h4>
                <div className="space-y-3">
                  {isBanned ? (
                    <button 
                      onClick={handleUnbanUser}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <UserCheck size={18} /> Yasaklamayı Kaldır
                    </button>
                  ) : (
                    <button 
                      onClick={handleBanUser}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Ban size={18} /> Kullanıcıyı Yasakla
                    </button>
                  )}
                  <button 
                    onClick={handleResetMessageCount}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={18} /> Mesaj Sayacını Sıfırla
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-dark-gray/50 p-4 rounded-lg">
              <h4 className="font-heading text-lg mb-3">Kullanıcı Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-space-black p-3 rounded-md">
                  <p className="text-cyber-gray text-sm">Kullanıcı Adı</p>
                  <p className="font-bold">{selectedUser.displayName}</p>
                </div>
                <div className="bg-space-black p-3 rounded-md">
                  <p className="text-cyber-gray text-sm">E-posta</p>
                  <p className="font-bold">{selectedUser.email}</p>
                </div>
                <div className="bg-space-black p-3 rounded-md">
                  <p className="text-cyber-gray text-sm">Rol</p>
                  <p className="font-bold">{selectedUser.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</p>
                </div>
                <div className="bg-space-black p-3 rounded-md">
                  <p className="text-cyber-gray text-sm">Mesaj Sayısı</p>
                  <p className="font-bold">{selectedUser.messageCount || 0}</p>
                </div>
                <div className="bg-space-black p-3 rounded-md">
                  <p className="text-cyber-gray text-sm">Durum</p>
                  <div className="flex flex-wrap gap-1">
                    {isMuted && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded-full text-xs">
                        Susturuldu
                      </span>
                    )}
                    {isBanned && (
                      <span className="px-2 py-1 bg-red-700/20 text-red-300 rounded-full text-xs">
                        Yasaklandı
                      </span>
                    )}
                    {!isMuted && !isBanned && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                        Aktif
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'communication' ? (
          <div className="bg-dark-gray/50 p-4 rounded-lg">
            <h4 className="font-heading text-lg mb-3 flex items-center gap-2">
              <Send className="text-blue-400" /> Kullanıcıya Mesaj Gönder
            </h4>
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
        ) : (
          <div className="bg-dark-gray/50 p-4 rounded-lg">
            <h4 className="font-heading text-lg mb-3">Kullanıcı İstatistikleri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-space-black p-4 rounded-md">
                <p className="text-cyber-gray">Toplam Mesaj</p>
                <p className="text-3xl font-bold text-electric-purple">{selectedUser.messageCount || 0}</p>
              </div>
              <div className="bg-space-black p-4 rounded-md">
                <p className="text-cyber-gray">Hesap Oluşturma</p>
                <p className="text-lg font-bold">
                  {selectedUser.joinDate ? new Date(selectedUser.joinDate).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                </p>
              </div>
              <div className="bg-space-black p-4 rounded-md">
                <p className="text-cyber-gray">Son Giriş</p>
                <p className="text-lg font-bold">
                  {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                </p>
              </div>
              <div className="bg-space-black p-4 rounded-md">
                <p className="text-cyber-gray">Durum</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {isMuted && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded-full text-xs">
                      Susturuldu
                    </span>
                  )}
                  {isBanned && (
                    <span className="px-2 py-1 bg-red-700/20 text-red-300 rounded-full text-xs">
                      Yasaklandı
                    </span>
                  )}
                  {!isMuted && !isBanned && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                      Aktif
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EnhancedAdminChatControls;