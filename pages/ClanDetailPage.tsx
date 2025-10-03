import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, query, collection, where, documentId, getDocs, writeBatch, increment, arrayRemove, updateDoc, deleteDoc, deleteField, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth } from '../src/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Crown, Shield, Users, LogOut, ShieldAlert, Settings, Lock, Unlock, Mail, ArrowUp, ArrowDown, UserMinus, Loader2, UserPlus, ChevronsUp, ChevronsDown, BookOpen } from 'lucide-react';
import { getClanIconComponent } from '../components/ClanIcons';

// =============================================================================
// TYPESCRIPT VERİ TİPLERİ
// =============================================================================
interface ClanMember { uid: string; displayName: string; avatarUrl: string; clanRole: 'leader' | 'officer' | 'member'; score: number; }
interface ClanData { id: string; name: string; emblem: string; bio?: string; totalScore: number; memberCount: number; level: number; members: string[]; leaderId: string; joinType: 'open' | 'invite-only' | 'closed'; }
type LogType = 'join' | 'leave' | 'kick' | 'promote' | 'demote' | 'settings_change' | 'clan_disbanded';
interface ActivityLog { id: string; type: LogType; actorName: string; targetName?: string; details?: any; timestamp: Date; }

// =============================================================================
// YARDIMCI BİLEŞENLER
// =============================================================================
const ConfirmationModal: React.FC<any> = ({ isOpen, title, message, onConfirm, onCancel, isSubmitting, confirmText = "Evet, Onayla", cancelText = "Vazgeç" }) => { if (!isOpen) return null; return ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-dark-gray p-8 rounded-lg w-full max-w-md border border-cyber-gray/30 relative text-center shadow-lg"><ShieldAlert size={48} className="mx-auto text-yellow-400 mb-4" /><h2 className="text-2xl font-bold mb-2 text-ghost-white">{title}</h2><p className="text-cyber-gray mb-6">{message}</p><div className="flex justify-center gap-4"><button onClick={onCancel} disabled={isSubmitting} className="px-6 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors disabled:opacity-50">{cancelText}</button><button onClick={onConfirm} disabled={isSubmitting} className="px-6 py-2 rounded-md font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isSubmitting && <Loader2 size={18} className="animate-spin" />}{confirmText}</button></div></motion.div></div>); };

const MemberListItem: React.FC<{ member: ClanMember; currentUserRole?: 'leader' | 'officer' | 'member'; onManage: (uid: string, action: 'promote' | 'demote' | 'kick') => void; isCurrentUser: boolean }> = ({ member, currentUserRole, onManage, isCurrentUser }) => {
    const canManage = useMemo(() => (currentUserRole === 'leader' && member.clanRole !== 'leader') || (currentUserRole === 'officer' && member.clanRole === 'member'), [currentUserRole, member.clanRole]);
    const roleMap = { leader: { icon: <Crown size={18} className="text-yellow-400"/>, name: "Lider", color: "text-yellow-400" }, officer: { icon: <Shield size={18} className="text-sky-400"/>, name: "Subay", color: "text-sky-400" }, member: { icon: <Users size={18} className="text-cyber-gray"/>, name: "Üye", color: "text-cyber-gray" } };
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
                    {currentUserRole === 'leader' && member.clanRole === 'member' && (<button onClick={() => onManage(member.uid, 'promote')} title="Subay Yap" className="p-2 rounded-md hover:bg-sky-500/20 text-sky-500 transition-colors"><ArrowUp size={18} /></button>)}
                    {currentUserRole === 'leader' && member.clanRole === 'officer' && (<button onClick={() => onManage(member.uid, 'demote')} title="Üyeliğe Düşür" className="p-2 rounded-md hover:bg-gray-500/20 text-gray-400 transition-colors"><ArrowDown size={18} /></button>)}
                    <button onClick={() => onManage(member.uid, 'kick')} title="Klandan At" className="p-2 rounded-md hover:bg-red-500/20 text-red-500 transition-colors"><UserMinus size={18} /></button>
                </div>
            )}
        </motion.div>
    );
};

