// TAM VE EKSİKSİZ KOD DOSYASI: pages/ChatRoomPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { LoaderCircle, SendHorizonal, ArrowLeft, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message { 
    id: string; 
    text: string; 
    senderId: string; 
    timestamp: any; 
}

const ChatRoomPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [otherUserName, setOtherUserName] = useState<string>('Yükleniyor...');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        // 1. Hata ayıklama logları ile mevcut durumu kontrol et
        console.log("%c--- Sohbet Odası Yüklendi (ChatRoomPage) ---", "color: orange; font-weight: bold;");
        console.log("URL'den gelen Chat ID:", chatId);
        console.log("Giriş yapan kullanıcı UID:", user?.uid);
        
        // 2. Güvenlik kontrolü yap
        if (chatId && user?.uid) {
            const isUserInChatId = chatId.split('_').includes(user.uid);
            console.log("Kullanıcı bu sohbet ID'sine dahil mi?:", isUserInChatId);
            if (!isUserInChatId) {
                console.error("GÜVENLİK UYARISI: Bu kullanıcının bu sohbete erişim yetkisi YOK! Kurallar bu yüzden engelliyor olabilir.");
            }
        }
        console.log("-------------------------------------------");
        
        // 3. Gerekli veriler yoksa işlemi durdur
        if (!chatId || !user) {
            if (!authLoading) setIsLoading(false);
            return;
        }

        // 4. Diğer kullanıcının bilgilerini çek
        const getOtherUserInfo = async () => {
            const userUIDs = chatId.split('_');
            const otherUserUID = userUIDs.find(uid => uid !== user.uid);
            if (otherUserUID) {
                const userDocRef = doc(db, 'users', otherUserUID);
                const userDocSnap = await getDoc(userDocRef);
                setOtherUserName(userDocSnap.exists() ? userDocSnap.data().displayName : 'Bilinmeyen Gezgin');
            }
        };
        getOtherUserInfo();
        
        // 5. Mesajları gerçek zamanlı dinle
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp'));

        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(fetchedMessages);
            setIsLoading(false);
        }, (error) => {
            console.error("Mesajlar alınırken Firestore hatası:", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [chatId, user, authLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user || !chatId) return;
        const currentMessage = newMessage;
        setNewMessage('');
        
        try {
            const chatDocRef = doc(db, 'chats', chatId);
            const messagesColRef = collection(db, 'chats', chatId, 'messages');
            
            await addDoc(messagesColRef, {
                text: currentMessage,
                senderId: user.uid,
                timestamp: serverTimestamp(),
            });
            
            await setDoc(chatDocRef, {
                users: chatId.split('_').sort(),
                lastMessage: { text: currentMessage, timestamp: serverTimestamp() },
            }, { merge: true });

        } catch (error) {
            console.error("Mesaj gönderilemedi:", error);
            setNewMessage(currentMessage);
            alert("Mesaj gönderilirken bir hata oluştu. Lütfen konsolu kontrol edin.");
        }
    };
    
    if (isLoading || authLoading) return <div className="flex justify-center items-center h-screen"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) { navigate("/login"); return null; }
    if (!chatId) return <div className="text-center py-20 text-red-500">Geçersiz veya Eksik Sohbet Kimliği.</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-screen bg-space-black text-ghost-white">
            <header className="flex items-center p-4 border-b border-cyber-gray/50 bg-dark-gray/50 flex-shrink-0">
                 <button onClick={() => navigate('/messages')} className="mr-4 p-2 rounded-full hover:bg-cyber-gray/50 transition-colors">
                     <ArrowLeft />
                 </button>
                 <User className="w-8 h-8 mr-3 text-cyber-gray" />
                 <h2 className="text-xl font-bold font-heading">{otherUserName}</h2>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                 <AnimatePresence>
                {messages.map(message => {
                    if (!message.timestamp) return null; // Sunucu timestamp'i gelene kadar gösterme
                    const isSender = message.senderId === user.uid;
                    return (
                        <motion.div key={message.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${isSender ? 'bg-electric-purple text-white rounded-br-none' : 'bg-dark-gray text-ghost-white rounded-bl-none'}`}>
                                <p style={{ wordBreak: 'break-word' }}>{message.text}</p>
                            </div>
                        </motion.div>
                    );
                })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-space-black border-t border-cyber-gray/50 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                    <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Bir mesaj yaz..."
                        className="flex-1 w-full p-3 bg-dark-gray text-ghost-white rounded-lg border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none transition-all"
                    />
                    <button type="submit" className="p-3 bg-electric-purple text-white rounded-lg hover:bg-opacity-80 transition-all disabled:bg-cyber-gray">
                        <SendHorizonal />
                    </button>
                </form>
            </footer>
        </motion.div>
    );
};

export default ChatRoomPage;