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
    DocumentData, deleteDoc, Timestamp, setDoc, where
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Send, Trash2, LoaderCircle, ShieldAlert, Pin, CornerDownLeft, X, Smile } from 'lucide-react';
import { getUserEmojis } from '../data/specialEmojis';
import { checkAndGrantAchievements } from '../src/utils/achievementService';
import AdminTag from '../components/AdminTag';

// YENİ VE AKILLI FİLTRE IMPORT EDİLİYOR
import { fortressProfanityCheckINTELLIGENCE as fortressModerationCheck, ModerationResult } from '../src/utils/fortressProfanityFilterULTRA';
import ChatJoinRequestPage from './ChatJoinRequestPage';


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
    seenBy?: { [uid: string]: Timestamp }; // görüldü bilgisi için
}

interface PinnedMessage extends Message {
    pinnedBy: string;
}

interface UserProfile {
    mutedUntil?: Timestamp;
    inventory?: any;
    messageCount?: number;
    displayName?: string;
}

const MAX_CHAR_LIMIT = 300;
const PAGE_SIZE = 50; // Her seferinde yüklenecek mesaj sayısı

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
    const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
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
    const [disclaimerTimer, setDisclaimerTimer] = useState(10);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showSpecialEmojis, setShowSpecialEmojis] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [chatSettings, setChatSettings] = useState<{
        chatPaused: boolean;
        chatPauseReason: string;
        slowMode: boolean;
        slowModeDelay: number;
    }>({
        chatPaused: false,
        chatPauseReason: '',
        slowMode: false,
        slowModeDelay: 0
    });
    const lastMessageTime = useRef<number>(0);
    const lastMessageSpamCheck = useRef(0);
    const [chatError, setChatError] = useState<string | null>(null);
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const initialLoadDone = useRef(false);
    
    // ... DİĞER FONKSİYONLARINIZ BURADA DEĞİŞMEDEN KALIYOR ...
    
    // Diğer tüm useEffect ve yardımcı fonksiyonlar aynı kalır.
    // Değişiklik sadece sendMessage fonksiyonunda olacak.

    // useEffect for users
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
        
        const unsubscribePinned = onSnapshot(pinnedMessageRef, (doc) => {
            if (doc.exists()) {
                setPinnedMessage(doc.data() as PinnedMessage);
            } else {
                setPinnedMessage(null);
            }
        });

        const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                setChatSettings(doc.data() as any);
            }
        });

        return () => {
            unsubscribePinned();
            unsubscribeSettings();
        };
    }, []);

    // Archive date logic
    const ARCHIVE_DATE = new Date('2025-09-24T21:53:00');

    // syncChat logic
    const syncChat = useCallback(async () => {
        const q = query(
            collection(db, 'messages'),
            where('createdAt', '>', Timestamp.fromDate(ARCHIVE_DATE)),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
        );
        const documentSnapshots = await getDocs(q);
        const msgs: Message[] = documentSnapshots.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                displayName: data.displayName || 'Anonim'
            } as Message;
        }).reverse();
        
        setMessages(msgs);

        if (documentSnapshots.docs.length > 0) {
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        }
        setHasMore(documentSnapshots.docs.length >= PAGE_SIZE);
    }, []);

    // ... Diğer tüm useEffects and helper functions aynı kalacak ...
    // ... Bu bölümü kısalık için geçiyorum, aşağıda tam kodu görebilirsiniz ...


    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newMessage.trim() === '' || !user || !userProfile || isSending || newMessage.length > MAX_CHAR_LIMIT) return;
    
        if (chatSettings.chatPaused && !isAdmin) {
            setChatError(chatSettings.chatPauseReason || 'Sohbet şu anda devre dışı.');
            setTimeout(() => setChatError(null), 3000);
            return;
        }
    
        if (chatSettings.slowMode && !isAdmin) {
            const now = Date.now();
            const timeSinceLastMessage = now - lastMessageTime.current;
            const requiredDelay = chatSettings.slowModeDelay * 1000;
    
            if (timeSinceLastMessage < requiredDelay) {
                const remainingTime = ((requiredDelay - timeSinceLastMessage) / 1000).toFixed(1);
                setChatError(`Yavaş mod aktif. ${remainingTime} saniye sonra mesaj gönderebilirsiniz.`);
                setTimeout(() => setChatError(null), 3000);
                return;
            }
        }
    
        // ============================================================================
        //                   YENİ VE AKILLI MODERASYON ENTEGRASYONU
        // ============================================================================
        const moderationResult = fortressModerationCheck(newMessage);
        
        // Puan 50'den büyük veya eşitse (ciddi ihlal) mesajı ENGELLE
        if (moderationResult.isFlagged && moderationResult.score >= 50) {
            setChatError(moderationResult.reason || 'Mesajınız topluluk kurallarına aykırı olduğu için engellendi.');
            setTimeout(() => setChatError(null), 5000);
            return; // Mesajı göndermeyi durdur
        }
        
        // ============================================================================

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
            displayName: userProfile?.displayName || user.displayName || 'Anonim',
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
            lastMessageTime.current = Date.now();
            
            // HAFİF İHLAL İÇİN UYARI GÖSTER (PUAN 50'DEN KÜÇÜK)
            // Mesaj engellenmez, sadece nazik bir uyarı çıkar.
            if (moderationResult.isFlagged && moderationResult.score < 50) {
                const wisdomQuotes = ["Evren, kelimelerimizin yankılarını saklar...", "En güçlü ses sükunettir...", "Bazı kelimeler köprü kurar, bazıları duvar örer...", "Kelimelerin de bir ağırlığı vardır..."];
                const randomQuote = wisdomQuotes[Math.floor(Math.random() * wisdomQuotes.length)];
                setChatError(randomQuote);
                setTimeout(() => setChatError(null), 4000);
            }

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { messageCount: increment(1) });
            
            const updatedProfile = {
                ...userProfile,
                messageCount: (userProfile.messageCount || 0) + 1,
            };
            
            checkAndGrantAchievements(updatedProfile, { 
                type: 'MESSAGE_SENT', 
                payload: { updatedProfile } 
            });
            
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
    
    // ... Diğer tüm fonksiyonlar ve JSX render kısmı aynı kalacak ...
    // Tam kodu aşağıya bırakıyorum.

    // ... [ÖNCEKİ KODUN DEVAMI]

    // updateSeenStatus
    const updateSeenStatus = useCallback(async () => {
        if (!user || messages.length === 0) return;
        try {
            const unreadMessages = messages.filter(msg => msg.uid !== user.uid && (!msg.seenBy || !msg.seenBy[user.uid])).slice(-10);
            for (const msg of unreadMessages) {
                const messageRef = doc(db, 'messages', msg.id);
                await updateDoc(messageRef, { [`seenBy.${user.uid}`]: serverTimestamp() });
            }
        } catch (error) { console.error('Görüldü bilgisi güncellenirken hata:', error); }
    }, [user, messages]);

    // visibility change useEffect
    useEffect(() => {
        if (document.visibilityState === 'visible') { updateSeenStatus(); }
        const handleVisibilityChange = () => { if (document.visibilityState === 'visible') { updateSeenStatus(); } };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
    }, [updateSeenStatus]);

    // Disclaimer control effect
    useEffect(() => {
        if (!user) return;
        const checkDisclaimerStatus = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.data()?.hasAcceptedChatDisclaimer) {
                    setShowDisclaimer(true); setDisclaimerTimer(10);
                } else { setShowDisclaimer(false); }
            } catch (error) { console.error("Disclaimer durumu kontrol edilirken hata:", error); setShowDisclaimer(true); setDisclaimerTimer(10); }
        };
        checkDisclaimerStatus();
    }, [user]);

    // Disclaimer timer effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showDisclaimer && disclaimerTimer > 0) {
            timer = setInterval(() => setDisclaimerTimer(prev => prev - 1), 1000);
        }
        return () => { if (timer) clearInterval(timer); };
    }, [showDisclaimer, disclaimerTimer]);

    const handleAcceptDisclaimer = async () => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { hasAcceptedChatDisclaimer: true, disclaimerAcceptedAt: serverTimestamp() });
            setShowDisclaimer(false);
            await triggerSignal();
        } catch (error) { console.error("Sorumluluk reddi kaydedilirken hata:", error); }
    };
    const triggerSignal = async () => {
        const metaRef = doc(db, 'chat_meta', 'last_update');
        await setDoc(metaRef, { timestamp: serverTimestamp() });
    };

    // main sync useEffect
    useEffect(() => {
        if (!user || showDisclaimer) return;
        const chatSignalRef = doc(db, 'chat_meta', 'last_update');
        const unsubscribeChat = onSnapshot(chatSignalRef, () => {
            if (initialLoadDone.current) {
                syncChat();
            } else {
                initialLoadDone.current = true;
                syncChat();
            }
        });
        return () => { unsubscribeChat(); };
    }, [user, syncChat, showDisclaimer]);
    
    // scrollIntoView useEffect
    useEffect(() => {
        setTimeout(() => { dummy.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    }, [messages]);
    
    // ... loadMoreMessages, handleStartReply, and other handlers...
    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || !lastVisible) return;
        setLoadingMore(true);
        const nextQuery = query(collection(db, 'messages'), where('createdAt', '>', Timestamp.fromDate(ARCHIVE_DATE)), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
        try {
            const documentSnapshots = await getDocs(nextQuery);
            const newMsgs: Message[] = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
            const container = chatContainerRef.current;
            const previousScrollHeight = container?.scrollHeight || 0;
            setMessages(prev => [...newMsgs, ...prev]);
            if (documentSnapshots.docs.length > 0) {
                setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
            }
            setHasMore(documentSnapshots.docs.length >= PAGE_SIZE);
            if (container) {
                requestAnimationFrame(() => { container.scrollTop = container.scrollHeight - previousScrollHeight; });
            }
        } catch (error) {
            console.error('Mesajlar yüklenirken hata:', error);
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    };
    const handleStartReply = (message: Message) => { setReplyingToMessage(message); };
    const handleCancelReply = () => { setReplyingToMessage(null); };
    const handlePinMessage = async (message: Message) => {
        if (!isAdmin || !user) return;
        const pinnedMessageRef = doc(db, 'chat_meta', 'pinned_message');
        const pinData: PinnedMessage = { ...message, pinnedBy: userProfile?.displayName || 'Admin' };
        try { await setDoc(pinnedMessageRef, pinData as any); } catch (error) { console.error("Mesaj sabitlenirken hata:", error); }
    };
    const handleUnpinMessage = async () => {
        if (!isAdmin) return;
        const pinnedMessageRef = doc(db, 'chat_meta', 'pinned_message');
        try { await deleteDoc(pinnedMessageRef); } catch (error) { console.error("Sabitlenmiş mesaj kaldırılırken hata:", error); }
    };
    const handleDeleteMessage = async (message: Message) => {
        if (!user || !(isAdmin || message.uid === user.uid)) return;
        try { await deleteDoc(doc(db, 'messages', message.id)); await triggerSignal(); }
        catch (error) { console.error("Mesaj silinirken hata:", error); setChatError("Mesaj silinemedi."); setTimeout(() => setChatError(null), 3000); }
    };
    const getCharCountColor = () => {
        if (newMessage.length >= MAX_CHAR_LIMIT) return 'text-red-500';
        if (newMessage.length > MAX_CHAR_LIMIT * 0.9) return 'text-yellow-400';
        return 'text-cyber-gray';
    };
    const getAllEmojis = () => { return [ { name: 'Piksel', emojis: ['🕹️','👾','💾','🧠'] }, { name: 'Oyun', emojis: ['🎮','🎯','🏆','⚡'] }, { name: 'Uzay', emojis: ['🚀','🛸','⭐','🌌'] }, { name: 'Siber', emojis: ['🤖','💻','🔮','⚡'] }, { name: 'Anime', emojis: ['😺','🌸','⚔️','💫'] }, { name: 'Klasik', emojis: ['😀','😂','😍','🤔','😎','😢','😡','🤗'] } ]; };
    const insertEmoji = (emoji: string) => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); };

    // ... RETURN JSX...
    if (authLoading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) return <div className="text-center py-20"><h1 className="text-4xl font-heading">Erişim Reddedildi</h1><p className="mt-4 text-cyber-gray">Sohbet frekansına bağlanmak için sisteme giriş yapmalısın.</p><Link to="/login" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">Giriş Yap</Link></div>;
    if (!userProfile?.chatAccessGranted && !isAdmin) return <ChatJoinRequestPage />;
    if (showDisclaimer) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-dark-gray p-6 rounded-lg border border-cyber-gray/50 w-full max-w-lg shadow-2xl shadow-electric-purple/20">
             <h2 className="text-2xl font-heading text-electric-purple mb-4 flex items-center gap-3">
                 <ShieldAlert size={28}/> FREKANSA BAĞLANMADAN ÖNCE...
            </h2>
            <div className="space-y-4 text-ghost-white">
                <p className="text-yellow-400 font-semibold">Bu sinyale katılarak, evrenin aşağıdaki temel yasalarını kalıcı olarak kabul etmiş olursun:</p>
                <ul className="list-none pl-2 space-y-3 text-cyber-gray border-l-2 border-electric-purple/50">
                     <li className="pl-4">
                         <span className="font-bold text-ghost-white">KURAL I: Yankı Asla Kaybolmaz.</span><br/>
                         Boşluğa fısıldanan her sinyal (<span className="italic">mesaj</span>) sonsuza dek kaydedilir. Kişisel veri sızdırmak yasaktır.
                    </li>
                     <li className="pl-4">
                        <span className="font-bold text-ghost-white">KURAL II: Kaosa Geçit Yok.</span><br/>
                        Ailevi, şahsi ve kutsal değerlere hakaret, tehdit <span className="font-bold text-red-500">sürgün edilme sebebidir.</span>
                    </li>
                     <li className="pl-4">
                        <span className="font-bold text-ghost-white">KURAL III: Mimar Değil, Gönderici Sorumludur.</span><br/>
                         Gönderdiğin her sinyalin tek sorumlusu sensin. <span className="underline">Mimar sorumlu tutulamaz.</span>
                    </li>
                </ul>
                <p className="mt-4 p-3 bg-space-black border border-cyber-gray/30 rounded-md text-electric-purple/80">
                    Piksellerin hafızası, kelimelerin ise ağırlığı vardır.
                </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-4">
                <span className="text-cyber-gray font-mono tracking-widest">{disclaimerTimer < 10 ? `0${disclaimerTimer}`: disclaimerTimer}</span>
                <button
                    onClick={handleAcceptDisclaimer}
                    disabled={disclaimerTimer > 0}
                    className={`px-6 py-3 bg-electric-purple text-white font-bold rounded-lg transition-all transform hover:scale-105 duration-300 ${disclaimerTimer > 0 ? 'opacity-40 cursor-not-allowed filter grayscale' : 'hover:bg-opacity-80 hover:shadow-lg hover:shadow-electric-purple/50'}`}>
                    Yasaları Anladım, Sorumluluğu Alıyorum
                </button>
            </div>
        </motion.div>
    </div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
             {/* JSX'in geri kalanı, UI componentleri değişmeden aynı kalır */}
             {chatSettings.chatPaused && <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-red-900/50 border border-red-700/50 rounded-lg text-sm"><div className="flex items-start gap-3"><ShieldAlert className="text-red-400 mt-1 flex-shrink-0" size={18}/><div><p className="font-bold text-red-300">Sohbet Durduruldu</p><p className="text-red-200">{chatSettings.chatPauseReason || 'Sohbet şu anda devre dışı.'}</p></div></div></motion.div>}
             {pinnedMessage && <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-yellow-900/50 border border-yellow-700/50 rounded-lg flex items-start gap-3 text-sm"><Pin className="text-yellow-400 mt-1 flex-shrink-0" size={18}/><div className="flex-1"><p className="font-bold text-yellow-300">Sabitlenmiş Mesaj</p><p className="text-yellow-200">"{pinnedMessage.text}" - <span className="font-semibold">{pinnedMessage.displayName}</span></p></div>{isAdmin && (<button onClick={handleUnpinMessage} className="p-1 rounded-full hover:bg-yellow-700/50"><X className="text-yellow-400" size={16}/></button>)}</motion.div>}

            <div ref={chatContainerRef} className={`flex-1 overflow-y-auto p-4 space-y-4 bg-dark-gray/50 rounded-t-lg border border-b-0 border-cyber-gray/50 ${chatSettings.chatPaused ? 'filter blur-sm' : ''}`}>
                {hasMore && (<div className="text-center my-4"><button onClick={loadMoreMessages} disabled={loadingMore} className="text-cyber-gray hover:text-electric-purple disabled:text-gray-500 text-sm font-semibold transition-colors">{loadingMore ? 'Yükleniyor...' : 'Geçmiş Mesajları Yükle'}</button></div>)}
                {messages.map(msg => {
                    const senderIsAdmin = allUsers.get(msg.uid)?.role === 'admin';
                    const messageIsFromCurrentUser = user.uid === msg.uid;
                    const isSystemMessage = msg.uid === 'system';
                    if (isSystemMessage) { return <div key={msg.id} className="text-center my-2"><span className="px-3 py-1 bg-space-black text-cyber-gray text-xs rounded-full">{msg.text}</span></div>; }
                    return (<div key={msg.id} className={`flex items-start gap-3 group relative ${messageIsFromCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>{!messageIsFromCurrentUser && (<Link to={`/profile/${msg.uid}`}><img src={allUsers.get(msg.uid)?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.uid}`} alt={msg.displayName} className="w-10 h-10 rounded-full bg-dark-gray object-cover flex-shrink-0"/></Link>)}<motion.div className={`p-3 rounded-lg max-w-xs md:max-w-lg break-words ${senderIsAdmin ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-500/10 to-orange-500/10' : messageIsFromCurrentUser ? 'bg-electric-purple text-white' : 'bg-space-black'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{!messageIsFromCurrentUser && (senderIsAdmin ? <AdminTag name={msg.displayName} className="text-sm mb-1" /> : <Link to={`/profile/${msg.uid}`} className="font-bold text-sm text-electric-purple/80 hover:underline mb-1 block">{msg.displayName}</Link>)}{msg.replyingTo && (<div className="mb-2 p-2 border-l-2 border-cyber-gray/50 bg-black/20 rounded-md text-xs opacity-80"><p className="font-bold">{msg.replyingTo.displayName}</p><p className="truncate">{msg.replyingTo.text}</p></div>)}<p className="text-ghost-white">{msg.text}</p></motion.div><div className={`flex gap-2 items-center absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${messageIsFromCurrentUser ? 'left-2' : 'right-2'}`}><button onClick={() => handleStartReply(msg)} title="Yanıtla" className="text-cyber-gray hover:text-white"><CornerDownLeft size={16}/></button>{isAdmin && <button onClick={() => handlePinMessage(msg)} title="Sabitle" className="text-yellow-400 hover:text-yellow-300"><Pin size={16} /></button>}{(isAdmin || messageIsFromCurrentUser) && <button onClick={() => handleDeleteMessage(msg)} title="Mesajı Sil" className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>}</div></div>);
                })}
                 <div ref={dummy}></div>
            </div>
            <div className="p-4 bg-dark-gray rounded-b-lg border border-t-0 border-cyber-gray/50">
                 {replyingToMessage && (<motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-2 mb-3 bg-space-black border-l-4 border-electric-purple rounded-md text-sm flex justify-between items-center"><div><p className="text-cyber-gray">Yanıtlanıyor: <span className="text-ghost-white font-bold">{replyingToMessage.displayName}</span></p><p className="text-cyber-gray/80 truncate">"{replyingToMessage.text}"</p></div><button onClick={handleCancelReply} className="p-1 rounded-full hover:bg-cyber-gray/20"><X size={16}/></button></motion.div>)}
                {chatError && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-2 p-3 mb-4 rounded-md text-sm border ${chatError.includes("susturuldun") ? 'text-red-300 bg-red-900/50 border-red-700/50' : 'text-yellow-300 bg-yellow-900/50 border-yellow-700/50'}`}><ShieldAlert size={18} /><span>{chatError}</span></motion.div>)}
                <form onSubmit={sendMessage} className="flex gap-4 items-center">
                    <div className="relative flex-1">
                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={chatSettings.chatPaused && !isAdmin ? "Sohbet şu anda devre dışı..." : "Bir mesaj gönder..."} maxLength={MAX_CHAR_LIMIT} className={`w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none ${chatSettings.chatPaused && !isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={chatSettings.chatPaused && !isAdmin} />
                    {showEmojiPicker && ( <div className="absolute bottom-full mb-2 w-full bg-dark-gray border border-cyber-gray/50 rounded-lg p-4 shadow-lg z-10"><h3 className="text-sm font-semibold text-electric-purple mb-2">Emojiler</h3><div className="grid grid-cols-8 gap-2">{getAllEmojis().flatMap(set => set.emojis).map((emoji, index) => ( <button key={index} type="button" onClick={() => insertEmoji(emoji)} className="text-2xl hover:scale-125 transition-transform p-1">{emoji}</button> ))}</div></div> )}
                    </div>
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 bg-cyber-gray/50 text-white rounded-md hover:bg-cyber-gray/70 transition-all" title="Emoji Ekle"><Smile size={20} /></button>
                    <button type="submit" disabled={!newMessage.trim() || isSending || newMessage.length > MAX_CHAR_LIMIT || (chatSettings.chatPaused && !isAdmin)} className="p-3 bg-electric-purple text-white rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray/50 disabled:cursor-not-allowed"><Send /></button>
                </form>
                <p className={`text-xs text-right mt-2 font-mono transition-colors ${getCharCountColor()}`}>{newMessage.length} / {MAX_CHAR_LIMIT}</p>
            </div>
        </motion.div>
    );
};

export default ChatPage;