import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, query, collection, where, documentId, getDocs, writeBatch, increment, arrayRemove, arrayUnion, updateDoc, deleteDoc, deleteField, addDoc, serverTimestamp, orderBy, limit, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth, UserProfileData } from '../src/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Crown, Shield, Users, LogOut, ShieldAlert, Settings, Lock, Unlock, Mail, ArrowUp, ArrowDown, UserMinus, Loader2, UserPlus, ChevronsUp, ChevronsDown, BookOpen, MessageCircle, Star } from 'lucide-react';
import { getClanIconComponent } from '../components/ClanIcons';
import ClanChat from '../components/ClanChat';
import { checkAndGrantAchievements } from '../src/utils/achievementService';

// =============================================================================
// TYPESCRIPT VERİ TİPLERİ
// =============================================================================
interface ClanMember { uid: string; displayName: string; avatarUrl: string; clanRole: 'leader' | 'officer' | 'member' | 'elder'; score: number; }
interface ClanData { id: string; name: string; emblem: string; bio?: string; totalScore: number; memberCount: number; level: number; experience: number; members: string[]; leaderId: string; joinType: 'open' | 'invite-only' | 'closed'; }
type LogType = 'join' | 'leave' | 'kick' | 'promote' | 'demote' | 'settings_change' | 'clan_disbanded' | 'leader_transfer';
interface ActivityLog { id: string; type: LogType; actorName: string; targetName?: string; details?: any; timestamp: Date; }

// =============================================================================
// YARDIMCI BİLEŞENLER
// =============================================================================
const ConfirmationModal: React.FC<any> = ({ isOpen, title, message, onConfirm, onCancel, isSubmitting, confirmText = "Evet, Onayla", cancelText = "Vazgeç" }) => { if (!isOpen) return null; return ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-dark-gray p-8 rounded-lg w-full max-w-md border border-cyber-gray/30 relative text-center shadow-lg"><ShieldAlert size={48} className="mx-auto text-yellow-400 mb-4" /><h2 className="text-2xl font-bold mb-2 text-ghost-white">{title}</h2><p className="text-cyber-gray mb-6">{message}</p><div className="flex justify-center gap-4"><button onClick={onCancel} disabled={isSubmitting} className="px-6 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors disabled:opacity-50">{cancelText}</button><button onClick={onConfirm} disabled={isSubmitting} className="px-6 py-2 rounded-md font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isSubmitting && <Loader2 size={18} className="animate-spin" />}{confirmText}</button></div></motion.div></div>); };

