import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'; // DİKKAT: setDoc import edildi

// ==============================================================================
// GEREKLİ IMPORTLAR
// ==============================================================================
import { checkAndGrantAchievements } from '../utils/achievementService'; // Başarım Servisini import et
import { defaultAvatarUrl } from '../../data/avatars'; // Varsayılan avatarı import et

export interface UserProfileData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    score?: number;
    highestScore?: number;  // En yüksek skoru tutacak yeni alan
    bio?: string;
    avatarUrl?: string;
    achievements?: string[];
    clanId?: string;
    clanRole?: 'leader' | 'co-leader' | 'member';
    [key:string]: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, isAdmin: false, loading: true });

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Not: Presence sistemi artık sadece sohbet sayfasında useChatPresence hook'u ile yönetiliyor

  useEffect(() => {
    // Auth durumu değiştiğinde dinleyici çalışır
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Auth kullanıcısını ayarla
      
      if (currentUser) {
        // Kullanıcı giriş yaptıysa, gidip Firestore'daki profilini dinlemeye başla
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                // =====================================================================
                // 1. MEVCUT KULLANICI GİRİŞ YAPTIĞINDA
                // =====================================================================
                const profileData = docSnap.data() as UserProfileData;
                setUserProfile(profileData); 
                
                // KULLANICI GİRİŞ YAPTIĞI ANDA EKSİK BAŞARIMLARINI KONTROL ET!
                checkAndGrantAchievements(profileData, { type: 'USER_LOGIN' });

            } else {
                // =====================================================================
                // 2. YENİ KULLANICI İLK DEFA GİRİŞ YAPIYORSA
                // =====================================================================
                
                // Yeni kullanıcı için varsayılan bir profil nesnesi oluştur
                const newUserProfile: UserProfileData = {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName || `Gezgin#${Math.floor(Math.random() * 9000) + 1000}`,
                    email: currentUser.email || '',
                    role: 'user',
                    score: 0,
                    bio: 'Bu dijital evrendeki yolculuğuma yeni başladım!',
                    avatarUrl: currentUser.photoURL || defaultAvatarUrl,
                    achievements: [],
                    joinDate: new Date(),
                    messageCount: 0,
                    playedGames: []
                };

                // Asenkron işlemleri yönetmek için IIFE (Immediately Invoked Function Expression) kullan
                (async () => {
                    try {
                        // Yeni profili Firestore'a kaydet
                        await setDoc(userDocRef, newUserProfile);
                        
                        // YENİ KULLANICI OLAYINI BAŞARIM SERVİSİNE BİLDİR!
                        checkAndGrantAchievements(newUserProfile, { type: 'USER_CREATED' });

                        // Uygulamanın anında tepki vermesi için state'i hemen güncelle
                        setUserProfile(newUserProfile); 
                        
                    } catch (error) {
                        console.error("Yeni kullanıcı profili oluşturulurken hata oluştu:", error);
                    }
                })();
            }
            setLoading(false);
        });

        // Component unmount olduğunda Firestore dinleyicisini iptal et
        return () => unsubscribeProfile();
        
      } else {
        // Kullanıcı çıkış yaptıysa, tüm verileri sıfırla
        setUserProfile(null);
        setLoading(false);
      }
    });
    
    // Component unmount olduğunda Auth dinleyicisini iptal et
    return () => unsubscribeAuth();
  }, []); // Bu useEffect sadece bir kez çalışır.

  const isAdmin = userProfile?.role === 'admin';
  const value = { user, userProfile, isAdmin, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Yükleme bitene kadar alt component'leri render etme */}
      {!loading && children}
    </AuthContext.Provider>
  );
};