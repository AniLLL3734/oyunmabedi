import {setGlobalOptions} from "firebase-functions";
import * as functions from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/firestore";
import * as logger from "firebase-functions/logger";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import * as admin from "firebase-admin";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

// ===============================================
// BAHİS SİSTEMİ GÜVENLİ SUNUCU FONKSİYONU
// ===============================================

const GAME_CONFIG = {
  dice: {name: "Zar Atışı", multiplier: 5.5},
  coin: {name: "Yazı Tura", multiplier: 1.95},
  color: {
    name: "Renk Oyunu",
    multipliers: {red: 2, black: 2, green: 14},
  },
  number: {
    name: "Tek / Çift",
    multipliers: {even: 1.95, odd: 1.95},
  },
  card: {
    name: "Yüksek / Alçak",
    multipliers: {high: 2.1, low: 2.1, same: 8},
  },
  rocket: {
    name: "Roket",
  },
};

const DAILY_BET_LIMIT = 100000;

export const placeBet = functions.region("europe-west1").https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Bu işlemi yapmak için giriş yapmalısınız.",
        );
      }

      const {game, amount, guess} = data;
      const uid = context.auth.uid;

      if (
        !game ||
      typeof amount !== "number" ||
      amount <= 0 ||
      !guess ||
      !Object.keys(GAME_CONFIG).includes(game)
      ) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Geçersiz bahis bilgileri.",
        );
      }

      const userRef = db.collection("users").doc(uid);

      try {
        const result = await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);

          if (!userDoc.exists) {
            throw new functions.https.HttpsError(
                "not-found", "Kullanıcı bulunamadı.");
          }

          const userData = userDoc.data()!;
          const currentScore = userData.score || 0;

          if (currentScore < amount) {
            throw new functions.https.HttpsError(
                "failed-precondition", "Yetersiz bakiye!");
          }

          const today = new Date().toDateString();
          const lastBetDate = userData.lastBetDate || "";
          const todayBets =
          lastBetDate === today ? userData.todayBets || 0 : 0;
          if (todayBets + amount > DAILY_BET_LIMIT) {
            throw new functions.https.HttpsError(
                "resource-exhausted",
                `Günlük bahis limitini (${DAILY_BET_LIMIT}) aştınız.`,
            );
          }

          transaction.update(userRef, {
            score: admin.firestore.FieldValue.increment(-amount),
          });

          let win = false;
          let multiplier = 0;
          let outcome: string | number | { value: number; suit: string };
          let winnings = 0;

          switch (game) {
            case "dice": {
              const roll = Math.floor(Math.random() * 6) + 1;
              outcome = roll;
              win = roll === guess.value;
              multiplier = GAME_CONFIG.dice.multiplier;
              break;
            }
            case "coin":
              outcome = Math.random() < 0.5 ? "heads" : "tails";
              win = outcome === guess.value;
              multiplier = GAME_CONFIG.coin.multiplier;
              break;
            case "color": {
              const colorRoll = Math.random() * 100;
              if (colorRoll < 3) {
                outcome = "green";
              } else if (colorRoll < 51.5) {
                outcome = "red";
              } else {
                outcome = "black";
              }
              win = outcome === guess.value;
              const gv = guess.value as keyof typeof GAME_CONFIG.color.multipliers;
              multiplier = GAME_CONFIG.color.multipliers[gv];
              break;
            }
            case "number": {
              const num = Math.floor(Math.random() * 100) + 1;
              outcome = num;
              const resultType = num % 2 === 0 ? "even" : "odd";
              win = resultType === guess.value;
              const gv = guess.value as keyof typeof GAME_CONFIG.number.multipliers;
              multiplier = GAME_CONFIG.number.multipliers[gv];
              break;
            }
            case "card": {
              const suits = ["♣", "♦", "♥", "♠"];
              const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
              const currentCardValue = guess.currentCardValue;
              const newCard = {
                value: values[Math.floor(Math.random() * values.length)],
                suit: suits[Math.floor(Math.random() * suits.length)],
              };
              outcome = newCard;
              if (guess.choice === "high") win = newCard.value > currentCardValue;
              if (guess.choice === "low") win = newCard.value < currentCardValue;
              if (guess.choice === "same") win = newCard.value === currentCardValue;
              const gc = guess.choice as keyof typeof GAME_CONFIG.card.multipliers;
              multiplier = GAME_CONFIG.card.multipliers[gc];
              break;
            }
            case "rocket": {
              const targetMultiplier = guess.value;
              const crashPoint = (1 / (1 - Math.random())) * 0.99;
              outcome = parseFloat(crashPoint.toFixed(2));
              win = crashPoint >= targetMultiplier;
              multiplier = targetMultiplier;
              break;
            }
          }

          if (win) {
            winnings = amount * multiplier;
            transaction.update(userRef, {
              score: admin.firestore.FieldValue.increment(winnings),
            });
          }

          const betLogRef = db
              .collection("users")
              .doc(uid)
              .collection("bets")
              .doc();
          transaction.set(betLogRef, {
            game: game,
            amount: amount,
            result: win ? "win" : "lose",
            multiplier: multiplier,
            outcome: outcome,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          transaction.update(userRef, {
            todayBets: admin.firestore.FieldValue.increment(amount),
            lastBetDate: today,
          });

          const finalUserData = await transaction.get(userRef);

          return {
            result: win ? "win" : "lose",
            winnings: win ? winnings : -amount,
            netGain: win ? winnings - amount : -amount,
            newScore: finalUserData.data()!.score,
            outcome: outcome,
          };
        });
        return result;
      } catch (error) {
        console.error("Bahis Hatası:", error);
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        throw new functions.https.HttpsError(
            "internal",
            "Bahis işlenirken bir sunucu hatası oluştu.",
        );
      }
    },
);

