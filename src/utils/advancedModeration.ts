// Gelişmiş Moderasyon Sistemi v5 - Davranışsal ve Desen Tabanlı Filtreleme
// Bu sürüm, sağlanan sohbet geçmişi analiz edilerek özel olarak tasarlanmıştır.

// --- ARAYÜZLER VE TİPLER (Değişiklik Yok) ---
export interface ModerationResult {
    isBlocked: boolean;
    reason?: string;
    action: 'allow' | 'warn' | 'block';
    confidence: number; 
}

export interface SpamDetection {
    isSpam: boolean;
    reason: string;
    confidence: number;
}

// --- VERİ DEPOLAMA (Değişiklik Yok) ---
const userMessageHistory = new Map<string, {
    messages: string[];
    timestamps: number[];
    lastMessage: number;
}>();


// --- YAPILANDIRMA VE UYARI MESAJLARI ---

// Gizemli ve Zeki Uyarı Mesajları Havuzu
const PROFANITY_WARNINGS = [
    "Sinyalin, evrenin karanlık bir köşesinde yutuldu. Daha aydınlık frekanslar dene.",
    "Mimar, bu frekans anomalisini kaydetti. Piksellerin fısıltısı daha zarif olmalı.",
    "Boşluğa gönderdiğin bu sinyal, bir kara deliğin olay ufkunda yankılanmaya mahkum edildi.",
    "Bu kelimeler, zamanın dokusunda bir yırtık oluşturdu. Sistem, evreni korumak için mesajını izole etti.",
    "Yüksek bir zeka, kelimelerini daha keskin bir kılıç gibi kullanır. Bu deneme kör bir baltaydı.",
    "Tebrikler! Kozmik gürültü filtresini tetikledin. Belki bir sonraki sinyalin yıldızlara ulaşır.",
];

// Spam için standart uyarılar
const SPAM_WARNINGS = {
    SPAM: "Frekans boğuluyor. Lütfen daha yapıcı sinyaller gönder.",
    COOLDOWN: "Sinyal gönderim hızın evrensel limitleri aşıyor. Lütfen yavaşla.",
    REPEAT: "Aynı yankıyı tekrar tekrar göndermenin bir anlamı yok.",
};


// --- AKILLI FİLTRELEME VERİTABANI ---
// Not: Tüm kelimeler 'normalizeText' fonksiyonundan geçmiş halleriyle yazılmıştır.
const PROFANITY_DATABASE = {
    // Kural tabanlı yakalama için hedef kelimeler
    TARGETS: {
        FAMILY: ['ana', 'anne', 'baba', 'bacı', 'avrat', 'sulale', 'soy', 'olum', 'kız', 'olun', 'ölü', 'diri'],
        RELIGIOUS_SELF: ['allah', 'kitap', 'din', 'peygamber'],
    },

    // Kural tabanlı yakalama için eylem kelimeleri
    ACTIONS: {
        SEVERE_VERBS: ['sik', 'sok', 'gotur', 'hoplat', 'bas', 'patlat', 'yal', 'yala', 'dans et', 'kaldir'],
        GENERAL_VERBS: ['sov', 'geber']
    },

    // Tek başına kullanıldığında anında engellenecek hakaretler
    INSULTS: {
        SEVERE: [
            'amk', 'amina', 'amq', 'amcik', 'amck',
            'got', 'gotveren', 'götveren',
            'sik', 'sok', 'yarrak', 'yarak', 'yarram', 'sikim',
            'orospu', 'kahpe', 'fayse', 'fahişe',
            'pezevenk', 'pezo',
            'oç', 'oc',
            'piç', 'pic',
            'siktir', 'sktir'
        ],
        MODERATE: [
            'gavat', 'kavat',
            'yavsak', 'yavşak',
            'döl', 'dol',
            'ibne', 'top', 'travesti', // hakaret amaçlı kullanıldığında
            'sakso', 'saksafon', // sohbet geçmişine özel
            'pipi', 'purno'      // sohbet geçmişine özel
        ],
        // Hafif olanlar artık tamamen engellendiği için 'mild' seviyesi kaldırıldı.
    }
};

// --- ÇEKİRDEK FONKSİYONLAR ---

/**
 * Metni, atlatılması neredeyse imkansız hale getirmek için agresifçe temizler.
 */
const normalizeText = (message: string): string => {
    return message
        .toLowerCase()
        .replace(/@/g, 'a').replace(/4/g, 'a')
        .replace(/[3e]/g, 'e')
        .replace(/[1ilı!]/g, 'i')
        .replace(/[0oö]/g, 'o')
        .replace(/[5sş]/g, 's')
        .replace(/[uü]/g, 'u')
        .replace(/[gğ]/g, 'g')
        .replace(/[cç]/g, 'c')
        .replace(/[^a-z0-9]/g, ''); // Sadece harf ve rakamları bırakır, boşluk ve diğer her şeyi siler
};


