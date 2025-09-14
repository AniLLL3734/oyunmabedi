// ===================================================================================
//
//              CHATPAGE.TSX - SİNYAL MEKANİZMASI VERSİYONU (BÜTÇE DOSTU)
//               ----------------------------------------------------
// Bu bileşen SADECE FIRESTORE kullanarak çalışır.
// - Sürekli onSnapshot maliyetinden kaçınmak için tek bir belgeyi dinler ("sinyal").
// - Yeni mesaj, silme gibi olaylarda "sinyal" alıp veriyi bir kereliğine çeker.
// - Blaze planı veya Cloud Functions GEREKTİRMEZ. %100 ÜCRETSİZ PLAN UYUMLU.
//
// ===================================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import {
    collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc,
    updateDoc, increment, getDocs, limit, startAfter, QueryDocumentSnapshot,
    DocumentData, deleteDoc, Timestamp, setDoc
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Send, Trash2, LoaderCircle, ShieldAlert, Pin, CornerDownLeft, X } from 'lucide-react';
import { grantAchievement } from '../src/utils/grantAchievement';
import AdminTag from '../components/AdminTag';
import { containsProfanity } from '../src/utils/profanityFilter';

// --- ARAYÜZ TANIMLARI ---
interface ReplyInfo {
    uid: string;
    displayName: string;
    text: string;
}

interface Message {
    id: string;
    uid: string;
    displayName: string;
    text: string;
    createdAt: Timestamp; // Sadece Firestore kullandığımız için Timestamp türü en doğrusu.
    replyingTo?: ReplyInfo;
}

interface PinnedMessage extends Message {
    pinnedBy: string;
}

interface UserProfile {
    mutedUntil?: Timestamp;
}

const MAX_CHAR_LIMIT = 300;
const PAGE_SIZE = 50; // Hem ilk yükleme hem de "daha fazla yükle" için standart boyut.

const formatRemainingTime = (endDate: Date) => {
    const totalSeconds = Math.floor((endDate.getTime() - new Date().getTime()) / 1000);
    if (totalSeconds <= 0) return "0 saniye";
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let result = '';
    if (days > 0) result += `${days} gün `;
    if (hours > 0) result += `${hours} saat `;
    if (minutes > 0) result += `${minutes} dakika `;
    if (seconds > 0 && days === 0 && hours === 0) result += `${seconds} saniye`;
    return result.trim();
};

