// DOSYA: data/achievements.ts

import { RadioTower, MessagesSquare, Milestone, Award, Badge, Medal, Ghost, Coffee, Bot, Bomb, Crown } from "lucide-react";
import React from 'react';

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    tier: 'Kolay' | 'Orta' | 'Zor' | 'Mimar';
}

export const achievementsList: Achievement[] = [
    // === Kolay Başarımlar ===
    {
        id: 'first_login',
        name: 'Sinyal Alındı',
        description: 'Dijital evrene ilk adımını attın ve aramıza katıldın. Bu uzun bir yolculuğun başlangıcı.',
        icon: Ghost,
        color: 'text-cyber-gray',
        tier: 'Kolay',
    },
    {
        id: 'pixel_whisper',
        name: 'Pikselin Fısıltısı',
        description: 'Sitede vakit geçirerek ilk 100 skorunu kazandın. Zaman senin için akmaya başladı.',
        icon: RadioTower,
        color: 'text-green-400',
        tier: 'Kolay',
    },
    {
        id: 'chat_initiate',
        name: 'Terminalin Acemisi',
        description: 'Sohbet terminaline ilk defa bağlandın. Artık frekansımızı duyabiliyorsun.',
        icon: Bot,
        color: 'text-blue-400',
        tier: 'Kolay',
    },
    
    // === Orta Başarımlar ===
    {
        id: 'frequency_echo',
        name: 'Frekansın Yankısı',
        description: 'Sözlerin, sohbet terminalinde 100 kezden fazla yankılandı. Sen artık bu frekansın bir parçasısın.',
        icon: MessagesSquare,
        color: 'text-electric-purple',
        tier: 'Orta'
    },
    {
        id: 'interdimensional_traveler',
        name: 'Evrenler Arası Gezgin',
        description: 'En az 10 farklı simülasyonun kapısını araladın. Gerçeklikler senin için bir oyun alanı.',
        icon: Milestone,
        color: 'text-yellow-400',
        tier: 'Orta'
    },
    {
        id: 'scholar_of_the_code',
        name: 'Kodun Alimi',
        description: 'Yaratıcı\'nın mütevazı mabedini ziyaret ettin. Kaynağın sırlarına bir adım daha yakınsın.',
        icon: Coffee,
        color: 'text-orange-400',
        tier: 'Orta'
    },

    // === Zor Başarımlar ===
    {
        id: 'time_lord',
        name: 'Zaman Lordu',
        description: 'Sitede zaman geçirerek 10,000 skora ulaştın. Zaman senin için sadece bir değişkendir.',
        icon: Award,
        color: 'text-red-500',
        tier: 'Zor',
    },
    {
        id: 'void_caller',
        name: 'Boşluğun Çağrısı',
        description: 'Toplam 1,000 mesaj gönderdin. Senin sesin artık bu dijital evrenin temel yasalarından biri.',
        icon: Bomb,
        color: 'text-rose-500',
        tier: 'Zor'
    },
    {
        id: 'legend_of_ttmtal',
        name: 'TTMTAL Efsanesi',
        description: 'Tüm başarımların kilidini açtın. Bu evrenin her köşesini keşfettin. Sana saygımız sonsuz, Efsane.',
        icon: Medal,
        color: 'from-yellow-400 via-red-500 to-purple-500', // Gradyan için özel
        tier: 'Zor'
    }
];

// === YENİ VE ÖNEMLİ KISIM ===
// Admin için özel unvanı ayrı bir değişken olarak export ediyoruz.
export const adminTitle: Achievement = {
    id: 'architect_title',
    name: 'Mimar',
    description: 'Bu dijital evrenin yaratıcısı. Kurallar onun tarafından yazılır.',
    icon: Crown,
    color: 'from-yellow-400 via-red-500 to-purple-500', // En havalı gradyan
    tier: 'Mimar' // Sadece admine özel seviye
};


// Bu fonksiyonu, admin unvanını da içerecek şekilde güncelliyoruz.
export const getAchievementById = (id: string | undefined): Achievement | undefined => {
    if (!id) return undefined;
    if (id === adminTitle.id) return adminTitle;
    return achievementsList.find(a => a.id === id);
};