const MemberListItem: React.FC<{ 
    member: ClanMember; 
    currentUserRole?: 'leader' | 'officer' | 'member' | 'elder'; 
    onManage: (uid: string, action: 'promote' | 'demote' | 'kick') => void; 
    isCurrentUser: boolean;
    onTransferLeadership?: (uid: string) => void;
}> = ({ member, currentUserRole, onManage, isCurrentUser, onTransferLeadership }) => {
    const canManage = useMemo(() => (currentUserRole === 'leader' && member.clanRole !== 'leader') || (currentUserRole === 'officer' && member.clanRole === 'member'), [currentUserRole, member.clanRole]);
    
    // Updated role definitions with Ottoman military titles
    const roleMap = { 
        leader: { icon: <Crown size={18} className="text-yellow-400"/>, name: "Paşa", color: "text-yellow-400" }, 
        elder: { icon: <Shield size={18} className="text-purple-400"/>, name: "Yüzbaşı", color: "text-purple-400" }, 
        officer: { icon: <Users size={18} className="text-sky-400"/>, name: "Çavuş", color: "text-sky-400" }, 
        member: { icon: <Star size={18} className="text-cyber-gray"/>, name: "Yeminli Üye", color: "text-cyber-gray" } 
    };
    
    const currentRole = roleMap[member.clanRole] || roleMap.member;
    return (
        <motion.div layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isCurrentUser ? 'bg-electric-purple/20' : 'bg-dark-gray/40'}`}>
            <div className="flex items-center gap-4 flex-grow min-w-0">
                <img src={member.avatarUrl} alt={member.displayName} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-cyber-gray/30"/>
                <div className="flex-grow min-w-0">
                    <p className="font-bold text-ghost-white truncate">{member.displayName}</p>
                    <div className={`flex items-center gap-2 text-sm font-semibold ${currentRole.color}`}>{currentRole.icon}<span>{currentRole.name}</span></div>
                </div>
                <p className='font-mono text-lg text-electric-purple/80 ml-auto mr-4 flex-shrink-0'> {member.score.toLocaleString()} SKOR</p>
            </div>
            {canManage && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    {currentUserRole === 'leader' && member.clanRole === 'member' && (
                        <button 
                            onClick={() => onManage(member.uid, 'promote')} 
                            title="Çavuşluk Rütbesine Terfi Et" 
                            className="p-2 rounded-md hover:bg-sky-500/20 text-sky-500 transition-colors"
                        >
                            <ArrowUp size={18} />
                        </button>
                    )}
                    {currentUserRole === 'leader' && member.clanRole === 'officer' && (
                        <button 
                            onClick={() => onManage(member.uid, 'promote')} 
                            title="Yüzbaşılığa Terfi Et" 
                            className="p-2 rounded-md hover:bg-purple-500/20 text-purple-500 transition-colors"
                        >
                            <ArrowUp size={18} />
                        </button>
                    )}
                    {currentUserRole === 'leader' && member.clanRole === 'elder' && (
                        <button 
                            onClick={() => onManage(member.uid, 'demote')} 
                            title="Çavuşluk Seviyesine Düşür" 
                            className="p-2 rounded-md hover:bg-gray-500/20 text-gray-400 transition-colors"
                        >
                            <ArrowDown size={18} />
                        </button>
                    )}
                    {currentUserRole === 'leader' && member.clanRole === 'officer' && (
                        <button 
                            onClick={() => onManage(member.uid, 'demote')} 
                            title="Yeminli Üyelik Seviyesine Düşür" 
                            className="p-2 rounded-md hover:bg-gray-500/20 text-gray-400 transition-colors"
                        >
                            <ArrowDown size={18} />
                        </button>
                    )}
                    <button 
                        onClick={() => onManage(member.uid, 'kick')} 
                        title="Klandan At" 
                        className="p-2 rounded-md hover:bg-red-500/20 text-red-500 transition-colors"
                    >
                        <UserMinus size={18} />
                    </button>
                </div>
            )}
            {/* Add transfer leadership button for leaders */}
            {currentUserRole === 'leader' && member.clanRole !== 'leader' && onTransferLeadership && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                        onClick={() => onTransferLeadership(member.uid)} 
                        title="Paşalığı Devret" 
                        className="p-2 rounded-md hover:bg-yellow-500/20 text-yellow-500 transition-colors"
                    >
                        <Crown size={18} />
                    </button>
                </div>
            )}
        </motion.div>
    );
};

const ActivityLogItem: React.FC<any> = ({ log }) => { const logInfo = useMemo(() => { const actor = <span className="font-bold text-ghost-white">{log.actorName}</span>; const target = <span className="font-semibold text-ghost-white/80">{log.targetName}</span>; switch (log.type) { case 'join': return { icon: <UserPlus className="text-green-400" />, message: <>{actor} klana katıldı.</> }; case 'leave': return { icon: <UserMinus className="text-orange-400" />, message: <>{actor} klandan ayrıldı.</> }; case 'kick': return { icon: <UserMinus className="text-red-500" />, message: <>{actor}, {target} adlı üyeyi klandan attı.</> }; case 'promote': 
            // Handle different promotion types with Ottoman military titles
            let promoteMessage = <>{actor}, {target} adlı üyeyi terfi ettirdi.</>;
            if (log.details?.newRole === 'officer') {
                promoteMessage = <>{actor}, {target} adlı üyeyi Çavuş rütbesine yükseltti.</>;
            } else if (log.details?.newRole === 'elder') {
                promoteMessage = <>{actor}, {target} adlı üyeyi Yüzbaşı rütbesine yükseltti.</>;
            } else if (log.details?.newRole === 'leader') {
                promoteMessage = <>{actor}, {target} adlı üyeyi Paşa rütbesine yükseltti.</>;
            }
            return { icon: <ChevronsUp className="text-sky-400" />, message: promoteMessage };
case 'demote': 
            // Handle different demotion types with Ottoman military titles
            let demoteMessage = <>{actor}, {target} adlı üyenin rütbesini düşürdü.</>;
            if (log.details?.oldRole === 'officer') {
                demoteMessage = <>{actor}, {target} adlı üyenin rütbesini Yeminli Üye'ye düşürdü.</>;
            } else if (log.details?.oldRole === 'elder') {
                demoteMessage = <>{actor}, {target} adlı üyenin rütbesini Çavuş'a düşürdü.</>;
            } else if (log.details?.oldRole === 'leader') {
                demoteMessage = <>{actor}, {target} adlı üyenin rütbesini Yüzbaşı'ya düşürdü.</>;
            }
            return { icon: <ChevronsDown className="text-gray-400" />, message: demoteMessage };
case 'settings_change': return { icon: <Settings className="text-purple-400" />, message: <>{actor} katılım ayarını <span className="font-semibold text-ghost-white/80">{log.details.newType}</span> olarak değiştirdi.</> }; case 'clan_disbanded': return { icon: <ShieldAlert className="text-red-600" />, message: <>{actor} klanı dağıttı.</> }; case 'leader_transfer': return { icon: <Crown className="text-yellow-400" />, message: <>{actor}, liderliği {target} adlı üyeye devretti.</> }; default: return { icon: <BookOpen className="text-cyber-gray" />, message: "Bilinmeyen bir klan aktivitesi." }; } }, [log]); 
  
  // Safe timestamp formatting
  const formatTimestamp = (timestamp: any) => {
    try {
      return timestamp.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      return new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    }
  };
  
  return ( <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-4 p-3 border-b border-cyber-gray/10 text-sm"><div className="flex-shrink-0 mt-1">{logInfo.icon}</div><div className="flex-grow"><p className="text-cyber-gray">{logInfo.message}</p><p className="text-xs text-cyber-gray/60 mt-1">{formatTimestamp(log.timestamp)}</p></div></motion.div> ); };
const PageLoader: React.FC = () => ( <div className="flex justify-center items-center h-full min-h-[60vh]"><Loader2 size={48} className="animate-spin text-electric-purple" /></div> );

// Join Request Item Component
const JoinRequestItem: React.FC<{
    request: any;
    onAccept: (requestId: string, requesterUid: string, requesterName: string) => void;
    onReject: (requestId: string, requesterName: string) => void;
    isSubmitting: boolean;
}> = ({ request, onAccept, onReject, isSubmitting }) => {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-gray/40">
            <div className="flex items-center gap-4">
                <img 
                    src={request.avatarUrl} 
                    alt={request.displayName} 
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-cyber-gray/30"
                />
                <div>
                    <p className="font-bold text-ghost-white">{request.displayName}</p>
                    <p className="text-cyber-gray text-sm">{request.message}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onAccept(request.id, request.uid, request.displayName)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                >
                    Kabul Et
                </button>
                <button
                    onClick={() => onReject(request.id, request.displayName)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
                >
                    Reddet
                </button>
            </div>
        </div>
    );
};

// =============================================================================
// ANA BİLEŞEN: ClanDetailPage
// =============================================================================
const ClanDetailPage: React.FC = () => {
    const { clanId } = useParams<{ clanId: string }>();
    const { user, userProfile, refreshUserProfile } = useAuth();
    const navigate = useNavigate();
    
    const [clan, setClan] = useState<ClanData | null>(null);
    const [members, setMembers] = useState<ClanMember[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [joinRequests, setJoinRequests] = useState<any[]>([]); // Add this line for join requests
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('members');
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    
    useEffect(() => {
        if (!clanId) {
            navigate('/clans');
            return;
        }
        fetchClanDetails(clanId);
    }, [clanId, navigate]);
    
    // Add real-time listener for activity logs
    useEffect(() => {
        if (!clanId || clanId === 'undefined' || clanId === 'null') return;
        
        const logQuery = query(collection(db, 'clans', clanId, 'activityLog'), orderBy('timestamp', 'desc'), limit(50));
        const unsubscribe = onSnapshot(logQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                // Handle null timestamp safely
                let timestamp = new Date();
                if (data.timestamp) {
                    try {
                        timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    } catch (e) {
                        console.warn('Invalid timestamp format, using current time');
                    }
                }
                return { id: doc.id, ...data, timestamp } as ActivityLog;
            }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Ensure proper ordering
            setActivityLog(logs);
        }, (error) => {
            console.error("Error fetching activity logs:", error);
        });
        
        return () => unsubscribe();
    }, [clanId]);
    
    async function fetchClanDetails(id: string, suppressLoading = false) {
        if (!suppressLoading) setLoading(true);
        try {
            const clanDoc = await getDoc(doc(db, 'clans', id));
            if (!clanDoc.exists()) {
                toast.error('Bu klan bulunamadı veya dağıtılmış.');
                navigate('/clans');
                return;
            }

            const clanData = { id: clanDoc.id, ...clanDoc.data() } as ClanData;
            setClan(clanData);

            const memberUIDs = clanData.members || [];
            if (memberUIDs.length > 0) {
                const memberDetails: ClanMember[] = [];
                for (let i = 0; i < memberUIDs.length; i += 30) {
                    const chunk = memberUIDs.slice(i, i + 30);
                    const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                    const userDocs = await getDocs(usersQuery);
                    userDocs.docs.forEach(uDoc => {
                        const userData = uDoc.data();
                        memberDetails.push({ uid: uDoc.id, displayName: userData.displayName || 'İsimsiz', avatarUrl: userData.avatarUrl || '/avatars/default.png', clanRole: userData.clanRole || 'member', score: userData.score || 0 });
                    });
                }
                const roleOrder: Record<ClanMember['clanRole'], number> = { leader: 0, elder: 1, officer: 2, member: 3 };
                memberDetails.sort((a, b) => roleOrder[a.clanRole] - roleOrder[b.clanRole] || b.score - a.score);
                setMembers(memberDetails);
            } else {
                setMembers([]);
            }
            
            // Fetch join requests if user is leader or officer
            const isLeaderOrOfficer = userProfile?.clanId === clanData.id && (userProfile?.clanRole === 'leader' || userProfile?.clanRole === 'officer');
            if (isLeaderOrOfficer) {
                const requestsQuery = query(collection(db, 'clans', id, 'joinRequests'), orderBy('timestamp', 'desc'));
                const requestsSnapshot = await getDocs(requestsQuery);
                const requests = requestsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { id: doc.id, ...data };
                });
                setJoinRequests(requests);
            }
            
        } catch (err) {
            toast.error('Klan bilgileri yüklenirken bir hata oluştu.');
            console.error("Fetch Clan Details Error:", err);
            navigate('/clans');
        } finally {
            if (!suppressLoading) setLoading(false);
        }
    }
    
    const isLeader = useMemo(() => userProfile?.clanId === clan?.id && userProfile?.clanRole === 'leader', [userProfile, clan]);
    const closeModal = () => setModalState({ ...modalState, isOpen: false });
    const triggerConfirmation = (title: string, message: string, onConfirm: () => void) => setModalState({ isOpen: true, title, message, onConfirm });
    
    function logActivityAndRefreshUI(logData: Omit<ActivityLog, 'id' | 'timestamp'>) {
        if (!clan || !clan.id) return;
        
        // First update the UI immediately
        const newLog: ActivityLog = { id: `local-${Date.now()}`, ...logData, timestamp: new Date() };
        setActivityLog(prevLogs => [newLog, ...prevLogs]);
        
        // Then try to save to database (this might fail due to permissions)
        addDoc(collection(db, 'clans', clan.id, 'activityLog'), { ...logData, timestamp: serverTimestamp() })
            .catch(err => {
                console.error("Aktivite logu kaydedilirken hata:", err);
                // If saving fails, we still keep the UI updated
                // Only show toast error if it's not a permission error (to avoid spamming)
                if (!err.message.includes('permission')) {
                    toast.error("Aktivite logu kaydedilemedi, ancak ekranda gösteriliyor.");
                }
            });
    }
    
    async function performLeaveClan() {
        if (!user || !userProfile || !clan) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Klandan ayrılıyorsun...");
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'users', user.uid), { clanId: deleteField(), clanRole: deleteField() });
            if (clan.memberCount <= 1) {
                batch.delete(doc(db, 'clans', clan.id));
            } else {
                // Allow leader to leave if they have transferred leadership
                if (isLeader && clan.leaderId === user.uid) {
                    // This shouldn't happen now that we have leader transfer, but just in case
                    throw new Error("Liderlik devredilmeden klandan ayrılamazsınız. Önce liderliği başka bir üyeye devredin.");
                }
                batch.update(doc(db, 'clans', clan.id), { 
                    members: arrayRemove(user.uid), 
                    memberCount: increment(-1),
                    totalScore: increment(-(userProfile.score || 0))
                });
                logActivityAndRefreshUI({ type: 'leave', actorName: userProfile.displayName });
            }
            await batch.commit();
            if (typeof refreshUserProfile === 'function') await refreshUserProfile();
            toast.success(clan.memberCount <= 1 ? "Klan dağıtıldı!" : "Klandan ayrıldın.", { id: toastId });
            navigate('/clans');
        } catch (err) {
            toast.error("İşlem sırasında bir hata oluştu.", { id: toastId });
            console.error(err);
        } finally {
            setIsSubmitting(false);
            closeModal();
        }
    }

    async function performClanManagement(memberUid: string, action: 'promote' | 'demote' | 'kick') {
        if (!clan || !userProfile || (!isLeader && !(userProfile.clanRole === 'officer' && action === 'kick'))) return;
        setIsSubmitting(true);
        const toastId = toast.loading("İşlem yapılıyor...");
        try {
            const targetMember = members.find(m => m.uid === memberUid);
            if (!targetMember) throw new Error("Üye bulunamadı!");
            
            const logType: LogType = action;
            if (action === 'kick') {
                const batch = writeBatch(db);
                batch.update(doc(db, 'clans', clan.id), { members: arrayRemove(memberUid), memberCount: increment(-1) });
                batch.update(doc(db, 'users', memberUid), { clanId: deleteField(), clanRole: deleteField() });
                await batch.commit();
                setClan(prev => prev ? { ...prev, memberCount: prev.memberCount - 1, members: prev.members.filter(id => id !== memberUid) } : null);
                setMembers(prev => prev.filter(m => m.uid !== memberUid));
            } else {
                if (!isLeader) return;
                let newRole = targetMember.clanRole;
                
                // Promotion logic
                if (action === 'promote') {
                    if (targetMember.clanRole === 'member') {
                        newRole = 'officer'; // Yeminli Üye -> Çavuş
                    } else if (targetMember.clanRole === 'officer') {
                        newRole = 'elder'; // Çavuş -> Yüzbaşı
                    } else if (targetMember.clanRole === 'elder') {
                        newRole = 'leader'; // Yüzbaşı -> Paşa
                    }
                } 
                // Demotion logic
                else if (action === 'demote') {
                    if (targetMember.clanRole === 'officer') {
                        newRole = 'member'; // Çavuş -> Yeminli Üye
                    } else if (targetMember.clanRole === 'elder') {
                        newRole = 'officer'; // Yüzbaşı -> Çavuş
                    } else if (targetMember.clanRole === 'leader') {
                        newRole = 'elder'; // Paşa -> Yüzbaşı
                    }
                }
                
                await updateDoc(doc(db, 'users', memberUid), { clanRole: newRole });
                setMembers(prev => prev.map(m => m.uid === memberUid ? { ...m, clanRole: newRole as any } : m));
                
                // Check for clan leader achievement when promoting someone to leader
                if (newRole === 'leader') {
                    const promotedMemberDoc = await getDoc(doc(db, 'users', memberUid));
                    if (promotedMemberDoc.exists()) {
                        const promotedMemberProfile = promotedMemberDoc.data() as UserProfileData;
                        checkAndGrantAchievements(promotedMemberProfile, { type: 'CLAN_ACTION', payload: { action: 'transferred' } });
                    }
                }
                
                // Log the role change with details
                if (action === 'promote' || action === 'demote') {
                    logActivityAndRefreshUI({ 
                        type: action, 
                        actorName: userProfile.displayName, 
                        targetName: targetMember.displayName,
                        details: action === 'promote' 
                            ? { newRole: newRole } 
                            : { oldRole: targetMember.clanRole }
                    });
                }
            }
            
            if (action === 'kick') {
                logActivityAndRefreshUI({ type: logType, actorName: userProfile.displayName, targetName: targetMember.displayName });
            }
            
            toast.success("İşlem tamamlandı.", { id: toastId });
        } catch (err) {
            toast.error("İşlem sırasında bir hata oluştu.", { id: toastId });
            console.error(err);
        } finally {
            setIsSubmitting(false);
            closeModal();
        }
    }

    async function performDeleteClan() {
        if (!clan || !isLeader || !userProfile) { 
            toast.error("Bu işlemi yapmaya yetkiniz yok."); 
            return; 
        }
        setIsSubmitting(true);
        const toastId = toast.loading(`Klan dağıtılıyor... (${members.length} üye)`);
        try {
            logActivityAndRefreshUI({ type: 'clan_disbanded', actorName: userProfile.displayName });
            
            // Create an archived version of the clan with its activity log
            const archivedClanData = {
                ...clan,
                archivedAt: serverTimestamp(),
                archivedBy: userProfile.uid,
                archivedByName: userProfile.displayName,
                isArchived: true
            };
            
            // Archive the clan with its activity log before deleting
            await setDoc(doc(db, 'archived_clans', clan.id), archivedClanData);
            
            // Copy all activity logs to the archived clan
            const logQuery = query(collection(db, 'clans', clan.id, 'activityLog'));
            const logSnapshot = await getDocs(logQuery);
            const batch = writeBatch(db);
            
            for (const logDoc of logSnapshot.docs) {
                const archivedLogRef = doc(db, 'archived_clans', clan.id, 'activityLog', logDoc.id);
                batch.set(archivedLogRef, logDoc.data());
            }
            
            await batch.commit();
            
            // Now remove clan data from users
            for (let i = 0; i < members.length; i += 499) {
                const chunk = members.slice(i, i + 499);
                const userBatch = writeBatch(db);
                chunk.forEach((member) => {
                    const userRef = doc(db, 'users', member.uid);
                    userBatch.update(userRef, { clanId: deleteField(), clanRole: deleteField() });
                });
                await userBatch.commit();
            }
            
            // Delete the clan document (but activity logs remain in archived_clans)
            await deleteDoc(doc(db, 'clans', clan.id));
            
            if (typeof refreshUserProfile === 'function') await refreshUserProfile();
            toast.success("Klan başarıyla dağıtıldı!", { id: toastId });
            navigate('/clans');
        } catch (err) {
            console.error("Delete Clan Error:", err);
            toast.error("Klan dağıtılırken bir hata oluştu.", { id: toastId });
        } finally {
            setIsSubmitting(false);
            closeModal();
        }
    }
    
    async function handleChangeJoinType(newType: ClanData['joinType']) {
        if (!clan || !isLeader || clan.joinType === newType || !userProfile) return;
        const toastId = toast.loading("Ayar güncelleniyor...");
        try {
            await updateDoc(doc(db, 'clans', clan.id), { joinType: newType });
            const typeMap = { 'open': 'Herkese Açık', 'invite-only': 'Sadece Davetle', 'closed': 'Kapalı' };
            logActivityAndRefreshUI({ type: 'settings_change', actorName: userProfile.displayName, details: { newType: typeMap[newType] } });
            setClan(prev => prev ? { ...prev, joinType: newType } : null);
            toast.success("Katılım türü güncellendi.", { id: toastId });
        } catch (err) {
            toast.error("Ayar güncellenirken hata oluştu.", { id: toastId });
        }
    }

    // Function to add experience to the clan and handle level progression
    async function addClanExperience(exp: number) {
        if (!clan || !isLeader) return;
        
        try {
            const newExp = (clan.experience || 0) + exp;
            const newLevel = Math.floor(newExp / 1000) + 1; // 1000 exp per level
            
            const updateData: any = { experience: newExp };
            if (newLevel > clan.level) {
                updateData.level = newLevel;
                // Log level up
                logActivityAndRefreshUI({ 
                    type: 'settings_change', 
                    actorName: 'Sistem', 
                    details: { newType: `Klan ${newLevel}. seviyeye ulaştı!` } 
                });
                toast.success(`Klan ${newLevel}. seviyeye ulaştı!`);
            }
            
            await updateDoc(doc(db, 'clans', clan.id), updateData);
            setClan(prev => prev ? { ...prev, ...updateData } : null);
        } catch (err) {
            console.error("Error adding clan experience:", err);
        }
    }
    
    // Function to reward clan members with experience
    async function rewardClanMembers(exp: number) {
        if (!clan || !isLeader || !members.length) return;
        
        try {
            const batch = writeBatch(db);
            const expPerMember = Math.floor(exp / members.length);
            
            members.forEach(member => {
                // In a real implementation, you might want to update user experience
                // For now, we'll just log the activity
            });
            
            // Add experience to the clan
            await addClanExperience(exp);
            
            logActivityAndRefreshUI({ 
                type: 'settings_change', 
                actorName: userProfile?.displayName || 'Bilinmeyen', 
                details: { newType: `Klan üyeleri ${exp} tecrübe puanı kazandı!` } 
            });
            
            toast.success(`Klan üyeleri ${exp} tecrübe puanı kazandı!`);
        } catch (err) {
            console.error("Error rewarding clan members:", err);
            toast.error("Klan üyeleri ödüllendirilirken bir hata oluştu.");
        }
    }

    // Add new function for transferring leadership
    async function performLeaderTransfer(newLeaderUid: string) {
        if (!clan || !isLeader || !userProfile) { 
            toast.error("Bu işlemi yapmaya yetkiniz yok."); 
            return; 
        }
        
        setIsSubmitting(true);
        const toastId = toast.loading("Liderlik devrediliyor...");
        
        try {
            const newLeader = members.find(m => m.uid === newLeaderUid);
            if (!newLeader) throw new Error("Yeni lider bulunamadı!");
            
            const batch = writeBatch(db);
            
            // Update current leader's role to elder
            batch.update(doc(db, 'users', user!.uid), { clanRole: 'elder' });
            
            // Update new leader's role to leader
            batch.update(doc(db, 'users', newLeaderUid), { clanRole: 'leader' });
            
            // Update clan's leaderId
            batch.update(doc(db, 'clans', clan.id), { leaderId: newLeaderUid });
            
            await batch.commit();
            
            // Update local state
            setMembers(prev => prev.map(m => {
                if (m.uid === user!.uid) return { ...m, clanRole: 'elder' };
                if (m.uid === newLeaderUid) return { ...m, clanRole: 'leader' };
                return m;
            }));
            
            setClan(prev => prev ? { ...prev, leaderId: newLeaderUid } : null);
            
            logActivityAndRefreshUI({ 
                type: 'leader_transfer', 
                actorName: userProfile.displayName, 
                targetName: newLeader.displayName 
            });
            
            // Get the new leader's profile to trigger achievement
            const newLeaderDoc = await getDoc(doc(db, 'users', newLeaderUid));
            if (newLeaderDoc.exists()) {
                const newLeaderProfile = newLeaderDoc.data() as UserProfileData;
                checkAndGrantAchievements(newLeaderProfile, { type: 'CLAN_ACTION', payload: { action: 'transferred' } });
            }
            
            toast.success(`${newLeader.displayName} artık klan lideri!`, { id: toastId });
            
            // Close modal
            closeModal();
        } catch (err) {
            toast.error("Liderlik devrilirken bir hata oluştu.", { id: toastId });
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Function to start editing clan description
    const startEditingDescription = () => {
        setEditedDescription(clan?.bio || '');
        setIsEditingDescription(true);
    };
    
    // Function to save edited clan description
    const saveDescription = async () => {
        if (!clan || !isLeader) return;
        
        try {
            await updateDoc(doc(db, 'clans', clan.id), { bio: editedDescription });
            setClan(prev => prev ? { ...prev, bio: editedDescription } : null);
            setIsEditingDescription(false);
            toast.success('Klan açıklaması güncellendi!');
        } catch (err) {
            console.error("Error updating clan description:", err);
            toast.error('Açıklama güncellenirken bir hata oluştu.');
        }
    };
    
    // Function to cancel editing
    const cancelEditing = () => {
        setIsEditingDescription(false);
        setEditedDescription('');
    };
    
    // Function to directly join an open clan
    async function handleDirectJoin(clanId: string) {
        if (!user || !userProfile || userProfile.clanId) {
            toast.error('Klana katılmak için uygun durumda değilsiniz.');
            return;
        }

        if (!clanId || clanId === 'undefined' || clanId === 'null') {
            toast.error('Geçersiz klan ID.');
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading('Klana katılıyor...');

        try {
            const batch = writeBatch(db);
            const clanRef = doc(db, 'clans', clanId);
            batch.update(clanRef, {
                members: arrayUnion(user.uid),
                memberCount: increment(1),
                totalScore: increment(userProfile.score || 0)
            });

            const userRef = doc(db, 'users', user.uid);
            batch.update(userRef, { 
                clanId: clanId, 
                clanRole: 'member' 
            });

            await batch.commit();

            // Add activity log
            try {
                await addDoc(collection(db, 'clans', clanId, 'activityLog'), {
                    type: 'join',
                    actorName: userProfile.displayName,
                    timestamp: serverTimestamp()
                });
            } catch (logError) {
                console.error("Activity log error:", logError);
                // Don't fail the whole operation if activity log fails
            }

            // Refresh user profile
            if (typeof refreshUserProfile === 'function') await refreshUserProfile();
            
            toast.success('Klana başarıyla katıldınız!', { id: toastId });
            
            // Refresh clan data
            await fetchClanDetails(clanId, true);
        } catch (err) {
            toast.error('Klana katılırken bir hata oluştu.', { id: toastId });
            console.error("Direct Join Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Function to request to join a clan (for invite-only clans)
    async function requestToJoinClan() {
        if (!user || !userProfile || userProfile.clanId || !clan) {
            toast.error('Klana katılma isteği göndermek için giriş yapmalısınız ve bir klanda olmamalısınız.');
            return;
        }
        
        if (clan.joinType !== 'invite-only') {
            toast.error('Bu klan sadece davetle katılınabilir.');
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading('Katılma isteği gönderiliyor...');

        try {
            // Check if user has already sent a request
            const requestQuery = query(
                collection(db, 'clans', clan.id, 'joinRequests'),
                where('uid', '==', user.uid)
            );
            const requestSnapshot = await getDocs(requestQuery);
            
            if (!requestSnapshot.empty) {
                toast.error('Zaten bir katılma isteğiniz var.', { id: toastId });
                setIsSubmitting(false);
                return;
            }

            // Add join request to clan
            await addDoc(collection(db, 'clans', clan.id, 'joinRequests'), {
                uid: user.uid,
                displayName: userProfile.displayName,
                avatarUrl: userProfile.avatarUrl || '/avatars/default.png',
                message: `${userProfile.displayName} klanınıza katılmak istiyor.`,
                timestamp: serverTimestamp(),
                status: 'pending'
            });

            toast.success('Katılma isteğiniz gönderildi. Klan liderleri isteğinizi değerlendirecek.', { id: toastId });
        } catch (err) {
            toast.error('Katılma isteği gönderilirken bir hata oluştu.', { id: toastId });
            console.error("Join Request Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Function to accept a join request (for leaders and officers)
    async function acceptJoinRequest(requestId: string, requesterUid: string, requesterName: string) {
        if (!clan || !userProfile || (!isLeader && userProfile.clanRole !== 'officer')) {
            toast.error("Bu işlemi yapmaya yetkiniz yok.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading('Üye kabul ediliyor...');

        try {
            const batch = writeBatch(db);
            
            // Add user to clan members
            batch.update(doc(db, 'clans', clan.id), {
                members: arrayUnion(requesterUid),
                memberCount: increment(1),
                totalScore: increment(userProfile.score || 0)
            });

            // Update user's clan info
            batch.update(doc(db, 'users', requesterUid), {
                clanId: clan.id,
                clanRole: 'member'
            });

            // Delete the join request
            batch.delete(doc(db, 'clans', clan.id, 'joinRequests', requestId));

            // Add activity log
            batch.set(doc(collection(db, 'clans', clan.id, 'activityLog')), {
                type: 'join',
                actorName: requesterName,
                timestamp: serverTimestamp()
            });

            await batch.commit();

            // Refresh clan data
            await fetchClanDetails(clan.id, true);
            
            toast.success(`${requesterName} klanınıza kabul edildi!`, { id: toastId });
        } catch (err) {
            toast.error('Üye kabul edilirken bir hata oluştu.', { id: toastId });
            console.error("Accept Join Request Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Function to reject a join request (for leaders and officers)
    async function rejectJoinRequest(requestId: string, requesterName: string) {
        if (!clan || !userProfile || (!isLeader && userProfile.clanRole !== 'officer')) {
            toast.error("Bu işlemi yapmaya yetkiniz yok.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading('İstek reddediliyor...');

        try {
            // Delete the join request
            await deleteDoc(doc(db, 'clans', clan.id, 'joinRequests', requestId));
            
            toast.success(`${requesterName} için olan istek reddedildi.`, { id: toastId });
        } catch (err) {
            toast.error('İstek reddedilirken bir hata oluştu.', { id: toastId });
            console.error("Reject Join Request Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    }
    
    if (loading) { return <PageLoader />; }
    if (!clan) { return (<div className="text-center py-20 text-ghost-white"><h1 className="text-2xl font-bold">Klan Yüklenemedi</h1><p>Bu klan mevcut olmayabilir veya silinmiş.</p></div>); }
    
    return (
        <>
            <Toaster position="bottom-right" toastOptions={{ style: { background: '#222738', color: '#E0E1E9', border: '1px solid #434960' } }}/>
            <AnimatePresence><ConfirmationModal {...modalState} isOpen={modalState.isOpen} isSubmitting={isSubmitting} onCancel={closeModal} /></AnimatePresence>
            <motion.div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="lg:col-span-1 bg-dark-gray/60 p-6 rounded-lg border border-cyber-gray/20 flex flex-col gap-4 self-start">
                       <div className="flex items-center gap-4">
                           <div className="w-20 h-20 bg-electric-purple/20 ring-2 ring-electric-purple/50 rounded-full flex items-center justify-center flex-shrink-0">{getClanIconComponent(clan.emblem, { size: 40, className: "text-electric-purple" })}</div>
                           <div><h1 className="text-3xl font-bold text-ghost-white break-words">{clan.name}</h1><p className="text-cyber-gray font-semibold">Seviye {clan.level}</p></div>
                       </div>
                       <div>
                           <div className="flex items-center justify-between mb-2">
                               <h3 className="font-semibold text-ghost-white">Hakkımızda</h3>
                               {isLeader && !isEditingDescription && (
                                   <button 
                                       onClick={startEditingDescription}
                                       className="text-xs text-electric-purple hover:text-purple-300"
                                   >
                                       Düzenle
                                   </button>
                               )}
                           </div>
                           
                           {isEditingDescription ? (
                               <div className="space-y-2">
                                   <textarea
                                       value={editedDescription}
                                       onChange={(e) => setEditedDescription(e.target.value)}
                                       placeholder="Klanınızın amacını ve ruhunu yansıtan kısa bir yazı..."
                                       className="w-full p-3 bg-black/20 border-2 border-cyber-gray/30 rounded-md text-white focus:outline-none focus:border-electric-purple resize-none"
                                       maxLength={500}
                                       rows={4}
                                   />
                                   <div className="flex gap-2 justify-end">
                                       <button
                                           onClick={cancelEditing}
                                           className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md text-sm"
                                       >
                                           İptal
                                       </button>
                                       <button
                                           onClick={saveDescription}
                                           className="px-3 py-1 bg-electric-purple hover:bg-purple-700 rounded-md text-sm"
                                       >
                                           Kaydet
                                       </button>
                                   </div>
                               </div>
                           ) : (
                               <p className="text-cyber-gray text-sm leading-relaxed">
                                   {clan.bio || 'Biyografi eklenmemiş.'}
                               </p>
                           )}
                       </div>
                       <div className="border-t border-cyber-gray/20 pt-4 text-sm space-y-2">
                           <p><strong className="text-ghost-white font-medium">Toplam Skor:</strong> <span className='font-mono'>{clan.totalScore.toLocaleString()}</span></p>
                           <p><strong className="text-ghost-white font-medium">Üye Sayısı:</strong> {clan.memberCount} / 50</p>
                           <p><strong className="text-ghost-white font-medium">Tecrübe:</strong> <span className='font-mono'>{clan.experience?.toLocaleString() || '0'}</span></p>
                           <div className="w-full bg-cyber-gray/20 rounded-full h-2">
                               <div 
                                   className="bg-electric-purple h-2 rounded-full" 
                                   style={{ width: `${((clan.experience || 0) % 1000) / 10}%` }}
                               ></div>
                           </div>
                           <p className="text-xs text-cyber-gray">Sonraki seviye: {1000 - ((clan.experience || 0) % 1000)} tecrübe puanı</p>
                       </div>
                       {/* Join/Leave button section */}
                       <div className="mt-auto border-t border-cyber-gray/20 pt-4">
                           {userProfile?.clanId === clan.id ? (
                               // User is a member - show leave button
                               <button onClick={() => {
                                   if (isLeader && clan.memberCount > 1) {
                                       triggerConfirmation(
                                           "Liderlik Devretmeden Ayrılamazsınız", 
                                           "Klandan ayrılmadan önce liderliği başka bir üyeye devretmelisiniz. Liderlik devretmek için üyeler listesinden bir üyeye tıklayın.", 
                                           () => {}
                                       );
                                   } else {
                                       triggerConfirmation(
                                           isLeader && clan.memberCount === 1 ? "Klanı Dağıt" : "Klandan Ayrıl",
                                           isLeader && clan.memberCount === 1 ? "Bu işlem geri alınamaz. Klan, kalıcı olarak silinecektir. Emin misin?" : "Bu işlem geri alınamaz. Emin misin?",
                                           isLeader && clan.memberCount === 1 ? performDeleteClan : performLeaveClan
                                       );
                                   }
                               }} className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-red-900 disabled:cursor-not-allowed" disabled={isLeader && clan.memberCount > 1 && clan.leaderId === user?.uid}>
                                   <LogOut size={16} />
                                   {isLeader && clan.memberCount === 1 ? 'Klanı Dağıt' : 'Klandan Ayrıl'}
                               </button>
                           ) : (
                               // User is not a member - show join button if applicable
                               <>
                                   {clan.joinType === 'open' ? (
                                       // Open clan - direct join
                                       <button 
                                           onClick={() => {
                                               if (!user || !userProfile) {
                                                   toast.error('Klana katılmak için giriş yapmalısınız.');
                                                   return;
                                               }
                                               if (userProfile.clanId) {
                                                   toast.error('Zaten bir klanda bulunuyorsunuz.');
                                                   return;
                                               }
                                               triggerConfirmation(
                                                   "Klana Katıl",
                                                   "Bu klan herkese açıktır. Katılmak istediğinizden emin misiniz?",
                                                   () => handleDirectJoin(clan.id)
                                               );
                                           }}
                                           className="w-full flex justify-center items-center gap-2 bg-electric-purple hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
                                           disabled={!user || !userProfile || !!userProfile.clanId}
                                       >
                                           <UserPlus size={16} />
                                           Klana Katıl
                                       </button>
                                   ) : clan.joinType === 'invite-only' ? (
                                       // Invite-only clan - request to join
                                       <button 
                                           onClick={requestToJoinClan}
                                           disabled={isSubmitting || !user || !userProfile || !!userProfile.clanId}
                                           className="w-full flex justify-center items-center gap-2 bg-electric-purple hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                       >
                                           {isSubmitting ? (
                                               <>
                                                   <Loader2 size={16} className="animate-spin" />
                                                   İstek Gönderiliyor...
                                               </>
                                           ) : (
                                               <>
                                                   <Mail size={16} />
                                                   Katılma İsteği Gönder
                                               </>
                                           )}
                                       </button>
                                   ) : (
                                       // Closed clan - no joining
                                       <button 
                                           disabled 
                                           className="w-full flex justify-center items-center gap-2 bg-gray-600 text-gray-400 font-bold py-2 px-4 rounded cursor-not-allowed"
                                       >
                                           <Lock size={16} />
                                           Klan Kapalı
                                       </button>
                                   )}
                               </>
                           )}
                       </div>
                    </motion.div>
                    <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-dark-gray/60 p-6 rounded-lg border border-cyber-gray/20">
                        <div className="flex border-b border-cyber-gray/20 mb-6">
                            <button 
                                onClick={() => setActiveTab('members')} 
                                className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'members' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
                            >
                                Üyeler ({members.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('activity')} 
                                className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'activity' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
                            >
                                <BookOpen size={16}/>Aktivite
                            </button>
                            <button 
                                onClick={() => setActiveTab('chat')} 
                                className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
                            >
                                <MessageCircle size={16}/>Sohbet
                            </button>
                            {isLeader && (
                                <button 
                                    onClick={() => setActiveTab('settings')} 
                                    className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
                                >
                                    <Settings size={16}/>Ayarlar
                                </button>
                            )}
                            {/* Show join requests tab for leaders and officers */}
                            {(isLeader || userProfile?.clanRole === 'officer') && clan?.joinType === 'invite-only' && (
                                <button 
                                    onClick={() => setActiveTab('requests')} 
                                    className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}
                                >
                                    <Mail size={16}/>İstekler
                                    {joinRequests.length > 0 && (
                                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                            {joinRequests.length}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {activeTab === 'members' && (<div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 -mr-2"><AnimatePresence>{members.map(member => ( <MemberListItem key={member.uid} member={member} currentUserRole={userProfile?.clanRole} isCurrentUser={member.uid === user?.uid} onManage={(uid, action) => triggerConfirmation("Emin misin?", `Bu eylemi gerçekleştirmek üzeresin. Onaylıyor musun?`, () => performClanManagement(uid, action))} onTransferLeadership={performLeaderTransfer} /> ))}</AnimatePresence></div>)}
                                {activeTab === 'activity' && (<div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2 -mr-2">{activityLog.length > 0 ? activityLog.map(log => <ActivityLogItem key={log.id} log={log} />) : <p className="text-center text-cyber-gray p-8">Henüz kaydedilmiş bir aktivite yok.</p>}</div>)}
                                {activeTab === 'chat' && (<div className="h-[500px]"><ClanChat clanId={clanId!} /></div>)}
                                {activeTab === 'requests' && (isLeader || userProfile?.clanRole === 'officer') && (
                                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 -mr-2">
                                        {joinRequests.length > 0 ? (
                                            joinRequests.map(request => (
                                                <JoinRequestItem
                                                    key={request.id}
                                                    request={request}
                                                    onAccept={acceptJoinRequest}
                                                    onReject={rejectJoinRequest}
                                                    isSubmitting={isSubmitting}
                                                />
                                            ))
                                        ) : (
                                            <p className="text-center text-cyber-gray p-8">Henüz bekleyen katılma isteği yok.</p>
                                        )}
                                    </div>
                                )}
                                {activeTab === 'settings' && isLeader && (
                                    <div className="space-y-6 text-ghost-white">
                                        <div>
                                            <h3 className="text-xl font-bold mb-3">Katılım Ayarları</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[{ type: 'open', title: 'Herkese Açık', icon: <Unlock/> }, { type: 'invite-only', title: 'Sadece Davetle', icon: <Mail/> }, { type: 'closed', title: 'Kapalı', icon: <Lock/> }].map(s => (<button key={s.type} onClick={() => handleChangeJoinType(s.type as any)} className={`p-4 rounded-lg border-2 flex flex-col items-center text-center gap-2 transition-all duration-200 ${clan.joinType === s.type ? 'bg-electric-purple/20 border-electric-purple shadow-lg scale-105' : 'bg-dark-gray border-cyber-gray/30 hover:border-electric-purple/50'}`}>{s.icon}<span className="font-semibold">{s.title}</span></button>))}</div>
                                        </div>
                                    
                                    <div>
                                        <h3 className="text-xl font-bold mb-3">Klan Açıklaması</h3>
                                        <p className="text-cyber-gray text-sm mb-4">
                                            Klanınızın amacını ve ruhunu yansıtan kısa bir açıklama yazın.
                                        </p>
                                        {isEditingDescription ? (
                                            <div className="space-y-3">
                                                <textarea
                                                    value={editedDescription}
                                                    onChange={(e) => setEditedDescription(e.target.value)}
                                                    placeholder="Klanınızın amacını ve ruhunu yansıtan kısa bir yazı..."
                                                    className="w-full p-3 bg-black/20 border-2 border-cyber-gray/30 rounded-md text-white focus:outline-none focus:border-electric-purple resize-none"
                                                    maxLength={500}
                                                    rows={4}
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
                                                    >
                                                        İptal
                                                    </button>
                                                    <button
                                                        onClick={saveDescription}
                                                        className="px-4 py-2 bg-electric-purple hover:bg-purple-700 rounded-md"
                                                    >
                                                        Kaydet
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="bg-black/20 p-3 rounded-md min-h-[100px]">
                                                    {clan.bio || 'Henüz açıklama eklenmemiş.'}
                                                </p>
                                                <button
                                                    onClick={startEditingDescription}
                                                    className="px-4 py-2 bg-electric-purple hover:bg-purple-700 rounded-md"
                                                >
                                                    Açıklamayı Düzenle
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                     <div className='border-t border-cyber-gray/20 pt-6'><h3 className='text-xl font-bold text-red-400 mb-2'>Tehlikeli Bölge</h3><p className='text-cyber-gray text-sm mb-4'>Bu işlem geri alınamaz. Klan, kalıcı olarak silinecektir.</p><button onClick={() => triggerConfirmation("Klanı Dağıtmak Üzeresin!", "Bu işlem GERİ ALINAMAZ. Klan silinecek. Kesinlikle emin misin?", performDeleteClan)} className='px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 font-semibold transition-colors'>Klanı Kalıcı Olarak Sil</button></div>
                                </div>
                            )}
                        </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>
        </>
    );
};

export default ClanDetailPage;