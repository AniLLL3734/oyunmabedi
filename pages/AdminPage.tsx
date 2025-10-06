import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  deleteDoc, 
  updateDoc, 
  Timestamp, 
  onSnapshot, 
  getDocs, 
  addDoc, 
  setDoc, 
  getDoc, 
  where
} from 'firebase/firestore';
import { 
  LoaderCircle, Users, Gamepad2, Shield, Trash2, MicOff, MessageSquare, 
  Eye, EyeOff, Activity, TrendingUp, Clock, Zap, Megaphone, Pin, Trash, 
  UserX, Crown, Download, Trophy, Search, User, Plus, Minus, Flag, 
  AlertTriangle, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// INTERFACE TANIMLAMALARI
interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    mutedUntil?: Timestamp;
    score?: number;
}
interface GameData {
    id: string;
    title: string;
    category?: string;
    playCount?: number;
}
interface FeedbackData {
    id: string;
    uid: string;
    displayName: string;
    message: string;
    isRead: boolean;
    createdAt: any;
}
interface ReportData {
    id: string;
    reportedUserId: string;
    reporterUserId: string;
    reason: string;
    messageId?: string;
    createdAt: any;
    status: 'pending' | 'reviewed' | 'resolved';
    reporterName?: string;
    reportedUserName?: string;
}
interface SystemStats {
    activeUsers: number;
    totalMessages: number;
    messagesLastHour: number;
    totalGamesPlayed: number;
    gamesLastHour: number;
    topChatter?: {
        displayName: string;
        messageCount: number;
        uid: string;
    };
}
interface ChatRoom {
    id: string;
    name: string;
    participants: string[];
    createdBy: string;
    createdAt: Timestamp;
    isActive: boolean;
}

// MUTE MODAL COMPONENT'İ
const MuteModal: React.FC<{
    user: UserData;
    onClose: () => void;
    onMute: (uid: string, durationMs: number) => void;
}> = ({ user, onClose, onMute }) => {
    const durations = [
        { label: '5 Dakika', value: 5 * 60 * 1000 },
        { label: '1 Saat', value: 60 * 60 * 1000 },
        { label: '1 Gün', value: 24 * 60 * 60 * 1000 },
        { label: 'Kalıcı (10 Yıl)', value: 10 * 365 * 24 * 60 * 60 * 1000 },
    ];
    const isCurrentlyMuted = user.mutedUntil && user.mutedUntil.toDate() > new Date();

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-space-black p-6 rounded-lg border border-cyber-gray/50 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-heading mb-4 text-center">Sustur: <span className="text-electric-purple">{user.displayName}</span></h3>
                {isCurrentlyMuted && (<div className="mb-4 text-center p-3 bg-yellow-900/50 border border-yellow-700/50 rounded-md"><p className="text-yellow-300 text-sm">Bu kullanıcı şu an susturulmuş.</p><p className="text-xs text-yellow-500">Bitiş: {user.mutedUntil?.toDate().toLocaleString('tr-TR')}</p></div>)}
                <div className="grid grid-cols-2 gap-4">{durations.map(d => (<button key={d.value} onClick={() => onMute(user.uid, d.value)} className="w-full p-3 bg-dark-gray hover:bg-electric-purple/80 rounded-md transition-colors font-semibold">{d.label}</button>))}</div>
                <div className="mt-4 border-t border-cyber-gray/30 pt-4"><button onClick={() => onMute(user.uid, 0)} className="w-full p-3 bg-red-800 hover:bg-red-700 rounded-md transition-colors font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={!isCurrentlyMuted}>Susturmayı Kaldır</button></div>
            </motion.div>
        </div>
    );
};

