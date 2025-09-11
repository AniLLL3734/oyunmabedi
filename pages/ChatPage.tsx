import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Send, Trash2, LoaderCircle, ShieldAlert } from 'lucide-react';
import { grantAchievement } from '../src/utils/grantAchievement';
import AdminTag from '../components/AdminTag';
import { containsProfanity } from '../src/utils/profanityFilter';

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
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [isSending, setIsSending] = useState(false);
    const lastMessageTimestamp = useRef(0);
    const [chatError, setChatError] = useState<string | null>(null);

    // Tüm kullanıcı bilgilerini bir kez çek
    useEffect(() => {
        const fetchUsers = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersMap = new Map<string, any>();
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data()));
            setAllUsers(usersMap);
        };
        fetchUsers();
    }, []);

    // Mesajları dinleyen ve scroll'u yöneten ana useEffect
    useEffect(() => {
        if (!user) return;
        grantAchievement(user.uid, 'chat_initiate').catch(console.error);

        const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs: Message[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs.reverse());

            if (querySnapshot.docs.length > 0) {
                setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
            }
            setHasMore(querySnapshot.docs.length >= 50);
        });

        return () => unsubscribe();
    }, [user]);

    // *** SCROLL DÜZELTMESİ BURADA ***
    // 'messages' dizisi her güncellendiğinde, bu effect çalışarak en alta kaydırır.
    // 'setTimeout' ile React'in DOM'u tamamen çizmesini bekleyerek en garantili sonucu alırız.
    useEffect(() => {
        setTimeout(() => {
            dummy.current?.scrollIntoView({ behavior: 'auto' });
        }, 0);
    }, [messages]);
    

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || !lastVisible) return;
        setLoadingMore(true);

        const nextQuery = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(50));
        const documentSnapshots = await getDocs(nextQuery);

        const newMsgs: Message[] = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        const container = chatContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;

        setMessages(prevMessages => [...newMsgs.reverse(), ...prevMessages]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        setHasMore(documentSnapshots.docs.length >= 50);

        if (container) {
            requestAnimationFrame(() => { container.scrollTop = container.scrollHeight - previousScrollHeight; });
        }
        setLoadingMore(false);
    };
    
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user || isSending) return;
        const now = Date.now();
        const COOLDOWN_SECONDS = 2;
        if (now - lastMessageTimestamp.current < COOLDOWN_SECONDS * 1000) {
            const timeLeft = ((COOLDOWN_SECONDS * 1000 - (now - lastMessageTimestamp.current)) / 1000).toFixed(1);
            setChatError(`Frekans çok hızlı, ${timeLeft} saniye sonra tekrar dene.`);
            setTimeout(() => setChatError(null), 3000);
            return;
        }
        setIsSending(true);
        try {
            await addDoc(collection(db, 'messages'), { text: newMessage, uid: user.uid, displayName: user.displayName, createdAt: serverTimestamp() });
            lastMessageTimestamp.current = now;
            if (containsProfanity(newMessage)) {
                const wisdomQuotes = ["Evren, kelimelerimizin yankılarını saklar...", "En güçlü ses...","Bazı kelimeler köprü kurar...","Kelimelerin de bir ağırlığı vardır..."];
                const randomQuote = wisdomQuotes[Math.floor(Math.random() * wisdomQuotes.length)];
                setChatError(randomQuote);
                setTimeout(() => setChatError(null), 4000);
            }
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { messageCount: increment(1) });
            const userSnap = await getDoc(userRef);
            const messageCount = userSnap.data()?.messageCount || 0;
            if (messageCount >= 100) await grantAchievement(user.uid, 'frequency_echo');
            if (messageCount >= 1000) await grantAchievement(user.uid, 'void_caller');
            setNewMessage('');
        } catch(error) { 
            console.error("Mesaj gönderilemedi:", error);
            setChatError("Mesaj gönderilirken bir frekans hatası oluştu.");
            setTimeout(() => setChatError(null), 3000);
        } finally {
            setIsSending(false);
        }
    };
    
    const deleteMessage = async (messageId: string) => {
        if (!isAdmin) return;
        try { 
            await deleteDoc(doc(db, 'messages', messageId));
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (error) { console.error("Mesaj silinirken hata:", error); }
    };
    
    if (authLoading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) return <div className="text-center py-20"><h1 className="text-4xl font-heading">Erişim Reddedildi</h1><p className="mt-4 text-cyber-gray">Sohbet frekansına bağlanmak için sisteme giriş yapmalısın.</p><Link to="/login" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">Giriş Yap</Link></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-gray/50 rounded-t-lg border border-b-0 border-cyber-gray/50">
                {hasMore && (
                    <div className="text-center my-4">
                        <button onClick={loadMoreMessages} disabled={loadingMore} className="text-cyber-gray hover:text-electric-purple disabled:text-gray-500 text-sm font-semibold transition-colors">
                            {loadingMore ? 'Yükleniyor...' : 'Geçmiş Mesajları Yükle'}
                        </button>
                    </div>
                )}
                {messages.map(msg => {
                    const senderIsAdmin = allUsers.get(msg.uid)?.role === 'admin';
                    const messageIsFromCurrentUser = user.uid === msg.uid;
                    return (
                        <div key={msg.id} className={`flex items-start gap-3 group relative ${messageIsFromCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!messageIsFromCurrentUser && <Link to={`/profile/${msg.uid}`}><img src={allUsers.get(msg.uid)?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.uid}`} alt={msg.displayName} className="w-10 h-10 rounded-full bg-dark-gray object-cover flex-shrink-0"/></Link>}
                            <div className={`p-3 rounded-lg max-w-xs md:max-w-lg break-words ${senderIsAdmin ? 'border-2 border-yellow-400 bg-dark-gray' : messageIsFromCurrentUser ? 'bg-electric-purple text-white' : 'bg-space-black'}`}>
                                {!messageIsFromCurrentUser && (
                                    senderIsAdmin ? 
                                    <AdminTag name={msg.displayName} className="text-sm mb-1" /> :
                                    <Link to={`/profile/${msg.uid}`} className="font-bold text-sm text-electric-purple/80 mb-1 hover:underline">{msg.displayName}</Link>
                                )}
                                <p className="text-ghost-white">{msg.text}</p>
                            </div>
                            {isAdmin && (<button onClick={() => deleteMessage(msg.id)} title="Mesajı Sil" className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity ${messageIsFromCurrentUser ? 'left-2' : 'right-2'}`}><Trash2 size={14} /></button>)}
                        </div>
                    );
                })}
                 <div ref={dummy}></div>
            </div>
            <div className="p-4 bg-dark-gray rounded-b-lg border border-t-0 border-cyber-gray/50">
                {chatError && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 mb-4 text-yellow-300 bg-yellow-900/50 rounded-md text-sm border border-yellow-700/50"
                    >
                        <ShieldAlert size={18} />
                        <span>{chatError}</span>
                    </motion.div>
                )}
                <form onSubmit={sendMessage} className="flex gap-4">
                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Bir mesaj gönder..." className="flex-1 p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                    <button type="submit" disabled={!newMessage.trim() || isSending} className="p-3 bg-electric-purple text-white rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray/50 disabled:cursor-not-allowed"><Send /></button>
                </form>
            </div>
        </motion.div>
    );
};

export default ChatPage;