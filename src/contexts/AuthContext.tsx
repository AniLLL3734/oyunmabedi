import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// ==============================================================================
// GEREKLİ IMPORTLAR
// ==============================================================================
import { checkAndGrantAchievements } from '../utils/achievementService';
import { defaultAvatarUrl } from '../../data/avatars';

export interface UserProfileData {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    score?: number;
    highestScore?: number;
    bio?: string;
    avatarUrl?: string;
    achievements?: string[];
    clanId?: string;
    clanRole?: 'leader' | 'elder' | 'officer' | 'member';
    lastLogoutTime?: Date; // Yeni eklenen alan
    [key:string]: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  isAdmin: boolean;
  loading: boolean;
  refreshUserProfile?: () => Promise<void>;
  signOutAndSetCooldown?: () => Promise<void>; // Yeni eklenen fonksiyon
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const profileData = docSnap.data() as UserProfileData;
                setUserProfile(profileData);
                checkAndGrantAchievements(profileData, { type: 'USER_LOGIN' });
            } else {
                const isAdminUser = currentUser.email === 'fatalrhymer37@ttmtal.com';
                const newUserProfile: UserProfileData = {
                    uid: currentUser.uid,
                    displayName: isAdminUser ? 'FaTaLRhymeR37' : (currentUser.displayName || `Gezgin#${Math.floor(Math.random() * 9000) + 1000}`),
                    email: currentUser.email || '',
                    role: isAdminUser ? 'admin' : 'user',
                    score: isAdminUser ? 405000 : 0,
                    highestScore: isAdminUser ? 405000 : 0,
                    bio: isAdminUser ? 'Bu dijital evrenin yaratıcısı. Kurallar benim tarafından yazılır.' : 'Bu dijital evrendeki yolculuğuma yeni başladım!',
                    avatarUrl: currentUser.photoURL || defaultAvatarUrl,
                    achievements: isAdminUser ? [
                        'first_login',
                        'pixel_whisper',
                        'chat_initiate',
                        'frequency_echo',
                        'interdimensional_traveler',
                        'scholar_of_the_code',
                        'time_lord',
                        'void_caller',
                        'legend_of_ttmtal',
                        'architect_title'
                    ] : [],
                    joinDate: isAdminUser ? new Date('2023-01-01') : new Date(),
                    messageCount: isAdminUser ? 5000 : 0,
                    playedGames: isAdminUser ? ['game1', 'game2'] : [],
                    level: isAdminUser ? 100 : undefined,
                    experience: isAdminUser ? 1000000 : undefined,
                    totalPlayTime: isAdminUser ? 100000 : undefined,
                    favoriteGame: isAdminUser ? 'Retro Games' : undefined,
                    lastLogin: new Date(),
                    isOnline: false,
                    lastSeen: serverTimestamp(),
                    friends: [],
                    blockedUsers: [],
                    notificationsEnabled: true,
                    theme: 'dark',
                    language: 'tr'
                };

                (async () => {
                    try {
                        await setDoc(userDocRef, newUserProfile);
                        checkAndGrantAchievements(newUserProfile, { type: 'USER_CREATED' });
                        setUserProfile(newUserProfile); 
                    } catch (error) {
                        console.error("Yeni kullanıcı profili oluşturulurken hata oluştu:", error);
                    }
                })();
            }
            setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    
    return () => unsubscribeAuth();
  }, []);

  // Yeni eklenen fonksiyon: Çıkış yaparken cooldown süresini başlatır
  const signOutAndSetCooldown = async () => {
    if (user) {
      try {
        // Kullanıcının Firestore belgesini güncelle
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          lastLogoutTime: new Date() // Çıkış zamanını kaydet
        });
      } catch (error) {
        console.error("Çıkış zamanı kaydedilirken hata oluştu:", error);
      }
    }
    
    // Firebase auth oturumunu kapat
    await signOut(auth);
    
    // LocalStorage'a da çıkış zamanını kaydet (client tarafı için)
    localStorage.setItem('accountCreationCooldown', Date.now().toString());
  };

  const isAdmin = userProfile?.role === 'admin';
  
  const refreshUserProfile = async () => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfileData);
      }
    }
  };
  
  const value = { user, userProfile, isAdmin, loading, refreshUserProfile, signOutAndSetCooldown };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};