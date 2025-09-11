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
    [key:string]: any; 
}

interface AuthContextType {
  user: User | null; // Orijinal 'User' tipini koruyoruz
  userProfile: UserProfileData | null; // 'userProfile'ı ayrı tutuyoruz
  isAdmin: boolean;
  loading: boolean;
  // setUserProfile'ı kaldırdık çünkü artık buna gerek yok, otomatik güncellenecek.
}

// undefined yerine doğru başlangıç değerlerini veriyoruz.
const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, isAdmin: false, loading: true });

// Bu hook aynı kalıyor, sadece tipi düzelttik
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

  useEffect(() => {
    // Auth durumu değiştiğinde dinleyici çalışır
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Auth kullanıcısını ayarla
      
      if (currentUser) {
        // Kullanıcı giriş yaptıysa, gidip Firestore'daki profilini dinlemeye başla
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            if(docSnap.exists()){
                const profileData = docSnap.data() as UserProfileData;
                setUserProfile(profileData); // Firestore profilini AYRI BİR state'e ayarla
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        // Kullanıcı çıkış yaptığında Firestore dinleyicisini iptal et
        return () => unsubscribeProfile();
        
      } else {
        // Kullanıcı çıkış yaptıysa, tüm verileri sıfırla
        setUserProfile(null);
        setLoading(false);
      }
    });
    
    return () => unsubscribeAuth();
  }, []);

  // isAdmin'i, AYRI olan userProfile state'inden türetiyoruz. EN KRİTİK DÜZELTME BURADA!
  const isAdmin = userProfile?.role === 'admin';
  const value = { user, userProfile, isAdmin, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};