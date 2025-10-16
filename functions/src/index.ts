/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import {onDocumentCreated} from "firebase-functions/firestore";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// === AI MODERASYON FONKSİYONU ===
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

// Firebase Admin SDK'sını başlat
initializeApp();
const db = getFirestore();

// Gemini API anahtarını environment değişkeninden al
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set!");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // DOĞRU VE HIZLI MODEL ADI
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
});

// Moderasyon kuyruğuna yeni belge eklendiğinde tetiklenir
export const moderateMessage = onDocumentCreated("moderation_queue/{docId}", async (event) => {
    console.log(`[DEBUG] Cloud Function triggered for docId: ${event.params.docId}`);
    const snapshot = event.data;
    if (!snapshot) {
        console.log(`[DEBUG] No data in moderation_queue document`);
        logger.error("No data in moderation_queue document");
        return;
    }

    const input = snapshot.data() as {
        senderUid: string;
        senderDisplayName: string;
        messageId: string;
        messageText: string;
    };

    console.log(`[DEBUG] Input data:`, input);
    logger.info(`[AI Moderation] Processing message from ${input.senderDisplayName}: "${input.messageText}"`);

    try {
        // --- GÜVENLİK 1: KULLANICI BİLGİLERİNİ ÇEK VE ADMİN KONTROLÜ YAP ---
        console.log(`[DEBUG] Checking user: ${input.senderUid}`);
        const userDocRef = db.collection('users').doc(input.senderUid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists || userDocSnap.data()?.role === 'admin') {
            console.log(`[DEBUG] User not found or is admin: ${input.senderDisplayName}`);
            logger.info(`[AI Moderation] Action cancelled: User not found or is admin (${input.senderDisplayName}).`);
            return; // Kullanıcı admin ise veya bulunamazsa HİÇBİR ŞEY YAPMA
        }

        // --- GÜVENLİK 2: YENİ, GELİŞMİŞ PROMPT ---
        console.log(`[DEBUG] Preparing Gemini prompt`);
        const prompt = `
            GÖREV: Sen adı "OyunMabediAI" olan bir siber adalet sistemisin. Sana verilen mesajı analiz edip, ciddiyetine göre bir eylem planı oluşturacaksın.

            KULLANICI: "${input.senderDisplayName}"
            MESAJ: "${input.messageText}"

            ANALİZ ve EYLEM PLANI:
            1. Mesajın toksikliğini, küfür, hakaret, nefret söylemi, spam ve tehdit içermesi durumunu 0 (tertemiz) ile 10 (aşırı derecede zararlı) arasında puanla.
            2. Bu puana göre aşağıdaki eylemlerden SADECE BİRİNİ seç:
               - Puan 0-3: Eylem Gerekmez (NONE)
               - Puan 4-6: Mesajı Sil ve Uyarı Gönder (DELETE_AND_WARN)
               - Puan 7-8: Mesajı Sil, Uyar ve 30 Dakika Sustur (MUTE_30M)
               - Puan 9: Mesajı Sil, Uyar ve 24 Saat Sustur (MUTE_24H)
               - Puan 10: Mesajı Sil, Uyar ve Kalıcı olarak Sohbete Erişimini Engelle (BAN)

            ÇIKTI FORMATI: Cevabını SADECE ve SADECE aşağıdaki JSON formatında ver. Başka hiçbir açıklama, metin veya işaretleme ekleme.

            {
              "toxicityScore": <0-10 arasında bir sayı>,
              "action": "<NONE, DELETE_AND_WARN, MUTE_30M, MUTE_24H, veya BAN>",
              "warningMessage": "<Eğer bir eylem varsa, kullanıcıya hitaben '@${input.senderDisplayName}' ile başlayan, durumu açıklayan net bir uyarı mesajı. Eylem yoksa null.>"
            }
        `;

        console.log(`[DEBUG] Calling Gemini API`);
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        console.log(`[DEBUG] Gemini response: "${text}"`);

        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        console.log(`[DEBUG] Parsed JSON: "${jsonString}"`);
        const analysis = JSON.parse(jsonString);
        console.log(`[DEBUG] Analysis result:`, analysis);

        if (!analysis.action || analysis.action === 'NONE') {
            console.log(`[DEBUG] No action needed for message: "${input.messageText}"`);
            logger.info(`[AI Moderation] Message clean: "${input.messageText}"`);
            return;
        }

        console.log(`[DEBUG] Taking action: ${analysis.action} for toxicity score ${analysis.toxicityScore}`);
        logger.info(`[AI Moderation] Violation detected (${analysis.toxicityScore}/10): Action -> ${analysis.action}`);

        // Mesaj silme işlemi tüm cezalarda ortak
        console.log(`[DEBUG] Deleting message: ${input.messageId}`);
        await db.collection('messages').doc(input.messageId).delete();

        // Uyarıyı sohbete gönderme (tüm cezalarda ortak)
        if (analysis.warningMessage) {
            console.log(`[DEBUG] Sending warning message: "${analysis.warningMessage}"`);
            await db.collection('messages').add({
                uid: "oyunmabedi-ai-bot-v1",
                displayName: "OyunMabediAI",
                text: analysis.warningMessage,
                createdAt: Timestamp.now()
            });
        }

        // Eyleme göre kullanıcıya ceza uygulama
        const now = new Date();
        switch (analysis.action) {
            case 'MUTE_30M':
                const mute30mUntil = new Date(now.getTime() + 30 * 60 * 1000);
                console.log(`[DEBUG] Muting user for 30 minutes until ${mute30mUntil}`);
                await userDocRef.update({ mutedUntil: Timestamp.fromDate(mute30mUntil) });
                break;
            case 'MUTE_24H':
                const mute24hUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                console.log(`[DEBUG] Muting user for 24 hours until ${mute24hUntil}`);
                await userDocRef.update({ mutedUntil: Timestamp.fromDate(mute24hUntil) });
                break;
            case 'BAN':
                console.log(`[DEBUG] Banning user permanently`);
                await userDocRef.update({ chatAccessGranted: false }); // Kullanıcının sohbet erişimini kalıcı olarak kapat
                break;
        }

        console.log(`[DEBUG] Action completed successfully`);
        logger.info(`[AI Moderation] Action completed: ${analysis.action} for user ${input.senderDisplayName}`);

    } catch (error) {
        logger.error("AI Moderation critical error:", error);
    }
});
