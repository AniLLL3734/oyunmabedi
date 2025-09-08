// DOSYA: pages/PrivateChatPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../src/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../src/contexts/AuthContext';
import { Send, ArrowLeft, LoaderCircle, UserX } from 'lucide-react';
import { motion } from 'framer-motion';

const PrivateChatPage: React.FC = () => {
    const { recipientId } = useParams<{ recipientId: string }>();
    const { user, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatId, setChatId] = useState<string | null>(null);
    const [recipient, setRecipient] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const dummy = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || !recipientId || user.uid === recipientId) { setIsLoading(false); return; }
        const setupChat = async () => {
            setIsLoading(true);
            const recipientDocRef = doc(db, 'users', recipientId);
            const recipientSnap = await getDoc(recipientDocRef);
            if (!recipientSnap.exists()) { setRecipient(null); setIsLoading(false); return; }
            setRecipient(recipientSnap.data());
            const sortedIds = [user.uid, recipientId].sort();
            const currentChatId = sortedIds.join('_');
            setChatId(currentChatId);
            const selfUserRef = doc(db, 'users', user.uid);
            await updateDoc(selfUserRef, { unreadChats: arrayRemove(currentChatId) });
            const messagesRef = collection(db, 'chats', currentChatId, 'messages');
            const q = query(messagesRef, orderBy('timestamp'));
            const unsubscribe = onSnapshot(q, (snapshot) => { setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
            setIsLoading(false);
            return unsubscribe;
        };
        const unsubscribePromise = setupChat();
        return () => { unsubscribePromise.then(unsubscribe => { if (unsubscribe) unsubscribe(); }); };
    }, [user, recipientId]);
    
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !chatId || !user || !recipient || isSending) return;
        setIsSending(true);
        try {
            const chatRef = doc(db, 'chats', chatId);
            const messagesRef = collection(chatRef, 'messages');
            await addDoc(messagesRef, { text: newMessage, senderId: user.uid, timestamp: serverTimestamp() });
            await setDoc(chatRef, { lastMessage: { text: newMessage, timestamp: serverTimestamp() }, users: [user.uid, recipientId], userNames: [user.displayName, recipient.displayName] }, { merge: true });
            const recipientUserRef = doc(db, 'users', recipientId);
            await updateDoc(recipientUserRef, { unreadChats: arrayUnion(chatId) });
            setNewMessage('');
        } catch(error) { console.error("Mesaj gönderilemedi:", error); } 
        finally { setIsSending(false); }
    };
    
    useEffect(() => { dummy.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    if (isLoading || authLoading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (user && recipientId && user.uid === recipientId) return <div className="text-center py-20"><h1 className="text-4xl font-heading">Kendine Mesaj Gönderemezsin</h1><p className="mt-4 text-cyber-gray">Başka bir gezgin seç.</p><Link to="/all-users" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded">Gezginlere Göz At</Link></div>;
    if (!recipient) return <div className="text-center py-20"><UserX size={64} className="mx-auto text-red-500" /><h1 className="text-4xl font-heading mt-4">Kullanıcı Bulunamadı</h1><p className="mt-4 text-cyber-gray">Mesaj göndermeye çalıştığın gezgin bulunamadı.</p><Link to="/all-users" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded">Tüm Gezginlere Dön</Link></div>;

    return (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
            <Link to="/dms" className="inline-flex items-center gap-2 text-cyber-gray hover:text-electric-purple mb-4 transition-colors"><ArrowLeft size={20} /><span>Tüm Mesajlara Dön</span></Link>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-gray/50 rounded-t-lg border border-b-0 border-cyber-gray/50">
                {messages.map(msg => (<div key={msg.id} className={`flex items-start gap-3 ${user?.uid === msg.senderId ? 'justify-end' : ''}`}><div className={`p-3 rounded-lg max-w-lg break-words ${user?.uid === msg.senderId ? 'bg-electric-purple text-white' : 'bg-space-black'}`}><p>{msg.text}</p></div></div>))}
                 <div ref={dummy}></div>
            </div>
             <form onSubmit={sendMessage} className="flex gap-4 p-4 bg-dark-gray rounded-b-lg border border-t-0 border-cyber-gray/50">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={`... ${recipient?.displayName || ''} adlı kullanıcıya bir mesaj gönder`} className="flex-1 p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                <button type="submit" disabled={!newMessage.trim() || isSending} className="p-3 bg-electric-purple text-white rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray/50 disabled:cursor-not-allowed">{isSending ? <LoaderCircle className="animate-spin" /> : <Send />}</button>
            </form>
        </motion.div>
    );
};
export default PrivateChatPage;