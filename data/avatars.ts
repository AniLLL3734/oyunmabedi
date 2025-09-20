// DOSYA: data/avatars.ts

export interface Avatar {
    id: string;
    url: string;
    gender: 'male' | 'female';
}

// Yeni kullanıcılar için varsayılan avatar (public/avatars/varsayilan.jpg)
export const defaultAvatarUrl = "/avatars/varsayilan.jpg";

// Seçilebilecek avatarların listesi
export const availableAvatars: Avatar[] = [
    // Erkek Avatarları
    { id: 'male_1', url: '/avatars/erkek-1.jpg', gender: 'male' },
    { id: 'male_2', url: '/avatars/erkek-2.jpg', gender: 'male' },
    { id: 'male_3', url: '/avatars/erkek-3.jpg', gender: 'male' },
    // --- YENİ EKLENEN AVATARLAR ---
    { id: 'male_4', url: '/avatars/erkek-4.jpg', gender: 'male' },
    { id: 'male_5', url: '/avatars/erkek-5.jpg', gender: 'male' },
    { id: 'male_6', url: '/avatars/erkek-6.jpg', gender: 'male' },

    
    // Kadın Avatarları
    { id: 'female_1', url: '/avatars/kız-1.jpg', gender: 'female' },
    { id: 'female_2', url: '/avatars/kız-2.jpg', gender: 'female' },
    { id: 'female_3', url: '/avatars/kız-3.jpg', gender: 'female' },
    // --- YENİ EKLENEN AVATARLAR ---
    { id: 'female_4', url: '/avatars/kız-4.jpg', gender: 'female' },
    { id: 'female_5', url: '/avatars/kız-5.jpg', gender: 'female' },
    { id: 'female_6', url: '/avatars/kız-6.jpg', gender: 'female' }

];