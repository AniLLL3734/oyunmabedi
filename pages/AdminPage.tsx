    import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, query, orderBy, doc, deleteDoc, updateDoc, Timestamp, onSnapshot, getDocs, addDoc, setDoc, getDoc, where } from 'firebase/firestore';
import { LoaderCircle, Users, Gamepad2, Shield, Trash2, MicOff, MessageSquare, Eye, EyeOff, Activity, TrendingUp, Clock, Zap, Megaphone, Pin, Trash, UserX, Crown, Download, Trophy, Search, User, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
interface SystemStats {
    activeUsers: number;
    totalMessages: number;
    messagesLastHour: number;
    totalGamesPlayed: number;
    gamesLastHour: number;
    systemUptime: string;
    topChatter?: {
        displayName: string;
        messageCount: number;
        uid: string;
    };
}

const MuteModal: React.FC<{
    user: UserData;
    onClose: () => void;
    onMute: (uid: string, durationMs: number) => void;
}> = ({ user, onClose, onMute }) => {
    const durations = [
        { label: '5 Dakika', value: 5 * 60 * 1000 },
        { label: '1 Saat', value: 60 * 60 * 1000 },
        { label: '1 Gün', value: 24 * 60 * 60 * 1000 },
        { label: 'Kalıcı (10 Yıl)', value: 365 * 24 * 60 * 60 * 1000 * 10 },
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

const AdminPage: React.FC = () => {
    const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'dashboard' | 'users' | 'games' | 'feedback' | 'commands'>('dashboard');
    const [users, setUsers] = useState<UserData[]>([]);
    const [games, setGames] = useState<GameData[]>([]);
    const [feedback, setFeedback] = useState<FeedbackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
    const [selectedUserForMute, setSelectedUserForMute] = useState<UserData | null>(null);
    const [systemStats, setSystemStats] = useState<SystemStats>({
        activeUsers: 0,
        totalMessages: 0,
        messagesLastHour: 0,
        totalGamesPlayed: 0,
        gamesLastHour: 0,
        systemUptime: '0d 0h 0m'
    });
    
    const [announcementText, setAnnouncementText] = useState('');
    const [pinText, setPinText] = useState('');
    const [muteUsername, setMuteUsername] = useState('');
    const [muteDuration, setMuteDuration] = useState('1h');
    const [kickUsername, setKickUsername] = useState('');
    const [searchUser, setSearchUser] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [scoreAmount, setScoreAmount] = useState<number>(0);

    // Skor yönetimi fonksiyonları
    const handleSearchUser = async () => {
        if (!searchUser.trim()) return;
        
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('displayName', '==', searchUser.trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data() as UserData;
                setSelectedUser({
                    ...userData,
                    uid: querySnapshot.docs[0].id,
                    score: userData.score || 0
                });
            } else {
                setSelectedUser(null);
                alert('Kullanıcı bulunamadı');
            }
        } catch (error) {
            console.error('Kullanıcı arama hatası:', error);
            alert('Kullanıcı aranırken bir hata oluştu');
        }
    };

    const handleUpdateScore = async (increment: boolean) => {
        if (!selectedUser || !scoreAmount) return;
        
        try {
            const userRef = doc(db, 'users', selectedUser.uid);
            const userDoc = await getDoc(userRef);
            const currentScore = userDoc.data()?.score || 0;
            
            const newScore = increment ? 
                currentScore + Math.abs(scoreAmount) : 
                Math.max(0, currentScore - Math.abs(scoreAmount));
            
            await updateDoc(userRef, { score: newScore });
            
            setSelectedUser(prev => prev ? {...prev, score: newScore} : null);
            alert(`${selectedUser.displayName} kullanıcısının skoru ${newScore} olarak güncellendi`);
        } catch (error) {
            console.error('Skor güncelleme hatası:', error);
            alert('Skor güncellenirken bir hata oluştu');
        }
    };

    useEffect(() => {
        if (!isAdmin) return;

        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setSystemStats(prev => ({ ...prev, activeUsers: snapshot.size }));
        });

        const unsubscribeMessages = onSnapshot(collection(db, 'messages'), async (snapshot) => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            const messagesLastHour = snapshot.docs.filter(doc => {
                const messageTime = doc.data().createdAt?.toDate();
                return messageTime && messageTime > oneHourAgo;
            }).length;

            // En çok mesaj atan kullanıcıyı bul
            const messageCountByUser = snapshot.docs.reduce((acc, doc) => {
                const uid = doc.data().uid;
                if (uid && uid !== 'system') {
                    acc[uid] = (acc[uid] || 0) + 1;
                }
                return acc;
            }, {} as { [key: string]: number });

            let topChatterId = '';
            let maxMessages = 0;

            Object.entries(messageCountByUser).forEach(([uid, count]) => {
                if (count > maxMessages) {
                    maxMessages = count;
                    topChatterId = uid;
                }
            });

            if (topChatterId) {
                const userDoc = await getDoc(doc(db, 'users', topChatterId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setSystemStats(prev => ({ 
                        ...prev, 
                        totalMessages: snapshot.size, 
                        messagesLastHour,
                        topChatter: {
                            uid: topChatterId,
                            displayName: userData.displayName,
                            messageCount: maxMessages
                        }
                    }));
                    return;
                }
            }

            setSystemStats(prev => ({ ...prev, totalMessages: snapshot.size, messagesLastHour }));
        });

        const unsubscribeGames = onSnapshot(collection(db, 'games'), (snapshot) => {
            const totalGamesPlayed = snapshot.docs.reduce((sum, doc) => sum + (doc.data().playCount || 0), 0);
            setSystemStats(prev => ({ ...prev, totalGamesPlayed }));
        });

        return () => {
            unsubscribeUsers();
            unsubscribeMessages();
            unsubscribeGames();
        };
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) { setIsLoading(false); return; }
        const fetchData = async () => {
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
                }
            } catch (error) { console.error("Admin paneli verisi çekilirken hata:", error); } 
            finally { setIsLoading(false); }
        };
        fetchData();
    }, [view, isAdmin]);

    const startDmWithUser = async (targetUser: UserData) => {
        if (!user || !targetUser.uid) {
            alert("Sohbet başlatılamıyor: Kullanıcı bilgileri eksik.");
            return;
        }
        
        const sortedUIDs = [user.uid, targetUser.uid].sort();
        const chatId = sortedUIDs.join('_');

        const chatRef = doc(db, 'chats', chatId);
        const targetUserRef = doc(db, 'users', targetUser.uid);
        
        try {
            await setDoc(chatRef, { 
                users: sortedUIDs, 
                userNames: [user.displayName, targetUser.displayName]
            }, { merge: true });

            await updateDoc(targetUserRef, { unreadAdminMessage: true });
            
            navigate(`/dm/${chatId}`);
        } catch(error) {
             console.error("DM başlatılırken Firestore hatası:", error);
             alert("Özel sohbet başlatılırken bir hata oluştu.");
        }
    };
    
    const handleMuteUser = async (uid: string, durationMs: number) => {
        const userRef = doc(db, 'users', uid);
        try {
            const expiryDate = durationMs > 0 ? Timestamp.fromDate(new Date(Date.now() + durationMs)) : null;
            await updateDoc(userRef, { mutedUntil: expiryDate });
            setUsers(users.map(u => u.uid === uid ? { ...u, mutedUntil: expiryDate || undefined } : u));
            alert("Kullanıcının susturma durumu güncellendi.");
        } catch (error) {
            console.error("Kullanıcı susturulurken hata:", error);
        } finally {
            closeMuteModal();
        }
    };
    
    const openMuteModal = (userToMute: UserData) => { setSelectedUserForMute(userToMute); setIsMuteModalOpen(true); };
    const closeMuteModal = () => { setSelectedUserForMute(null); setIsMuteModalOpen(false); };
    
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
    
    const toggleFeedbackRead = async (feedbackItem: FeedbackData) => {
        const feedbackRef = doc(db, 'feedback', feedbackItem.id);
        try {
            const newReadState = !feedbackItem.isRead;
            await updateDoc(feedbackRef, { isRead: newReadState });
            setFeedback(feedback.map(fb => fb.id === feedbackItem.id ? { ...fb, isRead: newReadState } : fb));
        } catch (error) {
            console.error("Geri bildirim durumu güncellenirken hata:", error);
        }
    };
    
    const handleDeleteFeedback = async (feedbackId: string) => {
        if (window.confirm("Bu geri bildirimi kalıcı olarak silmek istediğinizden emin misiniz?")) {
            try {
                await deleteDoc(doc(db, 'feedback', feedbackId));
                setFeedback(feedback.filter(fb => fb.id !== feedbackId));
                alert("Geri bildirim silindi.");
            } catch (error) {
                console.error("Geri bildirim silinirken hata:", error);
                alert("Geri bildirim silinirken bir hata oluştu.");
            }
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

    const pinMessage = async () => {
        if (!pinText.trim()) return;
        try {
            await setDoc(doc(db, 'chat_meta', 'pinned_message'), {
                text: pinText, pinnedBy: userProfile?.displayName || user?.displayName || 'Admin', pinnedAt: new Date()
            });
            await addDoc(collection(db, 'messages'), {
                text: `📌 **Mesaj sabitlendi:** ${pinText}`,
                uid: 'system', displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true
            });
            setPinText(''); alert('Mesaj sabitlendi!');
        } catch (error) { console.error('Mesaj sabitlenirken hata:', error); }
    };

    const muteUser = async () => {
        if (!muteUsername.trim()) return;
        try {
            const durationMs = parseDuration(muteDuration);
            if (durationMs === 0) return;
            await addDoc(collection(db, 'messages'), {
                text: `🔇 **${muteUsername}** susturuldu. Süre: ${formatDuration(durationMs)} (Sadece bildirim)`,
                uid: 'system', displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true
            });
            setMuteUsername(''); alert('Susturma bildirimi gönderildi!');
        } catch (error) { console.error('Susturma bildirimi gönderilirken hata:', error); }
    };

    const kickUser = async () => {
        if (!kickUsername.trim()) return;
        try {
            await addDoc(collection(db, 'messages'), {
                text: `👢 **${kickUsername}** sohbetten atıldı. (Sadece bildirim)`,
                uid: 'system', displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true
            });
            setKickUsername(''); alert('Atma bildirimi gönderildi!');
        } catch (error) { console.error('Atma bildirimi gönderilirken hata:', error); }
    };

    const clearChat = async () => {
        if (!window.confirm('Sohbeti temizlemek istediğinizden emin misiniz?')) return;
        try {
            await addDoc(collection(db, 'messages'), {
                text: '🧹 **Sohbet temizlendi.** (Sadece bildirim - Mesajlar silinmedi)',
                uid: 'system', displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true
            });
            alert('Temizleme bildirimi gönderildi!');
        } catch (error) { console.error('Temizleme bildirimi gönderilirken hata:', error); }
    };


    const exportChatHistory = async () => {
        try {
            const messagesRef = collection(db, 'messages');
            const q = query(messagesRef, orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);
            
            const chatHistory = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    messageId: doc.id,
                    text: data.text,
                    senderId: data.uid,
                    senderName: data.displayName,
                    timestamp: data.createdAt?.toDate().toISOString(),
                    isSystemMessage: data.isSystemMessage || false
                };
            });

            const fileName = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
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
            console.error("Sohbet geçmişi dışa aktarılırken hata:", error);
            alert("Sohbet geçmişi dışa aktarılırken bir hata oluştu!");
        }
    };

    const removeAnnouncement = async () => {
        if (!window.confirm('Duyuruyu kaldırmak istediğinizden emin misiniz?')) return;
        try {
            await addDoc(collection(db, 'messages'), {
                text: '📢 **Duyuru kaldırıldı.**',
                uid: 'system', displayName: 'Sistem', createdAt: new Date(), isSystemMessage: true
            });
            alert('Duyuru kaldırma bildirimi gönderildi!');
        } catch (error) { console.error('Duyuru kaldırma bildirimi gönderilirken hata:', error); }
    };

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

    const formatDuration = (ms: number): string => {
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        if (days > 0) return `${days} gün`;
        const hours = Math.floor(ms / (60 * 60 * 1000));
        if (hours > 0) return `${hours} saat`;
        const minutes = Math.floor(ms / (60 * 1000));
        return `${minutes} dakika`;
    };
    
    if (authLoading || isLoading) { return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /><p className="ml-4 text-cyber-gray">Yükleniyor...</p></div>; }
    if (!isAdmin) { return <div className="text-center text-red-500 py-20"><h1>ERİŞİM REDDEDİLDİ.</h1></div>; }
    
    const unreadFeedbackCount = feedback.filter(fb => !fb.isRead).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {isMuteModalOpen && selectedUserForMute && (<MuteModal user={selectedUserForMute} onClose={closeMuteModal} onMute={handleMuteUser} />)}
            <h1 className="text-5xl font-heading mb-8 flex items-center gap-4"><Shield size={48} className="text-electric-purple" /> Yönetim Paneli</h1>
            <div className="flex flex-wrap gap-4 mb-8 border-b border-cyber-gray/50">
                <button onClick={() => setView('dashboard')} className={`py-3 px-5 text-lg font-bold ${view === 'dashboard' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><Activity className="inline-block mr-2" /> Dashboard</button>
                <button onClick={() => setView('users')} className={`py-3 px-5 text-lg font-bold ${view === 'users' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><Users className="inline-block mr-2" /> Kullanıcılar</button>
                <button onClick={() => setView('games')} className={`py-3 px-5 text-lg font-bold ${view === 'games' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><Gamepad2 className="inline-block mr-2" /> Oyunlar</button>
                <button onClick={() => setView('feedback')} className={`py-3 px-5 text-lg font-bold relative ${view === 'feedback' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><MessageSquare className="inline-block mr-2" /> Geri Bildirimler{unreadFeedbackCount > 0 && <span className="absolute top-2 right-2 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 justify-center items-center text-xs text-white">{unreadFeedbackCount}</span></span>}</button>
                <button onClick={() => setView('commands')} className={`py-3 px-5 text-lg font-bold ${view === 'commands' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><Shield className="inline-block mr-2" /> Sistem Komutları</button>
            </div>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                            <h3 className="text-2xl font-heading mb-4 flex items-center gap-2"><Zap className="text-electric-purple" />Sistem Durumu</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div><span className="text-ghost-white">Veritabanı: Aktif</span></div>
                                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div><span className="text-ghost-white">Sohbet: Aktif</span></div>
                                <div className="flex items-center gap-3"><div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div><span className="text-ghost-white">Oyunlar: Aktif</span></div>
                            </div>
                        </motion.div>

                        {systemStats.topChatter && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-6 rounded-lg border border-blue-500/30">
                                <h3 className="text-2xl font-heading mb-4 flex items-center gap-2">
                                    <Crown className="text-yellow-400" />
                                    En Çok Mesaj Atan
                                </h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xl font-bold text-blue-400">{systemStats.topChatter.displayName}</p>
                                        <p className="text-cyber-gray mt-1">
                                            {systemStats.topChatter.messageCount.toLocaleString()} mesaj
                                        </p>
                                    </div>
                                    <MessageSquare className="text-blue-400" size={32} />
                                </div>
                            </motion.div>
                        )}
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                        <h3 className="text-2xl font-heading mb-4 flex items-center gap-2"><Clock className="text-electric-purple" />Hızlı İşlemler</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <button onClick={() => setView('users')} className="p-4 bg-electric-purple/20 hover:bg-electric-purple/30 rounded-lg border border-electric-purple/30 transition-colors text-left"><Users className="text-electric-purple mb-2" size={24} /><p className="font-bold">Kullanıcıları Yönet</p><p className="text-sm text-cyber-gray">Sustur, sil, mesaj at</p></button>
                            <button onClick={() => setView('feedback')} className="p-4 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg border border-yellow-500/30 transition-colors text-left"><MessageSquare className="text-yellow-400 mb-2" size={24} /><p className="font-bold">Geri Bildirimler</p><p className="text-sm text-cyber-gray">{unreadFeedbackCount} okunmamış</p></button>
                            <button onClick={() => setView('games')} className="p-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors text-left"><Gamepad2 className="text-red-400 mb-2" size={24} /><p className="font-bold">Oyun İstatistikleri</p><p className="text-sm text-cyber-gray">En popüler oyunlar</p></button>
                            <button onClick={() => navigate('/chat')} className="p-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors text-left"><MessageSquare className="text-green-400 mb-2" size={24} /><p className="font-bold">Sohbete Git</p><p className="text-sm text-cyber-gray">Admin komutları kullan</p></button>
                        </div>
                    </motion.div>
                </div>
            )}

            {view === 'users' && (
                <div className="bg-dark-gray/50 rounded-lg overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-cyber-gray/50"><tr><th className="p-4">Kullanıcı Adı</th><th className="p-4">E-posta</th><th className="p-4">Rol</th><th className="p-4">Eylemler</th></tr></thead>
                        <tbody>
                            {users.map(u => {
                                const isMuted = u.mutedUntil && u.mutedUntil.toDate() > new Date();
                                return (
                                    <tr key={u.uid} className={`border-b border-cyber-gray/50 last:border-0 hover:bg-space-black ${isMuted ? 'bg-red-900/30' : ''}`}>
                                        <td className="p-4 flex items-center gap-2">{u.displayName}{isMuted && <MicOff size={14} className="text-red-400"/>}</td>
                                        <td className="p-4 text-cyber-gray">{u.email}</td>
                                        <td className="p-4">{u.role === 'admin' ? <span className="text-electric-purple font-bold">Admin</span> : 'Kullanıcı'}</td>
                                        <td className="p-4 flex gap-4">
                                            <button onClick={() => startDmWithUser(u)} disabled={u.uid === user?.uid} className="text-sky-400 hover:text-sky-300 disabled:text-gray-600" title="Özel Mesaj"><MessageSquare size={18} /></button>
                                            <button onClick={() => openMuteModal(u)} disabled={u.uid === user?.uid} className="text-yellow-500 hover:text-yellow-400 disabled:text-gray-600" title="Sustur"><MicOff size={18} /></button>
                                            <button onClick={() => handleDeleteUser(u)} disabled={u.role === 'admin' || u.uid === user?.uid} className="text-red-500 hover:text-red-400 disabled:text-gray-600" title="Kullanıcıyı Sil"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'games' && (
                <div className="space-y-4">
                    <div className="bg-dark-gray/50 rounded-lg overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-cyber-gray/50">
                                <tr>
                                    <th className="p-4">Oyun Adı</th>
                                    <th className="p-4">Kategori</th>
                                    <th className="p-4">Oynanma Sayısı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {games.map(game => (
                                    <tr key={game.id} className="border-b border-cyber-gray/50 last:border-0 hover:bg-space-black">
                                        <td className="p-4">{game.title}</td>
                                        <td className="p-4 text-cyber-gray">{game.category || 'Kategorisiz'}</td>
                                        <td className="p-4">{game.playCount?.toLocaleString() || '0'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {view === 'feedback' && (
                <div className="space-y-4">
                {feedback.map(fb => (
                    <div key={fb.id} className={`p-4 rounded-lg border ${fb.isRead ? 'bg-dark-gray/30 border-cyber-gray/20' : 'bg-electric-purple/10 border-electric-purple/30'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold">{fb.displayName}</p>
                                <p className="text-cyber-gray mt-2">{fb.message}</p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                <span className="text-xs text-cyber-gray">{new Date(fb.createdAt?.toDate()).toLocaleString('tr-TR')}</span>
                                <button onClick={() => toggleFeedbackRead(fb)} title={fb.isRead ? 'Okunmadı olarak işaretle' : 'Okundu olarak işaretle'}>{fb.isRead ? <EyeOff size={18} className="text-gray-500"/> : <Eye size={18} className="text-green-500"/>}</button>
                                <button onClick={() => handleDeleteFeedback(fb.id)} title="Geri bildirimi sil"><Trash2 size={18} className="text-red-500"/></button>
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            )}

            {view === 'commands' && (
                <div className="space-y-6">
                    <h2 className="text-3xl font-heading mb-6 flex items-center gap-2"><Megaphone className="text-electric-purple" />Sistem Komutları</h2>
                    

                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50 mb-6">
                        <h3 className="text-xl font-heading mb-4 flex items-center gap-2"><Trophy className="text-yellow-400" />Skor Yönetimi</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                    placeholder="Kullanıcı adı..."
                                    className="flex-1 p-3 bg-space-black border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray"
                                />
                                <button
                                    onClick={handleSearchUser}
                                    className="px-6 py-2 bg-electric-purple hover:bg-opacity-80 text-white font-bold rounded-lg transition-colors"
                                >
                                    <Search className="inline-block mr-2" />Ara
                                </button>
                            </div>
                            
                            {selectedUser && (
                                <div className="bg-space-black p-4 rounded-lg">
                                    <div className="flex items-center gap-3 mb-4">
                                        <User className="text-electric-purple" />
                                        <div>
                                            <p className="font-bold text-ghost-white">{selectedUser.displayName}</p>
                                            <p className="text-cyber-gray text-sm">Mevcut Skor: {selectedUser.score || 0}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3 items-center">
                                        <input
                                            type="number"
                                            value={scoreAmount}
                                            onChange={(e) => setScoreAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                            min="0"
                                            placeholder="Skor miktarı..."
                                            className="w-32 p-2 bg-dark-gray border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray"
                                        />
                                        <button
                                            onClick={() => handleUpdateScore(true)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <Plus size={18} />Ekle
                                        </button>
                                        <button
                                            onClick={() => handleUpdateScore(false)}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <Minus size={18} />Çıkar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                        <h3 className="text-xl font-heading mb-4 flex items-center gap-2"><Megaphone className="text-yellow-400" />Duyuru Yönetimi</h3>
                        <div className="space-y-4"><textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="Duyuru metnini buraya yazın..." className="w-full p-3 bg-space-black border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray resize-none" rows={3}/>
                            <div className="flex gap-3"><button onClick={sendAnnouncement} className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors">Duyuru Gönder</button><button onClick={removeAnnouncement} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors">Duyuruyu Kaldır</button></div>
                        </div>
                    </div>
                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                        <h3 className="text-xl font-heading mb-4 flex items-center gap-2"><Pin className="text-blue-400" />Mesaj Sabitle</h3>
                        <div className="space-y-4"><textarea value={pinText} onChange={(e) => setPinText(e.target.value)} placeholder="Sabitlenecek mesajı buraya yazın..." className="w-full p-3 bg-space-black border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray resize-none" rows={3}/>
                            <button onClick={pinMessage} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors">Mesajı Sabitle</button>
                        </div>
                    </div>
                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                        <h3 className="text-xl font-heading mb-4 flex items-center gap-2"><MicOff className="text-red-400" />Kullanıcı Sustur</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" value={muteUsername} onChange={(e) => setMuteUsername(e.target.value)} placeholder="Kullanıcı adı" className="p-3 bg-space-black border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray"/>
                            <select value={muteDuration} onChange={(e) => setMuteDuration(e.target.value)} className="p-3 bg-space-black border border-cyber-gray/50 rounded-lg text-ghost-white">
                                <option value="5m">5 Dakika</option><option value="1h">1 Saat</option><option value="6h">6 Saat</option><option value="1d">1 Gün</option><option value="7d">7 Gün</option>
                            </select>
                            <button onClick={muteUser} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors">Sustur</button>
                        </div>
                    </div>
                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                        <h3 className="text-xl font-heading mb-4 flex items-center gap-2"><UserX className="text-orange-400" />Kullanıcı At</h3>
                        <div className="flex gap-4"><input type="text" value={kickUsername} onChange={(e) => setKickUsername(e.target.value)} placeholder="Kullanıcı adı" className="flex-1 p-3 bg-space-black border border-cyber-gray/50 rounded-lg text-ghost-white placeholder-cyber-gray"/>
                            <button onClick={kickUser} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors">At</button>
                        </div>
                    </div>
                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                        <h3 className="text-xl font-heading mb-4 flex items-center gap-2"><Trash className="text-purple-400" />Sohbet Temizle</h3>
                        <p className="text-cyber-gray mb-4">Sohbete temizleme bildirimi gönderir (mesajlar silinmez).</p>
                        <button onClick={clearChat} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors">Temizleme Bildirimi Gönder</button>
                    </div>

                    <div className="bg-dark-gray/50 p-6 rounded-lg border border-cyber-gray/50">
                        <h3 className="text-xl font-heading mb-4 flex items-center gap-2"><MessageSquare className="text-green-400" />Sohbet Yönetimi</h3>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => exportChatHistory()}
                                    className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download size={20} />
                                    <span>Sohbeti JSON Olarak İndir</span>
                                </button>
                            </div>
                            <p className="text-cyber-gray text-sm">Not: Bu özellikler özel sohbet odası içindeyken de kullanılabilir.</p>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminPage;