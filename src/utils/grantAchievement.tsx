// DOSYA: src/utils/grantAchievement.tsx

// === DOĞRU ADRESLER BURADA ===
import { db } from "../firebase";
import { getAchievementById } from "../../data/achievements";

import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Award } from 'lucide-react';

export const grantAchievement = async (userId: string, achievementId: string) => {
    const userRef = doc(db, 'users', userId);
    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (!userData.achievements || !userData.achievements.includes(achievementId)) {
                await updateDoc(userRef, {
                    achievements: arrayUnion(achievementId)
                });

                const achievementDetails = getAchievementById(achievementId);
                if (achievementDetails) {
                    toast.custom((t) => (
                         <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-dark-gray shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-electric-purple ring-opacity-5`}>
                           <div className="flex-1 w-0 p-4">
                             <div className="flex items-start">
                               <div className="flex-shrink-0 pt-0.5 text-yellow-400">
                                  <Award />
                               </div>
                               <div className="ml-3 flex-1">
                                 <p className="text-sm font-medium text-ghost-white">BAŞARIM AÇILDI!</p>
                                 <p className="mt-1 text-sm text-cyber-gray">{achievementDetails.name}</p>
                               </div>
                             </div>
                           </div>
                         </div>
                       ), { duration: 4000 });
                }
            }
        }
    } catch(error) {
        console.error("Başarım verilirken hata oluştu:", error);
    }
};