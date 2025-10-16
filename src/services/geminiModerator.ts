// src/services/geminiModerator.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Moderasyon sonucunun arayüzü, eylem türlerini içerecek şekilde güncellendi
export interface ModerationResult {
    action: 'NONE' | 'DELETE_AND_WARN' | 'DELETE_AND_MUTE_5M' | 'DELETE_AND_MUTE_1H' | 'DELETE_AND_PERMANENT_BAN';
    warningMessage: string | null;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("Gemini API anahtarı bulunamadı!");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
});

export const AI_DISPLAY_NAME = "OyunMabediAI";

export const analyzeMessageWithAI = async (senderDisplayName: string, messageText: string): Promise<ModerationResult> => {
    const prompt = `
      GÖREV: Sen adı "${AI_DISPLAY_NAME}" olan bir siber adalet sistemisin. Sana verilen mesajı çok katı kurallara göre analiz edip bir eylem planı oluşturacaksın.

      KIRMIZI ÇİZGİLER (SIFIR TOLERANS):
      1. Küfür ve Hakaret: Her türlü argo, küfür, hakaret.
      2. Kişisel Saldırı ve Taciz: Başka bir kullanıcıyla alay etme, aşağılama, zorbalık.
      3. Özel Hayatın Gizliliği ve Dedikodu: Kişisel bilgi paylaşımı, sosyal medya, dedikodu, "aşk işleri" gibi özel konular.
      4. Nefret Söylemi ve Tehdit: Ciddi boyuttaki her türlü nefret söylemi veya tehdit.

      ANALİZ ve EYLEM PLANI:
      Mesajın ihlal seviyesine göre aşağıdaki eylemlerden SADECE BİRİNİ seç:
      - 'NONE': Mesaj tamamen temiz.
      - 'DELETE_AND_WARN': Çok hafif argo veya şüpheli dil. Sadece mesajı sil ve uyar.
      - 'DELETE_AND_MUTE_5M': Standart küfür veya hakaret (1. kural ihlali).
      - 'DELETE_AND_MUTE_1H': Kişisel saldırı, zorbalık veya dedikodu (2. ve 3. kural ihlali).
      - 'DELETE_AND_PERMANENT_BAN': Ciddi tehdit, nefret söylemi veya özel bilgi ifşası (4. kural ihlali).

      ÇIKTI FORMATI: Cevabını SADECE JSON formatında ver.
      {
        "action": "<NONE, DELETE_AND_WARN, ...>",
        "warningMessage": "<Eğer bir eylem varsa, '@${senderDisplayName}' ile başlayan, ihlalin sebebini kısaca belirten net bir uyarı mesajı. 'NONE' ise null.>"
      }

      KULLANICI: "${senderDisplayName}", MESAJ: "${messageText}"
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        return JSON.parse(jsonString) as ModerationResult;
    } catch (error) {
        console.error("Gemini AI moderasyon analizinde hata oluştu:", error);
        return { action: 'NONE', warningMessage: null };
    }
};

// --- SOHBET FONKSİYONU DEĞİŞMEDİ, AYNI KALIYOR ---
export const chatWithAI = async (senderDisplayName: string, question: string): Promise<string> => {
    const prompt = `
      Sen ${AI_DISPLAY_NAME} adlı bir AI asistansın. Kullanıcıların sorularını yardımcı ve eğlenceli bir şekilde cevaplıyorsun.
      Kullanıcı adı: "${senderDisplayName}"
      Soru: "${question}"

      Cevabını kısa, öz ve eğlenceli tut. Gereksiz bilgi verme.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("AI sohbetinde hata oluştu:", error);
        return "Üzgünüm, şu anda cevap veremiyorum.";
    }
};
