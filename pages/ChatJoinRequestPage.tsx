import React, { useState, useEffect, forwardRef } from 'react';
import { useForm, SubmitHandler, UseFormRegister, FieldErrors } from 'react-hook-form';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Loader, AlertTriangle, User, Users, PencilLine, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Form verileri için tip tanımı (sadece "ad" alıyoruz)
interface IFormData {
  name: string;
  class: string;
  reason: string;
}

// ---- YARDIMCI ARAYÜZ BİLEŞENLERİ (Kodu Temiz Tutmak İçin) ----

// Tekrar eden input yapısını basitleştiren özel Input bileşeni
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: keyof IFormData;
  label: string;
  icon: React.ReactNode;
  register: UseFormRegister<IFormData>;
  errors: FieldErrors<IFormData>;
}

const FormInput = ({ id, label, icon, register, errors, ...rest }: InputProps) => (
  <div>
    <label htmlFor={id} className="text-sm font-bold text-cyber-gray block mb-2">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-cyber-gray/70">
        {icon}
      </div>
      <input
        id={id}
        {...register(id, { 
            required: `${label} alanı zorunludur.`,
            ...(id === 'reason' && { minLength: { value: 15, message: 'En az 15 karakter yazmalısınız.' }}) 
        })}
        className={`w-full pl-10 pr-3 py-3 bg-space-black text-ghost-white rounded-md border ${
          errors[id] ? 'border-red-500' : 'border-cyber-gray/50'
        } focus:ring-2 focus:ring-electric-purple focus:outline-none transition-all`}
        {...rest}
      />
    </div>
    {errors[id] && <p className="text-red-400 text-xs mt-1.5">{errors[id]?.message}</p>}
  </div>
);

const FormTextarea = ({ id, label, icon, register, errors, ...rest }: InputProps & {rows: number}) => (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-cyber-gray block mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute top-3.5 left-0 flex items-center pl-3 pointer-events-none text-cyber-gray/70">
            {icon}
        </div>
        <textarea
            id={id}
            {...register(id, { 
                required: `${label} alanı zorunludur.`,
                minLength: { value: 15, message: 'En az 15 karakterden oluşan bir neden belirtin.' } 
            })}
            className={`w-full pl-10 pr-3 py-3 bg-space-black text-ghost-white rounded-md border ${
                errors[id] ? 'border-red-500' : 'border-cyber-gray/50'
            } focus:ring-2 focus:ring-electric-purple focus:outline-none transition-all resize-none`}
            {...rest}
        />
      </div>
      {errors[id] && <p className="text-red-400 text-xs mt-1.5">{errors[id]?.message}</p>}
    </div>
);


// Yükleme animasyonu
const LoadingIndicator = () => (
  <div className="flex min-h-[80vh] justify-center items-center">
    <Loader className="animate-spin text-electric-purple" size={48} />
  </div>
);

// Hata mesajı kartı
const ErrorMessageCard: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center gap-3 p-3 my-4 text-sm text-red-400 bg-red-900/30 border border-red-500/40 rounded-md">
        <AlertTriangle size={20} />
        <span>{message}</span>
    </div>
);


