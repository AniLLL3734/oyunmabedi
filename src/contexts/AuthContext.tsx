// DOSYA: src/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface UserProfileData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    score?: number;
    bio?: string;
    avatarUrl?: string;
    achievements?: string[];
    [key: string]: any; 
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfileData | null>> | null;
  isAdmin: boolean;
  loading: boolean;
}

// === HATA BURADAYDI VE DÜZELTİLDİ ===
// 'Auth-type' yerine doğru olan 'AuthContextType' yazıldı.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth durumundaki değişiklikleri dinle (giriş/çıkış)
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);

        // Giriş yapan kullanıcının Firestore'daki profil verilerini gerçek zamanlı olarak dinle
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            if(docSnap.exists()){
                const profileData = docSnap.data() as UserProfileData;
                setUserProfile(profileData);
                setIsAdmin(profileData.role === 'admin');
            }
            setLoading(false);
        }, (error) => {
             console.error("Firestore profil dinleme hatası:", error);
             setLoading(false);
        });

        // Bu return, kullanıcı çıkış yaptığında Firestore dinleyicisini temizler.
        return () => unsubscribeProfile();
        
      } else {
        // Kullanıcı çıkış yaptıysa tüm verileri sıfırla.
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    
    // Bu return, ana component kaldırıldığında Auth dinleyicisini temizler.
    return () => unsubscribeAuth();
  }, []);

  const value = { user, userProfile, setUserProfile, isAdmin, loading };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};