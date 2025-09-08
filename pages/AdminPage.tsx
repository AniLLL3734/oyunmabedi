// DOSYA: pages/AdminPage.tsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth'; // Type ismini yeniden adlandırma
import { LoaderCircle, Users, Gamepad2, Shield, Trash2, Edit } from 'lucide-react';

interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
}

const AdminPage: React.FC = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [view, setView] = useState<'users' | 'games'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [games, setGames] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAdmin) return;

        const fetchData = async () => {
            setIsLoading(true);
            if (view === 'users') {
                const q = query(collection(db, 'users'), orderBy('displayName'));
                const querySnapshot = await getDocs(q);
                setUsers(querySnapshot.docs.map(doc => doc.data() as UserData));
            } else {
                const q = query(collection(db, 'games'), orderBy('playCount', 'desc'));
                const querySnapshot = await getDocs(q);
                setGames(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
            setIsLoading(false);
        };

        fetchData();
    }, [view, isAdmin]);

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

    const handleDeleteUser = async (uid: string) => {
        if(window.confirm("Bu kullanıcıyı silmek istediğinden emin misin? Bu işlem geri alınamaz!")) {
             alert("Bu özellik güvenlik nedeniyle devre dışı bırakıldı. Firebase konsolundan silin.");
            // Gerçek silme kodu: await deleteDoc(doc(db, 'users', uid)); 
        }
    }
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-5xl font-heading mb-8 flex items-center gap-4">
                <Shield size={48} className="text-electric-purple" /> Yönetim Paneli
            </h1>
            <div className="flex gap-4 mb-8 border-b border-cyber-gray/50">
                <button onClick={() => setView('users')} className={`py-3 px-5 text-lg font-bold ${view === 'users' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}>
                    <Users className="inline-block mr-2" /> Kullanıcılar
                </button>
                <button onClick={() => setView('games')} className={`py-3 px-5 text-lg font-bold ${view === 'games' ? 'text-electric-purple border-b-2 border-electric-purple' : 'text-cyber-gray'}`}>
                   <Gamepad2 className="inline-block mr-2" /> Oyunlar
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
                                             <button onClick={() => handleDeleteUser(u.uid)} disabled={u.role === 'admin'} className="text-red-500 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed">
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
                     <h2 className="text-3xl font-heading mb-4">Oyun Yönetimi</h2>
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
                                        <td className="p-4 font-bold">{g.id}</td>
                                        <td className="p-4 text-cyber-gray">{g.category || 'N/A'}</td>
                                        <td className="p-4 font-mono text-electric-purple">{g.playCount}</td>
                                        <td className="p-4 flex gap-4">
                                            <button className="text-green-500 hover:text-green-400"><Edit size={18} /></button>
                                            <button className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
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