// DOSYA: pages/AuthlessChatPage.tsx (Nihai Versiyon: Basit, Hızlı, Tam Yetkili)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getChatDb } from '../src/firebase-servers';
import {
    collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc,
    getDocs, deleteDoc, limit, startAfter, QueryDocumentSnapshot, DocumentData, setDoc, Timestamp
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Send, Trash2, ShieldAlert, Pin, CornerDownLeft, X, LoaderCircle } from 'lucide-react';
import { getRoomInfo, ChatRoomInfo } from '../src/chat-room-config';
import AdminTag from '../components/AdminTag';

// --- Arayüzler ve Sabitler ---
interface ReplyInfo { uid: string; displayName: string; text: string; }
interface Message {
    id: string;
    uid: string;
    displayName: string;
    text: string;
    createdAt: Timestamp;
    role?: string;
    replyingTo?: ReplyInfo;
}
interface PinnedMessage extends Message { pinnedBy: string; }

const MAX_CHAR_LIMIT = 300;
const INITIAL_LOAD_LIMIT = 25;
const MORE_MESSAGES_LIMIT = 35;
const ADMIN_ROLE_KEY = import.meta.env.VITE_ADMIN_SECRET_ROLE
const AuthlessChatPage: React.FC = () => {
    const { serverId } = useParams<{ serverId: string }>(); 
    const navigate = useNavigate();

    const [messages, setMessages] = useState<Message[]>([]);
    const [roomInfo, setRoomInfo] = useState<ChatRoomInfo | null>(null);
    const [userInfo, setUserInfo] = useState<{ uid: string; displayName: string; role: string; key: string } | null>(null);
    const [allUsers, setAllUsers] = useState<Map<string, any>>(new Map());
    const [newMessage, setNewMessage] = useState('');
    const dummy = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [firstMessage, setFirstMessage] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const currentUserIsAdmin = userInfo?.role === ADMIN_ROLE_KEY;

    useEffect(() => {
        const ticketString = localStorage.getItem('chatTicket');
        if (ticketString) { 
            setUserInfo(JSON.parse(ticketString)); 
        } else { 
            alert("Sohbet odasına girmek için Lobi'den bir sunucu seçmelisiniz.");
            navigate('/chat-rooms'); 
        }

        if (serverId) { 
            const info = getRoomInfo(serverId); 
            if (info) { 
                setRoomInfo(info); 
            } else { 
                navigate('/chat-rooms'); 
            }
        }

        const fetchUsers = async () => {
             const mainDb = await import('../src/firebase').then(m => m.db);
             const usersSnap = await getDocs(collection(mainDb, 'users'));
             const usersMap = new Map<string, any>();
             usersSnap.forEach(doc => usersMap.set(doc.id, doc.data()));
             setAllUsers(usersMap);
        };
        fetchUsers();
    }, [serverId, navigate]);

    useEffect(() => {
        if (!serverId || !userInfo) return;
        const chatDb = getChatDb(serverId);

        const q = query(collection(chatDb, 'messages'), orderBy('createdAt', 'desc'), limit(INITIAL_LOAD_LIMIT));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                setFirstMessage(querySnapshot.docs[querySnapshot.docs.length - 1]);
                setHasMore(querySnapshot.docs.length === INITIAL_LOAD_LIMIT);
            } else {
                setHasMore(false);
            }
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
            setMessages(msgs);
        });

        const pinnedMessageRef = doc(chatDb, 'chat_meta', 'pinned_message');
        const unsubscribePinned = onSnapshot(pinnedMessageRef, (docSnap) => {
            setPinnedMessage(docSnap.exists() ? docSnap.data() as PinnedMessage : null);
        });

        return () => {
            unsubscribe();
            unsubscribePinned();
        };
    }, [serverId, userInfo]);

    useEffect(() => { setTimeout(() => { dummy.current?.scrollIntoView({ behavior: 'auto' }); }, 100); }, [messages]);

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || !firstMessage || !serverId) return;
        setLoadingMore(true);

        const chatDb = getChatDb(serverId);
        const nextQuery = query(
            collection(chatDb, 'messages'), 
            orderBy('createdAt', 'desc'), 
            startAfter(firstMessage), 
            limit(MORE_MESSAGES_LIMIT)
        );

        const documentSnapshots = await getDocs(nextQuery);
        if(documentSnapshots.empty){
            setHasMore(false);
            setLoadingMore(false);
            return;
        }

        const newMsgs = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
        
        const container = chatContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;

        setMessages(prev => [...newMsgs, ...prev]);
        setFirstMessage(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        setHasMore(documentSnapshots.docs.length >= MORE_MESSAGES_LIMIT);
        
        if (container) { requestAnimationFrame(() => { container.scrollTop = container.scrollHeight - previousScrollHeight; }); }
        setLoadingMore(false);
    };
    
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInfo || !serverId || newMessage.trim() === '' || isSending || newMessage.length > MAX_CHAR_LIMIT) return;

        setIsSending(true);
        const chatDb = getChatDb(serverId);
        const newMessageData = {
            text: newMessage,
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            role: userInfo.role,
            secretKey: userInfo.key,
            createdAt: serverTimestamp(),
            ...(replyingToMessage && { replyingTo: { uid: replyingToMessage.uid, displayName: replyingToMessage.displayName, text: replyingToMessage.text }})
        };

        try {
            await addDoc(collection(chatDb, 'messages'), newMessageData);
            setNewMessage('');
            setReplyingToMessage(null);
        } catch (error) {
            console.error(`Mesaj gönderilemedi (${serverId}):`, error);
            setChatError("Mesaj gönderilirken bir frekans hatası oluştu.");
            setTimeout(() => setChatError(null), 3000);
        } finally {
            setIsSending(false);
        }
    };
    
    const deleteMessage = async (messageId: string) => {
        if (!currentUserIsAdmin || !serverId) {
            alert("Bu işlem için yetkiniz yok.");
            return;
        }
        try {
            const chatDb = getChatDb(serverId);
            await deleteDoc(doc(chatDb, 'messages', messageId));
        } catch(error) {
            console.error("Mesaj silinirken hata:", error);
        }
    };

    const handlePinMessage = async (message: Message) => {
        if (!currentUserIsAdmin || !serverId || !userInfo) return;
        const chatDb = getChatDb(serverId);
        const pinnedMessageRef = doc(chatDb, 'chat_meta', 'pinned_message');
        
        const pinData: PinnedMessage = { 
            ...message, 
            role: userInfo.role,
            pinnedBy: userInfo.displayName
        };
        await setDoc(pinnedMessageRef, pinData as any);
    };
    
    const handleUnpinMessage = async () => {
        if (!currentUserIsAdmin || !serverId) return;
        const chatDb = getChatDb(serverId);
        const pinnedMessageRef = doc(chatDb, 'chat_meta', 'pinned_message');
        await deleteDoc(pinnedMessageRef);
    };

    const handleStartReply = (message: Message) => setReplyingToMessage(message);
    const handleCancelReply = () => setReplyingToMessage(null);
    
    const getCharCountColor = () => {
        if (newMessage.length >= MAX_CHAR_LIMIT) return 'text-red-500';
        if (newMessage.length > MAX_CHAR_LIMIT * 0.9) return 'text-yellow-400';
        return 'text-cyber-gray';
    };

    if (!userInfo || !roomInfo) { 
        return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>; 
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
            <div className={`p-3 mb-4 rounded-lg border-l-4 ${roomInfo.themeColor} bg-space-black`}>
                <h1 className="text-2xl font-bold text-ghost-white">{roomInfo.title}</h1>
                <p className="text-sm text-cyber-gray mt-1">{roomInfo.welcomeMessage}</p>
            </div>
            
            {pinnedMessage && (
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-yellow-900/50 border border-yellow-700/50 rounded-lg flex items-start gap-3 text-sm">
                    <Pin className="text-yellow-400 mt-1 flex-shrink-0" size={18}/>
                    <div className="flex-1">
                        <p className="font-bold text-yellow-300">Sabitlenmiş Mesaj</p>
                        <p className="text-yellow-200">"{pinnedMessage.text}" - <span className="font-semibold">{pinnedMessage.displayName}</span></p>
                    </div>
                    {currentUserIsAdmin && (<button onClick={handleUnpinMessage} className="p-1 rounded-full hover:bg-yellow-700/50"><X className="text-yellow-400" size={16}/></button>)}
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
                    const senderIsAdmin = msg.role === ADMIN_ROLE_KEY;
                    const messageIsFromCurrentUser = userInfo.uid === msg.uid;
                    return (
                        <div key={msg.id} className={`flex items-start gap-3 group relative ${messageIsFromCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!messageIsFromCurrentUser && (
                                <Link to={`/profile/${msg.uid}`}>
                                    <div className="relative">
                                        <img 
                                            src={allUsers.get(msg.uid)?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.uid}`} 
                                            alt={msg.displayName} 
                                            className={`w-10 h-10 rounded-full bg-dark-gray object-cover flex-shrink-0 ${
                                                allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'neon_frame' 
                                                    ? 'border-2 border-cyan-400 ring-2 ring-cyan-400/50' 
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'hologram_frame'
                                                    ? 'border-2 border-purple-400 ring-2 ring-purple-400/50'
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'golden_frame'
                                                    ? 'border-2 border-yellow-400 ring-2 ring-yellow-400/50'
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'matrix_frame'
                                                    ? 'border-2 border-green-400 ring-2 ring-green-400/50'
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'fire_frame'
                                                    ? 'border-2 border-red-400 ring-2 ring-red-400/50'
                                                    : ''
                                            }`}
                                        />
                                        {/* Aktif çerçeve efekti */}
                                        {allUsers.get(msg.uid)?.inventory?.activeAvatarFrame && (
                                            <div className={`absolute inset-0 rounded-full animate-pulse ${
                                                allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'neon_frame' 
                                                    ? 'ring-1 ring-cyan-400/30' 
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'hologram_frame'
                                                    ? 'ring-1 ring-purple-400/30'
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'golden_frame'
                                                    ? 'ring-1 ring-yellow-400/30'
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'matrix_frame'
                                                    ? 'ring-1 ring-green-400/30'
                                                    : allUsers.get(msg.uid)?.inventory?.activeAvatarFrame === 'fire_frame'
                                                    ? 'ring-1 ring-red-400/30'
                                                    : ''
                                            }`} />
                                        )}
                                    </div>
                                </Link>
                            )}
                            <div className={`p-3 rounded-lg max-w-xs md:max-w-lg break-words ${senderIsAdmin ? 'border-2 border-yellow-400 bg-dark-gray' : messageIsFromCurrentUser ? 'bg-electric-purple text-white' : 'bg-space-black'}`}>
                                {!messageIsFromCurrentUser && (
                                    senderIsAdmin ? 
                                    <AdminTag name={msg.displayName} className="text-sm mb-1" /> :
                                    <div className="mb-1">
                                        <Link to={`/profile/${msg.uid}`} className="font-bold text-sm text-electric-purple/80 hover:underline">{msg.displayName}</Link>
                                        {allUsers.get(msg.uid)?.inventory?.activeSpecialTitle && (
                                            <span className="ml-2 px-2 py-1 bg-purple-500/20 border border-purple-400/50 rounded-full text-xs text-purple-300 font-bold">
                                                {allUsers.get(msg.uid)?.inventory?.activeSpecialTitle === 'score_hunter_title' && 'Skor Avcısı'}
                                                {allUsers.get(msg.uid)?.inventory?.activeSpecialTitle === 'time_master_title' && 'Zaman Efendisi'}
                                                {allUsers.get(msg.uid)?.inventory?.activeSpecialTitle === 'pixel_master_title' && 'Piksel Ustası'}
                                                {allUsers.get(msg.uid)?.inventory?.activeSpecialTitle === 'digital_ghost_title' && 'Dijital Hayalet'}
                                                {allUsers.get(msg.uid)?.inventory?.activeSpecialTitle === 'cyber_legend_title' && 'Siber Efsane'}
                                                {allUsers.get(msg.uid)?.inventory?.activeSpecialTitle === 'code_breaker_title' && 'Kod Kırıcı'}
                                            </span>
                                        )}
                                    </div>
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
                                {currentUserIsAdmin && <button onClick={() => handlePinMessage(msg)} title="Sabitle" className="text-yellow-400 hover:text-yellow-300"><Pin size={16} /></button>}
                                {currentUserIsAdmin && <button onClick={() => deleteMessage(msg.id)} title="Mesajı Sil" className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>}
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
                             <p className="text-cyber-gray/80 truncate">`"{replyingToMessage.text}"`</p>
                        </div>
                        <button onClick={handleCancelReply} className="p-1 rounded-full hover:bg-cyber-gray/20"><X size={16}/></button>
                     </motion.div>
                 )}
                {chatError && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 mb-4 rounded-md text-sm border text-yellow-300 bg-yellow-900/50 border-yellow-700/50">
                        <ShieldAlert size={18} />
                        <span>{chatError}</span>
                    </motion.div>
                )}
                <form onSubmit={sendMessage} className="flex gap-4 items-start">
                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Bir mesaj gönder..." maxLength={MAX_CHAR_LIMIT} className="flex-1 p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none" />
                    <button type="submit" disabled={!newMessage.trim() || isSending || newMessage.length > MAX_CHAR_LIMIT} className="p-3 bg-electric-purple text-white rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray/50 disabled:cursor-not-allowed">
                        <Send />
                    </button>
                </form>
                <p className={`text-xs text-right mt-2 font-mono transition-colors ${getCharCountColor()}`}>{newMessage.length} / {MAX_CHAR_LIMIT}</p>
            </div>
        </motion.div>
    );
};

export default AuthlessChatPage;