const ActivityLogItem: React.FC<any> = ({ log }) => { const logInfo = useMemo(() => { const actor = <span className="font-bold text-ghost-white">{log.actorName}</span>; const target = <span className="font-semibold text-ghost-white/80">{log.targetName}</span>; switch (log.type) { case 'join': return { icon: <UserPlus className="text-green-400" />, message: <>{actor} klana katıldı.</> }; case 'leave': return { icon: <UserMinus className="text-orange-400" />, message: <>{actor} klandan ayrıldı.</> }; case 'kick': return { icon: <UserMinus className="text-red-500" />, message: <>{actor}, {target} adlı üyeyi klandan attı.</> }; case 'promote': return { icon: <ChevronsUp className="text-sky-400" />, message: <>{actor}, {target} adlı üyeyi Subay rütbesine yükseltti.</> }; case 'demote': return { icon: <ChevronsDown className="text-gray-400" />, message: <>{actor}, {target} adlı üyenin rütbesini Üye'ye düşürdü.</> }; case 'settings_change': return { icon: <Settings className="text-purple-400" />, message: <>{actor} katılım ayarını <span className="font-semibold text-ghost-white/80">{log.details.newType}</span> olarak değiştirdi.</> }; case 'clan_disbanded': return { icon: <ShieldAlert className="text-red-600" />, message: <>{actor} klanı dağıttı.</> }; default: return { icon: <BookOpen className="text-cyber-gray" />, message: "Bilinmeyen bir klan aktivitesi." }; } }, [log]); return ( <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-4 p-3 border-b border-cyber-gray/10 text-sm"><div className="flex-shrink-0 mt-1">{logInfo.icon}</div><div className="flex-grow"><p className="text-cyber-gray">{logInfo.message}</p><p className="text-xs text-cyber-gray/60 mt-1">{log.timestamp.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</p></div></motion.div> ); };
const PageLoader: React.FC = () => ( <div className="flex justify-center items-center h-full min-h-[60vh]"><Loader2 size={48} className="animate-spin text-electric-purple" /></div> );

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
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('members');
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (!clanId) {
            navigate('/clans');
            return;
        }
        fetchClanDetails(clanId);
    }, [clanId, navigate]);
    
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
                const roleOrder: Record<ClanMember['clanRole'], number> = { leader: 0, officer: 1, member: 2 };
                memberDetails.sort((a, b) => roleOrder[a.clanRole] - roleOrder[b.clanRole] || b.score - a.score);
                setMembers(memberDetails);
            } else {
                setMembers([]);
            }
            
            const logQuery = query(collection(db, 'clans', id, 'activityLog'), orderBy('timestamp', 'desc'), limit(50));
            const logSnapshot = await getDocs(logQuery);
            const logs = logSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp.toDate() } as ActivityLog));
            setActivityLog(logs);
        } catch (err) {
            toast.error('Klan bilgileri yüklenirken bir hata oluştu.');
            console.error("Fetch Clan Details Error:", err);
            navigate('/clans');
        } finally {
            if (!suppressLoading) setLoading(false);
        }
    }
    
    const isLeader = useMemo(() => userProfile?.clanId === clan?.id && userProfile.clanRole === 'leader', [userProfile, clan]);
    const closeModal = () => setModalState({ ...modalState, isOpen: false });
    const triggerConfirmation = (title: string, message: string, onConfirm: () => void) => setModalState({ isOpen: true, title, message, onConfirm });
    
    function logActivityAndRefreshUI(logData: Omit<ActivityLog, 'id' | 'timestamp'>) {
        if (!clan) return;
        addDoc(collection(db, 'clans', clan.id, 'activityLog'), { ...logData, timestamp: serverTimestamp() }).catch(err => console.error("Aktivite logu kaydedilirken hata:", err));
        const newLog: ActivityLog = { id: `local-${Date.now()}`, ...logData, timestamp: new Date() };
        setActivityLog(prevLogs => [newLog, ...prevLogs]);
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
                if (isLeader) throw new Error("Leader cannot leave.");
                batch.update(doc(db, 'clans', clan.id), { members: arrayRemove(user.uid), memberCount: increment(-1) });
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
                const newRole = action === 'promote' ? 'officer' : 'member';
                await updateDoc(doc(db, 'users', memberUid), { clanRole: newRole });
                setMembers(prev => prev.map(m => m.uid === memberUid ? { ...m, clanRole: newRole } : m));
            }
            
            logActivityAndRefreshUI({ type: logType, actorName: userProfile.displayName, targetName: targetMember.displayName });
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
        if (!clan || !isLeader || !userProfile) { toast.error("Bu işlemi yapmaya yetkiniz yok."); return; }
        setIsSubmitting(true);
        const toastId = toast.loading(`Klan dağıtılıyor... (${members.length} üye)`);
        try {
            logActivityAndRefreshUI({ type: 'clan_disbanded', actorName: userProfile.displayName });
            for (let i = 0; i < members.length; i += 499) {
                const chunk = members.slice(i, i + 499);
                const batch = writeBatch(db);
                chunk.forEach((member) => {
                    const userRef = doc(db, 'users', member.uid);
                    batch.update(userRef, { clanId: deleteField(), clanRole: deleteField() });
                });
                await batch.commit();
            }
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
                       <div><h3 className="font-semibold text-ghost-white mb-2">Hakkımızda</h3><p className="text-cyber-gray text-sm leading-relaxed">{clan.bio || 'Biyografi eklenmemiş.'}</p></div>
                       <div className="border-t border-cyber-gray/20 pt-4 text-sm space-y-2">
                           <p><strong className="text-ghost-white font-medium">Toplam Skor:</strong> <span className='font-mono'>{clan.totalScore.toLocaleString()}</span></p>
                           <p><strong className="text-ghost-white font-medium">Üye Sayısı:</strong> {clan.memberCount} / 50</p>
                       </div>
                       {userProfile?.clanId === clan.id && (
                           <div className="mt-auto border-t border-cyber-gray/20 pt-4">
                               <button onClick={() => triggerConfirmation(isLeader && clan.memberCount === 1 ? "Klanı Dağıt" : "Klandan Ayrıl", isLeader && clan.memberCount > 1 ? "Liderler klandan ayrılamaz. Önce liderliği devretmelisiniz." : "Bu işlem geri alınamaz. Emin misin?", isLeader && clan.memberCount > 1 ? ()=>{} : isLeader && clan.memberCount === 1 ? performDeleteClan : performLeaveClan)} className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-red-900 disabled:cursor-not-allowed" disabled={isLeader && clan.memberCount > 1}><LogOut size={16} />{isLeader && clan.memberCount === 1 ? 'Klanı Dağıt' : 'Klandan Ayrıl'}</button>
                           </div>
                       )}
                    </motion.div>
                    <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-dark-gray/60 p-6 rounded-lg border border-cyber-gray/20">
                        <div className="flex border-b border-cyber-gray/20 mb-6"><button onClick={() => setActiveTab('members')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'members' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}>Üyeler ({members.length})</button><button onClick={() => setActiveTab('activity')} className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'activity' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}><BookOpen size={16}/>Aktivite</button>{isLeader && <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'text-white border-b-2 border-electric-purple' : 'text-cyber-gray hover:text-white'}`}><Settings size={16}/>Ayarlar</button>}</div>
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {activeTab === 'members' && (<div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 -mr-2"><AnimatePresence>{members.map(member => ( <MemberListItem key={member.uid} member={member} currentUserRole={userProfile?.clanRole} isCurrentUser={member.uid === user?.uid} onManage={(uid, action) => triggerConfirmation("Emin misin?", `Bu eylemi gerçekleştirmek üzeresin. Onaylıyor musun?`, () => performClanManagement(uid, action))} /> ))}</AnimatePresence></div>)}
                                {activeTab === 'activity' && (<div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2 -mr-2">{activityLog.length > 0 ? activityLog.map(log => <ActivityLogItem key={log.id} log={log} />) : <p className="text-center text-cyber-gray p-8">Henüz kaydedilmiş bir aktivite yok.</p>}</div>)}
                                {activeTab === 'settings' && isLeader && (
                                    <div className="space-y-6 text-ghost-white">
                                        <div>
                                            <h3 className="text-xl font-bold mb-3">Katılım Ayarları</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[{ type: 'open', title: 'Herkese Açık', icon: <Unlock/> }, { type: 'invite-only', title: 'Sadece Davetle', icon: <Mail/> }, { type: 'closed', title: 'Kapalı', icon: <Lock/> }].map(s => (<button key={s.type} onClick={() => handleChangeJoinType(s.type as any)} className={`p-4 rounded-lg border-2 flex flex-col items-center text-center gap-2 transition-all duration-200 ${clan.joinType === s.type ? 'bg-electric-purple/20 border-electric-purple shadow-lg scale-105' : 'bg-dark-gray border-cyber-gray/30 hover:border-electric-purple/50'}`}>{s.icon}<span className="font-semibold">{s.title}</span></button>))}</div>
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