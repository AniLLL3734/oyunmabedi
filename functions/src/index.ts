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

export const placeBet = functions.https.onCall(
    async (data: any, context: any) => {
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

          const userData: any = userDoc.data();
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
          let outcome: string | number | { value: number; suit: string } = "";
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
          const finalData: any = finalUserData.data();

          return {
            result: win ? "win" : "lose",
            winnings: win ? winnings : -amount,
            netGain: win ? winnings - amount : -amount,
            newScore: finalData.score,
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
// OYUN 1: LİMAN TALANI (DOCK PLUNDER) FONKSİYONU
// ===============================================

interface GameState {
    id: string;
    grid: ({ isOpen: boolean; isOfficer: boolean; } | { isOfficer: boolean; isOpen?: undefined; })[];
    isOver: boolean;
    multiplier: number;
    officerCount: number;
    betAmount: number;
    revealedCount: number;
    userId: string;
}

// Güvenli çarpan tablosu (kasa avantajı içerir)
// [officerCount][revealedCount] -> multiplier
const MULTIPLIERS: { [key: number]: number[] } = {
    1: [1.03, 1.08, 1.15, 1.22, 1.30, 1.40, 1.55, 1.70, 1.90, 2.15, 2.40, 2.75, 3.20, 3.75, 4.50, 5.50, 7.00, 9.00, 12.00, 16.00, 24.00, 40.00, 80.00, 200.00],
    3: [1.12, 1.28, 1.47, 1.70, 1.98, 2.30, 2.70, 3.20, 3.85, 4.65, 5.70, 7.00, 8.80, 11.20, 14.50, 19.00, 25.00, 35.00, 50.00, 80.00, 130.00, 300.00],
    5: [1.23, 1.52, 1.89, 2.36, 2.95, 3.70, 4.70, 6.00, 7.80, 10.20, 13.50, 18.00, 24.50, 34.00, 48.00, 70.00, 100.00, 170.00, 300.00, 1000.00],
    10: [1.65, 2.70, 4.40, 7.20, 11.80, 19.50, 32.00, 54.00, 90.00, 150.00, 250.00, 450.00, 800.00, 1500.00, 5000.00],
};

// Oyun mantığını işleyecek ana Cloud Function
export const playDockPlunder = functions.https.onCall(async (data: any, context: any) => {
    const uid = context.auth?.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "Lütfen giriş yapın.");
    }
    
    const { action, betAmount, officerCount, gameId, cellIndex } = data;
    const userRef = db.doc(`users/${uid}`);

    // --- YENİ OYUN BAŞLATMA ---
    if (action === "startGame") {
        const userDoc = await userRef.get();
        const userData: any = userDoc.data();
        if (!userDoc.exists || userData.score < betAmount) {
            throw new functions.https.HttpsError("failed-precondition", "Yetersiz bakiye.");
        }
        
        // Bahsi hesaptan düş
        await userRef.update({ score: admin.firestore.FieldValue.increment(-betAmount) });

        const grid = Array(25).fill(false);
        let officersPlaced = 0;
        while (officersPlaced < officerCount) {
            const index = Math.floor(Math.random() * 25);
            if (!grid[index]) {
                grid[index] = true;
                officersPlaced++;
            }
        }
        
        const newGame: any = {
            grid: grid.map((isOfficer: boolean) => ({ isOfficer })), // Secret grid
            isOver: false,
            multiplier: 1,
            officerCount,
            betAmount,
            revealedCount: 0,
            userId: uid,
        };
        const gameRef = await db.collection("dockPlunderGames").add(newGame);
        newGame.id = gameRef.id;

        return { gameState: getClientGameState(newGame) };
    }

    const gameDocRef = db.doc(`dockPlunderGames/${gameId}`);
    const gameDoc = await gameDocRef.get();
    const gameData: any = gameDoc.data();

    if (!gameDoc.exists || gameData.userId !== uid) {
        throw new functions.https.HttpsError("not-found", "Oyun bulunamadı veya size ait değil.");
    }

    if (gameData.isOver) {
        throw new functions.https.HttpsError("failed-precondition", "Bu oyun zaten bitti.");
    }

    // --- SANDIK AÇMA ---
    if (action === "revealCell") {
        if (gameData.grid[cellIndex].isOfficer) { // YAKALANDI
            await gameDocRef.update({ isOver: true, grid: gameData.grid.map((c: any) => ({...c, isOpen: true})) }); // Oyuncuya tümünü göster
            gameData.isOver = true;
        } else { // BAŞARILI
            gameData.revealedCount++;
            const newMultiplier = MULTIPLIERS[gameData.officerCount][gameData.revealedCount-1];
            await gameDocRef.update({ 
                revealedCount: admin.firestore.FieldValue.increment(1),
                multiplier: newMultiplier || gameData.multiplier, // Tablo dışına çıkarsa son çarpanı koru
            });
            gameData.multiplier = newMultiplier;
            
            // Grid'deki tek bir hücreyi güncelle
            const clientGridUpdate = gameData.grid.map((c: any, i: number) => i === cellIndex ? {isOpen: true, isOfficer: false} : (c.isOpen ? c : {isOpen: false, isOfficer: false}));
            gameData.grid = clientGridUpdate;

        }
        return { gameState: getClientGameState(gameData) };
    }

    // --- PARAYI ÇEKME (CASH OUT) ---
    if (action === "cashOut") {
        if(gameData.revealedCount === 0) {
            throw new functions.https.HttpsError("failed-precondition", "Henüz bir kutu açmadınız.");
        }
        const payout = Math.floor(gameData.betAmount * gameData.multiplier);
        await userRef.update({ score: admin.firestore.FieldValue.increment(payout) });
        await gameDocRef.update({ isOver: true });

        return { payout };
    }

    throw new functions.https.HttpsError("invalid-argument", "Geçersiz işlem.");
});

// Oyuncuya gönderilecek güvenli oyun state'ini hazırlar
function getClientGameState(serverState: any) {
    return {
        id: serverState.id,
        grid: Array(25).fill({}).map((_: any, index: number) => {
            const serverCell = serverState.grid[index];
            if (serverCell?.isOpen) {
                 return {isOpen: true, isOfficer: serverCell.isOfficer };
            }
            return {isOpen: false, isOfficer: false};
        }),
        isOver: serverState.isOver,
        multiplier: serverState.multiplier,
        betAmount: serverState.betAmount,
    }
}

// ===============================================
// OYUN 2: BORSA SİMÜLASYONU (INVESTMENT) FONKSİYONU
// ===============================================

interface Company {
    ticker: string;
    basePrice: number;
    volatility: number; // 0.1 (düşük) - 0.5 (yüksek) arası
}

const companiesData: Company[] = [
    { ticker: "NVA", basePrice: 150, volatility: 0.2 },
    { ticker: "CYB", basePrice: 80, volatility: 0.4 },
    { ticker: "SOL", basePrice: 200, volatility: 0.1 },
    { ticker: "QNT", basePrice: 40, volatility: 0.6 },
];

export const manageInvestment = functions.https.onCall(async (data: any, context: any) => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Giriş yapmalısınız.");

    const { action, companyTicker, amount, investmentId } = data;
    const userRef = db.doc(`users/${uid}`);
    const userDoc = await userRef.get();
    const userData: any = userDoc.data();
    const userDisplayName = userData?.displayName || 'Anonim';
    const userAvatarUrl = userData?.avatarUrl || '';

    if (action === "buy") {
        const company = companiesData.find(c => c.ticker === companyTicker);
        if (!company) throw new functions.https.HttpsError("not-found", "Şirket bulunamadı.");
        
        if (!userDoc.exists || userData.score < amount) {
            throw new functions.https.HttpsError("failed-precondition", "Yetersiz bakiye.");
        }

        await userRef.update({ score: admin.firestore.FieldValue.increment(-amount) });
        
        const investment = {
            userId: uid,
            companyTicker,
            investedAmount: amount,
            purchasePrice: company.basePrice,
            status: "active",
            resolveTime: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000), // 5 dakika vade
        };
        await db.collection("investments").add(investment);
        return { success: true };
    }

    if (action === "resolve") {
        const invRef = db.doc(`investments/${investmentId}`);
        const invDoc = await invRef.get();

        if (!invDoc.exists || invDoc.data()?.userId !== uid) {
            throw new functions.https.HttpsError("not-found", "Yatırım bulunamadı.");
        }
        
        const investment: any = invDoc.data();
        if (investment?.status !== 'active') throw new functions.https.HttpsError("failed-precondition", "Bu yatırım zaten sonuçlanmış.");
        if (investment.resolveTime.toMillis() > Date.now()) {
            throw new functions.https.HttpsError("failed-precondition", "Yatırımın vadesi henüz dolmadı.");
        }

        const company = companiesData.find(c => c.ticker === investment.companyTicker)!;
        
        // Kasa avantajı burada: -0.49 yerine -0.5 olsa tamamen adil olurdu.
        const performanceFactor = (Math.random() - 0.49) * 2; // -0.98 ile +1.02 arası
        const priceChange = company.basePrice * company.volatility * performanceFactor;
        const finalPrice = Math.max(1, company.basePrice + priceChange);
        
        const payout = Math.floor((finalPrice / investment.purchasePrice) * investment.investedAmount);
        const profit = payout - investment.investedAmount;

        await userRef.update({ score: admin.firestore.FieldValue.increment(payout) });
        await invRef.update({ status: "resolved", finalPrice, payout });
        
        // Update investment profit/loss tracking
        if (profit > 0) {
            // Update top earners collection
            const profitRef = db.collection('investment_profits').doc(uid);
            const profitDoc = await profitRef.get();
            
            if (profitDoc.exists) {
                await profitRef.update({
                    totalProfit: admin.firestore.FieldValue.increment(profit),
                    displayName: userDisplayName,
                    avatarUrl: userAvatarUrl,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await profitRef.set({
                    userId: uid,
                    displayName: userDisplayName,
                    avatarUrl: userAvatarUrl,
                    totalProfit: profit,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } else if (profit < 0) {
            // Update biggest losers collection
            const lossRef = db.collection('investment_losses').doc(uid);
            const lossDoc = await lossRef.get();
            const lossAmount = Math.abs(profit);
            
            if (lossDoc.exists) {
                await lossRef.update({
                    totalLoss: admin.firestore.FieldValue.increment(lossAmount),
                    displayName: userDisplayName,
                    avatarUrl: userAvatarUrl,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await lossRef.set({
                    userId: uid,
                    displayName: userDisplayName,
                    avatarUrl: userAvatarUrl,
                    totalLoss: lossAmount,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        return { success: true, payout, investedAmount: investment.investedAmount, profit };
    }

    throw new functions.https.HttpsError("invalid-argument", "Geçersiz işlem.");
});

// ===============================================
// OYUN 3: SLOT MAKİNESİ (SLOT MACHINE) FONKSİYONU
// ===============================================

const REELS = [
    ["GEM", "STAR", "BOMB", "ROCKET", "STAR", "BOMB", "STAR"], // Nadir semboller (GEM, ROCKET) daha az
    ["STAR", "BOMB", "GEM", "BOMB", "ROCKET", "STAR", "BOMB"],
    ["BOMB", "STAR", "ROCKET", "STAR", "BOMB", "GEM", "STAR"],
];

const PAYOUTS: {[key: string]: number} = {
    "GEM-GEM-GEM": 50,
    "ROCKET-ROCKET-ROCKET": 25,
    "STAR-STAR-STAR": 10,
    // Diğer özel kombinasyonlar...
};

export const playSlots = functions.https.onCall(async (data: any, context: any) => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Giriş yapmalısınız.");
    
    const { betAmount } = data;
    if (betAmount <= 0) throw new functions.https.HttpsError("invalid-argument", "Geçersiz bahis miktarı.");

    const userRef = db.doc(`users/${uid}`);
    const userDoc = await userRef.get();
    const userData: any = userDoc.data();
    if (!userDoc.exists || userData.score < betAmount) {
        throw new functions.https.HttpsError("failed-precondition", "Yetersiz bakiye.");
    }
    
    // Önce bahsi düş
    await userRef.update({ score: admin.firestore.FieldValue.increment(-betAmount) });
    
    // Sonucu belirle
    const finalReels = REELS.map(reel => reel[Math.floor(Math.random() * reel.length)]);
    const resultKey = finalReels.join("-");
    
    let payout = PAYOUTS[resultKey] ? PAYOUTS[resultKey] * betAmount : 0;
    
    // Küçük kazanç: İki STAR gelirse... (Kasa avantajını dengelemek için)
    if (payout === 0) {
        const starCount = finalReels.filter(s => s === 'STAR').length;
        if (starCount === 2) {
            payout = betAmount * 2;
        }
    }

    // Kazanç varsa hesaba ekle
    if(payout > 0){
        await userRef.update({ score: admin.firestore.FieldValue.increment(payout) });
    }
    
    return { finalReels, payout };
});

// ===============================================
// AI MODERASYON FONKSİYONU
// ===============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set!");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
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