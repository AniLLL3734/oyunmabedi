// DOSYA: pages/ChatPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, getDocs, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Send, Trash2, LoaderCircle } from 'lucide-react';
import { grantAchievement } from '../src/utils/grantAchievement.tsx';
import AdminTag from '../components/AdminTag'; // AdminTag bileşenini import et

interface Message {
    id: string;
    uid: string;
    displayName: string;
    text: string;
    createdAt: any;
}

const ChatPage: React.FC = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [allUsers, setAllUsers] = useState<Map<string, any>>(new Map());
    const [newMessage, setNewMessage] = useState('');
    const dummy = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersMap = new Map();
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data()));
            setAllUsers(usersMap);
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!user) return; 

        const checkFirstVisit = async () => { await grantAchievement(user.uid, 'chat_initiate'); };
        checkFirstVisit();

        const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50)); 
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs: Message[] = [];
            querySnapshot.forEach((doc) => { msgs.push({ ...doc.data(), id: doc.id } as Message) });
            setMessages(msgs.reverse());
        });

        return () => unsubscribe();
    }, [user]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user) return;
        try {
            await addDoc(collection(db, 'messages'), { text: newMessage, uid: user.uid, displayName: user.displayName, createdAt: serverTimestamp() });
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { messageCount: increment(1) });
            const userSnap = await getDoc(userRef); 
            const messageCount = userSnap.data()?.messageCount || 0;
            if (messageCount >= 100) await grantAchievement(user.uid, 'frequency_echo');
            if (messageCount >= 1000) await grantAchievement(user.uid, 'void_caller');
            setNewMessage('');
        } catch(error) { console.error("Mesaj gönderilemedi:", error); }
    };
    
    const deleteMessage = async (id: string) => {
        await deleteDoc(doc(db, 'messages', id));
    };

    useEffect(() => { dummy.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    
    if (authLoading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>
    if (!user) return <div className="text-center py-20"><h1 className="text-4xl font-heading">Erişim Reddedildi</h1><p className="mt-4 text-cyber-gray">Sohbet frekansına bağlanmak için sisteme giriş yapmalısın.</p><Link to="/login" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">Giriş Yap</Link></div>

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-gray/50 rounded-t-lg border border-b-0 border-cyber-gray/50">
                {messages.map(msg => {
                    const senderIsAdmin = allUsers.get(msg.uid)?.role === 'admin';
                    return (
                    <div key={msg.id} className={`flex items-start gap-3 group relative ${user.uid === msg.uid ? 'justify-end' : ''}`}>
                        {user.uid !== msg.uid && <img src={allUsers.get(msg.uid)?.avatarUrl} alt={msg.displayName} className="w-10 h-10 rounded-full bg-dark-gray object-cover"/>}
                        <div className={`p-3 rounded-lg max-w-lg break-words ${senderIsAdmin ? 'border-2 border-yellow-400 bg-dark-gray' : user.uid === msg.uid ? 'bg-electric-purple text-white' : 'bg-space-black'}`}>
                            {user.uid !== msg.uid && (
                                senderIsAdmin ? 
                                <AdminTag name={msg.displayName} className="text-sm mb-1" /> :
                                <Link to={`/profile/${msg.uid}`} className="font-bold text-sm text-electric-purple/80 mb-1 hover:underline">{msg.displayName}</Link>
                            )}
                            <p className="text-ghost-white">{msg.text}</p>
                        </div>
                        {isAdmin && (<button onClick={() => deleteMessage(msg.id)} title="Mesajı Sil" className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={14} /></button>)}
                    </div>
                )})}
                 <div ref={dummy}></div>
            </div>
            <form onSubmit={sendMessage} className="flex gap-4 p-4 bg-dark-gray rounded-b-lg border border-t-0 border-cyber-gray/50">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Bir mesaj gönder..." className="flex-1 p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-electric-purple text-white rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray/50 disabled:cursor-not-allowed"><Send /></button>
            </form>
        </motion.div>
    );
};

export default ChatPage;