// USER SELECTION MODAL COMPONENT'İ
const UserSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    availableUsers: UserData[];
    selectedUsers: UserData[];
    onUserToggle: (user: UserData) => void;
    onCreateRoom: () => void;
    roomName: string;
    setRoomName: (name: string) => void;
}> = ({ isOpen, onClose, availableUsers, selectedUsers, onUserToggle, onCreateRoom, roomName, setRoomName }) => {
    if (!isOpen) return null;
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredUsers = searchTerm.trim() === '' 
        ? availableUsers 
        : availableUsers.filter(user => 
            user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            user.uid.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-space-black p-6 rounded-lg border border-cyber-gray/50 w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-2xl font-heading mb-6 text-center text-electric-purple">Sohbet Odası Oluştur</h3>
                <div className="mb-6">
                    <label className="block text-cyber-gray mb-2">Oda Adı</label>
                    <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Oda adını girin..." className="w-full p-3 bg-dark-gray border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray" autoFocus />
                </div>
                <div className="mb-6 flex-1 min-h-0 flex flex-col">
                    <h4 className="text-lg font-bold text-ghost-white mb-2">Katılımcıları Seçin</h4>
                     <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Kullanıcı ara..."
                        className="w-full p-3 bg-dark-gray border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray mb-4"
                    />
                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 pr-2">
                        {filteredUsers.map(user => (
                            <div key={user.uid} onClick={() => onUserToggle(user)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedUsers.some(u => u.uid === user.uid) ? 'bg-electric-purple/20 border-electric-purple' : 'bg-dark-gray/50 border-cyber-gray/50 hover:bg-dark-gray/70'}`}>
                                <p className="font-bold text-ghost-white truncate">{user.displayName}</p>
                                <p className="text-sm text-cyber-gray truncate">{user.email}</p>
                            </div>
                        ))}
                         {filteredUsers.length === 0 && <div className="col-span-2 text-center py-4 text-cyber-gray">Kullanıcı bulunamadı</div>}
                    </div>
                </div>
                <div className="flex gap-4 mt-auto pt-4 border-t border-cyber-gray/50">
                    <button onClick={onCreateRoom} disabled={!roomName.trim() || selectedUsers.length === 0} className="flex-1 px-6 py-3 bg-electric-purple hover:bg-electric-purple/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors">Oda Oluştur ({selectedUsers.length} katılımcı)</button>
                    <button onClick={onClose} className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors">İptal</button>
                </div>
            </motion.div>
        </div>
    );
};


// ANA ADMIN PAGE COMPONENT'İ
const AdminPage: React.FC = () => {
    const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'dashboard' | 'users' | 'games' | 'feedback' | 'reports' | 'chatroom' | 'privateChat' | 'commands'>('dashboard');
    
    // STATE TANIMLAMALARI
    const [users, setUsers] = useState<UserData[]>([]);
    const [games, setGames] = useState<GameData[]>([]);
    const [feedback, setFeedback] = useState<FeedbackData[]>([]);
    const [reports, setReports] = useState<ReportData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
    const [selectedUserForMute, setSelectedUserForMute] = useState<UserData | null>(null);
    const [systemStats, setSystemStats] = useState<SystemStats>({ activeUsers: 0, totalMessages: 0, messagesLastHour: 0, totalGamesPlayed: 0, gamesLastHour: 0 });
    
    // KOMUTLAR İÇİN STATE'LER
    const [announcementText, setAnnouncementText] = useState('');
    const [pinText, setPinText] = useState('');
    const [muteUsername, setMuteUsername] = useState('');
    const [muteDuration, setMuteDuration] = useState('5m');
    const [kickUsername, setKickUsername] = useState('');
    const [slowModeDelay, setSlowModeDelay] = useState('5');
    const [chatPauseReason, setChatPauseReason] = useState('');
    const [gameCommentsEnabled, setGameCommentsEnabled] = useState(true);

    // SKOR YÖNETİMİ İÇİN STATE'LER
    const [searchUser, setSearchUser] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [scoreAmount, setScoreAmount] = useState<number>(0);
    
    // ÖZEL SOHBET ODALARI İÇİN STATE'LER
    const [isUserSelectionModalOpen, setIsUserSelectionModalOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<UserData[]>([]);
    const [selectedUsersForRoom, setSelectedUsersForRoom] = useState<UserData[]>([]);
    const [privateChatRoomName, setPrivateChatRoomName] = useState('');
    const [privateChatRooms, setPrivateChatRooms] = useState<any[]>([]);

    
    // YETKİ KONTROLÜ VE VERİ ÇEKME İŞLEMLERİ
    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) {
            navigate('/');
            return;
        }

        const fetchAllUsersForModal = async () => {
            try {
                const q = query(collection(db, 'users'), orderBy('displayName'));
                const querySnapshot = await getDocs(q);
                const allUsers = querySnapshot.docs
                    .map(doc => ({ uid: doc.id, ...doc.data() } as UserData))
                    .filter(u => u.uid !== user?.uid);
                setAvailableUsers(allUsers);
            } catch (error) {
                console.error("Modal için kullanıcılar çekilirken hata:", error);
            }
        };

        fetchAllUsersForModal();
    }, [isAdmin, authLoading, navigate, user?.uid]);


    useEffect(() => {
        if (!isAdmin) {
            setIsLoading(false);
            return;
        }
    
        const fetchDataForView = async () => {
            setIsLoading(true);
            try {
                if (view === 'users') {
                    const q = query(collection(db, 'users'), orderBy('displayName'));
                    const querySnapshot = await getDocs(q);
                    setUsers(querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
                } else if (view === 'games') {
                    const q = query(collection(db, 'games'), orderBy('playCount', 'desc'));
                    const querySnapshot = await getDocs(q);
                    setGames(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameData)));
                } else if (view === 'feedback') {
                    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    setFeedback(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackData)));
                } else if (view === 'reports') {
                    const q = query(collection(db, 'user_reports'), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    const reportsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportData));
                    
                    const reportsWithNames = await Promise.all(reportsData.map(async (report) => {
                        try {
                            const [reporterDoc, reportedDoc] = await Promise.all([
                                getDoc(doc(db, 'users', report.reporterUserId)),
                                getDoc(doc(db, 'users', report.reportedUserId))
                            ]);
                            return { ...report, reporterName: reporterDoc.data()?.displayName || 'Bilinmeyen', reportedUserName: reportedDoc.data()?.displayName || 'Bilinmeyen' };
                        } catch {
                            return { ...report, reporterName: 'Bilinmeyen', reportedUserName: 'Bilinmeyen' };
                        }
                    }));
                    setReports(reportsWithNames);
                } else if (view === 'privateChat') {
                     const q = query(collection(db, 'private_chat_rooms'), orderBy('createdAt', 'desc'));
                     onSnapshot(q, (snapshot) => {
                        const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setPrivateChatRooms(rooms);
                     });
                }
            } catch (error) { 
                console.error("Admin paneli verisi çekilirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDataForView();

    }, [view, isAdmin]);


    useEffect(() => {
        if (!isAdmin) return;

        // Ayarları Çek
        const fetchSettings = async () => {
            const settingsDoc = await getDoc(doc(db, 'chat_meta', 'settings'));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                setGameCommentsEnabled(data.gameCommentsEnabled !== false); // default true
            }
        };
        fetchSettings();

        // İSTATİSTİKLER İÇİN SNAPSHOT LISTENER'LAR
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setSystemStats(prev => ({ ...prev, activeUsers: snapshot.size }));
        });

        const unsubMessages = onSnapshot(collection(db, 'messages'), async (snapshot) => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            const messagesLastHour = snapshot.docs.filter(doc => doc.data().createdAt?.toDate() > oneHourAgo).length;

            const messageCountByUser = snapshot.docs.reduce((acc, doc) => {
                const uid = doc.data().uid;
                if (uid && uid !== 'system') { acc[uid] = (acc[uid] || 0) + 1; }
                return acc;
            }, {} as { [key: string]: number });

            let topChatterId = '';
            let maxMessages = 0;
            Object.entries(messageCountByUser).forEach(([uid, count]) => {
                if (count > maxMessages) { maxMessages = count; topChatterId = uid; }
            });

            let topChatterData;
            if (topChatterId) {
                const userDoc = await getDoc(doc(db, 'users', topChatterId));
                if (userDoc.exists()) {
                    topChatterData = {
                        uid: topChatterId,
                        displayName: userDoc.data().displayName,
                        messageCount: maxMessages
                    };
                }
            }
            
            setSystemStats(prev => ({ ...prev, totalMessages: snapshot.size, messagesLastHour, topChatter: topChatterData }));
        });

        const unsubGames = onSnapshot(collection(db, 'games'), (snapshot) => {
            const totalGamesPlayed = snapshot.docs.reduce((sum, doc) => sum + (doc.data().playCount || 0), 0);
            setSystemStats(prev => ({ ...prev, totalGamesPlayed }));
        });

        return () => {
            unsubUsers();
            unsubMessages();
            unsubGames();
        };
    }, [isAdmin]);
    
    // FONKSİYONLAR

    // Modal Fonksiyonları
    const openMuteModal = (userToMute: UserData) => { setSelectedUserForMute(userToMute); setIsMuteModalOpen(true); };
    const closeMuteModal = () => { setSelectedUserForMute(null); setIsMuteModalOpen(false); };
    
    // Kullanıcı Yönetim Fonksiyonları
    const handleMuteUser = async (uid: string, durationMs: number) => {
        const userRef = doc(db, 'users', uid);
        try {
            const expiryDate = durationMs > 0 ? Timestamp.fromDate(new Date(Date.now() + durationMs)) : null;
            await updateDoc(userRef, { mutedUntil: expiryDate });
            setUsers(users.map(u => u.uid === uid ? { ...u, mutedUntil: expiryDate || undefined } : u));
            alert(`Kullanıcının susturma durumu güncellendi: ${durationMs > 0 ? (durationMs / 60000) + ' dakika' : 'Susturma kaldırıldı'}.`);
        } catch (error) {
            console.error("Kullanıcı susturulurken hata:", error);
        } finally {
            closeMuteModal();
        }
    };
    
    const handleDeleteUser = async (userToDelete: UserData) => {
        if (window.confirm(`${userToDelete.displayName} adlı kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            try {
                await deleteDoc(doc(db, 'users', userToDelete.uid));
                setUsers(users.filter(u => u.uid !== userToDelete.uid));
                alert("Kullanıcı başarıyla silindi.");
            } catch (error) {
                console.error("Kullanıcı silinirken hata:", error);
                alert("Kullanıcı silinirken bir hata oluştu.");
            }
        }
    };

    const startDmWithUser = async (targetUser: UserData) => {
        if (!user || !targetUser.uid) {
            alert("Sohbet başlatılamıyor: Kullanıcı bilgileri eksik.");
            return;
        }
        const sortedUIDs = [user.uid, targetUser.uid].sort();
        const chatId = sortedUIDs.join('_');
        try {
            await setDoc(doc(db, 'chats', chatId), { 
                users: sortedUIDs, 
                userNames: [userProfile?.displayName || user.displayName, targetUser.displayName]
            }, { merge: true });
            navigate(`/dm/${chatId}`);
        } catch(error) {
             console.error("DM başlatılırken Firestore hatası:", error);
             alert("Özel sohbet başlatılırken bir hata oluştu.");
        }
    };

    // Feedback Yönetim Fonksiyonları
    const toggleFeedbackRead = async (feedbackItem: FeedbackData) => {
        const feedbackRef = doc(db, 'feedback', feedbackItem.id);
        try {
            const newReadState = !feedbackItem.isRead;
            await updateDoc(feedbackRef, { isRead: newReadState });
            setFeedback(feedback.map(fb => fb.id === feedbackItem.id ? { ...fb, isRead: newReadState } : fb));
        } catch (error) { console.error("Geri bildirim durumu güncellenirken hata:", error); }
    };
    
    const handleDeleteFeedback = async (feedbackId: string) => {
        if (window.confirm("Bu geri bildirimi kalıcı olarak silmek istediğinizden emin misiniz?")) {
            try {
                await deleteDoc(doc(db, 'feedback', feedbackId));
                setFeedback(feedback.filter(fb => fb.id !== feedbackId));
                alert("Geri bildirim silindi.");
            } catch (error) { console.error("Geri bildirim silinirken hata:", error); }
        }
    };

    // Rapor Yönetim Fonksiyonları
    const handleUpdateReportStatus = async (reportId: string, newStatus: 'pending' | 'reviewed' | 'resolved') => {
        try {
            await updateDoc(doc(db, 'user_reports', reportId), { status: newStatus });
            setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
            alert(`Rapor durumu "${newStatus}" olarak güncellendi.`);
        } catch (error) { console.error("Rapor durumu güncellenirken hata:", error); }
    };

    const handleDeleteReport = async (reportId: string) => {
        if (window.confirm("Bu raporu kalıcı olarak silmek istediğinizden emin misiniz?")) {
            try {
                await deleteDoc(doc(db, 'user_reports', reportId));
                setReports(reports.filter(r => r.id !== reportId));
                alert("Rapor silindi.");
            } catch (error) { console.error("Rapor silinirken hata:", error); }
        }
    };

    // Özel Sohbet Odası Fonksiyonları
    const handleUserToggle = (user: UserData) => {
        setSelectedUsersForRoom(prev =>
            prev.some(u => u.uid === user.uid)
                ? prev.filter(u => u.uid !== user.uid)
                : [...prev, user]
        );
    };

    const openUserSelectionModal = () => setIsUserSelectionModalOpen(true);
    const closeUserSelectionModal = () => { setIsUserSelectionModalOpen(false); setSelectedUsersForRoom([]); setPrivateChatRoomName(''); };

    const handleCreatePrivateChatRoom = async () => {
        if (!privateChatRoomName.trim() || selectedUsersForRoom.length === 0 || !user) return;
        try {
            const roomId = `private_${Date.now()}`;
            const participants = [user.uid, ...selectedUsersForRoom.map(u => u.uid)];
            await setDoc(doc(db, 'private_chat_rooms', roomId), {
                name: privateChatRoomName.trim(), participants, createdBy: user.uid,
                createdAt: Timestamp.now(), isActive: true
            });
            await addDoc(collection(db, 'private_chat_rooms', roomId, 'messages'), {
                text: `🆕 **Özel sohbet odası oluşturuldu!**`, uid: 'system',
                displayName: 'Sistem', createdAt: Timestamp.now(), isSystemMessage: true
            });
            closeUserSelectionModal();
            alert('Özel sohbet odası başarıyla oluşturuldu!');
        } catch (error) {
            console.error('Özel sohbet odası oluşturma hatası:', error);
            alert('Özel sohbet odası oluşturulurken bir hata oluştu.');
        }
    };

    const handleClosePrivateChatRoom = async (roomId: string, roomName: string) => {
         if (window.confirm(`"${roomName}" adlı odayı kapatmak istediğinizden emin misiniz?`)) {
            try {
                await updateDoc(doc(db, 'private_chat_rooms', roomId), {
                    isActive: false, closedAt: Timestamp.now(), closedBy: user?.uid
                });
                alert('Özel sohbet odası başarıyla kapatıldı!');
            } catch (error) {
                console.error('Özel sohbet odası kapatma hatası:', error);
            }
        }
    };

    // Komut Fonksiyonları
    const parseDuration = (duration: string): number => {
        const match = duration.match(/^(\d+)([mhd])$/);
        if (!match) return 0;
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 0;
        }
    };
    
    const sendAnnouncement = async () => {
        if (!announcementText.trim()) return;
        try {
            await addDoc(collection(db, 'messages'), {
                text: `📢 **DUYURU:** ${announcementText}`,
                uid: 'system', displayName: 'Sistem', createdAt: new Date(), isAnnouncement: true
            });
            setAnnouncementText(''); alert('Duyuru gönderildi!');
        } catch (error) { console.error('Duyuru gönderilirken hata:', error); }
    };

    const removeAnnouncement = async () => {
        try {
             await setDoc(doc(db, 'chat_meta', 'pinned_message'), { text: "" }); // Bu duyuruyu nasıl kaldırdığınıza bağlı
             alert('Duyuru kaldırıldı!');
        } catch (error) { console.error('Duyuru kaldırılırken hata:', error); }
    };
    
    const pinMessage = async () => {
        if (!pinText.trim()) return;
        try {
            await setDoc(doc(db, 'chat_meta', 'pinned_message'), {
                text: pinText, pinnedBy: userProfile?.displayName || 'Admin', pinnedAt: new Date()
            });
            setPinText(''); alert('Mesaj sabitlendi!');
        } catch (error) { console.error('Mesaj sabitlenirken hata:', error); }
    };
    
    const muteUser = async () => {
        if (!muteUsername.trim()) return;
        try {
            // Gerçek mute işlemi için kullanıcıyı bulup güncellemek gerekir.
            // Bu sadece bir bildirim gönderir. Gerçek Mute için `handleMuteUser` kullanılmalı.
            await addDoc(collection(db, 'messages'), {
                text: `🔇 **${muteUsername}** susturuldu. (Bildirim)`, uid: 'system',
                displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true
            });
            setMuteUsername(''); alert('Susturma bildirimi gönderildi!');
        } catch (error) { console.error('Susturma bildirimi gönderilirken hata:', error); }
    };
    
    const kickUser = async () => {
        if (!kickUsername.trim()) return;
        try {
            // Gerçek kick işlemi için kullanıcıyı silmek gerekir.
            // Bu sadece bir bildirim gönderir. Gerçek Kick için `handleDeleteUser` kullanılmalı.
            await addDoc(collection(db, 'messages'), {
                text: `👢 **${kickUsername}** atıldı. (Bildirim)`, uid: 'system',
                displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true
            });
            setKickUsername(''); alert('Atma bildirimi gönderildi!');
        } catch (error) { console.error('Atma bildirimi gönderilirken hata:', error); }
    };
    
    const clearChat = async () => {
        if (window.confirm('Bu sadece bir temizleme bildirimi gönderir, mesajları silmez. Emin misiniz?')) {
             try {
                await addDoc(collection(db, 'messages'), { text: '🧹 **Sohbet temizlendi.**', uid: 'system', displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true });
                alert('Temizleme bildirimi gönderildi!');
             } catch (error) { console.error('Temizleme bildirimi gönderilirken hata:', error); }
        }
    };
    
    const toggleChatSetting = async (setting: object, message: string, alertMsg: string) => {
        try {
            await setDoc(doc(db, 'chat_meta', 'settings'), setting, { merge: true });
            await addDoc(collection(db, 'messages'), { text: message, uid: 'system', displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true });
            alert(alertMsg);
        } catch (error) { console.error(`Ayar değiştirilirken hata: ${alertMsg}`, error); }
    };
    
    const toggleSlowMode = (enabled: boolean) => {
        const delay = parseInt(slowModeDelay);
        toggleChatSetting(
            { slowMode: enabled, slowModeDelay: enabled ? delay : 0 },
            enabled ? `⏱️ **Yavaş mod aktif.** (${delay} sn)` : '⏱️ **Yavaş mod kapatıldı.**',
            enabled ? 'Yavaş mod açıldı!' : 'Yavaş mod kapatıldı!'
        );
    };
    
    const toggleChatPause = (paused: boolean) => {
        toggleChatSetting(
            { chatPaused: paused, chatPauseReason: paused ? chatPauseReason : '' },
            paused ? `🚫 **Sohbet durduruldu.** Neden: ${chatPauseReason}` : '✅ **Sohbet tekrar aktif.**',
            paused ? 'Sohbet durduruldu!' : 'Sohbet tekrar aktif!'
        );
    };

    const toggleGameComments = (enabled: boolean) => {
        setGameCommentsEnabled(enabled);
        toggleChatSetting(
            { gameCommentsEnabled: enabled },
            enabled ? '💬 **Oyun yorumları aktif.**' : '🚫 **Oyun yorumları kapatıldı.**',
            enabled ? 'Oyun yorumları açıldı!' : 'Oyun yorumları kapatıldı!'
        );
    };
    
    const exportChatHistory = async () => {
        try {
            const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);
            const chatHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) { console.error("Sohbet geçmişi dışa aktarılırken hata:", error); }
    };
    
    const handleSearchUser = async () => {
        if (!searchUser.trim()) return;
        try {
            const q = query(collection(db, 'users'), where('displayName', '==', searchUser.trim()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                setSelectedUser({ uid: doc.id, ...doc.data() } as UserData);
            } else {
                setSelectedUser(null);
                alert('Kullanıcı bulunamadı');
            }
        } catch (error) { console.error('Kullanıcı arama hatası:', error); }
    };
    
    const handleUpdateScore = async (increment: boolean) => {
        if (!selectedUser) return;
        try {
            const userRef = doc(db, 'users', selectedUser.uid);
            const currentScore = selectedUser.score || 0;
            const newScore = increment ? currentScore + Math.abs(scoreAmount) : Math.max(0, currentScore - Math.abs(scoreAmount));
            await updateDoc(userRef, { score: newScore });
            setSelectedUser(prev => prev ? {...prev, score: newScore} : null);
            alert(`${selectedUser.displayName} kullanıcısının skoru ${newScore} olarak güncellendi`);
        } catch (error) { console.error('Skor güncelleme hatası:', error); }
    };
    

    // RENDER
    if (authLoading || isLoading) { return <div className="flex justify-center items-center h-screen"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>; }
    if (!isAdmin) { return <div className="text-center text-red-500 py-20"><h1>ERİŞİM REDDEDİLDİ.</h1></div>; }
    
    const unreadFeedbackCount = feedback.filter(fb => !fb.isRead).length;
    const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8">
            {isMuteModalOpen && selectedUserForMute && (<MuteModal user={selectedUserForMute} onClose={closeMuteModal} onMute={handleMuteUser} />)}
            <UserSelectionModal isOpen={isUserSelectionModalOpen} onClose={closeUserSelectionModal} availableUsers={availableUsers} selectedUsers={selectedUsersForRoom} onUserToggle={handleUserToggle} onCreateRoom={handleCreatePrivateChatRoom} roomName={privateChatRoomName} setRoomName={setPrivateChatRoomName}/>
            
            <h1 className="text-4xl md:text-5xl font-heading mb-8 flex items-center gap-4"><Shield size={48} className="text-electric-purple" /> Yönetim Paneli</h1>
            
            <div className="flex flex-wrap gap-2 md:gap-4 mb-8 border-b border-cyber-gray/50">
                {(['dashboard', 'users', 'games', 'feedback', 'reports', 'privateChat', 'commands'] as const).map(tab => {
                    const icons = { dashboard: Activity, users: Users, games: Gamepad2, feedback: MessageSquare, reports: Flag, privateChat: MessageSquare, commands: Shield };
                    const labels = { dashboard: 'Dashboard', users: 'Kullanıcılar', games: 'Oyunlar', feedback: 'Geri Bildirim', reports: 'Raporlar', privateChat: 'Özel Odalar', commands: 'Komutlar' };
                    const Icon = icons[tab];
                    return (
                        <button key={tab} onClick={() => setView(tab)} className={`py-3 px-3 md:px-5 text-sm md:text-lg font-bold relative transition-colors ${view === tab ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}>
                            <Icon className="inline-block mr-2" /> {labels[tab]}
                            {tab === 'feedback' && unreadFeedbackCount > 0 && <span className="absolute top-2 right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 justify-center items-center text-xs text-white">{unreadFeedbackCount}</span></span>}
                            {tab === 'reports' && pendingReportsCount > 0 && <span className="absolute top-2 right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 justify-center items-center text-xs text-white">{pendingReportsCount}</span></span>}
                        </button>
                    );
                })}
            </div>
            {/* VİEW'LERE GÖRE İÇERİK */}
            
            {view === 'dashboard' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-electric-purple/20 to-cyber-blue/20 p-6 rounded-lg border border-electric-purple/30">
                            <div className="flex items-center justify-between"><div><p className="text-cyber-gray text-sm">Aktif Kullanıcılar</p><p className="text-3xl font-bold text-electric-purple">{systemStats.activeUsers}</p></div><Users className="text-electric-purple" size={32} /></div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 rounded-lg border border-green-500/30">
                            <div className="flex items-center justify-between"><div><p className="text-cyber-gray text-sm">Toplam Mesaj</p><p className="text-3xl font-bold text-green-400">{systemStats.totalMessages.toLocaleString()}</p></div><MessageSquare className="text-green-400" size={32} /></div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-6 rounded-lg border border-yellow-500/30">
                            <div className="flex items-center justify-between"><div><p className="text-cyber-gray text-sm">Son Saat Mesaj</p><p className="text-3xl font-bold text-yellow-400">{systemStats.messagesLastHour}</p></div><TrendingUp className="text-yellow-400" size={32} /></div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-red-500/20 to-pink-500/20 p-6 rounded-lg border border-red-500/30">
                            <div className="flex items-center justify-between"><div><p className="text-cyber-gray text-sm">Oyun Oynanma</p><p className="text-3xl font-bold text-red-400">{systemStats.totalGamesPlayed.toLocaleString()}</p></div><Gamepad2 className="text-red-400" size={32} /></div>
                        </motion.div>
                    </div>
                     {systemStats.topChatter && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-6 rounded-lg border border-blue-500/30">
                            <h3 className="text-2xl font-heading mb-4 flex items-center gap-2"><Crown className="text-yellow-400" />En Çok Mesaj Atan</h3>
                            <p className="text-xl font-bold text-blue-400">{systemStats.topChatter.displayName} ({systemStats.topChatter.messageCount.toLocaleString()} mesaj)</p>
                        </motion.div>
                    )}
                 </div>
            )}
            {view === 'users' && (
                 <div className="bg-dark-gray/50 rounded-lg overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-cyber-gray/50"><tr><th className="p-4">Kullanıcı</th><th className="p-4 hidden md:table-cell">E-posta</th><th className="p-4">Rol</th><th className="p-4">Eylemler</th></tr></thead>
                        <tbody>
                            {users.map(u => {
                                const isMuted = u.mutedUntil && u.mutedUntil.toDate() > new Date();
                                return (
                                    <tr key={u.uid} className={`border-b border-cyber-gray/50 last:border-0 hover:bg-space-black ${isMuted ? 'bg-red-900/30' : ''}`}>
                                        <td className="p-4 flex items-center gap-2 font-bold">{u.displayName}{isMuted && <MicOff size={14} className="text-red-400"/>}</td>
                                        <td className="p-4 text-cyber-gray hidden md:table-cell">{u.email}</td>
                                        <td className="p-4">{u.role === 'admin' ? <span className="text-electric-purple font-bold">Admin</span> : 'Kullanıcı'}</td>
                                        <td className="p-4 flex gap-4">
                                            <button onClick={() => startDmWithUser(u)} disabled={u.uid === user?.uid} className="text-sky-400 hover:text-sky-300 disabled:text-gray-600" title="Özel Mesaj"><MessageSquare size={18} /></button>
                                            <button onClick={() => openMuteModal(u)} disabled={u.uid === user?.uid} className="text-yellow-500 hover:text-yellow-400 disabled:text-gray-600" title="Sustur"><MicOff size={18} /></button>
                                            <button onClick={() => handleDeleteUser(u)} disabled={u.role === 'admin' || u.uid === user?.uid} className="text-red-500 hover:text-red-400 disabled:text-gray-600" title="Sil"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {view === 'games' && (
                <div className="bg-dark-gray/50 rounded-lg overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-cyber-gray/50"><tr><th className="p-4">Oyun Adı</th><th className="p-4">Kategori</th><th className="p-4">Oynanma Sayısı</th></tr></thead>
                        <tbody>
                            {games.map(game => (
                                <tr key={game.id} className="border-b border-cyber-gray/50 last:border-0 hover:bg-space-black">
                                    <td className="p-4">{game.title}</td>
                                    <td className="p-4 text-cyber-gray">{game.category || 'Kategorisiz'}</td>
                                    <td className="p-4 font-bold">{game.playCount?.toLocaleString() || '0'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {view === 'feedback' && (
                 <div className="space-y-4">
                {feedback.map(fb => (
                    <div key={fb.id} className={`p-4 rounded-lg border ${fb.isRead ? 'bg-dark-gray/30 border-cyber-gray/20' : 'bg-electric-purple/10 border-electric-purple/30'}`}>
                        <div className="flex justify-between items-start flex-wrap gap-4">
                            <div>
                                <p className="font-bold">{fb.displayName}</p>
                                <p className="text-cyber-gray mt-2">{fb.message}</p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
                                <span className="text-xs text-cyber-gray">{new Date(fb.createdAt?.toDate()).toLocaleString('tr-TR')}</span>
                                <button onClick={() => toggleFeedbackRead(fb)} title={fb.isRead ? 'Okunmadı yap' : 'Okundu yap'}>{fb.isRead ? <EyeOff size={18} className="text-gray-500"/> : <Eye size={18} className="text-green-500"/>}</button>
                                <button onClick={() => handleDeleteFeedback(fb.id)} title="Sil"><Trash2 size={18} className="text-red-500"/></button>
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            )}
            {view === 'reports' && (
                <div className="space-y-4">
                     {reports.map(report => (
                        <div key={report.id} className={`p-4 rounded-lg border ${ report.status === 'pending' ? 'bg-orange-900/20 border-orange-500/50' : report.status === 'reviewed' ? 'bg-blue-900/20 border-blue-500/50' : 'bg-green-900/20 border-green-500/50'}`}>
                           <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold">{report.reportedUserName} rapor edildi</p>
                                    <p className="text-cyber-gray text-sm">Rapor eden: {report.reporterName}</p>
                                    <p className="text-cyber-gray mt-2">{report.reason}</p>
                                    <p className="text-xs text-cyber-gray mt-2">{new Date(report.createdAt?.toDate()).toLocaleString('tr-TR')}</p>
                                </div>
                               <div className="flex flex-col md:flex-row items-end gap-2">
                                     <span className={`px-3 py-1 rounded-full text-xs font-bold mb-2 md:mb-0 ${report.status === 'pending' ? 'bg-orange-500/20 text-orange-300' : 'bg-green-500/20 text-green-300'}`}>
                                       {report.status}
                                     </span>
                                    <button onClick={() => handleUpdateReportStatus(report.id, report.status === 'pending' ? 'resolved' : 'pending')} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">Durum Değiştir</button>
                                    <button onClick={() => handleDeleteReport(report.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"><Trash2 size={14} /></button>
                               </div>
                           </div>
                        </div>
                    ))}
                    {reports.length === 0 && <div className="text-center py-12 text-cyber-gray"><AlertTriangle size={48} className="mx-auto mb-4" /><p>Henüz rapor bulunmuyor.</p></div>}
                </div>
            )}
            {view === 'privateChat' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-heading">Özel Sohbet Odaları</h2>
                        <button onClick={openUserSelectionModal} className="px-4 py-2 bg-electric-purple hover:bg-opacity-80 rounded-lg flex items-center gap-2"><Plus size={18}/> Yeni Oda</button>
                    </div>
                    {privateChatRooms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {privateChatRooms.map((room) => (
                                <div key={room.id} className="bg-dark-gray/50 p-4 rounded-lg border border-cyber-gray/50 flex flex-col">
                                    <h3 className="text-xl font-bold">{room.name}</h3>
                                    <span className={`text-xs font-bold self-start px-2 py-1 rounded-full mt-1 ${room.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{room.isActive ? 'Aktif' : 'Kapalı'}</span>
                                    <div className="mt-auto pt-4 flex gap-2">
                                        <button disabled={!room.isActive} onClick={() => navigate(`/admin-chat/${room.id}`)} className="px-3 py-1 bg-electric-purple hover:bg-opacity-80 rounded text-sm disabled:bg-gray-600">Sohbete Gir</button>
                                        {room.isActive && <button onClick={() => handleClosePrivateChatRoom(room.id, room.name)} className="px-3 py-1 bg-red-600 hover:bg-opacity-80 rounded text-sm">Kapat</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-12 text-cyber-gray"><MessageSquare size={48} className="mx-auto mb-4" /><p>Henüz özel sohbet odası yok.</p></div>
                    )}
                </div>
            )}
            {view === 'commands' && (
                 <div className="space-y-6">
                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50"><h3 className="text-xl font-heading mb-4 flex items-center gap-2"><Megaphone className="text-yellow-400" />Duyuru Yönetimi</h3><div className="space-y-4"><textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="Duyuru metni..." className="w-full p-3 bg-space-black rounded-lg resize-none" rows={3}/>
                        <div className="flex gap-3"><button onClick={sendAnnouncement} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg">Gönder</button><button onClick={removeAnnouncement} className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg">Kaldır</button></div></div></div>
                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50"><h3 className="text-xl font-heading mb-4 flex items-center gap-2"><Pin className="text-blue-400" />Mesaj Sabitle</h3><div className="space-y-4"><textarea value={pinText} onChange={(e) => setPinText(e.target.value)} placeholder="Sabitlenecek mesaj..." className="w-full p-3 bg-space-black rounded-lg resize-none" rows={3}/>
                        <button onClick={pinMessage} className="px-6 py-2 bg-blue-500 text-white font-bold rounded-lg">Sabitle</button></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50"><h3 className="text-xl font-heading mb-4"><Clock className="inline mr-2 text-yellow-400" />Yavaş Mod</h3><input type="number" value={slowModeDelay} onChange={e=>setSlowModeDelay(e.target.value)} className="w-full p-2 bg-space-black rounded-lg mb-2"/><div className="flex gap-2"><button onClick={() => toggleSlowMode(true)} className="flex-1 p-2 bg-yellow-600 rounded">Aç</button><button onClick={() => toggleSlowMode(false)} className="flex-1 p-2 bg-gray-600 rounded">Kapat</button></div></div>
                        <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50"><h3 className="text-xl font-heading mb-4"><Zap className="inline mr-2 text-red-400"/>Sohbeti Durdur</h3><input type="text" value={chatPauseReason} onChange={e=>setChatPauseReason(e.target.value)} placeholder="Neden..." className="w-full p-2 bg-space-black rounded-lg mb-2"/><div className="flex gap-2"><button onClick={() => toggleChatPause(true)} className="flex-1 p-2 bg-red-600 rounded">Durdur</button><button onClick={() => toggleChatPause(false)} className="flex-1 p-2 bg-green-600 rounded">Devam Et</button></div></div>
                        <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50"><h3 className="text-xl font-heading mb-4"><MessageSquare className="inline mr-2 text-blue-400"/>Oyun Yorumları</h3><div className="flex gap-2"><button onClick={() => toggleGameComments(true)} className={`flex-1 p-2 rounded ${gameCommentsEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}>Aç</button><button onClick={() => toggleGameComments(false)} className={`flex-1 p-2 rounded ${!gameCommentsEnabled ? 'bg-red-600' : 'bg-gray-600'}`}>Kapat</button></div></div>
                        <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50"><h3 className="text-xl font-heading mb-4"><Download className="inline mr-2 text-green-400"/>Sohbet Geçmişi</h3><button onClick={exportChatHistory} className="w-full p-2 bg-green-600 rounded">JSON Olarak İndir</button></div>
                    </div>
                     <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50"><h3 className="text-xl font-heading mb-4"><Trophy className="inline mr-2 text-yellow-400" />Skor Yönetimi</h3>
                        <div className="flex gap-2 mb-4"><input type="text" value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Kullanıcı adı..." className="flex-1 p-2 bg-space-black rounded-lg" /><button onClick={handleSearchUser} className="px-4 bg-electric-purple rounded">Ara</button></div>
                        {selectedUser && <div className="bg-space-black p-4 rounded-lg"><p className="font-bold">{selectedUser.displayName} | Mevcut Skor: {selectedUser.score || 0}</p><div className="flex gap-2 mt-2"><input type="number" value={scoreAmount} onChange={e=>setScoreAmount(parseInt(e.target.value) || 0)} className="w-24 p-2 bg-dark-gray rounded-lg" /><button onClick={() => handleUpdateScore(true)} className="p-2 bg-green-600 rounded flex-1">Ekle</button><button onClick={() => handleUpdateScore(false)} className="p-2 bg-red-600 rounded flex-1">Çıkar</button></div></div>}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminPage;