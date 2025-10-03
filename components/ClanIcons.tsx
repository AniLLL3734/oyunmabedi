// src/components/ClanIcons.tsx (DÜZELTİLMİŞ)

import React from 'react';
import {
    Anchor, Axe, Award, Bird, Bomb, Bone, Cat, Castle, Cherry, Crown, Diamond, Dna, Dog, Feather,
    Fish, Flame, Ghost, GitBranch, Grape, Heart, Key, Leaf, Mountain, PawPrint, Rocket, Shield, Skull,
    Sparkles, Snowflake, Sun, Sword, TreePine, VenetianMask, Waves, Zap
} from 'lucide-react';

// Hata düzeltildi: 'Dragon' kaldırıldı, yerine 'Bird' eklendi.
export const clanEmblems = [
    { name: 'sword', Component: Sword },
    { name: 'shield', Component: Shield },
    { name: 'crown', Component: Crown },
    { name: 'skull', Component: Skull },
    { name: 'bird', Component: Bird }, // <-- DÜZELTME
    { name: 'flame', Component: Flame },
    { name: 'zap', Component: Zap },
    { name: 'axe', Component: Axe },
    { name: 'waves', Component: Waves },
    { name: 'mountain', Component: Mountain },
    { name: 'tree', Component: TreePine },
    { name: 'sun', Component: Sun },
    { name: 'feather', Component: Feather },
    { name: 'paw', Component: PawPrint },
    { name: 'bone', Component: Bone },
    { name: 'ghost', Component: Ghost },
    { name: 'bomb', Component: Bomb },
    { name: 'key', Component: Key },
    { name: 'award', Component: Award },
    { name: 'castle', Component: Castle },
    { name: 'rocket', Component: Rocket },
    { name: 'diamond', Component: Diamond },
    { name: 'anchor', Component: Anchor },
    { name: 'snowflake', Component: Snowflake },
    { name: 'mask', Component: VenetianMask },
];

// Bu fonksiyon hatasız çalışmaya devam edecek
export const getClanIconComponent = (iconName: string, props: { size?: number, className?: string } = {}) => {
    const emblem = clanEmblems.find(e => e.name === iconName);
    if (emblem) {
        return <emblem.Component {...props} />;
    }
    return <Sparkles {...props} />; // Varsayılan ikon
};