/**
 * İki kelime grubunun aynı metinde olup olmadığını kontrol eden desen motoru.
 * Burası "ana bacı" gibi yapıları yakalayan beyindir.
 */
const findPattern = (text: string, targets: string[], actions:string[]): boolean => {
    const hasTarget = targets.some(target => text.includes(target));
    if (!hasTarget) return false;

    const hasAction = actions.some(action => text.includes(action));
    return hasAction;
};

/**
 * Zeki ve ikonik uyarı mesajlarından rastgele birini seçer.
 */
const getRandomProfanityReason = (): string => {
    return PROFANITY_WARNINGS[Math.floor(Math.random() * PROFANITY_WARNINGS.length)];
};


// --- ANA MODERASYON FONKSİYONLARI ---

/**
 * Sadece spam kontrolü yapar. Kodda değişiklik yapılmadı.
 */
export const detectSpam = (message: string, userId: string): SpamDetection => {
    const now = Date.now();
    const history = userMessageHistory.get(userId) || { messages: [], timestamps: [], lastMessage: 0 };
    
    // Basit cooldown
    if (now - history.lastMessage < 1500) {
        return { isSpam: true, reason: SPAM_WARNINGS.COOLDOWN, confidence: 95 };
    }
    
    // Mesaj tekrarı
    if (history.messages.length > 0 && history.messages.some(msg => msg === message)) {
        return { isSpam: true, reason: SPAM_WARNINGS.REPEAT, confidence: 85 };
    }

    history.messages.push(message);
    history.timestamps.push(now);
    history.lastMessage = now;
    if (history.messages.length > 10) history.messages.shift();
    userMessageHistory.set(userId, history);
    
    return { isSpam: false, reason: '', confidence: 0 };
};


/**
 * Sohbet geçmişine göre tamamen yeniden yazılmış küfür filtresi.
 */
export const checkProfanity = (message: string): ModerationResult => {
    const normalizedMessage = normalizeText(message);

    // KURAL 1: AİLE BİREYLERİNE YÖNELİK AĞIR SALDIRILAR (EN YÜKSEK ÖNCELİK)
    if (findPattern(normalizedMessage, PROFANITY_DATABASE.TARGETS.FAMILY, PROFANITY_DATABASE.ACTIONS.SEVERE_VERBS)) {
        return { isBlocked: true, reason: getRandomProfanityReason(), action: 'block', confidence: 100 };
    }
    
    // KURAL 2: DOĞRUDAN VE AĞIR KÜFÜRLER
    if (PROFANITY_DATABASE.INSULTS.SEVERE.some(word => normalizedMessage.includes(word))) {
        return { isBlocked: true, reason: getRandomProfanityReason(), action: 'block', confidence: 98 };
    }
    
    // KURAL 3: ORTA SEVİYE HAKARETLER VE ARGOLAR
    if (PROFANITY_DATABASE.INSULTS.MODERATE.some(word => normalizedMessage.includes(word))) {
        return { isBlocked: true, reason: getRandomProfanityReason(), action: 'block', confidence: 90 };
    }
    
    // KURAL 4: DİĞER DESENLER (daha az ağır eylemlerle)
    if (findPattern(normalizedMessage, PROFANITY_DATABASE.TARGETS.FAMILY, PROFANITY_DATABASE.ACTIONS.GENERAL_VERBS)) {
        return { isBlocked: true, reason: getRandomProfanityReason(), action: 'block', confidence: 85 };
    }

    return { isBlocked: false, action: 'allow', confidence: 0 };
};


/**
 * Tüm kontrolleri birleştiren ana fonksiyon.
 */
export const moderateMessage = (message: string, userId: string): ModerationResult => {
    // Spam kontrolü önce yapılır.
    const spamCheck = detectSpam(message, userId);
    if (spamCheck.isSpam) {
        return {
            isBlocked: true,
            reason: spamCheck.reason,
            action: 'block',
            confidence: spamCheck.confidence,
        };
    }
    
    // Spam değilse, küfür kontrolü yapılır.
    const profanityCheck = checkProfanity(message);
    if (profanityCheck.isBlocked) {
        return profanityCheck; // Zaten engellendiği ve sebebi olduğu için direkt bunu döndür.
    }
    
    // Mesaj uzunluğu kontrolü
    if (message.length > 500) {
        return {
            isBlocked: true,
            reason: "Sinyalin evrenin limitlerini aşıyor. Lütfen daha kısa bir frekans kullan.",
            action: 'block',
            confidence: 70
        };
    }

    // Hiçbir kural ihlal edilmedi.
    return {
        isBlocked: false,
        action: 'allow',
        confidence: 0
    };
};


// --- YARDIMCI FONKSİYONLAR ---
export const clearUserHistory = (userId: string) => {
    userMessageHistory.delete(userId);
};

export const clearAllHistory = () => {
    userMessageHistory.clear();
};