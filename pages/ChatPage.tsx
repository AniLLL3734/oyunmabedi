// ===================================================================================
//
//              CHATPAGE.TSX - "ALTIN STANDART" VERSİYONU (TAM onSnapshot)
//               ---------------------------------------------------------
// Bu bileşen, en iyi kullanıcı deneyimi için doğrudan onSnapshot dinleyicisi kullanır.
// - Yeni mesajlar, silmeler ve düzenlemeler TAMAMEN anlık olarak yansıtılır.
// - Kod daha basit, anlaşılır ve güvenilirdir. Sinyal mekanizması tamamen kaldırılmıştır.
// - Tüm zamanlayıcı, state ve JSX hataları DÜZELTİLDİ.
//
// ===================================================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import {
    collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc,
    updateDoc, increment, getDocs, limit,
    deleteDoc, Timestamp, setDoc, where
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Send, Trash2, LoaderCircle, ShieldAlert, Pin, CornerDownLeft, X, Smile } from 'lucide-react';
import { checkAndGrantAchievements } from '../src/utils/achievementService';
import AdminTag from '../components/AdminTag';
import { fortressProfanityCheckINTELLIGENCE as fortressModerationCheck } from '../src/utils/fortressProfanityFilterULTRA';
import ChatJoinRequestPage from './ChatJoinRequestPage';
import ProfileAnimation from '../components/ProfileAnimations';

// --- ARAYÜZ TANIMLARI ---
interface ReplyInfo { uid: string; displayName: string; text: string; }
interface Message { id: string; uid: string; displayName: string; text: string; createdAt: Timestamp; replyingTo?: ReplyInfo; seenBy?: { [uid: string]: Timestamp }; }
interface PinnedMessage extends Message { pinnedBy: string; }
interface UserProfile { mutedUntil?: Timestamp; inventory?: any; messageCount?: number; displayName?: string; }

const MAX_CHAR_LIMIT = 300;
const PAGE_SIZE = 50;

const formatRemainingTime = (endDate: Date) => {
    const totalSeconds = Math.floor((endDate.getTime() - new Date().getTime()) / 1000);
    if (totalSeconds <= 0) return "0 saniye";
    const days = Math.floor(totalSeconds / 86400); const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60;
    let result = '';
    if (days > 0) result += `${days} gün `; if (hours > 0) result += `${hours} saat `;
    if (minutes > 0) result += `${minutes} dakika `; if (seconds > 0 && days === 0 && hours === 0) result += `${seconds} saniye`;
    return result.trim();
};