// ===============================================
// AI MODERASYON FONKSİYONU
// ===============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set!");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ],
});

export const moderateMessage = onDocumentCreated("moderation_queue/{docId}",
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        logger.error("No data in moderation_queue document");
        return;
      }

      const input = snapshot.data() as {
    senderUid: string;
    senderDisplayName: string;
    messageId: string;
    messageText: string;
    };

      logger.info(
          `[AI Moderation] Processing message from ${input.senderDisplayName}: ` +
      `"${input.messageText}"`,
      );

      try {
        const userDocRef = db.collection("users").doc(input.senderUid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists || userDocSnap.data()?.role === "admin") {
          logger.info(
              "[AI Moderation] Action cancelled: User not found or is admin " +
          `(${input.senderDisplayName}).`,
          );
          return;
        }

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

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        const jsonString = text.substring(
            text.indexOf("{"), text.lastIndexOf("}") + 1);
        const analysis = JSON.parse(jsonString);

        if (!analysis.action || analysis.action === "NONE") {
          logger.info(`[AI Moderation] Message clean: "${input.messageText}"`);
          return;
        }

        logger.info(
            `[AI Moderation] Violation detected (${analysis.toxicityScore}/10): ` +
        `Action -> ${analysis.action}`,
        );

        await db.collection("messages").doc(input.messageId).delete();

        if (analysis.warningMessage) {
          await db.collection("messages").add({
            uid: "oyunmabedi-ai-bot-v1",
            displayName: "OyunMabediAI",
            text: analysis.warningMessage,
            createdAt: Timestamp.now(),
          });
        }

        const now = new Date();
        switch (analysis.action) {
          case "MUTE_30M": {
            const mute30mUntil = new Date(now.getTime() + 30 * 60 * 1000);
            await userDocRef.update({mutedUntil: Timestamp.fromDate(mute30mUntil)});
            break;
          }
          case "MUTE_24H": {
            const mute24hUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            await userDocRef.update({mutedUntil: Timestamp.fromDate(mute24hUntil)});
            break;
          }
          case "BAN":
            await userDocRef.update({chatAccessGranted: false});
            break;
        }
        logger.info(
            `[AI Moderation] Action completed: ${analysis.action} for user ` +
        `${input.senderDisplayName}`,
        );
      } catch (error) {
        logger.error("AI Moderation critical error:", error);
      }
    });