// ANA BİLEŞEN
const ChatJoinRequestPage: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormData>({ mode: 'onTouched' });
  
  // State'leri daha anlamlı isimlendirelim
  const [pageStatus, setPageStatus] = useState<'loading' | 'form' | 'submitting' | 'success' | 'pending' | 'invitationless_join'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isChatInvitationless, setIsChatInvitationless] = useState(false);

  // Firestore'dan ayarları ve kullanıcı durumunu dinleme
  useEffect(() => {
    // try-catch ile hata yönetimi
    try {
        const settingsDocRef = doc(db, 'chat_meta', 'settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) setIsChatInvitationless(docSnap.data().isChatInvitationless || false);
        });
        return () => unsubscribe();
    } catch (e) {
        console.error("Chat ayarları dinlenirken hata:", e);
        setError("Sistem ayarları yüklenemedi. Lütfen sayfayı yenileyin.");
    }
  }, []);
  
  useEffect(() => {
    if (loading || !user) return;
    if (userProfile?.chatAccessGranted) { navigate('/chat'); return; }
    if (isChatInvitationless) { setPageStatus('invitationless_join'); return; }

    const checkExistingRequest = async () => {
      try {
        const q = query(collection(db, 'chat_join_requests'), where('uid', '==', user.uid), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        setPageStatus(snapshot.empty ? 'form' : 'pending');
      } catch (e) {
        console.error("Mevcut istek kontrol hatası:", e);
        setError("Başvuru durumunuz kontrol edilemedi. Lütfen sayfayı yenileyin.");
        setPageStatus('form');
      }
    };
    
    if (userProfile && !isChatInvitationless) {
       checkExistingRequest();
    }
  }, [user, userProfile, isChatInvitationless, navigate, loading]);

  // Form gönderim fonksiyonu
  const onSubmit: SubmitHandler<IFormData> = async (data) => {
    if (!user) return;
    setPageStatus('submitting');
    setError(null);
    try {
      await addDoc(collection(db, 'chat_join_requests'), {
        uid: user.uid,
        displayName: userProfile?.displayName || data.name,
        name: data.name,
        class: data.class,
        reason: data.reason,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });
      setPageStatus('success');
      setTimeout(() => setPageStatus('pending'), 2000); // 2 saniye sonra bekleme ekranına geç
    } catch (e) {
      console.error("İstek gönderme hatası:", e);
      setError("İsteğiniz gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
      setPageStatus('form');
    }
  };
  
  // Davetsiz katılma fonksiyonu
  const handleDirectJoin = async () => {
      if (!user) return;
      setPageStatus('submitting');
      setError(null);
      try {
          await updateDoc(doc(db, 'users', user.uid), { chatAccessGranted: true });
          navigate('/chat');
      } catch (e) {
          console.error("Doğrudan katılım hatası:", e);
          setError("Sohbete katılırken bir hata oluştu.");
          setPageStatus('invitationless_join');
      }
  }

  // --- Render (Görselleştirme) Mantığı ---

  const renderContent = () => {
    switch (pageStatus) {
      case 'loading':
        return <LoadingIndicator />;
      
      case 'pending':
        return (
          <div className="w-full max-w-md p-8 space-y-4 text-center">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                <CheckCircle className="mx-auto text-green-400" size={56} />
            </motion.div>
            <h1 className="text-3xl font-bold text-ghost-white font-heading">İstek Gönderildi</h1>
            <p className="text-cyber-gray">Katılım isteğiniz adminlere iletildi. Onay bekleniyor...</p>
          </div>
        );

      case 'invitationless_join':
        return (
          <div className="w-full max-w-md p-8 space-y-5 text-center">
            <Send className="mx-auto text-electric-purple" size={56} />
            <h1 className="text-3xl font-bold text-ghost-white font-heading">Sohbete Katılın!</h1>
            <p className="text-cyber-gray">Şu anda sohbet herkese açık! Aşağıdaki butona tıklayarak hemen katılabilirsiniz.</p>
            {error && <ErrorMessageCard message={error} />}
            <button 
                onClick={handleDirectJoin} 
                disabled={pageStatus === 'submitting'}
                className="w-full mt-2 py-3 px-4 bg-electric-purple text-white font-bold rounded-md hover:bg-opacity-80 transition-all flex items-center justify-center gap-2 disabled:bg-cyber-gray">
                {pageStatus === 'submitting' ? <Loader className="animate-spin" size={20}/> : 'Hemen Katıl'}
            </button>
          </div>
        );
        
      case 'form':
      case 'submitting':
      case 'success':
        return (
          <div className="w-full max-w-md p-6 md:p-8 space-y-6">
            <div className="text-center">
                <MessageSquarePlus className="mx-auto text-electric-purple" size={48} />
                <h1 className="mt-4 text-3xl font-bold text-ghost-white font-heading">Sohbete Katılım Formu</h1>
                <p className="text-cyber-gray mt-2">Topluluğa katılmak için lütfen formu doldurun.</p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <FormInput id="name" label="Adınız" icon={<User size={18} />} register={register} errors={errors} placeholder="Sadece adınızı girin"/>
                <FormInput id="class" label="Sınıfınız" icon={<Users size={18} />} register={register} errors={errors} placeholder="Örn: 9-A, 11-C"/>
                <FormTextarea id="reason" label="Katılma Nedeniniz" icon={<PencilLine size={18}/>} register={register} errors={errors} rows={4} placeholder="Sohbete neden katılmak istiyorsunuz?"/>
                
                {error && <ErrorMessageCard message={error} />}
              
                <button
                    type="submit"
                    disabled={pageStatus === 'submitting' || pageStatus === 'success'}
                    className={`w-full py-3 px-4 text-white font-bold rounded-md transition-all duration-300 flex items-center justify-center gap-2
                    ${pageStatus === 'success' ? 'bg-green-500' : 'bg-electric-purple'}
                    ${pageStatus === 'submitting' || pageStatus === 'success' ? 'cursor-not-allowed' : 'hover:bg-opacity-80'}`}
                >
                    <AnimatePresence mode="wait">
                        {pageStatus === 'submitting' && <motion.span key="submitting" initial={{ opacity: 0}} animate={{opacity: 1}} exit={{opacity:0}} className="flex items-center gap-2"><Loader size={18} className="animate-spin"/> Gönderiliyor...</motion.span>}
                        {pageStatus === 'success' && <motion.span key="success" initial={{ opacity: 0}} animate={{opacity: 1}} exit={{opacity:0}} className="flex items-center gap-2"><CheckCircle size={18} /> Başarılı!</motion.span>}
                        {pageStatus === 'form' && <motion.span key="idle" initial={{ opacity: 0}} animate={{opacity: 1}} exit={{opacity:0}} className="flex items-center gap-2"><Send size={18} /> İstek Gönder</motion.span>}
                    </AnimatePresence>
                </button>
            </form>

            <p className="text-center text-cyber-gray text-xs px-4">
              Verdiğiniz bilgiler adminler tarafından incelenecektir.
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen w-full flex justify-center items-center py-12 px-4 bg-space-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-space-black to-space-black">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md bg-dark-gray/50 backdrop-blur-xl border border-cyber-gray/30 rounded-2xl shadow-2xl shadow-electric-purple/10"
        >
            {renderContent()}
        </motion.div>
    </div>
  );
};

export default ChatJoinRequestPage; 