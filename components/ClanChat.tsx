// components/ClanChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../src/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../src/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClanMessage {
  id: string;
  uid: string;
  displayName: string;
  avatarUrl: string;
  message: string;
  timestamp: any;
}

const ClanChat: React.FC<{ clanId: string }> = ({ clanId }) => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ClanMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick message templates
  const messageTemplates = [
    "Herkese selam!",
    "Klan görevi zamanı!",
    "Harika iş çıkardınız!",
    "Birlikte daha güçlüyüz!",
    "Klanımıza yeni üye arıyoruz.",
    "Strateji toplantısı yapalım.",
    "Oyuna başlayalım!",
    "Klan seviyesi yükseldi!",
    "Tebrikler arkadaşlar!",
    "Klan lideri nerede?",
    "Güçlü birlikteyiz!",
    "Klanımıza katılmak ister misin?",
    "Bugün kim hazır?",
    "Klan maçına çağrım!",
    "Yeni strateji deneyelim!",
    "Klanımıza destek ol!",
    "Beraber ilerleyeceğiz!",
    "Klan görevleri başlasın!",
    "Yeni üyeler arıyoruz!",
    "Beraber daha yükseklere!",
    "Klanımızın gücü seninle!",
    "Taktik konuşalım!",
    "Klanımıza hoş geldin!",
    "Güçlü birlikte daha güçlüyüz!",
    "Klan görevleri için hazır mısın?",
    "Beraber zafer kazanalım!",
    "Klanımızın başarısı seninle!",
    "Yeni stratejiler deneyelim!",
    "Klanımızda sen de yer al!",
    "Herkes görevinde!"
  ];

  // Load chat messages
  useEffect(() => {
    if (!clanId || clanId === 'undefined' || clanId === 'null') {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'clans', clanId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ClanMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Handle null timestamp safely
        let timestamp = new Date();
        if (data.timestamp) {
          try {
            timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          } catch (e) {
            console.warn('Invalid timestamp format, using current time');
          }
        }
        msgs.push({ id: doc.id, ...data, timestamp } as ClanMessage);
      });
      // Sort messages by timestamp
      msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching clan messages:", error);
      toast.error("Klan sohbet mesajları yüklenirken bir hata oluştu.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clanId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendTemplateMessage = async (template: string) => {
    if (!user || !userProfile || sending) return;

    if (!clanId || clanId === 'undefined' || clanId === 'null') {
      toast.error("Geçersiz klan ID. Lütfen sayfayı yenileyin.");
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'clans', clanId, 'messages'), {
        uid: user.uid,
        displayName: userProfile.displayName,
        avatarUrl: userProfile.avatarUrl || '/avatars/default.png',
        message: template,
        timestamp: serverTimestamp()
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      // More specific error messages
      if (error.message && error.message.includes('permission')) {
        toast.error("Mesaj gönderme izniniz yok. Klan üyesi olduğunuzdan emin olun.");
      } else {
        toast.error("Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-electric-purple" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3 mb-4 max-h-[400px]">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-3 p-3 rounded-lg bg-dark-gray/40"
            >
              <img 
                src={msg.avatarUrl} 
                alt={msg.displayName} 
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-grow min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-ghost-white">{msg.displayName}</span>
                  <span className="text-xs text-cyber-gray">
                    {msg.timestamp ? 
                      (() => {
                        try {
                          const date = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                          return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                        } catch (e) {
                          return 'Şimdi';
                        }
                      })() : 
                      'Şimdi'}
                  </span>
                </div>
                <p className="text-ghost-white break-words">{msg.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick message templates - always visible */}
      <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-dark-gray/30 rounded-lg">
        {messageTemplates.map((template, index) => (
          <button
            key={index}
            onClick={() => sendTemplateMessage(template)}
            disabled={sending}
            className="text-xs p-2 bg-electric-purple/20 hover:bg-electric-purple/40 text-white rounded truncate disabled:opacity-50 flex items-center justify-center min-h-[40px]"
            title={template}
          >
            <span className="truncate">{template}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClanChat;