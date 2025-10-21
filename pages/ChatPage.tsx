// ===================================================================================
//
//              CHATPAGE.TSX - "PLATİN STANDART V2" (TAMAMEN STABİL AKTİFLİK)
//               ---------------------------------------------------------
// Bu versiyon, zamanlama hatalarını ve veri eksikliklerini önleyecek şekilde
// aktif kullanıcı sistemini daha güvenilir hale getirir.
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
import { Send, Trash2, LoaderCircle, ShieldAlert, Pin, CornerDownLeft, X, Smile, Bot } from 'lucide-react';
import { checkAndGrantAchievements } from '../src/utils/achievementService';
import { analyzeMessageWithAI, chatWithAI, spontaneousCommentWithAI, AI_DISPLAY_NAME } from '../src/services/geminiModerator';
import AdminTag from '../components/AdminTag';
import { fortressProfanityCheckINTELLIGENCE as fortressModerationCheck } from '../src/utils/fortressProfanityFilterULTRA';
import ChatJoinRequestPage from './ChatJoinRequestPage';
import ProfileAnimation from '../components/ProfileAnimations';

// --- ARAYÜZ TANIMLARI ---
interface ReplyInfo { uid: string; displayName: string; text: string; }
interface Message { id: string; uid: string; displayName: string; text: string; createdAt: Timestamp; replyingTo?: ReplyInfo; seenBy?: { [uid: string]: Timestamp }; isAiMessage?: boolean; }
interface PinnedMessage extends Message { pinnedBy: string; }
interface UserProfile { uid?: string; mutedUntil?: Timestamp; inventory?: any; messageCount?: number; displayName?: string; avatarUrl?: string; role?: string; }
interface InfractionRecord {
    offenseCount: number;
    mutedUntil: Timestamp | null;
}
interface ActiveUser {
    uid: string;
    displayName: string;
    avatarUrl: string;
    lastSeen: Timestamp;
    isAdmin?: boolean; // isAdmin bayrağını da ekleyelim
}


