// Gelişmiş Moderasyon Sistemi
// Otomatik spam koruması, kelime filtreleme ve davranış analizi

export interface ModerationResult {
    isBlocked: boolean;
    reason?: string;
    action: 'allow' | 'warn' | 'block' | 'mute';
    confidence: number; // 0-100 arası güven skoru
}

export interface SpamDetection {
    isSpam: boolean;
    reason: string;
    confidence: number;
}

// Spam tespiti için kullanıcı geçmişi
const userMessageHistory = new Map<string, {
    messages: string[];
    timestamps: number[];
    lastMessage: number;
}>();

// Spam koruması ayarları
const SPAM_CONFIG = {
    MAX_MESSAGES_PER_MINUTE: 5,
    MAX_SIMILAR_MESSAGES: 3,
    MAX_CAPS_RATIO: 0.7,
    MAX_REPEAT_CHARS: 5,
    COOLDOWN_SECONDS: 2,
    SIMILARITY_THRESHOLD: 0.8
};

// Gelişmiş kelime filtreleme
const PROFANITY_LEVELS = {
    MILD: ['aptal', 'salak', 'gerizekalı'],
    MODERATE: ['amk', 'aq', 'oç'],
    SEVERE: ['sik', 'sikerim', 'yarak', 'yarrak', 'göt']
};

const WARNING_MESSAGES = {
    SPAM: "Mesajınız spam olarak algılandı. Lütfen daha yapıcı olun.",
    PROFANITY: "Kibar bir dil kullanmanızı rica ederiz.",
    CAPS: "Büyük harf kullanımını azaltın.",
    REPEAT: "Aynı mesajı tekrar göndermeyin.",
    COOLDOWN: "Çok hızlı mesaj gönderiyorsunuz. Lütfen bekleyin."
};

// Spam tespiti
export const detectSpam = (message: string, userId: string): SpamDetection => {
    const now = Date.now();
    const userHistory = userMessageHistory.get(userId) || { messages: [], timestamps: [], lastMessage: 0 };
    
    // Cooldown kontrolü
    if (now - userHistory.lastMessage < SPAM_CONFIG.COOLDOWN_SECONDS * 1000) {
        return {
            isSpam: true,
            reason: WARNING_MESSAGES.COOLDOWN,
            confidence: 95
        };
    }
    
    // Son 1 dakikadaki mesaj sayısı
    const oneMinuteAgo = now - 60000;
    const recentMessages = userHistory.timestamps.filter(t => t > oneMinuteAgo);
    
    if (recentMessages.length >= SPAM_CONFIG.MAX_MESSAGES_PER_MINUTE) {
        return {
            isSpam: true,
            reason: WARNING_MESSAGES.SPAM,
            confidence: 90
        };
    }
    
    // Büyük harf oranı kontrolü
    const capsRatio = (message.match(/[A-ZĞÜŞİÖÇ]/g) || []).length / message.length;
    if (capsRatio > SPAM_CONFIG.MAX_CAPS_RATIO && message.length > 10) {
        return {
            isSpam: true,
            reason: WARNING_MESSAGES.CAPS,
            confidence: 70
        };
    }
    
    // Tekrarlanan karakter kontrolü
    const repeatChars = message.match(/(.)\1{4,}/g);
    if (repeatChars) {
        return {
            isSpam: true,
            reason: WARNING_MESSAGES.REPEAT,
            confidence: 80
        };
    }
    
    // Benzer mesaj kontrolü
    const similarity = calculateSimilarity(message, userHistory.messages);
    if (similarity > SPAM_CONFIG.SIMILARITY_THRESHOLD) {
        return {
            isSpam: true,
            reason: WARNING_MESSAGES.REPEAT,
            confidence: 85
        };
    }
    
    // Geçmişi güncelle
    userHistory.messages.push(message);
    userHistory.timestamps.push(now);
    userHistory.lastMessage = now;
    
    // Son 10 mesajı tut
    if (userHistory.messages.length > 10) {
        userHistory.messages = userHistory.messages.slice(-10);
        userHistory.timestamps = userHistory.timestamps.slice(-10);
    }
    
    userMessageHistory.set(userId, userHistory);
    
    return {
        isSpam: false,
        reason: '',
        confidence: 0
    };
};

// Mesaj benzerliği hesaplama (Levenshtein distance)
const calculateSimilarity = (message1: string, messages: string[]): number => {
    if (messages.length === 0) return 0;
    
    const similarities = messages.map(msg => {
        const distance = levenshteinDistance(message1.toLowerCase(), msg.toLowerCase());
        const maxLength = Math.max(message1.length, msg.length);
        return 1 - (distance / maxLength);
    });
    
    return Math.max(...similarities);
};

const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + indicator
            );
        }
    }
    
    return matrix[str2.length][str1.length];
};

// Gelişmiş kelime filtreleme
export const checkProfanity = (message: string): ModerationResult => {
    const lowerMessage = message.toLowerCase();
    
    // Ağır küfür kontrolü
    for (const word of PROFANITY_LEVELS.SEVERE) {
        if (lowerMessage.includes(word)) {
            return {
                isBlocked: true,
                reason: "Ağır küfür kullanımı tespit edildi.",
                action: 'block',
                confidence: 95
            };
        }
    }
    
    // Orta seviye küfür kontrolü
    for (const word of PROFANITY_LEVELS.MODERATE) {
        if (lowerMessage.includes(word)) {
            return {
                isBlocked: true,
                reason: WARNING_MESSAGES.PROFANITY,
                action: 'warn',
                confidence: 80
            };
        }
    }
    
    // Hafif küfür kontrolü
    for (const word of PROFANITY_LEVELS.MILD) {
        if (lowerMessage.includes(word)) {
            return {
                isBlocked: false,
                reason: WARNING_MESSAGES.PROFANITY,
                action: 'warn',
                confidence: 60
            };
        }
    }
    
    return {
        isBlocked: false,
        action: 'allow',
        confidence: 0
    };
};

// Ana moderasyon fonksiyonu
export const moderateMessage = (message: string, userId: string): ModerationResult => {
    // Spam kontrolü
    const spamCheck = detectSpam(message, userId);
    if (spamCheck.isSpam) {
        return {
            isBlocked: true,
            reason: spamCheck.reason,
            action: 'block',
            confidence: spamCheck.confidence
        };
    }
    
    // Küfür kontrolü
    const profanityCheck = checkProfanity(message);
    if (profanityCheck.isBlocked) {
        return profanityCheck;
    }
    
    // Mesaj uzunluğu kontrolü
    if (message.length > 500) {
        return {
            isBlocked: true,
            reason: "Mesaj çok uzun. Lütfen kısaltın.",
            action: 'warn',
            confidence: 70
        };
    }
    
    return {
        isBlocked: false,
        action: 'allow',
        confidence: 0
    };
};

// Kullanıcı geçmişini temizle
export const clearUserHistory = (userId: string) => {
    userMessageHistory.delete(userId);
};

// Tüm geçmişi temizle
export const clearAllHistory = () => {
    userMessageHistory.clear();
};
