// DOSYA: components/AdminTag.tsx

import React from 'react';
import { ShieldCheck, Crown, Zap } from 'lucide-react';

interface AdminTagProps {
    name: string;
    className?: string;
    variant?: 'default' | 'crown' | 'lightning';
    showAdminLabel?: boolean; // [ADMIN] etiketini göster/gizle
}

const AdminTag: React.FC<AdminTagProps> = ({ name, className, variant = 'default', showAdminLabel = true }) => {
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

    return (
        <span className={`inline-flex items-center justify-center gap-2 font-black ${className}`}>
            {/* [ADMIN] Etiketi */}
            {showAdminLabel && (
                <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-md border border-red-400 shadow-lg animate-pulse">
                    [ADMIN]
                </span>
            )}
            
            {/* Ana Admin Tag */}
            <span className={`inline-flex items-center gap-2 bg-clip-text text-transparent ${getGradient()} animate-gradient-x`}>
                {getIcon()}
                <span>{name}</span>
            </span>
        </span>
    );
};

export default AdminTag;