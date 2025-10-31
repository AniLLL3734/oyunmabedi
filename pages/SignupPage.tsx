import React, { useState, useEffect } from 'react';
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
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

    const onSubmit = async (data: any) => {
        setFirebaseError(null);
        const displayName = data.username.trim();

        // Hesap oluşturma sayısı kontrolü
        const count = parseInt(localStorage.getItem('accountCreationCount') || '0');
        if (count >= 2) {
            // Cooldown'u ayarla eğer henüz ayarlanmamışsa
            if (!localStorage.getItem('accountCreationCooldown')) {
                localStorage.setItem('accountCreationCooldown', Date.now().toString());
            }
            // Cooldown kontrolü...
            const cooldownTimestamp = localStorage.getItem('accountCreationCooldown');
            if (cooldownTimestamp) {
                const elapsed = Date.now() - parseInt(cooldownTimestamp);
                const cooldownDuration = 30 * 60 * 1000; // 30 dakika
                if (elapsed < cooldownDuration) {
                    const remaining = Math.ceil((cooldownDuration - elapsed) / 1000);
                    setFirebaseError(`Yeni hesap oluşturmak için ${Math.floor(remaining / 60)} dakika ${remaining % 60} saniye beklemelisin.`);
                    return;
                }
            }
        }

        // Temel doğrulamalar...
        if (displayName.length < 3) {
            setFirebaseError("Kullanıcı adı en az 3 karakter olmalı.");
            return;
        }
        if (displayName.toLowerCase().includes('admin') && displayName !== 'FaTaLRhymeR37' && displayName !== 'Padişah2.admın') {
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
            // Kullanıcı adı kontrolü...
            const usersRef = collection(db, 'users');
            const usernameQuery = query(usersRef, where('displayName', '==', displayName));
            const usernameSnapshot = await getDocs(usernameQuery);
            
            if (!usernameSnapshot.empty) {
                setFirebaseError('Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane dene.');
                return;
            }

            // Kullanıcı oluşturma...
            const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
            const user = userCredential.user;

            // Display Name'i güncelle
            await updateProfile(user, { displayName: displayName });

            const role = (displayName === 'FaTaLRhymeR37' || displayName === 'Padişah2.admın') ? 'admin' : 'user';
            const isAdmin = role === 'admin';
            
            const batch = writeBatch(db);
            const userDocRef = doc(db, 'users', user.uid);
            
            // Users koleksiyonuna yeni kullanıcıyı ve yeni alanları ekle
            batch.set(userDocRef, {
                uid: user.uid,
                displayName: displayName,
                email: email, 
                role: role,
                score: isAdmin ? 99999 : 0,
                achievements: isAdmin ? achievementsList.map(ach => ach.id) : [],
                selectedTitle: null, 
                avatarUrl: defaultAvatarUrl,
                unreadChats: [],
                gender: data.gender || 'unspecified',
                // --- YENİ ALANLARI VERİTABANINA EKLEME BÖLÜMÜ ---
                hometown: data.hometown || null,
                age: data.age || null,
                grade: data.grade || null,
                instagram: data.instagram || null,
                // --- YENİ ALANLARIN SONU ---
                messageCount: 0,
                joinDate: serverTimestamp(),
                lastLogin: serverTimestamp(),
                loginStreak: 1,
            });
            
            await batch.commit();

            // Hesap oluşturma sayısını artır
            localStorage.setItem('accountCreationCount', (count + 1).toString());

            if (!isAdmin) {
                await grantAchievement(user.uid, 'first_login');
            }

            navigate('/');

        } catch (error: any) {
            console.error("Signup Error Details:", error);
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

    // Cooldown kontrolü useEffect'i aynı kalıyor
    useEffect(() => {
        const checkCooldown = () => {
            const cooldownTimestamp = localStorage.getItem('accountCreationCooldown');
            if (cooldownTimestamp) {
                const elapsed = Date.now() - parseInt(cooldownTimestamp);
                const cooldownDuration = 30 * 60 * 1000;
                if (elapsed < cooldownDuration) {
                    const remaining = Math.ceil((cooldownDuration - elapsed) / 1000);
                    setCooldownRemaining(remaining);
                } else {
                    setCooldownRemaining(0);
                }
            } else {
                setCooldownRemaining(0);
            }
        };

        checkCooldown();
        const interval = setInterval(checkCooldown, 1000);
        return () => clearInterval(interval);
    }, []);

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
                        <div className="flex items-center gap-4 text-ghost-white">
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
                    
                    {/* --- YENİ EKLENEN ALANLARIN ARKA YÜZ (JSX) KODU --- */}
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Memleket</label>
                        <select {...register('hometown')}
                            className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
                        >
                            <option value="">Seçiniz...</option>
                            <option value="Adana">Adana</option>
                            <option value="Adıyaman">Adıyaman</option>
                            <option value="Afyonkarahisar">Afyonkarahisar</option>
                            <option value="Ağrı">Ağrı</option>
                            <option value="Aksaray">Aksaray</option>
                            <option value="Amasya">Amasya</option>
                            <option value="Ankara">Ankara</option>
                            <option value="Antalya">Antalya</option>
                            <option value="Ardahan">Ardahan</option>
                            <option value="Artvin">Artvin</option>
                            <option value="Aydın">Aydın</option>
                            <option value="Balıkesir">Balıkesir</option>
                            <option value="Bartın">Bartın</option>
                            <option value="Batman">Batman</option>
                            <option value="Bayburt">Bayburt</option>
                            <option value="Bilecik">Bilecik</option>
                            <option value="Bingöl">Bingöl</option>
                            <option value="Bitlis">Bitlis</option>
                            <option value="Bolu">Bolu</option>
                            <option value="Burdur">Burdur</option>
                            <option value="Bursa">Bursa</option>
                            <option value="Çanakkale">Çanakkale</option>
                            <option value="Çankırı">Çankırı</option>
                            <option value="Çorum">Çorum</option>
                            <option value="Denizli">Denizli</option>
                            <option value="Diyarbakır">Diyarbakır</option>
                            <option value="Düzce">Düzce</option>
                            <option value="Edirne">Edirne</option>
                            <option value="Elazığ">Elazığ</option>
                            <option value="Erzincan">Erzincan</option>
                            <option value="Erzurum">Erzurum</option>
                            <option value="Eskişehir">Eskişehir</option>
                            <option value="Gaziantep">Gaziantep</option>
                            <option value="Giresun">Giresun</option>
                            <option value="Gümüşhane">Gümüşhane</option>
                            <option value="Hakkâri">Hakkâri</option>
                            <option value="Hatay">Hatay</option>
                            <option value="Iğdır">Iğdır</option>
                            <option value="Isparta">Isparta</option>
                            <option value="İstanbul">İstanbul</option>
                            <option value="İzmir">İzmir</option>
                            <option value="Kahramanmaraş">Kahramanmaraş</option>
                            <option value="Karabük">Karabük</option>
                            <option value="Karaman">Karaman</option>
                            <option value="Kars">Kars</option>
                            <option value="Kastamonu">Kastamonu</option>
                            <option value="Kayseri">Kayseri</option>
                            <option value="Kırıkkale">Kırıkkale</option>
                            <option value="Kırklareli">Kırklareli</option>
                            <option value="Kırşehir">Kırşehir</option>
                            <option value="Kilis">Kilis</option>
                            <option value="Kocaeli">Kocaeli</option>
                            <option value="Konya">Konya</option>
                            <option value="Kütahya">Kütahya</option>
                            <option value="Malatya">Malatya</option>
                            <option value="Manisa">Manisa</option>
                            <option value="Mardin">Mardin</option>
                            <option value="Mersin">Mersin</option>
                            <option value="Muğla">Muğla</option>
                            <option value="Muş">Muş</option>
                            <option value="Nevşehir">Nevşehir</option>
                            <option value="Niğde">Niğde</option>
                            <option value="Ordu">Ordu</option>
                            <option value="Osmaniye">Osmaniye</option>
                            <option value="Rize">Rize</option>
                            <option value="Sakarya">Sakarya</option>
                            <option value="Samsun">Samsun</option>
                            <option value="Siirt">Siirt</option>
                            <option value="Sinop">Sinop</option>
                            <option value="Sivas">Sivas</option>
                            <option value="Şanlıurfa">Şanlıurfa</option>
                            <option value="Şırnak">Şırnak</option>
                            <option value="Tekirdağ">Tekirdağ</option>
                            <option value="Tokat">Tokat</option>
                            <option value="Trabzon">Trabzon</option>
                            <option value="Tunceli">Tunceli</option>
                            <option value="Uşak">Uşak</option>
                            <option value="Van">Van</option>
                            <option value="Yalova">Yalova</option>
                            <option value="Yozgat">Yozgat</option>
                            <option value="Zonguldak">Zonguldak</option>
                        </select>
                        <p className="text-xs text-cyber-gray/70 mt-1">İsteğe bağlı. Profilinizde görünecektir.</p>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Yaş <span className="text-red-500">*</span></label>
                        <input type="number" {...register('age', {
                            required: 'Yaş zorunludur',
                            valueAsNumber: true,
                            min: { value: 13, message: 'Minimum yaş 13 olmalıdır' },
                            max: { value: 100, message: 'Geçerli bir yaş giriniz' }
                        })}
                         placeholder="Örn: 18"
                         className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                        {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message as string}</p>}
                        <p className="text-xs text-cyber-gray/70 mt-1">Zorunlu. Profilinizde görünecektir.</p>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Sınıf <span className="text-red-500">*</span></label>
                         <select {...register('grade', { required: 'Sınıf seçmeniz zorunludur' })}
                             className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
                         >
                            <option value="">Sınıf Seçiniz...</option>
                            <option value="Mezun">Mezun</option>
                            <option value="Üniversite">Üniversite</option>
                            <option value="12. Sınıf">12. Sınıf</option>
                            <option value="11. Sınıf">11. Sınıf</option>
                            <option value="10. Sınıf">10. Sınıf</option>
                            <option value="9. Sınıf">9. Sınıf</option>
                            <option value="Diğer">Diğer</option>
                        </select>
                        {errors.grade && <p className="text-red-500 text-xs mt-1">{errors.grade.message as string}</p>}
                        <p className="text-xs text-cyber-gray/70 mt-1">Zorunlu. Profilinizde görünecektir.</p>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Instagram</label>
                        <input {...register('instagram', {
                            pattern: { value: /^@?[a-zA-Z0-9._]+$/, message: 'Geçersiz Instagram kullanıcı adı' }
                        })}
                         placeholder="@kullaniciadi"
                         className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                        {errors.instagram && <p className="text-red-500 text-xs mt-1">{errors.instagram.message as string}</p>}
                        <p className="text-xs text-cyber-gray/70 mt-1">İsteğe bağlı. Profilinizde görünecektir.</p>
                    </div>
                    {/* --- YENİ EKLENEN ALANLARIN SONU --- */}
                    
                    <div>
                        <label className="text-sm font-bold text-cyber-gray block mb-2">Şifre</label>
                        <input type="password" {...register('password', { required: 'Şifre zorunludur', minLength: { value: 6, message: 'Şifre en az 6 karakter olmalı' }})} className="w-full p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
                    </div>

                    {firebaseError && <p className="text-red-500 text-center">{firebaseError}</p>}
                    {cooldownRemaining > 0 && (
                        <p className="text-yellow-500 text-center">
                            Yeni hesap oluşturmak için {Math.floor(cooldownRemaining / 60)} dakika {cooldownRemaining % 60} saniye beklemelisin.
                        </p>
                    )}
                    <button type="submit" disabled={isSubmitting || cooldownRemaining > 0} className="w-full py-3 px-4 bg-electric-purple text-white font-bold rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray">
                         {isSubmitting ? 'Hesap Oluşturuluyor...' : cooldownRemaining > 0 ? 'Bekleme Süresi Devam Ediyor...' : 'Sisteme Katıl'}
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