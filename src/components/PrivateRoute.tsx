// DOSYA: src/components/PrivateRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoaderCircle } from 'lucide-react';

interface PrivateRouteProps {
    children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { user, loading } = useAuth(); // AuthContext'ten kullanıcı ve yükleme durumunu al
    const location = useLocation();

    // 1. AuthContext hala kullanıcı bilgisini yüklüyorsa, bir yükleme ekranı göster.
    // Bu, sayfa yenilendiğinde kullanıcının anlık olarak login sayfasına atılmasını engeller.
    if (loading) {
        return (
            <div className="flex justify-center items-center h-full py-20">
                <LoaderCircle className="animate-spin text-electric-purple" size={48} />
            </div>
        );
    }

    // 2. Yükleme bitti ve hala bir "user" objesi YOKSA, kullanıcı giriş yapmamış demektir.
    // Onu login sayfasına yönlendir.
    // `state={{ from: location }}` kısmı, giriş yaptıktan sonra kullanıcının
    // gitmeye çalıştığı orijinal sayfaya geri dönmesini sağlar.
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. Yükleme bitti ve "user" objesi VARSA, her şey yolunda demektir.
    // Çocuğu (yani korunan sayfayı, örn: <ChatPage />) render et.
    return children;
};

export default PrivateRoute;