// ===================================================================================
//                                  ANA BİLEŞEN
// ===================================================================================
const ChatPage: React.FC = () => {
    const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [allUsers, setAllUsers] = useState<Map<string, any>>(new Map());
    const [newMessage, setNewMessage] = useState('');
    const dummy = useRef<HTMLDivElement>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [disclaimerTimer, setDisclaimerTimer] = useState(10);
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [chatSettings, setChatSettings] = useState<{
        chatPaused: boolean; chatPauseReason: string; slowMode: boolean; slowModeDelay: number; isChatInvitationless: boolean;
    }>({ chatPaused: false, chatPauseReason: '', slowMode: false, slowModeDelay: 0, isChatInvitationless: false });
    const [chatError, setChatError] = useState<string | null>(null);
    const initialLoadDone = useRef(false);

    // Kullanıcılar, ayarlar ve sabitlenmiş mesaj için useEffect
    useEffect(() => {
        const fetchUsers = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersMap = new Map<string, any>();
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data()));
            setAllUsers(usersMap);
        };
        fetchUsers();
        const pinnedMessageRef = doc(db, 'chat_meta', 'pinned_message');
        const settingsRef = doc(db, 'chat_meta', 'settings');
        const unsubPinned = onSnapshot(pinnedMessageRef, (doc) => { setPinnedMessage(doc.exists() ? doc.data() as PinnedMessage : null); });
        const unsubSettings = onSnapshot(settingsRef, (doc) => { if (doc.exists()) setChatSettings(doc.data() as any); });
        return () => { unsubPinned(); unsubSettings(); };
    }, []);

    // Mesajlar için ana dinleyici
    useEffect(() => {
        if (!user || showDisclaimer) return;
        const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse());
            if (!initialLoadDone.current) {
                setHasMore(snapshot.docs.length >= PAGE_SIZE);
                initialLoadDone.current = true;
            }
        }, (error) => {
            console.error("onSnapshot hatası:", error);
            setChatError("Sohbet frekansında bir kesinti yaşandı.");
        });
        return () => unsubscribe();
    }, [user, showDisclaimer]);

    // Disclaimer kontrolü
    useEffect(() => {
        if (!user) return;
        const checkDisclaimer = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data()?.hasAcceptedChatDisclaimer) {
                    setShowDisclaimer(false);
                } else {
                    setShowDisclaimer(true);
                    setDisclaimerTimer(10);
                }
            } catch (error) {
                console.error("Disclaimer kontrol hatası", error);
                setShowDisclaimer(true);
            }
        };
        checkDisclaimer();
    }, [user]);

    // Zamanlayıcı
    useEffect(() => {
        if (!showDisclaimer || disclaimerTimer <= 0) return;
        const timerId = setInterval(() => { setDisclaimerTimer(prev => prev - 1); }, 1000);
        return () => clearInterval(timerId);
    }, [showDisclaimer, disclaimerTimer]);

    const handleAcceptDisclaimer = async () => {
        if (!user || disclaimerTimer > 0) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), { hasAcceptedChatDisclaimer: true, disclaimerAcceptedAt: serverTimestamp() });
            setShowDisclaimer(false);
        } catch (error) { console.error("Disclaimer kabul edilirken hata:", error); }
    };

    // Mesaj gönderme
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user || !userProfile || isSending) return;
        if (chatSettings.chatPaused && !isAdmin) { setChatError(chatSettings.chatPauseReason || 'Sohbet devre dışı.'); return; }
        setIsSending(true);
        try {
            await addDoc(collection(db, 'messages'), {
                text: newMessage, uid: user.uid, displayName: userProfile?.displayName || 'Anonim',
                createdAt: serverTimestamp(),
                ...(replyingToMessage && { replyingTo: { uid: replyingToMessage.uid, displayName: replyingToMessage.displayName, text: replyingToMessage.text }})
            });
            await updateDoc(doc(db, 'users', user.uid), { messageCount: increment(1) });
            const updatedProfile = { ...userProfile, messageCount: (userProfile?.messageCount || 0) + 1 };
            checkAndGrantAchievements(updatedProfile, { type: 'MESSAGE_SENT', payload: { updatedProfile } });
        setNewMessage(''); handleCancelReply();
        setTimeout(() => { dummy.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
        } catch(error) { 
            console.error("Mesaj gönderilemedi:", error); setChatError("Mesaj gönderilemedi.");
        } finally { setIsSending(false); }
    };

    // Mesaj silme
    const handleDeleteMessage = async (message: Message) => {
        if (!user || !(isAdmin || message.uid === user.uid)) return;
        try { await deleteDoc(doc(db, 'messages', message.id)); } 
        catch (error) { console.error("Mesaj silinirken hata:", error); setChatError("Mesaj silinemedi."); }
    };

    // Geçmişi yükleme
    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || messages.length === 0) return;
        setLoadingMore(true);
        const oldestMessage = messages[0];
        const q = query(collection(db, 'messages'), where('createdAt', '<', oldestMessage.createdAt), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
        try {
            const snapshot = await getDocs(q);
            const olderMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
            setMessages(prev => [...olderMsgs, ...prev]);
            setHasMore(snapshot.docs.length >= PAGE_SIZE);
        } catch (error) { console.error('Geçmiş mesajlar yüklenemedi:', error); setHasMore(false);
        } finally { setLoadingMore(false); }
    };

    const handleStartReply = (message: Message) => setReplyingToMessage(message);
    const handleCancelReply = () => setReplyingToMessage(null);
    const handlePinMessage = async (message: Message) => { if (!isAdmin || !user) return; await setDoc(doc(db, 'chat_meta', 'pinned_message'), { ...message, pinnedBy: userProfile?.displayName || 'Admin' }); };
    const handleUnpinMessage = async () => { if (!isAdmin) return; await deleteDoc(doc(db, 'chat_meta', 'pinned_message')); };
    useEffect(() => { dummy.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
    useEffect(() => { if (chatError) { const timer = setTimeout(() => setChatError(null), 4000); return () => clearTimeout(timer); } }, [chatError]);
    const getCharCountColor = () => { if (newMessage.length >= MAX_CHAR_LIMIT) return 'text-red-500'; if (newMessage.length > MAX_CHAR_LIMIT * 0.9) return 'text-yellow-400'; return 'text-cyber-gray'; };
    const getAllEmojis = () => [{ name: 'Klasik', emojis: ['😀','😂','😍','🤔','😎','😢','😡','🤗','🚀','🛸','⭐','🤖','💻','⚡'] }];
    const insertEmoji = (emoji: string) => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); };

    if (authLoading) return <div className="flex justify-center items-center h-screen"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) return <div className="text-center py-20"><h1 className="text-4xl font-heading">Erişim Reddedildi</h1><p className="mt-4 text-cyber-gray">Giriş yapmalısın.</p><Link to="/login" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">Giriş Yap</Link></div>;
    if (!isAdmin && !userProfile?.chatAccessGranted && !chatSettings.isChatInvitationless) return <ChatJoinRequestPage />;
    if (showDisclaimer) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-dark-gray p-6 rounded-lg border border-cyber-gray/50 w-full max-w-lg shadow-2xl shadow-electric-purple/20"><h2 className="text-2xl font-heading text-electric-purple mb-4 flex items-center gap-3"><ShieldAlert size={28}/> FREKANSA BAĞLANMADAN ÖNCE...</h2><div className="space-y-4 text-ghost-white"><p className="text-yellow-400 font-semibold">Bu sinyale katılarak, aşağıdaki temel yasaları kabul etmiş olursun:</p><ul className="list-none pl-2 space-y-3 text-cyber-gray border-l-2 border-electric-purple/50"><li className="pl-4"><span className="font-bold text-ghost-white">KURAL I:</span> Kişisel veri paylaşımı ve reklam yapmak yasaktır.</li><li className="pl-4"><span className="font-bold text-ghost-white">KURAL II:</span> Ailevi, şahsi ve kutsal değerlere hakaret veya tehdit <span className="font-bold text-red-500">yasaktır.</span></li><li className="pl-4"><span className="font-bold text-ghost-white">KURAL III:</span> Gönderdiğin her sinyalin tek sorumlusu sensin.</li></ul></div><div className="mt-6 flex items-center justify-end gap-4"><span className="text-cyber-gray font-mono tracking-widest">{disclaimerTimer < 10 ? `0${disclaimerTimer}`: disclaimerTimer}</span><button onClick={handleAcceptDisclaimer} disabled={disclaimerTimer > 0} className={`px-6 py-3 bg-electric-purple text-white font-bold rounded-lg transition-all ${disclaimerTimer > 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-opacity-80'}`}>Anladım, Sorumluluğu Alıyorum</button></div></motion.div></div>;
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
             {chatSettings.chatPaused && <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-red-900/50 border border-red-700/50 rounded-lg text-sm"><div className="flex items-start gap-3"><ShieldAlert className="text-red-400 mt-1 flex-shrink-0" size={18}/><div><p className="font-bold text-red-300">Sohbet Durduruldu</p><p className="text-red-200">{chatSettings.chatPauseReason || 'Sohbet şu anda devre dışı.'}</p></div></div></motion.div>}
             {pinnedMessage && <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-yellow-900/50 border border-yellow-700/50 rounded-lg flex items-start gap-3 text-sm"><Pin className="text-yellow-400 mt-1 flex-shrink-0" size={18}/><div className="flex-1"><p className="font-bold text-yellow-300">Sabitlenmiş Mesaj</p><p className="text-yellow-200">"{pinnedMessage.text}" - <span className="font-semibold">{pinnedMessage.displayName}</span></p></div>{isAdmin && (<button onClick={handleUnpinMessage} className="p-1 rounded-full hover:bg-yellow-700/50"><X className="text-yellow-400" size={16}/></button>)}</motion.div>}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-dark-gray/50 rounded-t-lg border border-b-0 border-cyber-gray/50 ${chatSettings.chatPaused ? 'filter blur-sm' : ''}`}>
                {hasMore && (<div className="text-center my-4"><button onClick={loadMoreMessages} disabled={loadingMore} className="text-cyber-gray hover:text-electric-purple text-sm font-semibold">{loadingMore ? 'Yükleniyor...' : 'Geçmiş Mesajları Yükle'}</button></div>)}
                {messages.map(msg => {
                    const senderIsAdmin = allUsers.get(msg.uid)?.role === 'admin';
                    const messageIsFromCurrentUser = user?.uid === msg.uid;
                    return (
                        <div key={msg.id} className={`flex items-start gap-3 group relative ${messageIsFromCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!messageIsFromCurrentUser && (
                                <Link to={`/profile/${msg.uid}`}>
                                    <ProfileAnimation animationId={allUsers.get(msg.uid)?.inventory?.activeProfileAnimation || ''}>
                                        <img src={allUsers.get(msg.uid)?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.uid}`} alt="" className="w-10 h-10 rounded-full bg-dark-gray object-cover"/>
                                    </ProfileAnimation>
                                </Link>
                            )}
                            <motion.div className={`p-3 rounded-lg max-w-xs md:max-w-lg break-words ${senderIsAdmin ? 'border-2 border-yellow-400' : messageIsFromCurrentUser ? 'bg-electric-purple text-white' : 'bg-space-black'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                {!messageIsFromCurrentUser && (senderIsAdmin ? <AdminTag name={msg.displayName} /> : <Link to={`/profile/${msg.uid}`} className="font-bold text-sm text-electric-purple/80 hover:underline">{msg.displayName}</Link>)}
                                {msg.replyingTo && (<div className="mb-2 p-2 border-l-2 bg-black/20 text-xs opacity-80"><p className="font-bold">{msg.replyingTo.displayName}</p><p className="truncate">{msg.replyingTo.text}</p></div>)}
                                <p className="text-ghost-white" style={{whiteSpace: "pre-wrap"}}>{msg.text}</p>
                            </motion.div>
                            <div className={`flex gap-2 items-center absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 ${messageIsFromCurrentUser ? 'left-2' : 'right-2'}`}>
                                <button onClick={() => handleStartReply(msg)} title="Yanıtla"><CornerDownLeft size={16}/></button>
                                {isAdmin && <button onClick={() => handlePinMessage(msg)} title="Sabitle"><Pin size={16} /></button>}
                                {(isAdmin || messageIsFromCurrentUser) && <button onClick={() => handleDeleteMessage(msg)} title="Sil"><Trash2 size={16} /></button>}
                            </div>
                        </div>
                    );
                })}
                 <div ref={dummy}></div>
            </div>
            <div className="p-4 bg-dark-gray rounded-b-lg border border-t-0 border-cyber-gray/50">
                 {replyingToMessage && (<motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-2 mb-3 bg-space-black border-l-4 border-electric-purple rounded-md text-sm flex justify-between items-center"><div><p>Yanıtlanıyor: <span className="font-bold">{replyingToMessage.displayName}</span></p></div><button onClick={handleCancelReply}><X size={16}/></button></motion.div>)}
                {chatError && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 mb-4 rounded-md text-sm border bg-yellow-900/50 border-yellow-700/50 text-yellow-300"><ShieldAlert size={18} /><span>{chatError}</span></motion.div>)}
                <form onSubmit={sendMessage} className="flex gap-4">
                    <div className="relative flex-1">
                        <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Bir mesaj gönder..." maxLength={MAX_CHAR_LIMIT} className="w-full p-4 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple resize-none" style={{height: "48px"}} disabled={chatSettings.chatPaused && !isAdmin} onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); sendMessage(e as any);}}} />
                        {showEmojiPicker && ( <div className="absolute bottom-full mb-2 w-full bg-dark-gray border border-cyber-gray/50 rounded-lg p-4 z-10"><h3>Emojiler</h3><div className="grid grid-cols-8 gap-2">{getAllEmojis()[0].emojis.map((emoji, index) => ( <button key={index} type="button" onClick={() => insertEmoji(emoji)} className="text-2xl hover:scale-125">{emoji}</button> ))}</div></div> )}
                    </div>
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-4 bg-cyber-gray/50 text-white rounded-md" title="Emoji Ekle"><Smile size={24} /></button>
                    <button type="submit" disabled={!newMessage.trim() || isSending} className="p-4 bg-electric-purple text-white rounded-md disabled:bg-cyber-gray/50"><Send size={24} /></button>
                </form>
                <p className={`text-xs text-right mt-2 font-mono ${getCharCountColor()}`}>{newMessage.length} / {MAX_CHAR_LIMIT}</p>
            </div>
        </motion.div>
    );
};

export default ChatPage;