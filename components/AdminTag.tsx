// DOSYA: components/AdminTag.tsx

import React from 'react';
import { ShieldCheck, Crown, Zap } from 'lucide-react';

interface AdminTagProps {
    name: string;
    className?: string;
    variant?: 'default' | 'crown' | 'lightning';
}

const AdminTag: React.FC<AdminTagProps> = ({ name, className, variant = 'default' }) => {
    const getIcon = () => {
        const iconProps = {
            size: "1em", // Yazı boyutuna göre kendini ayarlar
            className: "text-yellow-400"
        };
        switch (variant) {
            case 'crown':
                return <Crown {...iconProps} className={`${iconProps.className} animate-pulse`} />;
            case 'lightning':
                return <Zap {...iconProps} className={`${iconProps.className} animate-bounce`} />;
            default:
                return <ShieldCheck {...iconProps} />;
        }
    };

    const getGradient = () => {
        switch (variant) {
            case 'crown':
                return 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500';
            case 'lightning':
                return 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500';
            default:
                return 'bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500';
        }
    };

    // NOT: Ana kapsayıcıya gradient ve animasyon uygulanıyor.
    // Hem ikon hem de metin bu kapsayıcının içinde.
    // 'text-transparent' ve 'bg-clip-text' sadece metni etkiler,
    // ikon kendi rengini korur, bu yüzden bu yapı doğrudur.
    return (
        <span className={`inline-flex items-center justify-center gap-2 font-black bg-clip-text text-transparent ${getGradient()} animate-gradient-x ${className}`}>
            {getIcon()}
            <span>{name}</span>
        </span>
    );
};

export default AdminTag;