// DOSYA: pages/DirectMessagesPage.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../src/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../src/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LoaderCircle, User, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatListItem {
    id: string;
    otherUser: {
        uid: string | null;
        displayName: string;
    };
    lastMessage?: {
        text: string;
        timestamp: { seconds: number };
    };
    isUnread: boolean;
}

const DirectMessagesPage: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [chats, setChats] = useState<ChatListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            if (!authLoading) setIsLoading(false);
            return;
        }
        
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('users', 'array-contains', user.uid), orderBy('lastMessage.timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => {
                const data = doc.data();
                const otherUserUid = data.users?.find((uid: string) => uid !== user.uid) || null;
                const otherUserName = data.userNames?.find((name: string) => name !== user.displayName) || 'Bilinmeyen Gezgin';
                const isUnread = data.unreadBy?.[user.uid] === true;

                const chatItem: ChatListItem = {
                    id: doc.id,
                    otherUser: {
                        uid: otherUserUid,
                        displayName: otherUserName,
                    },
                    lastMessage: data.lastMessage,
                    isUnread: isUnread
                };
                return chatItem;
            }).filter(chat => chat.otherUser.uid);

            setChats(chatsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Sohbetler alınırken hata oluştu:", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [user, authLoading]);

    const handleChatClick = (otherUserUid: string | null) => {
        if (!otherUserUid) {
            alert("Sohbet odasına girilemiyor: Karşıdaki kullanıcı bulunamadı.");
            return;
        }
        navigate(`/dm/${otherUserUid}`);
    };

    if (isLoading || authLoading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) { navigate("/login"); return null; }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-4xl font-heading mb-8 flex items-center gap-3">
                <MessageCircle className="text-electric-purple" />Özel Mesajlar
            </h1>
            <div className="space-y-4">
                {chats.length > 0 ? chats.map((chat, index) => (
                    <motion.div
                        key={chat.id}
                        onClick={() => handleChatClick(chat.otherUser.uid)}
                        className={`flex items-center p-4 rounded-lg cursor-pointer transition-all border ${chat.isUnread ? 'bg-electric-purple/20 border-electric-purple/50' : 'bg-dark-gray/50 border-transparent hover:border-electric-purple/50'}`}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <User className="mr-4 text-cyber-gray w-8 h-8 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold ${chat.isUnread ? 'text-white' : 'text-ghost-white'}`}>{chat.otherUser.displayName}</h3>
                            <p className={`text-sm truncate ${chat.isUnread ? 'text-ghost-white/90 font-semibold' : 'text-cyber-gray'}`}>
                               {chat.lastMessage?.text || 'Henüz mesaj yok...'}
                            </p>
                        </div>
                         {chat.lastMessage?.timestamp && <span className="text-xs text-cyber-gray/70 ml-4 flex-shrink-0">{new Date(chat.lastMessage.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </motion.div>
                )) : (
                     <div className="text-center py-10"><p className="text-cyber-gray">Henüz özel bir görüşme başlatmadın.</p><Link to="/all-users" className="mt-4 inline-block text-electric-purple underline hover:text-electric-purple/80">Gezginler sayfasından birine mesaj göndererek başla!</Link></div>
                )}
            </div>
        </motion.div>
    );
};

export default DirectMessagesPage;