// ===================================================================================
//                                  ANA BİLEŞEN
// ===================================================================================
const ChatPage: React.FC = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [allUsers, setAllUsers] = useState<Map<string, any>>(new Map());
    const [newMessage, setNewMessage] = useState('');
    const dummy = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const lastMessageSpamCheck = useRef(0);
    const [chatError, setChatError] = useState<string | null>(null);
    const initialLoadDone = useRef(false);

    useEffect(() => {
        const fetchUsers = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersMap = new Map<string, any>();
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data()));
            setAllUsers(usersMap);
        };
        fetchUsers();

        const pinnedMessageRef = doc(db, 'chat_meta', 'pinned_message');
        const unsubscribePinned = onSnapshot(pinnedMessageRef, (doc) => {
            if (doc.exists()) {
                setPinnedMessage(doc.data() as PinnedMessage);
            } else {
                setPinnedMessage(null);
            }
        });

        return () => {
            unsubscribePinned();
        };
    }, []);

    const syncChat = useCallback(async () => {
        const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
        const documentSnapshots = await getDocs(q);
        const msgs: Message[] = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
        
        setMessages(msgs);

        if (documentSnapshots.docs.length > 0) {
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        }
        setHasMore(documentSnapshots.docs.length >= PAGE_SIZE);
    }, []);

    useEffect(() => {
        if (!user) return;
        
        syncChat();
        grantAchievement(user.uid, 'chat_initiate').catch(console.error);

        const metaRef = doc(db, 'chat_meta', 'last_update');
        const unsubscribeMeta = onSnapshot(metaRef, () => {
            if (initialLoadDone.current) {
                console.log("Sinyal alındı, sohbet güncelleniyor...");
                syncChat();
            } else {
                initialLoadDone.current = true;
            }
        });

        return () => unsubscribeMeta();
    }, [user, syncChat]);
    
    useEffect(() => {
        setTimeout(() => {
            dummy.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
    }, [messages]);
    
    const triggerSignal = async () => {
        const metaRef = doc(db, 'chat_meta', 'last_update');
        await setDoc(metaRef, { timestamp: serverTimestamp() });
    };

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || !lastVisible) return;
        setLoadingMore(true);

        const nextQuery = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
        const documentSnapshots = await getDocs(nextQuery);

        const newMsgs: Message[] = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        const container = chatContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;

        setMessages(prevMessages => [...newMsgs.reverse(), ...prevMessages]);
        if(documentSnapshots.docs.length > 0) {
           setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        }
        setHasMore(documentSnapshots.docs.length >= PAGE_SIZE);

        if (container) {
            requestAnimationFrame(() => { container.scrollTop = container.scrollHeight - previousScrollHeight; });
        }
        setLoadingMore(false);
    };

    const handleStartReply = (message: Message) => {
        setReplyingToMessage(message);
    };

    const handleCancelReply = () => {
        setReplyingToMessage(null);
    };

    const handlePinMessage = async (message: Message) => {
        if (!isAdmin || !user) return;
        const pinnedMessageRef = doc(db, 'chat_meta', 'pinned_message');
        const pinData: PinnedMessage = { ...message, pinnedBy: user.displayName || 'Admin' };
        try {
            await setDoc(pinnedMessageRef, pinData as any);
        } catch (error) {
            console.error("Mesaj sabitlenirken hata:", error);
        }
    };
    
    const handleUnpinMessage = async () => {
        if (!isAdmin) return;
        const pinnedMessageRef = doc(db, 'chat_meta', 'pinned_message');
        try {
            await deleteDoc(pinnedMessageRef);
        } catch (error) {
            console.error("Sabitlenmiş mesaj kaldırılırken hata:", error);
        }
    };
    
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newMessage.trim() === '' || !user || isSending || newMessage.length > MAX_CHAR_LIMIT) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data() as UserProfile;
                if (userData.mutedUntil && userData.mutedUntil.toDate() > new Date()) {
                    const remainingTime = formatRemainingTime(userData.mutedUntil.toDate());
                    setChatError(`Sohbette susturuldun. Kalan süre: ${remainingTime}.`);
                    setTimeout(() => setChatError(null), 5000);
                    return; 
                }
            }
        } catch (error) {
            console.error("Kullanıcı susturma durumu kontrol edilirken hata:", error);
        }

        const now = Date.now();
        const COOLDOWN_SECONDS = 2;
        if (now - lastMessageSpamCheck.current < COOLDOWN_SECONDS * 1000) {
            const timeLeft = ((COOLDOWN_SECONDS * 1000 - (now - lastMessageSpamCheck.current)) / 1000).toFixed(1);
            setChatError(`SPAM Yasaktır, ${timeLeft} saniye sonra tekrar dene.`);
            setTimeout(() => setChatError(null), 3000);
            return;
        }

        setIsSending(true);
        const newMessageData = {
            text: newMessage,
            uid: user.uid,
            displayName: user.displayName,
            createdAt: serverTimestamp(),
            ...(replyingToMessage && {
                replyingTo: {
                    uid: replyingToMessage.uid,
                    displayName: replyingToMessage.displayName,
                    text: replyingToMessage.text
                }
            })
        };

        try {
            await addDoc(collection(db, 'messages'), newMessageData);
            await triggerSignal();
            
            lastMessageSpamCheck.current = now;
            
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
            handleCancelReply();
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
            await triggerSignal();
        } catch (error) { console.error("Mesaj silinirken hata:", error); }
    };
    
    const getCharCountColor = () => {
        if (newMessage.length >= MAX_CHAR_LIMIT) return 'text-red-500';
        if (newMessage.length > MAX_CHAR_LIMIT * 0.9) return 'text-yellow-400';
        return 'text-cyber-gray';
    };
    
    if (authLoading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) return <div className="text-center py-20"><h1 className="text-4xl font-heading">Erişim Reddedildi</h1><p className="mt-4 text-cyber-gray">Sohbet frekansına bağlanmak için sisteme giriş yapmalısın.</p><Link to="/login" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">Giriş Yap</Link></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
            {pinnedMessage && (
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-yellow-900/50 border border-yellow-700/50 rounded-lg flex items-start gap-3 text-sm">
                    <Pin className="text-yellow-400 mt-1 flex-shrink-0" size={18}/>
                    <div className="flex-1">
                        <p className="font-bold text-yellow-300">Sabitlenmiş Mesaj</p>
                        <p className="text-yellow-200">"{pinnedMessage.text}" - <span className="font-semibold">{pinnedMessage.displayName}</span></p>
                    </div>
                    {isAdmin && (
                        <button onClick={handleUnpinMessage} className="p-1 rounded-full hover:bg-yellow-700/50">
                            <X className="text-yellow-400" size={16}/>
                        </button>
                    )}
                </motion.div>
            )}

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
                                
                                {msg.replyingTo && (
                                    <div className="mb-2 p-2 border-l-2 border-cyber-gray/50 bg-black/20 rounded-md text-xs opacity-80">
                                        <p className="font-bold">{msg.replyingTo.displayName}</p>
                                        <p className="truncate">{msg.replyingTo.text}</p>
                                    </div>
                                )}

                                <p className="text-ghost-white">{msg.text}</p>
                            </div>
                            <div className={`flex gap-2 items-center absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${messageIsFromCurrentUser ? 'left-2' : 'right-2'}`}>
                                <button onClick={() => handleStartReply(msg)} title="Yanıtla" className="text-cyber-gray hover:text-white"><CornerDownLeft size={16}/></button>
                                {isAdmin && <button onClick={() => handlePinMessage(msg)} title="Sabitle" className="text-yellow-400 hover:text-yellow-300"><Pin size={16} /></button>}
                                {isAdmin && <button onClick={() => deleteMessage(msg.id)} title="Mesajı Sil" className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>}
                            </div>
                        </div>
                    );
                })}
                 <div ref={dummy}></div>
            </div>
            <div className="p-4 bg-dark-gray rounded-b-lg border border-t-0 border-cyber-gray/50">
                 {replyingToMessage && (
                     <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-2 mb-3 bg-space-black border-l-4 border-electric-purple rounded-md text-sm flex justify-between items-center">
                        <div>
                             <p className="text-cyber-gray">Yanıtlanıyor: <span className="text-ghost-white font-bold">{replyingToMessage.displayName}</span></p>
                             <p className="text-cyber-gray/80 truncate">"{replyingToMessage.text}"</p>
                        </div>
                        <button onClick={handleCancelReply} className="p-1 rounded-full hover:bg-cyber-gray/20"><X size={16}/></button>
                     </motion.div>
                 )}

                {chatError && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 p-3 mb-4 rounded-md text-sm border ${
                            chatError.includes("susturuldun") 
                            ? 'text-red-300 bg-red-900/50 border-red-700/50' 
                            : 'text-yellow-300 bg-yellow-900/50 border-yellow-700/50'
                        }`}
                    >
                        <ShieldAlert size={18} />
                        <span>{chatError}</span>
                    </motion.div>
                )}
                <form onSubmit={sendMessage} className="flex gap-4 items-start">
                    <input 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Bir mesaj gönder..." 
                        maxLength={MAX_CHAR_LIMIT}
                        className="flex-1 p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim() || isSending || newMessage.length > MAX_CHAR_LIMIT} 
                        className="p-3 bg-electric-purple text-white rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray/50 disabled:cursor-not-allowed"
                    >
                        <Send />
                    </button>
                </form>
                <p className={`text-xs text-right mt-2 font-mono transition-colors ${getCharCountColor()}`}>
                    {newMessage.length} / {MAX_CHAR_LIMIT}
                </p>
            </div>
        </motion.div>
    );
};

export default ChatPage;