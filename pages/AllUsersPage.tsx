import React, { useState, useEffect } from 'react';
import { db } from '../src/firebase'; // Firestore instance
import { getDatabase, ref, get } from "firebase/database"; // Realtime DB
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, LoaderCircle, Info } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { motion } from 'framer-motion';

// UserData arayüzü, gelen verinin tipini belirler
interface UserData {
    id: string;
    displayName: string;
    isOnline: boolean;
    avatarUrl: string;
}

const AllUsersPage: React.FC = () => {
    // Gerekli state'ler ve hook'lar
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Asenkron veri çekme fonksiyonu
        const fetchUsersAndStatus = async () => {
            setIsLoading(true);
            console.log("[DEBUG] Kullanıcıları ve durumlarını çekme işlemi başlatıldı.");

            try {
                // Adım 1: Firestore ve Realtime DB için referansları oluşturma
                const usersCollectionRef = collection(db, 'users');
                const usersQuery = query(usersCollectionRef, orderBy('displayName'));
                
                const rtdb = getDatabase();
                const presenceRef = ref(rtdb, 'users');

                console.log("[DEBUG] Firebase referansları oluşturuldu. Veri çekiliyor...");

                // Adım 2: Promise.all ile verileri eş zamanlı olarak çekme
                const [usersSnapshot, presenceSnapshot] = await Promise.all([
                    getDocs(usersQuery),   // Firestore'dan kullanıcı listesi
                    get(presenceRef)       // Realtime DB'den online durumları
                ]);
                
                console.log("[DEBUG] Veri çekme istekleri tamamlandı.");

                // ----------- HATA AYIKLAMA KONSOL LOG'LARI -----------
                
                // Firestore'dan gelen veriyi kontrol et
                console.log(`[DEBUG] Firestore sorgusu sonuçlandı. Bulunan döküman sayısı: ${usersSnapshot.size}`);
                if (usersSnapshot.empty) {
                    console.warn(`[UYARI] Firestore'daki 'users' koleksiyonundan hiç veri gelmedi.
                    1. Koleksiyon adının doğru olduğundan emin olun ('users').
                    2. Firestore güvenlik kurallarınızın okumaya izin verdiğini kontrol edin.
                    3. Koleksiyonda en az bir döküman olduğundan emin olun.`);
                }
                
                // Realtime Database'den gelen veriyi kontrol et
                const presenceData = presenceSnapshot.val();
                console.log("[DEBUG] Realtime Database 'presence' verisi:", presenceData);
                if (!presenceData) {
                    console.warn("[UYARI] Realtime Database'den 'users' yolu için veri gelmedi (null). Güvenlik kurallarınızı veya veri yapınızı kontrol edin.");
                }

                // ----------- VERİ İŞLEME -----------

                // Firestore dökümanlarını bir diziye dönüştür
                const usersList = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                console.log("[DEBUG] Firestore verisinden oluşturulan kullanıcı listesi:", usersList);
                
                // Firestore ve Realtime DB verilerini birleştir
                const usersWithStatus = usersList.map(user => ({
                    ...user, // displayName, avatarUrl gibi alanları buradan alır
                    isOnline: presenceData && presenceData[user.id] && presenceData[user.id].connections,
                }));
                console.log("[DEBUG] Birleştirilmiş son kullanıcı listesi:", usersWithStatus);

                // State'i güncelle
                setUsers(usersWithStatus as UserData[]);

            } catch (error) {
                console.error("[HATA] Kullanıcılar çekilirken bir hata oluştu. Genellikle bu bir güvenlik kuralı sorunudur.", error);
            } finally {
                // Yüklenme durumunu her zaman sonlandır
                setIsLoading(false);
                console.log("[DEBUG] Veri çekme işlemi tamamlandı (finally bloğu çalıştı).");
            }
        };

        fetchUsersAndStatus();
    }, []); // Bağımlılık dizisi boş olduğu için bu effect sadece bileşen ilk render olduğunda çalışır.

    // Yüklenme durumu için arayüz
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><LoaderCircle className="animate-spin text-electric-purple" size={48} /></div>;
    }

    // Ana arayüz
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-heading mb-8">Tüm Gezginler</h1>
            {users.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user, index) => (
                        <motion.div 
                            key={user.id} 
                            className="p-4 bg-dark-gray/50 rounded-lg flex items-center justify-between transition-all border border-transparent hover:border-electric-purple/50"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                        >
                            <div className="flex items-center gap-4 group flex-1 min-w-0">
                                <div className="relative">
                                    <img src={user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.id}`} alt={user.displayName} className="w-10 h-10 rounded-full bg-dark-gray object-cover flex-shrink-0"/>
                                    {user.isOnline && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-dark-gray" title="Aktif"></div>}
                                </div>
                                <span className="font-bold text-ghost-white truncate">{user.displayName}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => navigate(`/profile/${user.id}`)} title="Profili Görüntüle" className="text-cyber-gray hover:text-electric-purple p-2 rounded-full hover:bg-space-black transition-colors">
                                    <Info size={20} />
                                </button>
                                {currentUser && currentUser.uid !== user.id && (
                                    <button onClick={() => navigate(`/dm/${user.id}`)} title="Özel Mesaj Gönder" className="text-cyber-gray hover:text-electric-purple p-2 rounded-full hover:bg-space-black transition-colors">
                                        <MessageSquare size={20} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-cyber-gray py-10">
                    <p>Görünüşe göre evrende senden başka gezgin yok.</p>
                </div>
            )}
        </motion.div>
    );
};

export default AllUsersPage;