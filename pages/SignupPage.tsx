// DOSYA: pages/SignupPage.tsx

import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../src/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { grantAchievement } from '../src/utils/grantAchievement.tsx';
import { defaultAvatarUrl } from '../data/avatars';
// HATA BURADAYDI, gereksiz 'adminTitle' import'u kaldırıldı.
import { achievementsList } from '../data/achievements'; 

const SignupPage: React.FC = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
    const navigate = useNavigate();
    const [firebaseError, setFirebaseError] = React.useState<string | null>(null);

    const onSubmit = async (data: any) => {
        const username = data.username.trim();
        const email = `${username.toLowerCase()}@ttmtal.com`;

        if (username.toLowerCase() === 'admin' || (username.toLowerCase().includes('admin') && username !== 'FaTaLRhymeR37')) {
             setFirebaseError('Bu kullanıcı adını seçemezsin.');
             return;
        }

        try {
            setFirebaseError(null);
            const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: username });

            const role = username === 'FaTaLRhymeR37' ? 'admin' : 'user';
            const isAdmin = role === 'admin';
            
            // DÜZELTME: 'adminTitle.id' artık olmadığı için mantık güncellendi.
            const initialAchievements = isAdmin
                ? achievementsList.map(ach => ach.id)
                : [];
            
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                displayName: username,
                email: email,
                role: role,
                score: isAdmin ? 99999 : 0,
                messageCount: 0,
                achievements: initialAchievements,
                // DÜZELTME: Seçili başlık ilk başta null olsun, sonra profilden seçilsin.
                selectedTitle: null, 
                avatarUrl: defaultAvatarUrl,
                unreadChats: [],
                lastLogin: null,
                loginStreak: 0,
            });

            if (!isAdmin) {
                await grantAchievement(user.uid, 'first_login');
            }
            navigate('/');

        } catch (error: any) {
            console.error("Kayıt hatası:", error);
            if (error.code === 'auth/email-already-in-use') { 
                setFirebaseError('Bu kullanıcı adı zaten alınmış. Başka bir tane dene.'); 
            } else if (error.code === 'auth/weak-password') { 
                setFirebaseError('Şifre çok zayıf. En az 6 karakter olmalı.'); 
            } else { 
                setFirebaseError('Bir hata oluştu veya bu kullanıcı adı geçersiz karakterler içeriyor.'); 
            }
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-12">
            <div className="w-full max-w-md p-8 space-y-6 bg-dark-gray rounded-lg border border-cyber-gray/50">
                <h1 className="text-3xl font-bold text-center text-ghost-white font-heading">Yeni Hesap Oluştur</h1>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Kullanıcı Adı</label>
                        <input type="text" {...register('username', { 
                            required: 'Kullanıcı adı zorunludur',
                            pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Kullanıcı adı sadece harf, sayı ve _ içerebilir.' }
                         })} 
                         className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message as string}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Şifre</label>
                        <input type="password" {...register('password', { required: 'Şifre zorunludur', minLength: { value: 6, message: 'Şifre en az 6 karakter olmalı' }})} className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
                    </div>
                    {firebaseError && <p className="text-red-500 text-center">{firebaseError}</p>}
                    <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-electric-purple text-white font-bold rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray">
                         {isSubmitting ? 'Hesap Oluşturuluyor...' : 'Sisteme Katıl'}
                    </button>
                </form>
                <p className="text-center text-cyber-gray">
                    Zaten bir sinyalin var mı?{' '}
                    <Link to="/login" className="font-bold text-electric-purple hover:underline">Sisteme Sız</Link>
                </p>
            </div>
        </motion.div>
    );
};

export default SignupPage;