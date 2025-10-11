import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Send, CheckCircle, Loader } from 'lucide-react'; // Loader ekleyebiliriz
import { useNavigate } from 'react-router-dom';

const ChatJoinRequestPage: React.FC = () => {
    const { user, userProfile, loading } = useAuth(); // AuthContext'ten 'loading' de alalım
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [requestStatus, setRequestStatus] = useState<'form' | 'pending' | null>(null);
    const [isChatInvitationless, setIsChatInvitationless] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // 1. EN ÖNEMLİ KONTROL: Kullanıcının zaten yetkisi var mı veya davet olmadan giriş açık mı?
        // userProfile, onSnapshot sayesinde her zaman güncel olacak.
        if (userProfile?.chatAccessGranted || isChatInvitationless) {
            navigate('/chat');
            return; // Yetkisi varsa veya davet olmadan giriş açık ise başka hiçbir şey yapma, çık.
        }

        // 2. Yetkisi yoksa ve davet olmadan giriş kapalıysa, mevcut bir başvurusu var mı diye kontrol et.
        const checkExistingRequest = async () => {
            if (!user) return;
            try {
                const q = query(
                    collection(db, 'chat_join_requests'),
                    where('uid', '==', user.uid),
                    where('status', '==', 'pending')
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    setRequestStatus('pending'); // Bekleyen isteği var
                } else {
                    setRequestStatus('form'); // Başvuru formu gösterilecek
                }
            } catch (error) {
                console.error('Mevcut istek kontrol edilirken hata:', error);
                setRequestStatus('form'); // Hata olursa da formu göster
            }
        };

        // userProfile yüklendi ve chat yetkisi yoksa ve davet olmadan giriş kapalıysa kontrolü başlat
        if (user && userProfile && !userProfile.chatAccessGranted && !isChatInvitationless) {
             checkExistingRequest();
        }

    }, [user, userProfile, isChatInvitationless, navigate]);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'chat_meta', 'settings'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setIsChatInvitationless(data.isChatInvitationless || false);
            }
        });
        return () => unsubscribe();
    }, []);

    const onSubmit = async (data: any) => {
        if (!user || !userProfile) return;
        try {
            setSubmitError(null);
            await addDoc(collection(db, 'chat_join_requests'), {
                uid: user.uid,
                displayName: userProfile.displayName,
                class: data.class,
                schoolNumber: data.schoolNumber,
                reason: data.reason,
                status: 'pending', // Her zaman 'pending' olarak başlar
                submittedAt: serverTimestamp()
            });
            setRequestStatus('pending'); // Başvuru sonrası bekleme ekranına geç
        } catch (error) {
            console.error('İstek gönderilirken hata:', error);
            setSubmitError('İstek gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    };
    
    // Auth contexti yüklenirken veya durum belirlenirken bir yükleme ekranı göster
    if (loading || requestStatus === null) {
        return (
            <div className="flex justify-center items-center py-12">
                 <Loader className="animate-spin text-electric-purple" size={48} />
            </div>
        );
    }
    
    // "Onay bekliyor" ekranı
    if (requestStatus === 'pending') {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-12">
                <div className="w-full max-w-md p-8 space-y-6 bg-dark-gray rounded-lg border border-cyber-gray/50 text-center">
                    <h1 className="text-3xl font-bold text-ghost-white font-heading">İstek Gönderildi</h1>
                    <p className="text-cyber-gray">Chat katılım isteğiniz adminlere iletildi. Onay bekleniyor...</p>
                    <p className="text-sm text-cyber-gray/80">İletişim Ekibimiz Tarafından Verdiğiniz Bilgiler Gözden Geçirilecek En Fazla 5 Dakika</p>
                </div>
            </motion.div>
        );
    }

    // Başvuru formu ekranı
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-12">
            <div className="w-full max-w-md p-8 space-y-6 bg-dark-gray rounded-lg border border-cyber-gray/50">
                <h1 className="text-3xl font-bold text-center text-ghost-white font-heading">Chat Katılım İsteği</h1>
                {/* ... formun geri kalan JSX kodu aynı kalabilir ... */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* ... inputlar ... */}
                     <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Sınıfınız</label>
                        <input
                            type="text"
                            {...register('class', { required: 'Sınıf bilgisi zorunludur' })}
                            placeholder="Örnek: 9-A"
                            className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
                        />
                        {errors.class && <p className="text-red-500 text-xs mt-1">{errors.class.message as string}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Okul Numaranız</label>
                        <input
                            type="text"
                            {...register('schoolNumber', { required: 'Okul numarası zorunludur' })}
                            placeholder="Örnek: 12345"
                            className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
                        />
                        {errors.schoolNumber && <p className="text-red-500 text-xs mt-1">{errors.schoolNumber.message as string}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Katılma Nedeni</label>
                        <textarea
                            {...register('reason', { required: 'Katılma nedeni zorunludur', minLength: { value: 10, message: 'En az 10 karakter yazın' } })}
                            placeholder="Chat'e neden katılmak istiyorsunuz? Kendinizi tanıtın..."
                            rows={4}
                            className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none resize-none"
                        />
                        {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message as string}</p>}
                    </div>
                    {submitError && <p className="text-red-500 text-center">{submitError}</p>}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 bg-electric-purple text-white font-bold rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray flex items-center justify-center gap-2"
                    >
                        <Send size={18} />
                        {isSubmitting ? 'Gönderiliyor...' : 'İstek Gönder'}
                    </button>
                </form>
                <p className="text-center text-cyber-gray text-xs">
                    Gönderdiğiniz bilgiler adminler tarafından incelenecek ve sorumluluk sizin olacaktır.
                </p>
            </div>
        </motion.div>
    );
};

export default ChatJoinRequestPage;