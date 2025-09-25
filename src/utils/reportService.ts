import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { UserReport, UserReportStats } from '../../types';

// Rapor oluştur
export const createReport = async (
  reportedUserId: string,
  reporterUserId: string,
  reason: string,
  messageId?: string
): Promise<string> => {
  try {
    const reportData: any = {
      reportedUserId,
      reporterUserId,
      reason,
      createdAt: serverTimestamp(),
      status: 'pending'
    };

    // messageId sadece varsa ekle
    if (messageId) {
      reportData.messageId = messageId;
    }

    const docRef = await addDoc(collection(db, 'user_reports'), reportData);

    // Rapor sayısını kontrol et ve gerekirse sustur
    await checkAndMuteUser(reportedUserId);

    return docRef.id;
  } catch (error) {
    console.error('Rapor oluşturulurken hata:', error);
    throw error;
  }
};

// Kullanıcının rapor sayısını kontrol et ve gerekirse sustur
export const checkAndMuteUser = async (userId: string): Promise<void> => {
  try {
    // Son 24 saatteki raporları say
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const reportsQuery = query(
      collection(db, 'user_reports'),
      where('reportedUserId', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(oneDayAgo)),
      where('status', '==', 'pending')
    );

    const reportsSnapshot = await getDocs(reportsQuery);
    const reportCount = reportsSnapshot.size;

    // 5 veya daha fazla rapor varsa kullanıcıyı sustur
    if (reportCount >= 5) {
      const muteUntil = new Date();
      muteUntil.setMinutes(muteUntil.getMinutes() + 10); // 10 dakika sustur

      // Kullanıcı dokümanını güncelle
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        mutedUntil: Timestamp.fromDate(muteUntil),
        muteReason: 'Çok fazla rapor alındı (5+ rapor)',
        lastMuteDate: serverTimestamp()
      });

      // Raporları "reviewed" olarak işaretle
      const batch = reportsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { status: 'reviewed' })
      );
      await Promise.all(batch);

      console.log(`Kullanıcı ${userId} 10 dakika susturuldu (${reportCount} rapor)`);
    }
  } catch (error) {
    console.error('Kullanıcı susturma kontrolünde hata:', error);
  }
};

// Kullanıcının rapor istatistiklerini al
export const getUserReportStats = async (userId: string): Promise<UserReportStats> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDocs(query(
      collection(db, 'users'),
      where('__name__', '==', userId)
    ));

    if (userSnap.empty) {
      return {
        userId,
        reportCount: 0,
        isMuted: false
      };
    }

    const userData = userSnap.docs[0].data();
    const isMuted = userData.mutedUntil && 
      userData.mutedUntil.toDate() > new Date();

    // Son 24 saatteki rapor sayısını al
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const reportsQuery = query(
      collection(db, 'user_reports'),
      where('reportedUserId', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(oneDayAgo))
    );

    const reportsSnapshot = await getDocs(reportsQuery);

    return {
      userId,
      reportCount: reportsSnapshot.size,
      lastReportDate: reportsSnapshot.docs.length > 0 ? 
        reportsSnapshot.docs[0].data().createdAt.toDate() : undefined,
      mutedUntil: userData.mutedUntil?.toDate(),
      isMuted
    };
  } catch (error) {
    console.error('Rapor istatistikleri alınırken hata:', error);
    return {
      userId,
      reportCount: 0,
      isMuted: false
    };
  }
};

// Kullanıcının daha önce bu kişiyi rapor edip etmediğini kontrol et
export const hasUserReportedBefore = async (
  reporterUserId: string,
  reportedUserId: string
): Promise<boolean> => {
  try {
    const reportsQuery = query(
      collection(db, 'user_reports'),
      where('reporterUserId', '==', reporterUserId),
      where('reportedUserId', '==', reportedUserId),
      where('status', '==', 'pending')
    );

    const reportsSnapshot = await getDocs(reportsQuery);
    return !reportsSnapshot.empty;
  } catch (error) {
    console.error('Rapor kontrolünde hata:', error);
    return false;
  }
};

// Rapor istatistiklerini al
export const getReportStatistics = async (): Promise<{
  totalReports: number;
  pendingReports: number;
  reviewedReports: number;
  resolvedReports: number;
  reportsLast24h: number;
  mostReportedUsers: Array<{ userId: string; userName: string; reportCount: number }>;
}> => {
  try {
    const reportsQuery = query(collection(db, 'user_reports'));
    const reportsSnapshot = await getDocs(reportsQuery);
    
    const reports = reportsSnapshot.docs.map(doc => doc.data());
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const reportsLast24h = reports.filter(report => 
      report.createdAt && report.createdAt.toDate() > oneDayAgo
    ).length;
    
    // En çok rapor edilen kullanıcıları bul
    const userReportCounts: { [userId: string]: number } = {};
    reports.forEach(report => {
      if (report.reportedUserId) {
        userReportCounts[report.reportedUserId] = (userReportCounts[report.reportedUserId] || 0) + 1;
      }
    });
    
    const mostReportedUsers = Object.entries(userReportCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, userName: 'Bilinmeyen', reportCount: count }));
    
    return {
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === 'pending').length,
      reviewedReports: reports.filter(r => r.status === 'reviewed').length,
      resolvedReports: reports.filter(r => r.status === 'resolved').length,
      reportsLast24h,
      mostReportedUsers
    };
  } catch (error) {
    console.error('Rapor istatistikleri alınırken hata:', error);
    return {
      totalReports: 0,
      pendingReports: 0,
      reviewedReports: 0,
      resolvedReports: 0,
      reportsLast24h: 0,
      mostReportedUsers: []
    };
  }
};

// Raporları filtrele
export const getFilteredReports = async (filters: {
  status?: 'pending' | 'reviewed' | 'resolved';
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}): Promise<UserReport[]> => {
  try {
    let reportsQuery = query(collection(db, 'user_reports'));
    
    if (filters.status) {
      reportsQuery = query(reportsQuery, where('status', '==', filters.status));
    }
    
    if (filters.dateFrom) {
      reportsQuery = query(reportsQuery, where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
    }
    
    if (filters.dateTo) {
      reportsQuery = query(reportsQuery, where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)));
    }
    
    reportsQuery = query(reportsQuery, orderBy('createdAt', 'desc'));
    
    if (filters.limit) {
      reportsQuery = query(reportsQuery, limit(filters.limit));
    }
    
    const reportsSnapshot = await getDocs(reportsQuery);
    return reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as UserReport[];
  } catch (error) {
    console.error('Filtrelenmiş raporlar alınırken hata:', error);
    return [];
  }
};
