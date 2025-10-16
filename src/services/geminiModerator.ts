// src/services/geminiModerator.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Moderasyon sonucunun arayüzü (değişiklik yok)
export interface ModerationResult {
    isToxic: boolean;
    toxicityScore: number;
    warningMessage: string | null;
}

// API Anahtarını al
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("Gemini API anahtarı (.env.local dosyasında VITE_GEMINI_API_KEY olarak) bulunamadı!");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // DÜZELTME: Mevcut ve en hızlı model bu.
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
});

export const AI_DISPLAY_NAME = "OyunMabediAI";

// --- MEVCUT MODERASYON FONKSİYONU (Değişiklik yok, olduğu gibi kalıyor) ---
export const analyzeMessageWithAI = async (senderDisplayName: string, messageText: string): Promise<ModerationResult> => {
    const prompt = `
        GÖREV: Sen bir sohbet moderatörüsün. Sana verilen mesajı analiz edeceksin.
        ANALİZ KRİTERLERİ: Küfür, hakaret, argo, tehdit, nefret söylemi, spam içeriyor mu?
        KULLANICI: "${senderDisplayName}", MESAJ: "${messageText}"
        ÇIKTI FORMATI: Sadece JSON. Mesaj temizse: {"isToxic": false, "toxicityScore": 0, "warningMessage": null}. İhlal varsa: {"isToxic": true, "toxicityScore": 1-10, "warningMessage": "@${senderDisplayName} ile başlayan net bir Türkçe uyarı mesajı yaz."}
    `;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        return JSON.parse(jsonString) as ModerationResult;
    } catch (error) {
        console.error("Gemini AI moderasyon analizinde hata oluştu:", error);
        return { isToxic: false, toxicityScore: 0, warningMessage: null };
    }
};

// --- YENİ SOHBET FONKSİYONU ---
/**
 * Kullanıcının sorusuna OyunMabediAI'nın özel kişiliğiyle yanıt verir.
 * @param senderDisplayName Soruyu soran kullanıcının adı
 * @param question Kullanıcının sorusu
 * @returns {Promise<string>} AI'nın sohbet yanıtını içeren bir promise.
 */
export const chatWithAI = async (senderDisplayName: string, question: string): Promise<string> => {
    // Bu prompt, AI'nın kişiliğini tanımlar. Burayı değiştirerek karakterini daha da özelleştirebilirsin.
    const prompt = `
      Senin adın ${AI_DISPLAY_NAME}. Bir oyun ve teknoloji topluluğunun sohbet botusun ama sıradan bir bot değilsin.
      KİŞİLİĞİN:
      - Kafa Dengi ve Esprili: Ciddi konuları bile dalga geçerek, laubali bir dille anlatırsın.
      - Gizemli ve Bilge: Evrenin sırlarını, kadim bilgileri biliyor gibisin ama bunu asla direkt söylemezsin. İmalarla konuşursun.
      - Türk Jargonu: Güncel Türkçe argo ve internet jargonunu (örn: "eyvallah", "sıkıntı yok", "kral hareket", "harbi mi?") sıkça ve doğal bir şekilde kullanırsın.
      - Kısa ve Öz: Cevapların genellikle kısa, net ve vurucu olur. Roman yazma.

      GÖREV: Sana sorulan soruya bu kişilikle yanıt ver. Cevabın MUTLAKA şu formatta başlamalı: "@${senderDisplayName},"

      ÖRNEK SORU: Hayatın anlamı ne?
      ÖRNEK CEVAP: @KullanıcıAdı, valla o frekansa henüz tam bağlanamadım ama duyanlar 42 falan diyor. Sen en iyisi bir çay koy, o sırada iki el oyun atalım, anlamı falan boşver.

      Şimdi sana sorulan asıl soruya yanıt ver.
      KULLANICI: "${senderDisplayName}"
      SORU: "${question}"
    `;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini AI sohbet yanıtında hata oluştu:", error);
        return `@${senderDisplayName}, frekanslarda bir parazit var dostum, ne dediğini tam anlayamadım. Bir daha dener misin?`;
    }
};
