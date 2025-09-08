// DOSYA: pages/EditProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { db, auth } from '../src/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, LoaderCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { availableAvatars } from '../data/avatars';

const EditProfilePage: React.FC = () => {
    const { user, loading, userProfile, setUserProfile } = useAuth(); // setUserProfile eklendi
    const navigate = useNavigate();
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(userProfile?.avatarUrl || '');
    
    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            displayName: userProfile?.displayName || '',
            bio: userProfile?.bio || ''
        }
    });

    useEffect(() => {
        if (userProfile) {
            setValue('displayName', userProfile.displayName);
            setValue('bio', userProfile.bio || '');
            setSelectedAvatarUrl(userProfile.avatarUrl);
        }
    }, [userProfile, setValue]);

    const onSubmit = async (data: { displayName: string; bio: string }) => {
        if (!user) return;
        
        const userDocRef = doc(db, 'users', user.uid);
        const updatePromises = [];

        if (data.displayName !== user.displayName) {
            updatePromises.push(updateProfile(auth.currentUser!, { displayName: data.displayName }));
        }

        const updatedData: any = {
            displayName: data.displayName,
            bio: data.bio,
            avatarUrl: selectedAvatarUrl
        };
        
        updatePromises.push(updateDoc(userDocRef, updatedData));
        
        try {
            await Promise.all(updatePromises);
            // Context'teki veriyi de güncelleyelim ki sayfa yenilemeden görünsün
            if (setUserProfile) {
                 setUserProfile(prev => prev ? {...prev, ...updatedData} : updatedData);
            }
            toast.success("Profilin başarıyla güncellendi!");
            navigate(`/profile/${user.uid}`);
        } catch (error) {
            console.error("Profil güncellenirken hata oluştu:", error);
            toast.error("Bir hata oluştu. Lütfen tekrar dene.");
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-full py-20"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    if (!user) { navigate('/login'); return null; }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <Link to={`/profile/${user.uid}`} className="inline-flex items-center gap-2 text-cyber-gray hover:text-electric-purple mb-8 transition-colors">
                <ArrowLeft size={20} />
                <span>Profiline Dön</span>
            </Link>
            <h1 className="text-4xl font-heading mb-8">Profilini Düzenle</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-8">
                 <div>
                    <label className="text-lg font-bold text-cyber-gray block mb-2">Avatarını Seç</label>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-4 p-4 bg-space-black rounded-lg">
                        {availableAvatars.map(avatar => (
                             <motion.img 
                                key={avatar.id}
                                src={avatar.url} 
                                alt={`Avatar ${avatar.id}`}
                                className={`w-full aspect-square rounded-full cursor-pointer transition-all border-4 ${selectedAvatarUrl === avatar.url ? 'border-electric-purple scale-110' : 'border-transparent hover:border-cyber-gray/50'}`}
                                onClick={() => setSelectedAvatarUrl(avatar.url)}
                                whileHover={{scale: 1.1}}
                             />
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="text-sm font-bold text-cyber-gray block mb-2">Görünür Adın</label>
                    <input {...register('displayName', { required: 'Kullanıcı adı boş bırakılamaz' })} className="w-full p-3 bg-dark-gray text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"/>
                     {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName.message as string}</p>}
                </div>
                 <div>
                    <label className="text-sm font-bold text-cyber-gray block mb-2">Biyografi</label>
                    <textarea {...register('bio', { maxLength: { value: 150, message: 'Biyografi en fazla 150 karakter olabilir.' } })} placeholder="Kendinden bahset..." rows={4} className="w-full p-3 bg-dark-gray text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none resize-none"/>
                    {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message as string}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-electric-purple text-white font-bold rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray">
                    <Save size={20} />
                    {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
            </form>
        </motion.div>
    );
};

export default EditProfilePage;