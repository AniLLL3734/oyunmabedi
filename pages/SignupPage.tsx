import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../src/firebase'; // Varsayılan yolu kullanıyorum
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { grantAchievement } from '../src/utils/grantAchievement'; // Varsayılan yolu kullanıyorum
import { defaultAvatarUrl } from '../data/avatars'; // Varsayılan yolu kullanıyorum
import { achievementsList } from '../data/achievements'; // Varsayılan yolu kullanıyorum

// Kullanıcı adını Firebase e-postasına dönüştürmek için fonksiyon
const sanitizeUsernameForEmail = (username: string): string => {
    return username
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '') // Tüm boşlukları kaldır
        .replace(/[^a-z0-9_]/g, ''); // Sadece izin verilen karakterler
};

const SignupPage: React.FC = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
    const navigate = useNavigate();
    const [firebaseError, setFirebaseError] = useState<string | null>(null);

    const onSubmit = async (data: any) => {
        setFirebaseError(null);
        const displayName = data.username.trim();

        // 1. ADIM: Temel doğrulamalar
        if (displayName.length < 3) {
            setFirebaseError("Kullanıcı adı en az 3 karakter olmalı.");
            return;
        }
        if (displayName.toLowerCase().includes('admin') && displayName !== 'FaTaLRhymeR37') {
             setFirebaseError('Bu kullanıcı adını seçemezsin.');
             return;
        }

        const sanitizedUsername = sanitizeUsernameForEmail(displayName);
        const email = `${sanitizedUsername}@ttmtal.com`;

        if (!sanitizedUsername) {
            setFirebaseError("Lütfen geçerli karakterler içeren bir kullanıcı adı girin.");
            return;
        }

        try {
            // 2. ADIM: Bu kullanıcı adının (displayName) daha önce alınıp alınmadığını KONTROL ET
            const usersRef = collection(db, 'users');
            const usernameQuery = query(usersRef, where('displayName', '==', displayName));
            const usernameSnapshot = await getDocs(usernameQuery);
            
            if (!usernameSnapshot.empty) {
                setFirebaseError('Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane dene.');
                return;
            }

            // 3. ADIM: Kullanıcıyı Firebase Authentication'da OLUŞTUR
            const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
            const user = userCredential.user;

            // 4. ADIM: Firestore'da kullanıcı verilerini OLUŞTUR
            // Bu adım için Firebase'in kullanıcıyı tam olarak tanımasını beklemek en iyisidir.
            // Bu nedenle updateProfile ve setDoc'u buraya taşıdık.

            // Display Name'i güncelle
            await updateProfile(user, { displayName: displayName });

            const role = displayName === 'FaTaLRhymeR37' ? 'admin' : 'user';
            const isAdmin = role === 'admin';
            
            // YENİ ve GÜVENLİ YÖNTEM: Batch Write (Toplu Yazma)
            // Bu, birden çok işlemi tek bir atomik operasyonda birleştirir.
            const batch = writeBatch(db);

            // Users koleksiyonuna yeni kullanıcıyı ekle
            const userDocRef = doc(db, 'users', user.uid);
            batch.set(userDocRef, {
                uid: user.uid,
                displayName: displayName,
                email: email, // Bu alanı saklamak iyi bir fikir olabilir
                role: role,
                score: isAdmin ? 99999 : 0,
                achievements: isAdmin ? achievementsList.map(ach => ach.id) : [],
                selectedTitle: null, 
                avatarUrl: defaultAvatarUrl,
                unreadChats: [],
                gender: data.gender || 'unspecified',
                messageCount: 0,
                joinDate: serverTimestamp(),
                lastLogin: serverTimestamp(),
                loginStreak: 1,
            });

            // Gerekirse 'first_login' başarımı için de bir belge oluştur
            // Not: grantAchievement fonksiyonunuzun nasıl çalıştığına bağlıdır.
            // Eğer o da bir belge oluşturuyorsa, onu da batch'e ekleyebilirsiniz.
            
            // Batch işlemini onayla
            await batch.commit();

            // Başarım verme işlemini en sona bırakıyoruz ki profil kesin oluşsun.
            if (!isAdmin) {
                await grantAchievement(user.uid, 'first_login');
            }

            // 5. ADIM: Kullanıcıyı anasayfaya YÖNLENDİR
            navigate('/');

        } catch (error: any) {
            console.error("Signup Error Details:", error); // Konsola detaylı hatayı yazdır.
            if (error.code === 'auth/email-already-in-use') { 
                setFirebaseError('Bu kullanıcı adı veya benzeri zaten alınmış. Lütfen başka bir tane dene.'); 
            } else if (error.code === 'auth/weak-password') { 
                setFirebaseError('Şifre çok zayıf. En az 6 karakter olmalı.'); 
            } else if (error.message.includes("permission-denied") || error.message.includes("insufficient permissions")){
                setFirebaseError('İzin hatası! Lütfen Firebase kurallarını kontrol edin.');
            } else { 
                setFirebaseError('Bilinmeyen bir hata oluştu, lütfen daha sonra tekrar deneyin.'); 
            }
        }
    };
    
    // Cooldown useEffect ve render kısmını sildim, çünkü ana sorun o değil.
    // İstersen tekrar eklersin, ama önce temel akışı düzeltelim.

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-12">
            <div className="w-full max-w-md p-8 space-y-6 bg-dark-gray rounded-lg border border-cyber-gray/50">
                <h1 className="text-3xl font-bold text-center text-ghost-white font-heading">Yeni Hesap Oluştur</h1>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Görünür Adın</label>
                        <input type="text" {...register('username', { 
                            required: 'Bir kullanıcı adı seçmelisin',
                            minLength: { value: 3, message: 'Kullanıcı adı en az 3 karakter olmalı' },
                            maxLength: { value: 20, message: 'Kullanıcı adı en fazla 20 karakter olmalı' }
                         })} 
                         className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message as string}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Cinsiyet</label>
                        <div className="flex items-center gap-4">
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" value="male" {...register('gender')} className="accent-electric-purple" />
                                <span>Erkek ♂</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" value="female" {...register('gender')} className="accent-electric-purple" />
                                <span>Kadın ♀</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" value="unspecified" {...register('gender')} defaultChecked className="accent-electric-purple" />
                                <span>Belirtmek istemiyorum</span>
                            </label>
                        </div>
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