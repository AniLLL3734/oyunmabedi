// DOSYA: components/AdminTag.tsx

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AdminTagProps {
    name: string;
    className?: string;
}

const AdminTag: React.FC<AdminTagProps> = ({ name, className }) => {
    return (
        <span className={`inline-flex items-center gap-2 font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500 animate-gradient-x ${className}`}>
            <ShieldCheck size="1em" className="text-yellow-400" />
            {name}
        </span>
    );
};

export default AdminTag;