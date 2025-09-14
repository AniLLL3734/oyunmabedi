import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../src/contexts/AuthContext';
import { Server, Zap, ShieldCheck, Skull } from 'lucide-react';

const ChatRoomSelectionPage: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [activityData, setActivityData] = useState({
        'main': 78,
        'chat2': 45,
        'chat3': 12,
        'chat4': 99,
    });

    const rooms = [
        {
            id: 'main',
            name: 'Oda 1: Ana Sunucu',
            icon: <ShieldCheck className="w-8 h-8 text-green-400" />,
            description: "Güvenli, kurallı ve kimlik doğrulamalı ana sohbet odası. Yeni başlayanlar için önerilir.",
            tag: "En Popüler",
            tagColor: "green",
            route: "/chat"
        },
        {
            id: 'chat2',
            name: 'Oda 2: Sunucu Beta',
            icon: <Zap className="w-8 h-8 text-yellow-400" />,
            description: "Kimlik doğrulamasız, kuralsız ve tamamen anonim. Burası Vahşi Batı, dikkatli olun! Sohbet Odası 1 Yoğunsa Buna Giriniz",
            tag: "Vahşi Batı",
            tagColor: "yellow",
            route: "/chat/server2"
        },
        {
            id: 'chat3',
            name: 'Oda 3: Sunucu Gama',
            icon: <Zap className="w-8 h-8 text-orange-400" />,
            description: "Deneyimli gezginler için daha az kalabalık, moderasyonsuz bir sunucu. 1 Ve 2. Sohbet Odaları Yoğunsa Buna Giriniz",
            tag: "Vahşi Batı",
            tagColor: "orange",
            route: "/chat/server3"
        },
        {
            id: 'chat4',
            name: 'Oda 4: Kaos Küresi',
            icon: <Skull className="w-8 h-8 text-red-500" />,
            description: "En kalabalık ve en kaotik sunucu. Her şeye hazırlıklı olun. Giriş yapmak sizin sorumluluğunuzdadır. Diğer Tüm Sohbet Odaları Doluysa Buna Giriniz",
            tag: "Genellikle Az Kişi",
            tagColor: "red",
            route: "/chat/server4"
        },
    ];

    const handleJoinRoom = (roomId: string, route: string) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (roomId === 'main') {
            navigate(route);
            return;
        }

        const secretKey = import.meta.env.VITE_CHAT_SECRET_KEY;
        const adminRoleKey = import.meta.env.VITE_ADMIN_SECRET_ROLE;

        if (!secretKey || !adminRoleKey) {
            console.error("Yapılandırma hatası! .env.local dosyasını kontrol et.");
            alert("Sohbet odasına bağlanırken bir hata oluştu.");
            return;
        }
        
        const ticket = {
            uid: user.uid,
            displayName: user.displayName || 'Anonim Gezgin',
            role: isAdmin ? adminRoleKey : 'user_standart',
            key: secretKey,
        };

        localStorage.setItem('chatTicket', JSON.stringify(ticket));
        navigate(route);
    };

    const getPingColor = (activity: number) => {
        if (activity < 50) return 'bg-green-500';
        if (activity < 90) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getTagBgColor = (color: string) => {
        switch (color) {
            case 'green': return 'bg-green-900/50 text-green-300';
            case 'yellow': return 'bg-yellow-900/50 text-yellow-300';
            case 'orange': return 'bg-orange-900/50 text-orange-300';
            case 'red': return 'bg-red-900/50 text-red-300';
            default: return 'bg-gray-700 text-gray-300';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="container mx-auto px-4 py-8"
        >
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-heading font-bold bg-gradient-to-r from-electric-purple to-pink-500 text-transparent bg-clip-text">
                    Sohbet Odaları
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-cyber-gray">
                    Farklı sunuculardan birini seçerek sohbete katıl. Ana Sunucu moderatörlü ve güvenlidir,
                    diğerleri ise kuralsız "Vahşi Batı" bölgeleridir.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {rooms.map((room) => (
                    <motion.div
                        key={room.id}
                        whileHover={{ y: -5, borderColor: '#9F70FD' }}
                        className="bg-space-black border border-cyber-gray/50 rounded-xl p-6 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    {room.icon}
                                    <h2 className="text-2xl font-bold text-ghost-white">{room.name}</h2>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getTagBgColor(room.tagColor)}`}>
                                    {room.tag}
                                </span>
                            </div>
                            <p className="text-cyber-gray mb-6 min-h-[60px]">{room.description}</p>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="relative flex h-3 w-3">
                                    <span className={`absolute inline-flex h-full w-full rounded-full ${getPingColor(activityData[room.id])} opacity-75 animate-ping`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${getPingColor(activityData[room.id])}`}></span>
                                </span>
                                Aktiflik: %{activityData[room.id]}
                            </div>

                            <button
                                onClick={() => handleJoinRoom(room.id, room.route)}
                                className="bg-electric-purple text-white font-bold py-2 px-6 rounded-lg hover:bg-opacity-80 transition-all transform hover:scale-105"
                            >
                                Odaya Katıl
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default ChatRoomSelectionPage;