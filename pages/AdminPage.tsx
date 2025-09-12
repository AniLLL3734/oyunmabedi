import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { LoaderCircle, Users, Gamepad2, Shield, Trash2, Edit, MessageSquare, Eye, EyeOff, MicOff } from 'lucide-react';
import { Link } from 'react-router-dom';

// Firestore'dan gelen veriler için tipler
interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    mutedUntil?: Timestamp; // Bu alan susturma bilgisini tutacak
}
interface FeedbackData {
    id: string;
    uid: string;
    displayName: string;
    message: string;
    isRead: boolean;
    createdAt: any;
}
interface GameData {
    id: string;
    title: string;
    category?: string;
    playCount?: number;
}

// Susturma Modal Bileşeni
const MuteModal: React.FC<{
    user: UserData;
    onClose: () => void;
    onMute: (uid: string, duration: number) => void;
}> = ({ user, onClose, onMute }) => {
    
    const durations = [
        { label: '5 Dakika', value: 5 * 60 * 1000 },
        { label: '1 Saat', value: 60 * 60 * 1000 },
        { label: '1 Gün', value: 24 * 60 * 60 * 1000 },
        { label: 'Kalıcı', value: 365 * 24 * 60 * 60 * 1000 * 100 }, // ~100 yıl
    ];

    const isCurrentlyMuted = user.mutedUntil && user.mutedUntil.toDate() > new Date();

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-space-black p-6 rounded-lg border border-cyber-gray/50 w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-2xl font-heading mb-4 text-center">
                    Sustur: <span className="text-electric-purple">{user.displayName}</span>
                </h3>
                
                {isCurrentlyMuted && (
                    <div className="mb-4 text-center p-3 bg-yellow-900/50 border border-yellow-700/50 rounded-md">
                        <p className="text-yellow-300 text-sm">Bu kullanıcı şu an susturulmuş.</p>
                        <p className="text-xs text-yellow-500">
                           Bitiş: {user.mutedUntil?.toDate().toLocaleString('tr-TR')}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {durations.map(d => (
                         <button 
                            key={d.value}
                            onClick={() => onMute(user.uid, d.value)}
                            className="w-full p-3 bg-dark-gray hover:bg-electric-purple/80 rounded-md transition-colors font-semibold"
                        >
                            {d.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 border-t border-cyber-gray/30 pt-4">
                     <button
                        onClick={() => onMute(user.uid, 0)} // 0 süresi susturmayı kaldırmak için
                        className="w-full p-3 bg-red-800 hover:bg-red-700 rounded-md transition-colors font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
                        disabled={!isCurrentlyMuted}
                    >
                       Susturmayı Kaldır
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


const AdminPage: React.FC = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [view, setView] = useState<'users' | 'games' | 'feedback'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [games, setGames] = useState<GameData[]>([]);
    const [feedback, setFeedback] = useState<FeedbackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
    const [selectedUserForMute, setSelectedUserForMute] = useState<UserData | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            setIsLoading(false);
            return;
        }

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
            } catch (error) {
                console.error("Admin paneli verisi çekilirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [view, isAdmin]);

    const handleMuteUser = async (uid: string, durationMs: number) => {
        const userRef = doc(db, 'users', uid);
        try {
            if (durationMs > 0) {
                const expiryDate = new Date(Date.now() + durationMs);
                await updateDoc(userRef, { mutedUntil: Timestamp.fromDate(expiryDate) });
                setUsers(users.map(u => u.uid === uid ? { ...u, mutedUntil: Timestamp.fromDate(expiryDate) } : u));
            } else {
                await updateDoc(userRef, { mutedUntil: null });
                setUsers(users.map(u => u.uid === uid ? { ...u, mutedUntil: undefined } : u));
            }
            alert("Kullanıcının susturma durumu güncellendi.");
        } catch (error) {
            console.error("Kullanıcı susturulurken hata:", error);
            alert("Kullanıcı susturulurken bir hata oluştu.");
        } finally {
            closeMuteModal();
        }
    };
    
    const openMuteModal = (userToMute: UserData) => {
        setSelectedUserForMute(userToMute);
        setIsMuteModalOpen(true);
    };

    const closeMuteModal = () => {
        setSelectedUserForMute(null);
        setIsMuteModalOpen(false);
    };

    const handleDeleteUser = async (userToDelete: UserData) => {
        if (user && userToDelete.uid === user.uid) {
            alert("Güvenlik nedeniyle kendi hesabınızı panelden silemezsiniz.");
            return;
        }
        if (window.confirm(`'${userToDelete.displayName}' adlı kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
            try {
                await deleteDoc(doc(db, 'users', userToDelete.uid));
                setUsers(prevUsers => prevUsers.filter(u => u.uid !== userToDelete.uid));
                alert(`'${userToDelete.displayName}' kullanıcısı başarıyla silindi.`);
            } catch (error) {
                console.error("Kullanıcı silinirken hata:", error);
                alert("Kullanıcı silinirken bir hata oluştu.");
            }
        }
    };

    const toggleFeedbackRead = async (feedbackItem: FeedbackData) => {
        const feedbackRef = doc(db, 'feedback', feedbackItem.id);
        try {
            await updateDoc(feedbackRef, { isRead: !feedbackItem.isRead });
            setFeedback(feedback.map(fb => fb.id === feedbackItem.id ? { ...fb, isRead: !fb.isRead } : fb));
        } catch (error) {
            console.error("Geri bildirim durumu güncellenemedi:", error);
        }
    };

    const handleDeleteFeedback = async (feedbackId: string) => {
        if (window.confirm("Bu geri bildirimi kalıcı olarak silmek istediğinizden emin misiniz?")) {
            const feedbackRef = doc(db, 'feedback', feedbackId);
            try {
                await deleteDoc(feedbackRef);
                setFeedback(feedback.filter(fb => fb.id !== feedbackId));
            } catch (error) {
                console.error("Geri bildirim silinemedi:", error);
            }
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex justify-center items-center h-full py-20">
                <LoaderCircle className="animate-spin text-electric-purple" size={48} />
                <p className="ml-4 text-cyber-gray">İmparatorluk verileri yükleniyor...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return <div className="text-center text-red-500 py-20"><h1>ERİŞİM REDDEDİLDİ. BU ALAN SADECE MİMARA AÇIKTIR.</h1></div>;
    }

    const unreadFeedbackCount = feedback.filter(fb => !fb.isRead).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {isMuteModalOpen && selectedUserForMute && (
                <MuteModal user={selectedUserForMute} onClose={closeMuteModal} onMute={handleMuteUser} />
            )}

            <h1 className="text-5xl font-heading mb-8 flex items-center gap-4">
                <Shield size={48} className="text-electric-purple" /> Yönetim Paneli
            </h1>
            <div className="flex flex-wrap gap-4 mb-8 border-b border-cyber-gray/50">
                <button onClick={() => setView('users')} className={`py-3 px-5 text-lg font-bold ${view === 'users' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}>
                    <Users className="inline-block mr-2" /> Kullanıcılar
                </button>
                <button onClick={() => setView('games')} className={`py-3 px-5 text-lg font-bold ${view === 'games' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}>
                   <Gamepad2 className="inline-block mr-2" /> Oyun İstatistikleri
                </button>
                <button onClick={() => setView('feedback')} className={`py-3 px-5 text-lg font-bold relative ${view === 'feedback' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}>
                   <MessageSquare className="inline-block mr-2" /> Geri Bildirimler
                   {unreadFeedbackCount > 0 && 
                      <span className="absolute top-2 right-2 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 justify-center items-center text-xs text-white">
                            {unreadFeedbackCount}
                          </span>
                      </span>
                   }
                </button>
            </div>

            {view === 'users' && (
                <div>
                    <h2 className="text-3xl font-heading mb-4">Kullanıcı Yönetimi</h2>
                    <div className="bg-dark-gray/50 rounded-lg overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-cyber-gray/50">
                                <tr>
                                    <th className="p-4">Kullanıcı Adı</th>
                                    <th className="p-4">E-posta</th>
                                    <th className="p-4">Rol</th>
                                    <th className="p-4">Eylemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const isMuted = u.mutedUntil && u.mutedUntil.toDate() > new Date();
                                    return (
                                        <tr key={u.uid} className={`border-b border-cyber-gray/50 last:border-0 hover:bg-space-black transition-colors ${isMuted ? 'bg-red-900/30' : ''}`}>
                                            <td className="p-4 flex items-center gap-2">
                                                {u.displayName}
                                                {isMuted && <MicOff size={14} className="text-red-400" title="Susturuldu"/>}
                                            </td>
                                            <td className="p-4 text-cyber-gray">{u.email}</td>
                                            <td className="p-4">{u.role === 'admin' ? <span className="text-electric-purple font-bold">Admin</span> : 'Kullanıcı'}</td>
                                            <td className="p-4 flex gap-4">
                                                <button onClick={() => openMuteModal(u)} disabled={u.uid === user?.uid} className="text-yellow-500 hover:text-yellow-400 disabled:text-gray-600 disabled:cursor-not-allowed" title="Kullanıcıyı Sustur">
                                                    <MicOff size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteUser(u)} disabled={u.role === 'admin' || u.uid === user?.uid} className="text-red-500 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed" title="Kullanıcıyı Sil">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {view === 'games' && (
                <div>
                     <h2 className="text-3xl font-heading mb-4">Oyun İstatistikleri</h2>
                      <div className="bg-dark-gray/50 rounded-lg overflow-x-auto">
                         <table className="w-full text-left">
                           <thead className="border-b border-cyber-gray/50">
                                <tr>
                                    <th className="p-4">Oyun Adı</th>
                                    <th className="p-4">Kategori</th>
                                    <th className="p-4">Oynanma Sayısı</th>
                                    <th className="p-4">Eylemler</th>
                                </tr>
                           </thead>
                           <tbody>
                               {games.map(g => (
                                    <tr key={g.id} className="border-b border-cyber-gray/50 last:border-0 hover:bg-space-black">
                                        <td className="p-4 font-bold">{g.title || g.id}</td>
                                        <td className="p-4 text-cyber-gray">{g.category || 'N/A'}</td>
                                        <td className="p-4 font-mono text-electric-purple">{g.playCount || 0}</td>
                                        <td className="p-4 flex gap-4">
                                            <button className="text-green-500 hover:text-green-400" title="Düzenle (Yakında)"><Edit size={18} /></button>
                                            <button className="text-red-500 hover:text-red-400" title="Sil (Yakında)"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                           </tbody>
                         </table>
                      </div>
                </div>
            )}
            {view === 'feedback' && (
                <div>
                     <h2 className="text-3xl font-heading mb-4">Gelen Sinyaller</h2>
                      <div className="bg-dark-gray/50 rounded-lg overflow-x-auto">
                         <table className="w-full text-left">
                           <thead className="border-b border-cyber-gray/50">
                                <tr>
                                    <th className="p-4 w-[15%]">Gönderen</th>
                                    <th className="p-4 w-[50%]">Mesaj</th>
                                    <th className="p-4 w-[20%]">Tarih</th>
                                    <th className="p-4 w-[15%]">Eylemler</th>
                                </tr>
                           </thead>
                           <tbody>
                               {feedback.length === 0 && (
                                    <tr>
                                       <td colSpan={4} className="p-8 text-center text-cyber-gray">Henüz mimara ulaşan bir sinyal yok.</td>
                                    </tr>
                               )}
                               {feedback.map(fb => (
                                    <tr key={fb.id} className={`border-b border-cyber-gray/50 last:border-0 hover:bg-space-black transition-colors ${!fb.isRead ? 'bg-electric-purple/10' : ''}`}>
                                        <td className="p-4 font-bold align-top">
                                            <Link to={`/profile/${fb.uid}`} className="hover:underline">{fb.displayName}</Link>
                                        </td>
                                        <td className="p-4 text-cyber-gray align-top whitespace-pre-wrap">{fb.message}</td>
                                        <td className="p-4 text-sm text-gray-500 align-top">
                                            {fb.createdAt?.toDate().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="p-4 flex flex-col sm:flex-row gap-3 align-top">
                                            <button onClick={() => toggleFeedbackRead(fb)} title={fb.isRead ? "Okunmadı olarak işaretle" : "Okundu olarak işaretle"} className={fb.isRead ? "text-gray-500 hover:text-green-500" : "text-green-500 hover:text-green-400"}>
                                                {fb.isRead ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            <button onClick={() => handleDeleteFeedback(fb.id)} title="Geri bildirimi sil" className="text-red-500 hover:text-red-400">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                           </tbody>
                         </table>
                      </div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminPage;