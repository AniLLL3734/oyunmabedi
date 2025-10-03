// DOSYA: pages/LeaderboardPage.tsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../src/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { LoaderCircle, Trophy } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { Link } from 'react-router-dom';
import AdminTag from '../components/AdminTag';

interface UserScore {
    uid: string;
    displayName: string;
    score: number;
    avatarUrl: string;
    role?: 'admin' | 'user';
}

interface ClanScore {
    id: string;
    name: string;
    emblem: string;
    totalScore: number;
    memberCount: number;
    level: number;
}

// Podyum kartı için küçük bir yardımcı bileşen
const PodiumCard: React.FC<{ user: UserScore, rank: number, color: string, shadowColor: string, scale?: number }> = ({ user, rank, color, shadowColor, scale = 1 }) => {
    return (
        <motion.div 
            className={`p-6 rounded-xl shadow-lg flex flex-col items-center justify-center ${color} ${shadowColor}`} 
            style={{ transform: `scale(${scale})`, zIndex: rank === 1 ? 10 : 1 }} 
            whileHover={{ scale: scale + 0.05 }}
        >
            <Link to={`/profile/${user.uid}`} className="flex flex-col items-center text-center">
                <span className={`text-6xl font-black text-black/50`}>{rank}</span>
                <img src={user.avatarUrl} alt={user.displayName} className="w-20 h-20 rounded-full my-4 border-4 border-white/50 object-cover"/>
                
                {user.role === 'admin' ? 
                    <AdminTag name={user.displayName} className="text-3xl text-white drop-shadow-lg" /> :
                    <h3 className="text-3xl font-bold text-white drop-shadow-lg">{user.displayName}</h3>
                }

                <p className="text-4xl font-heading font-black text-white/90 mt-2">{user.score.toLocaleString()}</p>
            </Link>
        </motion.div>
    );
};

const LeaderboardPage: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [leaderboard, setLeaderboard] = useState<UserScore[]>([]);
    const [clanLeaderboard, setClanLeaderboard] = useState<ClanScore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'clans'>('users');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('score', 'desc'), limit(100));

            try {
                const querySnapshot = await getDocs(q);
                const board: UserScore[] = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.score !== undefined && data.score >= 0) {
                         board.push({
                            uid: doc.id,
                            displayName: data.displayName || 'Anonim',
                            score: data.score,
                            avatarUrl: data.avatarUrl,
                            role: data.role
                        });
                    }
                });
                setLeaderboard(board);
            } catch (error) {
                console.error("Liderlik tablosu çekilirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchClanLeaderboard = async () => {
            const clansRef = collection(db, 'clans');
            const q = query(clansRef, orderBy('totalScore', 'desc'), limit(100));

            try {
                const querySnapshot = await getDocs(q);
                const board: ClanScore[] = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    board.push({
                        id: doc.id,
                        name: data.name,
                        emblem: data.emblem,
                        totalScore: data.totalScore || 0,
                        memberCount: data.memberCount || 0,
                        level: data.level || 1
                    });
                });
                setClanLeaderboard(board);
            } catch (error) {
                console.error("Klan liderlik tablosu çekilirken hata:", error);
            }
        };

        fetchLeaderboard();
        fetchClanLeaderboard();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full py-20">
                <LoaderCircle className="animate-spin text-electric-purple" size={48} />
                <p className="ml-4 text-cyber-gray">Skor verileri hesaplanıyor...</p>
            </div>
        );
    }

    const podium = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl font-heading mb-4 text-center flex justify-center items-center gap-4">
                <Trophy size={48} className="text-yellow-400" /> Skorların Efendileri
            </h1>

            <div className="flex justify-center mb-8">
                <div className="flex bg-dark-gray/50 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-2 rounded-md transition-all ${activeTab === 'users' ? 'bg-electric-purple text-white' : 'text-cyber-gray hover:text-ghost-white'}`}
                    >
                        Oyuncular
                    </button>
                    <button
                        onClick={() => setActiveTab('clans')}
                        className={`px-6 py-2 rounded-md transition-all ${activeTab === 'clans' ? 'bg-electric-purple text-white' : 'text-cyber-gray hover:text-ghost-white'}`}
                    >
                        Klanlar
                    </button>
                </div>
            </div>

            {activeTab === 'users' ? (
                <>
                    <p className="text-center text-cyber-gray mb-12">Sitede en çok zaman geçiren, piksellere hükmeden efsaneler.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-16 text-center items-end">
                        {podium.length > 1 ? (
                             <PodiumCard user={podium[1]} rank={2} color="bg-gray-400" shadowColor="shadow-gray-400/50" />
                        ) : <div /> }
                        {podium.length > 0 ? (
                             <PodiumCard user={podium[0]} rank={1} color="bg-gradient-to-t from-yellow-500 to-yellow-300" shadowColor="shadow-yellow-400/50" scale={1.1} />
                        ) : <div />}
                         {podium.length > 2 ? (
                             <PodiumCard user={podium[2]} rank={3} color="bg-yellow-700" shadowColor="shadow-yellow-700/50" />
                         ): <div />}
                    </div>

                     <div className="max-w-4xl mx-auto">
                         {others.map((player, index) => (
                             <motion.div
                                key={player.uid}
                                className={`flex items-center p-4 my-2 bg-dark-gray/60 rounded-lg border transition-all hover:bg-dark-gray ${player.uid === user?.uid ? 'border-electric-purple ring-2 ring-electric-purple/50' : 'border-cyber-gray/20'}`}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.05}}
                             >
                                <span className="text-xl font-bold text-cyber-gray w-12 flex-shrink-0">{index + 4}.</span>
                                <img src={player.avatarUrl} alt={player.displayName} className="w-10 h-10 rounded-full bg-dark-gray object-cover mr-4"/>
                                <div className="flex-grow">
                                    {player.role === 'admin' ?
                                        <AdminTag name={player.displayName} className="text-lg" /> :
                                        <Link to={`/profile/${player.uid}`} className="text-lg font-bold text-ghost-white hover:text-electric-purple">{player.displayName}</Link>
                                    }
                                </div>
                                <span className="text-xl font-heading font-black text-electric-purple">{player.score.toLocaleString()} SKOR</span>
                             </motion.div>
                         ))}
                     </div>
                </>
            ) : (
                <>
                    <p className="text-center text-cyber-gray mb-12">En güçlü klanlar, toplu skorlarıyla rekabet ediyor.</p>

                    <div className="max-w-4xl mx-auto">
                        {clanLeaderboard.map((clan, index) => (
                            <motion.div
                                key={clan.id}
                                className={`flex items-center p-4 my-2 bg-dark-gray/60 rounded-lg border transition-all hover:bg-dark-gray ${userProfile?.clanId === clan.id ? 'border-electric-purple ring-2 ring-electric-purple/50' : 'text-cyber-gray/20'}`}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.05}}
                            >
                                <span className="text-xl font-bold text-cyber-gray w-12 flex-shrink-0">{index + 1}.</span>
                                <div className="w-10 h-10 bg-cyber-gray rounded-full flex items-center justify-center text-lg font-bold text-electric-purple mr-4">
                                    {clan.emblem[0].toUpperCase()}
                                </div>
                                <div className="flex-grow">
                                    <Link to={`/clan/${clan.id}`} className="text-lg font-bold text-ghost-white hover:text-electric-purple">{clan.name}</Link>
                                    <p className="text-sm text-cyber-gray">{clan.memberCount} üye • Seviye {clan.level}</p>
                                </div>
                                <span className="text-xl font-heading font-black text-electric-purple">{clan.totalScore.toLocaleString()} TOPLAM SKOR</span>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}
        </motion.div>
    );
};

export default LeaderboardPage;
