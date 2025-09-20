import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../src/firebase'; // Değişiklik: db import edildi
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'; // Değişiklik: firestore importları eklendi

const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const sanitizeUsernameForEmail = (username: string): string => {
      return username
          .toLowerCase()
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9_]/g, '');
  };

  const onSubmit = async (data: any) => {
    const username = data.username.trim();
    const email = `${sanitizeUsernameForEmail(username)}@ttmtal.com`; 

    try {
      setFirebaseError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, data.password);
      const user = userCredential.user;
      
      // --- YENİ EKLENEN GİRİŞ SERİSİ MANTIĞI ---
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const lastLogin = userData.lastLogin?.toDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        let newStreak = userData.loginStreak || 1;

        if (lastLogin) {
          const lastLoginDay = new Date(lastLogin);
          lastLoginDay.setHours(0, 0, 0, 0);

          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastLoginDay.getTime() === yesterday.getTime()) {
            newStreak++;
          } else if (lastLoginDay.getTime() < yesterday.getTime()) {
            newStreak = 1;
          }
        }
        
        await updateDoc(userRef, {
          loginStreak: newStreak,
          lastLogin: serverTimestamp()
        });
      }
      
      console.log('Giriş başarılı ve seri güncellendi!');
      navigate('/'); 
    } catch (error: any) {
      console.error("Giriş hatası:", error);
      setFirebaseError("Kullanıcı adı veya şifre hatalı.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-dark-gray rounded-lg border border-cyber-gray/50">
        <h1 className="text-3xl font-bold text-center text-ghost-white font-heading">Sisteme Giriş</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-cyber-gray block mb-2">Kullanıcı Adı</label>
            <input 
              type="text" 
              {...register('username', { required: 'Kullanıcı adı zorunludur' })} 
              className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message as string}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-cyber-gray block mb-2">Şifre</label>
            <input 
              type="password" 
              {...register('password', { required: 'Şifre zorunludur' })} 
              className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
          </div>
          {firebaseError && <p className="text-red-500 text-center">{firebaseError}</p>}
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full py-3 px-4 bg-electric-purple text-white font-bold rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray"
          >
             {isSubmitting ? 'Giriş Yapılıyor...' : 'Sisteme Sız'}
            </button>
        </form>
        <p className="text-center text-cyber-gray">
          Hesabın yok mu?{' '}
          <Link to="/signup" className="font-bold text-electric-purple hover:underline">Yeni Hesap Oluştur</Link>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginPage;