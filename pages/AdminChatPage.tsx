// TAM VE EKSİKSİZ KOD DOSYASI: pages/AdminChatPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs,
  updateDoc,
  where
} from 'firebase/firestore';
import { LoaderCircle, SendHorizonal, ArrowLeft, User, Download, FileJson, X, AlertTriangle, Plus, Search, Users as UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Message { 
    id: string; 
    text: string; 
    senderId: string; 
    timestamp: any; 
    displayName?: string;
}

interface UserData {
    uid: string;
    displayName: string;
    email: string;
}

const AdminChatPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [roomName, setRoomName] = useState<string>('Yükleniyor...');
    const [isAdmin, setIsAdmin] = useState(false);
    const [participants, setParticipants] = useState<UserData[]>([]);
    const [isRoomActive, setIsRoomActive] = useState(true);
    const [roomCreator, setRoomCreator] = useState<string>('');
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [addingUsers, setAddingUsers] = useState<string[]>([]);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    // Kullanıcıları yükle (admin için)
    useEffect(() => {
        if (isAdmin && showAddUserModal) {
            const loadAllUsers = async () => {
                try {
                    const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
                    const usersSnapshot = await getDocs(usersQuery);
                    const usersData: UserData[] = [];
                    
                    usersSnapshot.forEach((doc) => {
                        const data = doc.data();
                        usersData.push({
                            uid: doc.id,
                            displayName: data.displayName || 'Bilinmeyen Kullanıcı',
                            email: data.email || ''
                        });
                    });
                    
                    setAllUsers(usersData);
                } catch (error) {
                    console.error("Kullanıcılar yüklenirken hata:", error);
                    toast.error('Kullanıcılar yüklenemedi');
                }
            };
            
            loadAllUsers();
        }
    }, [isAdmin, showAddUserModal]);

    useEffect(() => {
        // Admin kontrolü
        const checkAdminStatus = async () => {
            if (user?.uid) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.data();
                const isAdminUser = userData?.role === 'admin';
                setIsAdmin(isAdminUser);
            }
        };
        checkAdminStatus();

        // 1. Hata ayıklama logları ile mevcut durumu kontrol et
        console.log("%c--- Özel Sohbet Odası Yüklendi (AdminChatPage) ---", "color: orange; font-weight: bold;");
        console.log("URL'den gelen Oda ID:", roomId);
        console.log("Giriş yapan kullanıcı UID:", user?.uid);
        
        // 2. Gerekli veriler yoksa işlemi durdur
        if (!roomId || !user) {
            if (!authLoading) setIsLoading(false);
            return;
        }

        // 3. Oda bilgilerini çek
        const getRoomInfo = async () => {
            try {
                const roomDoc = await getDoc(doc(db, 'private_chat_rooms', roomId));
                if (roomDoc.exists()) {
                    const roomData = roomDoc.data();
                    setRoomName(roomData.name || 'Özel Sohbet Odası');
                    setIsRoomActive(roomData.isActive !== false);
                    setRoomCreator(roomData.createdBy || '');
                    
                    // Katılımcı bilgilerini çek
                    const participantData: UserData[] = [];
                    for (const participantId of roomData.participants || []) {
                        const userDoc = await getDoc(doc(db, 'users', participantId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            participantData.push({
                                uid: participantId,
                                displayName: userData.displayName || 'Bilinmeyen Kullanıcı',
                                email: userData.email || ''
                            });
                        }
                    }
                    setParticipants(participantData);
                } else {
                    setRoomName('Geçersiz Oda');
                }
            } catch (error) {
                console.error("Oda bilgileri alınırken hata:", error);
                setRoomName('Oda Bilgileri Alınamadı');
            }
        };
        getRoomInfo();
        
        // 4. Mesajları gerçek zamanlı dinle
        const messagesRef = collection(db, 'private_chat_rooms', roomId, 'messages');
        const q = query(messagesRef, orderBy('timestamp'));

        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(fetchedMessages);
            setIsLoading(false);
        }, (error) => {
            console.error("Mesajlar alınırken Firestore hatası:", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [roomId, user, authLoading]);

    const exportChatHistory = async () => {
        if (!roomId) return;
        
        try {
            const messagesRef = collection(db, 'private_chat_rooms', roomId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'));
            const snapshot = await getDocs(q);
            const chatHistory = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    messageId: doc.id,
                    text: data.text,
                    senderId: data.senderId,
                    senderName: data.displayName,
                    timestamp: data.timestamp?.toDate().toISOString(),
                };
            });

            const fileName = `private-chat-history-${roomId}-${new Date().toISOString().split('T')[0]}.json`;
            const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Sohbet geçmişi dışa aktarılırken hata", error);
            alert("Sohbet geçmişi dışa aktarılırken bir hata oluştu.");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user || !roomId) return;
        if (!isRoomActive) {
            toast.error('Bu sohbet odası kapatılmıştır.');
            return;
        }
        
        const currentMessage = newMessage;
        setNewMessage('');
        
        try {
            const chatDocRef = doc(db, 'private_chat_rooms', roomId);
            const messagesColRef = collection(db, 'private_chat_rooms', roomId, 'messages');
            
            await addDoc(messagesColRef, {
                text: currentMessage,
                senderId: user.uid,
                displayName: user.displayName || 'Anonim Kullanıcı',
                timestamp: serverTimestamp(),
            });
            
            await setDoc(chatDocRef, {
                lastMessage: { text: currentMessage, timestamp: serverTimestamp() },
            }, { merge: true });

        } catch (error) {
            console.error("Mesaj gönderilemedi:", error);
            setNewMessage(currentMessage);
            alert("Mesaj gönderilirken bir hata oluştu. Lütfen konsolu kontrol edin.");
        }
    };
    
    const handleCloseRoom = async () => {
        if (!roomId || !user) return;
        
        // Admin kontrolü
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                console.error('Kullanıcı belgesi bulunamadı');
                toast.error('Kullanıcı bilgileri alınamadı. Lütfen tekrar giriş yapın.');
                return;
            }
            
            const userData = userDoc.data();
            if (userData?.role !== 'admin') {
                console.error('Kullanıcı admin değil:', userData?.role);
                toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız.');
                return;
            }
        } catch (error) {
            console.error('Admin kontrolü sırasında hata:', error);
            toast.error('Yetki kontrolü sırasında bir hata oluştu.');
            return;
        }
        
        if (window.confirm('Bu özel sohbet odasını kapatmak istediğinizden emin misiniz?')) {
            try {
                // Odayı kapat
                await updateDoc(doc(db, 'private_chat_rooms', roomId), {
                    isActive: false,
                    closedAt: serverTimestamp(),
                    closedBy: user.uid
                });
                
                // Katılımcılara bildirim gönder
                for (const participant of participants) {
                    if (participant.uid !== user.uid) {
                        const notificationData = {
                            userId: participant.uid,
                            type: 'private_chat_closed',
                            title: 'Özel Sohbet Odası Kapatıldı',
                            message: `"${roomName}" adlı özel sohbet odası yönetici tarafından kapatıldı. Ana sayfaya yönlendiriliyorsunuz.`,
                            roomId: roomId,
                            roomName: roomName,
                            senderId: user.uid,
                            senderName: user.displayName || 'Admin',
                            createdAt: serverTimestamp(),
                            isRead: false
                        };
                        
                        console.log('Creating close notification for user:', participant.uid, notificationData);
                        
                        try {
                            await addDoc(collection(db, 'notifications'), notificationData);
                            console.log('Close notification created successfully for user:', participant.uid);
                        } catch (notificationError) {
                            console.error('Failed to create close notification for user:', participant.uid, notificationError);
                        }
                    }
                }
                
                toast.success('Özel sohbet odası kapatıldı. Katılımcılar ana sayfaya yönlendiriliyor...');
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } catch (error) {
                console.error("Oda kapatılırken hata:", error);
                toast.error('Oda kapatılırken bir hata oluştu: ' + (error as Error).message);
            }
        }
    };
    
    // Yeni kullanıcı ekleme işlevi
    const addUserToRoom = async (userId: string) => {
        if (!roomId || !user || !isAdmin) return;
        
        // Admin kontrolü
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                console.error('Kullanıcı belgesi bulunamadı');
                toast.error('Kullanıcı bilgileri alınamadı. Lütfen tekrar giriş yapın.');
                return;
            }
            
            const userData = userDoc.data();
            if (userData?.role !== 'admin') {
                console.error('Kullanıcı admin değil:', userData?.role);
                toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız.');
                return;
            }
        } catch (error) {
            console.error('Admin kontrolü sırasında hata:', error);
            toast.error('Yetki kontrolü sırasında bir hata oluştu.');
            return;
        }
        
        // Kullanıcı zaten odadaysa ekleme
        if (participants.some(p => p.uid === userId)) {
            toast.error('Bu kullanıcı zaten odada');
            return;
        }
        
        try {
            // Oda belgesini güncelle
            const roomRef = doc(db, 'private_chat_rooms', roomId);
            const roomDoc = await getDoc(roomRef);
            
            if (roomDoc.exists()) {
                const roomData = roomDoc.data();
                const updatedParticipants = [...(roomData.participants || []), userId];
                
                await updateDoc(roomRef, {
                    participants: updatedParticipants
                });
                
                // Kullanıcıya bildirim gönder
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const notificationData = {
                        userId: userId,
                        type: 'private_chat_invite',
                        title: 'Özel Sohbet Odasına Davet',
                        message: `"${roomName}" adlı özel sohbet odasına davet edildiniz!`,
                        roomId: roomId,
                        roomName: roomName,
                        senderId: user.uid,
                        senderName: user.displayName || 'Admin',
                        createdAt: serverTimestamp(),
                        isRead: false
                    };
                    
                    console.log('Creating notification for user:', userId, notificationData);
                    
                    try {
                        await addDoc(collection(db, 'notifications'), notificationData);
                        console.log('Notification created successfully for user:', userId);
                    } catch (notificationError) {
                        console.error('Failed to create notification for user:', userId, notificationError);
                    }
                    
                    // Kullanıcıyı katılımcılar listesine ekle
                    setParticipants(prev => [
                        ...prev,
                        {
                            uid: userId,
                            displayName: userData.displayName || 'Bilinmeyen Kullanıcı',
                            email: userData.email || ''
                        }
                    ]);
                    
                    toast.success('Kullanıcı odaya eklendi');
                }
            }
        } catch (error) {
            console.error("Kullanıcı eklenirken hata:", error);
            toast.error('Kullanıcı eklenirken bir hata oluştu: ' + (error as Error).message);
        }
    };
    
    // Kullanıcı arama filtresi
    const filteredUsers = searchTerm.trim() === '' 
        ? allUsers 
        : allUsers.filter(u => 
            u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            u.uid.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(u => !participants.some(p => p.uid === u.uid)); // Zaten odada olanları filtrele

    // Enter tuşu ile kullanıcı ekleme
    const handleAddUserOnEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && filteredUsers.length > 0) {
            e.preventDefault();
            addUserToRoom(filteredUsers[0].uid);
            setSearchTerm(''); // Arama kutusunu temizle
        }
    };

    if (isLoading || authLoading) return <div className="flex justify-center items-center h-screen"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) { navigate("/login"); return null; }
    if (!roomId) return <div className="text-center py-20 text-red-500">Geçersiz veya Eksik Oda Kimliği.</div>;

    // Kullanıcının bu odada olup olmadığını kontrol et
    const isParticipant = participants.some(p => p.uid === user.uid);
    if (!isParticipant && !isAdmin) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="bg-dark-gray/50 p-8 rounded-lg border border-cyber-gray/50 text-center max-w-md">
                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-400 mb-2">Erişim Reddedildi</h2>
                    <p className="text-cyber-gray mb-4">
                        Bu özel sohbet odasına erişim izniniz yok.
                    </p>
                    <button 
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-electric-purple hover:bg-electric-purple/80 text-white font-bold rounded-lg transition-colors"
                    >
                        Ana Sayfaya Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-screen bg-space-black text-ghost-white">
            <header className="flex flex-col border-b border-cyber-gray/50 bg-dark-gray/50 flex-shrink-0">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center">
                        <button onClick={() => navigate('/')} className="mr-4 p-2 rounded-full hover:bg-cyber-gray/50 transition-colors">
                            <ArrowLeft />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold font-heading">{roomName}</h2>
                            <p className="text-sm text-cyber-gray flex items-center gap-1">
                                <UsersIcon size={14} />
                                Katılımcılar: {participants.length}
                            </p>
                        </div>
                    </div>
                    
                    {!isRoomActive && (
                        <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-bold">
                            Oda Kapatıldı
                        </div>
                    )}
                </div>
                
                <div className="px-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                        {participants.slice(0, 5).map(participant => (
                            <span 
                                key={participant.uid} 
                                className={`px-2 py-1 rounded-full text-xs ${
                                    participant.uid === user.uid 
                                        ? 'bg-electric-purple/20 text-electric-purple' 
                                        : 'bg-cyber-gray/20 text-ghost-white'
                                }`}
                            >
                                {participant.uid === user.uid ? 'Siz' : participant.displayName}
                            </span>
                        ))}
                        {participants.length > 5 && (
                            <span className="px-2 py-1 bg-cyber-gray/20 text-ghost-white rounded-full text-xs">
                                +{participants.length - 5} daha
                            </span>
                        )}
                    </div>
                </div>
                
                {isAdmin && isRoomActive && (
                    <div className="flex flex-wrap gap-2 p-2 bg-dark-gray/80 border-t border-cyber-gray/50">
                        <button
                            onClick={() => setShowAddUserModal(true)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            <span>Kullanıcı Ekle</span>
                        </button>
                        <button
                            onClick={exportChatHistory}
                            className="flex-1 px-4 py-2 bg-electric-purple text-white rounded-md hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            <span>Sohbeti JSON Olarak İndir</span>
                        </button>
                        <button
                            onClick={handleCloseRoom}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <X size={16} />
                            <span>Odayı Kapat</span>
                        </button>
                    </div>
                )}
                
                {!isRoomActive && (
                    <div className="p-4 bg-red-900/50 border-t border-red-700/50 text-center">
                        <p className="text-red-200 font-bold">Bu özel sohbet odası yönetici tarafından kapatıldı. Ana sayfaya yönlendiriliyorsunuz...</p>
                    </div>
                )}
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                 <AnimatePresence>
                {messages.map(message => {
                    if (!message.timestamp) return null; // Sunucu timestamp'i gelene kadar gösterme
                    const isSender = message.senderId === user.uid;
                    return (
                        <motion.div key={message.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${isSender ? 'bg-electric-purple text-white rounded-br-none' : 'bg-dark-gray text-ghost-white rounded-bl-none'}`}>
                                {!isSender && (
                                    <p className="text-xs font-bold mb-1 opacity-80">
                                        {message.displayName || 'Anonim Kullanıcı'}
                                    </p>
                                )}
                                <p style={{ wordBreak: 'break-word' }}>{message.text}</p>
                            </div>
                        </motion.div>
                    );
                })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </main>

            {isRoomActive ? (
                <footer className="p-4 bg-space-black border-t border-cyber-gray/50 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                        <input 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            placeholder="Bir mesaj yaz..."
                            className="flex-1 w-full p-3 bg-dark-gray text-ghost-white rounded-lg border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none transition-all"
                        />
                        <button 
                            type="submit" 
                            className="p-3 bg-electric-purple text-white rounded-lg hover:bg-opacity-80 transition-all disabled:bg-cyber-gray"
                            disabled={!newMessage.trim()}
                        >
                            <SendHorizonal />
                        </button>
                    </form>
                </footer>
            ) : (
                <div className="p-4 bg-red-900/50 border-t border-red-700/50 text-center">
                    <p className="text-red-200">Bu oda kapatıldığı için mesaj gönderemezsiniz.</p>
                </div>
            )}
            
            {/* Kullanıcı Ekleme Modalı */}
            {showAddUserModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddUserModal(false)}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-space-black p-6 rounded-lg border border-cyber-gray/50 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-2xl font-heading mb-6 text-center text-electric-purple">
                            Kullanıcı Ekle
                        </h3>
                        
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-gray" size={20} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleAddUserOnEnter}
                                    placeholder="Kullanıcı ara... (Enter ile ilk sonucu ekle)"
                                    className="w-full pl-10 p-3 bg-dark-gray border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray"
                                    autoFocus
                                />
                            </div>
                        </div>
                        
                        <div className="mb-6 max-h-60 overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                                <div className="grid grid-cols-1 gap-2">
                                    {filteredUsers.map(userItem => (
                                        <div
                                            key={userItem.uid}
                                            className="flex items-center justify-between p-3 bg-dark-gray/50 rounded-lg border border-cyber-gray/50 hover:bg-dark-gray/70 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-ghost-white truncate">{userItem.displayName}</p>
                                                <p className="text-sm text-cyber-gray truncate">{userItem.email}</p>
                                            </div>
                                            <button
                                                onClick={() => addUserToRoom(userItem.uid)}
                                                disabled={addingUsers.includes(userItem.uid)}
                                                className="px-4 py-2 bg-electric-purple hover:bg-electric-purple/80 disabled:bg-gray-600 text-white rounded-lg transition-colors flex-shrink-0"
                                            >
                                                {addingUsers.includes(userItem.uid) ? 'Ekleniyor...' : 'Ekle'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-cyber-gray">
                                    {searchTerm ? 'Kullanıcı bulunamadı' : 'Tüm kullanıcılar zaten odada'}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowAddUserModal(false)}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminChatPage;