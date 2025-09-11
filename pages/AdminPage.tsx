import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { LoaderCircle, Users, Gamepad2, Shield, Trash2, Edit, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

// Firestore'dan gelen veriler için tipler
interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
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

const AdminPage: React.FC = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [view, setView] = useState<'users' | 'games' | 'feedback'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [games, setGames] = useState<GameData[]>([]);
    const [feedback, setFeedback] = useState<FeedbackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                                {users.map(u => (
                                    <tr key={u.uid} className="border-b border-cyber-gray/50 last:border-0 hover:bg-space-black">
                                        <td className="p-4">{u.displayName}</td>
                                        <td className="p-4 text-cyber-gray">{u.email}</td>
                                        <td className="p-4">{u.role === 'admin' ? <span className="text-electric-purple font-bold">Admin</span> : 'Kullanıcı'}</td>
                                        <td className="p-4">
                                             <button onClick={() => handleDeleteUser(u)} disabled={u.role === 'admin'} className="text-red-500 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed" title="Kullanıcıyı Sil">
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