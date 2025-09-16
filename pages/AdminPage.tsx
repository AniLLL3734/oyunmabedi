// TAM, EKSİKSİZ VE ÇALIŞAN KOD: pages/AdminPage.tsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { LoaderCircle, Users, Gamepad2, Shield, Trash2, MicOff, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Tipler
interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    mutedUntil?: Timestamp;
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

// Susturma Modal Bileşeni'nin tam hali
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

// Ana Admin Paneli Bileşeni'nin tam hali
const AdminPage: React.FC = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'users' | 'games' | 'feedback'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [games, setGames] = useState<GameData[]>([]);
    const [feedback, setFeedback] = useState<FeedbackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
    const [selectedUserForMute, setSelectedUserForMute] = useState<UserData | null>(null);

    useEffect(() => {
        if (!isAdmin) { setIsLoading(false); return; }
        const fetchData = async () => {
            setIsLoading(true);
            try {
                if (view === 'users') {
                    const q = query(collection(db, 'users'), orderBy('displayName'));
                    const querySnapshot = await getDocs(q);
                    setUsers(querySnapshot.docs.map(doc => doc.data() as UserData));
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
        if (!user) return;
        console.log("%c--- DM Başlatılıyor (AdminPage) ---", "color: blue; font-weight: bold;");
        const sortedUIDs = [user.uid.trim(), targetUser.uid.trim()].sort();
        const chatId = sortedUIDs.join('_');
        console.log("Oluşturulan Chat ID:", chatId);
        console.log("---------------------------------");

        try {
            const targetUserRef = doc(db, 'users', targetUser.uid);
            await updateDoc(targetUserRef, { unreadAdminMessage: true });
            navigate(`/dm/${chatId}`);
        } catch (error) {
            console.error("Özel sohbet başlatılırken hata:", error);
            alert("Sohbet başlatılırken bir hata oluştu.");
        }
    };
    
    // handleMuteUser fonksiyonunun tam hali
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
    
    // handleDeleteUser fonksiyonunun tam, çalışan hali
    const handleDeleteUser = async (userToDelete: UserData) => {
        if (window.confirm(`${userToDelete.displayName} adlı kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            try {
                // Not: Bu fonksiyon sadece Firestore belgesini siler. Firebase Authentication'daki kullanıcıyı silmez.
                // Tam bir silme için Cloud Function kullanmak gerekir.
                await deleteDoc(doc(db, 'users', userToDelete.uid));
                setUsers(users.filter(u => u.uid !== userToDelete.uid));
                alert("Kullanıcı başarıyla silindi.");
            } catch (error) {
                console.error("Kullanıcı silinirken hata:", error);
                alert("Kullanıcı silinirken bir hata oluştu.");
            }
        }
    };
    
    // toggleFeedbackRead fonksiyonunun tam, çalışan hali
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
    
    // handleDeleteFeedback fonksiyonunun tam, çalışan hali
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
    
    if (authLoading || isLoading) { return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /><p className="ml-4 text-cyber-gray">Yükleniyor...</p></div>; }
    if (!isAdmin) { return <div className="text-center text-red-500 py-20"><h1>ERİŞİM REDDEDİLDİ.</h1></div>; }
    
    const unreadFeedbackCount = feedback.filter(fb => !fb.isRead).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {isMuteModalOpen && selectedUserForMute && (<MuteModal user={selectedUserForMute} onClose={closeMuteModal} onMute={handleMuteUser} />)}
            <h1 className="text-5xl font-heading mb-8 flex items-center gap-4"><Shield size={48} className="text-electric-purple" /> Yönetim Paneli</h1>
            <div className="flex flex-wrap gap-4 mb-8 border-b border-cyber-gray/50">
                <button onClick={() => setView('users')} className={`py-3 px-5 text-lg font-bold ${view === 'users' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><Users className="inline-block mr-2" /> Kullanıcılar</button>
                <button onClick={() => setView('games')} className={`py-3 px-5 text-lg font-bold ${view === 'games' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><Gamepad2 className="inline-block mr-2" /> Oyunlar</button>
                <button onClick={() => setView('feedback')} className={`py-3 px-5 text-lg font-bold relative ${view === 'feedback' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}><MessageSquare className="inline-block mr-2" /> Geri Bildirimler{unreadFeedbackCount > 0 && <span className="absolute top-2 right-2 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 justify-center items-center text-xs text-white">{unreadFeedbackCount}</span></span>}</button>
            </div>

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
                                <button onClick={() => toggleFeedbackRead(fb)} title={fb.isRead ? 'Okunmadı olarak işaretle' : 'Okundu olarak işaretle'}>
                                    {fb.isRead ? <EyeOff size={18} className="text-gray-500"/> : <Eye size={18} className="text-green-500"/>}
                                </button>
                                <button onClick={() => handleDeleteFeedback(fb.id)} title="Geri bildirimi sil">
                                    <Trash2 size={18} className="text-red-500"/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </motion.div>
    );
};

export default AdminPage;