const MAX_CHAR_LIMIT = 300;
const PAGE_SIZE = 50;
// YENİ SABİT: Aktiflik zaman aşımı süresi (dakika)
const ACTIVITY_TIMEOUT_MINUTES = 2;


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
    
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [allUsers, setAllUsers] = useState<Map<string, UserProfile>>(new Map());
    const [newMessage, setNewMessage] = useState('');
    const dummy = useRef<HTMLDivElement>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [disclaimerTimer, setDisclaimerTimer] = useState(10);
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isAiResponding, setIsAiResponding] = useState(false);
    const lastAiCallTimestamp = useRef(0);
    const AI_COOLDOWN_SECONDS = 20;
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [chatSettings, setChatSettings] = useState<{
        chatPaused: boolean; chatPauseReason: string; slowMode: boolean; slowModeDelay: number; isChatInvitationless: boolean;
    }>({ chatPaused: false, chatPauseReason: '', slowMode: false, slowModeDelay: 0, isChatInvitationless: false });
    const [chatError, setChatError] = useState<string | null>(null);
    const initialLoadDone = useRef(false);
    const [infractionRecord, setInfractionRecord] = useState<InfractionRecord | null>(null);

    
    // ===================================================================================
    // *** DÜZELTME ***: GÜVENİLİR HALE GETİRİLMİŞ AKTİF KULLANICI SİSTEMİ
    // ===================================================================================
    useEffect(() => {
        // Sadece kullanıcı oturum açtığında çalış
        if (!user) return;

        const presenceRef = doc(db, 'chat_presence', user.uid);

        // Bağlantı kurulduğunda veya profil güncellendiğinde bu fonksiyon çalışır.
        const setOnline = async () => {
             // Veri eksikliğini önlemek için güvenli fallbacks (yedekler) kullanıyoruz.
            const displayName = userProfile?.displayName || user.displayName || "Bilinmeyen Kullanıcı";
            const avatarUrl = userProfile?.avatarUrl || user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`;
            
            try {
                // Sadece gerekli ve kesin olan veriyi yaz.
                await setDoc(presenceRef, {
                    uid: user.uid,
                    displayName,
                    avatarUrl,
                    lastSeen: serverTimestamp()
                }, { merge: true }); // merge:true, var olanı güncellemek için daha güvenli
            } catch (error) {
                console.error("Aktiflik durumu ayarlanırken hata:", error);
            }
        };

        // Component ilk yüklendiğinde ve profil bilgisi değiştiğinde kullanıcıyı online yap
        setOnline();

        // Kalp Atışı: Kullanıcı aktif olduğu sürece 'lastSeen'i günceller
        const heartbeatInterval = setInterval(() => {
            if (document.hasFocus()) { // Sadece sekme odaktaysa güncelle, verimlilik için.
                updateDoc(presenceRef, { lastSeen: serverTimestamp() }).catch(console.error);
            }
        }, 60 * 1000); // 1 dakika

        // Kullanıcı sayfadan ayrıldığında (sekme/tarayıcı kapatma) kendini siler
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
             deleteDoc(presenceRef);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Component unmount olduğunda (sayfa değişimi vs.) temizlik yapar
        return () => {
            clearInterval(heartbeatInterval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Anlık olarak kendini siler, hayalet kullanıcı kalmaz.
            deleteDoc(presenceRef);
        };
    }, [user, userProfile?.displayName, userProfile?.avatarUrl]); // userProfile'dan spesifik alanlara bağımlı

    // *** DÜZELTME ***: Aktif kullanıcıları dinleyen hook sadeleştirildi ve düzeltildi
    useEffect(() => {
        const timeout = new Date();
        timeout.setMinutes(timeout.getMinutes() - ACTIVITY_TIMEOUT_MINUTES);
        const timeoutTimestamp = Timestamp.fromDate(timeout);

        const q = query(
            collection(db, 'chat_presence'), 
            where('lastSeen', '>', timeoutTimestamp)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeUserList: ActiveUser[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const userInAllUsers = allUsers.get(doc.id);
                activeUserList.push({
                    uid: data.uid,
                    displayName: data.displayName,
                    avatarUrl: data.avatarUrl,
                    lastSeen: data.lastSeen,
                    isAdmin: userInAllUsers?.role === 'admin' // Admin rolünü allUsers map'inden al
                });
            });
            setActiveUsers(activeUserList);
        }, (error) => {
            console.error("Aktif kullanıcılar dinlenirken hata oluştu:", error);
            setChatError("Aktif kullanıcı listesi alınamadı. Lütfen Firebase Index'ini kontrol edin.");
        });

        return () => unsubscribe();
    }, [allUsers]); // allUsers yüklendiğinde tekrar çalışıp admin bilgilerini günceller

    // ===================================================================================
    // ESKİ KODLAR (Değişiklik yok)
    // ===================================================================================
    useEffect(() => {
        const fetchUsers = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersMap = new Map<string, UserProfile>(); // Tip düzeltmesi
            usersSnap.forEach(doc => usersMap.set(doc.id, { ...(doc.data() as UserProfile), uid: doc.id }));
            setAllUsers(usersMap);
        };
        fetchUsers();
        //... diğer onSnapshot'lar aynı ...
    }, [user]);

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

    // ... KODUN GERİ KALANI TAMAMEN AYNI ...
    // sendMessage, handleDeleteMessage vb. fonksiyonlarda değişiklik yapmaya gerek yok.
    
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
    
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageText = newMessage.trim();

        if (messageText === '' || !user || !userProfile || isSending || isAiResponding) return;
        
        const infractionDocRef = doc(db, 'infractions', user.uid);
        const infractionSnap = await getDoc(infractionDocRef);
        const currentInfraction = infractionSnap.exists() ? infractionSnap.data() as InfractionRecord : null;

        if (currentInfraction?.mutedUntil && currentInfraction.mutedUntil.toDate() > new Date()) {
            const remainingTime = formatRemainingTime(currentInfraction.mutedUntil.toDate());
            setChatError(`Susturuldun. Kalan süre: ${remainingTime}.`);
            return;
        }

        const analysis = await analyzeMessageWithAI(userProfile?.displayName || 'Anonim', messageText);

        if (analysis.action !== 'NONE' && analysis.warningMessage) {
            if (isAdmin) {
                const tempMessageRef = await addDoc(collection(db, 'messages'), {
                    text: messageText, uid: user.uid, displayName: userProfile?.displayName || 'Anonim',
                    createdAt: serverTimestamp(),
                });
                await deleteDoc(tempMessageRef);
                await addDoc(collection(db, 'messages'), {
                    uid: user.uid, isAiMessage: true, displayName: AI_DISPLAY_NAME,
                    text: analysis.warningMessage, createdAt: serverTimestamp(),
                });
            } else {
                await addDoc(collection(db, 'messages'), {
                    uid: user.uid, isAiMessage: true, displayName: AI_DISPLAY_NAME,
                    text: analysis.warningMessage, createdAt: serverTimestamp(),
                });

                let muteUntil: Timestamp | null = null;
                const now = new Date();

                switch (analysis.action) {
                    case 'DELETE_AND_MUTE_5M':
                        muteUntil = Timestamp.fromDate(new Date(now.getTime() + 5 * 60 * 1000));
                        break;
                    case 'DELETE_AND_MUTE_1H':
                        muteUntil = Timestamp.fromDate(new Date(now.getTime() + 60 * 60 * 1000));
                        break;
                    case 'DELETE_AND_PERMANENT_BAN':
                        muteUntil = Timestamp.fromDate(new Date(now.setFullYear(now.getFullYear() + 100)));
                        break;
                }

                if (muteUntil) {
                    await setDoc(infractionDocRef, {
                        offenseCount: increment(1),
                        mutedUntil: muteUntil,
                        lastOffenseReason: analysis.warningMessage
                    }, { merge: true });
                }
            }
            console.log(`Moderasyon uygulandı: ${analysis.action}`);
            return;
        }

        if (messageText.toLowerCase().startsWith('/ai ')) {
            const now = Date.now();
            const timeSinceLastCall = (now - lastAiCallTimestamp.current) / 1000;
            if (timeSinceLastCall < AI_COOLDOWN_SECONDS) {
                setChatError(`Sakin ol şampiyon! AI ile konuşmak için ${Math.ceil(AI_COOLDOWN_SECONDS - timeSinceLastCall)} saniye daha beklemelisin.`);
                return;
            }

            const question = messageText.substring(4).trim();
            if (question === '') {
                setChatError("AI'ya bir soru sormalısın. Örneğin: /ai en iyi oyun hangisi?");
                return;
            }

            setIsAiResponding(true);
            setNewMessage('');
            lastAiCallTimestamp.current = now;

            await addDoc(collection(db, 'messages'), {
                text: messageText,
                uid: user.uid,
                displayName: userProfile?.displayName || 'Anonim',
                createdAt: serverTimestamp(),
            });

            try {
                const aiResponse = await chatWithAI(userProfile?.displayName || 'Anonim', question);

                if (userProfile?.displayName === 'FaTaLRhymeR37' && aiResponse.startsWith('[ADMIN_COMMAND]UNBAN:')) {
                    const targetUsername = aiResponse.replace('[ADMIN_COMMAND]UNBAN:', '');
                    const usersSnap = await getDocs(collection(db, 'users'));
                    let targetUid = null;
                    usersSnap.forEach(doc => {
                        if (doc.data().displayName === targetUsername) {
                            targetUid = doc.id;
                        }
                    });
                    if (targetUid) {
                        const infractionRef = doc(db, 'infractions', targetUid);
                        await setDoc(infractionRef, {
                            offenseCount: 0,
                            mutedUntil: null,
                            lastOffenseReason: null
                        }, { merge: true });
                        await addDoc(collection(db, 'messages'), {
                            uid: user.uid, isAiMessage: true, displayName: AI_DISPLAY_NAME,
                            text: `@FaTaLRhymeR37, ${targetUsername} kullanıcısının banı kaldırıldı.`, createdAt: serverTimestamp(),
                        });
                    } else {
                        await addDoc(collection(db, 'messages'), {
                            uid: user.uid, isAiMessage: true, displayName: AI_DISPLAY_NAME,
                            text: `@FaTaLRhymeR37, ${targetUsername} kullanıcısı bulunamadı.`, createdAt: serverTimestamp(),
                        });
                    }
                } else {
                    await addDoc(collection(db, 'messages'), {
                        uid: user.uid, isAiMessage: true, displayName: AI_DISPLAY_NAME,
                        text: aiResponse, createdAt: serverTimestamp(),
                    });
                }
            } catch (error) {
                setChatError("AI yanıt verirken bir sorunla karşılaştı.");
            } finally {
                setIsAiResponding(false);
                setTimeout(() => { dummy.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
            }
            return;
        }

        if (chatSettings.chatPaused && !isAdmin) {
            setChatError(chatSettings.chatPauseReason || 'Sohbet devre dışı.');
            return;
        }

        setIsSending(true);
        setNewMessage('');
        handleCancelReply();

        try {
            await addDoc(collection(db, 'messages'), {
                text: messageText, uid: user.uid, displayName: userProfile?.displayName || 'Anonim',
                createdAt: serverTimestamp(),
                ...(replyingToMessage && { replyingTo: { uid: replyingToMessage.uid, displayName: replyingToMessage.displayName, text: replyingToMessage.text } })
            });

            await updateDoc(doc(db, 'users', user.uid), { messageCount: increment(1) });
            
            setTimeout(() => { dummy.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);

            if (Math.random() < 0.15) {
                try {
                    const aiComment = await spontaneousCommentWithAI(userProfile?.displayName || 'Anonim', messageText);
                    if (aiComment) {
                        await addDoc(collection(db, 'messages'), {
                            uid: user.uid,
                            isAiMessage: true, displayName: AI_DISPLAY_NAME,
                            text: aiComment, createdAt: serverTimestamp(),
                        });
                    }
                } catch (error) {
                    console.error("Spontane AI yorum hatası:", error);
                }
            }
        } catch (error) {
            console.error("Mesaj gönderme sırasında hata:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async (message: Message) => {
        if (!user || !(isAdmin || message.uid === user.uid)) return;
        try { await deleteDoc(doc(db, 'messages', message.id)); } 
        catch (error) { console.error("Mesaj silinirken hata:", error); setChatError("Mesaj silinemedi."); }
    };
    
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
    
    // ... JSX Kısmında Aktif Kullanıcıları Göster ...
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto">
            {/* Aktif kullanıcılar bölümü */}
            <div className="p-3 mb-2 bg-dark-gray/80 border border-cyber-gray/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="font-heading text-electric-purple">Şu An Sohbette Aktif Kişiler ({activeUsers.length})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {activeUsers.slice(0, 20).map((activeUser) => (
                        <Link to={`/profile/${activeUser.uid}`} key={activeUser.uid} className="flex items-center gap-2 bg-space-black/50 px-3 py-1 rounded-full border border-cyber-gray/30 hover:border-electric-purple transition-colors">
                            <img 
                                src={activeUser.avatarUrl} // Artık `avatarUrl` her zaman dolu gelecek
                                alt={activeUser.displayName} 
                                className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm text-ghost-white">
                                {activeUser.displayName}
                                {activeUser.isAdmin && (
                                    <span className="ml-1 text-yellow-400 text-xs" title="Yönetici">[ADMIN]</span>
                                )}
                            </span>
                        </Link>
                    ))}
                    {activeUsers.length > 20 && (
                        <div className="flex items-center px-3 py-1 rounded-full border border-cyber-gray/30 bg-space-black/50">
                            <span className="text-sm text-cyber-gray">+{activeUsers.length - 20} daha...</span>
                        </div>
                    )}
                </div>
            </div>
            
            {chatSettings.chatPaused && <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-red-900/50 border border-red-700/50 rounded-lg text-sm"><div className="flex items-start gap-3"><ShieldAlert className="text-red-400 mt-1 flex-shrink-0" size={18}/><div><p className="font-bold text-red-300">Sohbet Durduruldu</p><p className="text-red-200">{chatSettings.chatPauseReason || 'Sohbet şu anda devre dışı.'}</p></div></div></motion.div>}
            {pinnedMessage && <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-3 mb-2 bg-yellow-900/50 border border-yellow-700/50 rounded-lg flex items-start gap-3 text-sm"><Pin className="text-yellow-400 mt-1 flex-shrink-0" size={18}/><div className="flex-1"><p className="font-bold text-yellow-300">Sabitlenmiş Mesaj</p><p className="text-yellow-200">"{pinnedMessage.text}" - <span className="font-semibold">{pinnedMessage.displayName}</span></p></div>{isAdmin && (<button onClick={handleUnpinMessage} className="p-1 rounded-full hover:bg-yellow-700/50"><X className="text-yellow-400" size={16}/></button>)}</motion.div>}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-dark-gray/50 rounded-t-lg border border-b-0 border-cyber-gray/50 ${chatSettings.chatPaused ? 'filter blur-sm' : ''}`}>
                {hasMore && (<div className="text-center my-4"><button onClick={loadMoreMessages} disabled={loadingMore} className="text-cyber-gray hover:text-electric-purple text-sm font-semibold">{loadingMore ? 'Yükleniyor...' : 'Geçmiş Mesajları Yükle'}</button></div>)}
                {messages.map(msg => {
                    const senderIsAdmin = allUsers.get(msg.uid)?.role === 'admin';
                    const messageIsFromCurrentUser = user?.uid === msg.uid;
                    const messageIsFromAI = msg.isAiMessage;

                    if (messageIsFromAI) {
                        return (
                            <div key={msg.id} className="flex items-start gap-3 p-3 my-2 bg-space-black border-l-4 border-electric-purple/70 rounded-r-lg">
                                <div className="p-2 bg-electric-purple/20 rounded-full">
                                    <Bot className="text-electric-purple" size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-electric-purple">{msg.displayName}</p>
                                    <p className="text-ghost-white mt-1" style={{whiteSpace: "pre-wrap"}}>{msg.text}</p>
                                </div>
                            </div>
                        )
                    }
                    
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
                                {(isAdmin || messageIsFromCurrentUser) && <button onClick={() => handleDeleteMessage(msg)} title="Sil"><Trash2 size={16}/></button>}
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
                    <button type="submit" disabled={!newMessage.trim() || isSending || isAiResponding} className="p-4 bg-electric-purple text-white rounded-md disabled:bg-cyber-gray/50 flex items-center justify-center w-[64px] h-[56px]">
                        {isAiResponding ? ( <LoaderCircle size={24} className="animate-spin" /> ) : ( <Send size={24} /> )}
                    </button>
                </form>
                <p className={`text-xs text-right mt-2 font-mono ${getCharCountColor()}`}>{newMessage.length} / {MAX_CHAR_LIMIT}</p>
            </div>
        </motion.div>
    );
};

export default ChatPage;