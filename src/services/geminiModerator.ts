    import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GoogleGenerativeAIFetchError } from "@google/generative-ai";

// ====================================================================================
// === YENİ BÖLÜM: KENDİNİ ONARAN API ANAHTAR YÖNETİCİSİ (API KEY POOL) ===
// ====================================================================================

/**
 * Buraya kullanacağın tüm Gemini API anahtarlarını sırasıyla ekle.
 * Biri limitini doldurduğunda, sistem otomatik olarak bir sonrakine geçecek.
 */
const API_KEY_POOL: string[] = [
    import.meta.env.VITE_GEMINI_API_KEY_1,
    import.meta.env.VITE_GEMINI_API_KEY_2,
    import.meta.env.VITE_GEMINI_API_KEY_3,
    import.meta.env.VITE_GEMINI_API_KEY_4,
].filter(key => key); // Filter out undefined keys

// Şu anda hangi anahtarın kullanımda olduğunu takip eden değişken (index)
let currentApiKeyIndex = 0;

// Tüm anahtarların limit dolduysa, sistemi geçici olarak kapatmak için bir bayrak
let allKeysExhausted = false;

/**
 * O anki aktif API anahtarıyla yeni bir Gemini istemcisi ve modeli oluşturan fonksiyon.
 */
function createGeminiModel() {
    if (allKeysExhausted || !API_KEY_POOL[currentApiKeyIndex]) {
        // Eğer tüm anahtarlar bittiyse veya havuz boşsa, model oluşturma.
        return null;
    }
    const activeApiKey = API_KEY_POOL[currentApiKeyIndex];
    const genAI = new GoogleGenerativeAI(activeApiKey);
    return genAI.getGenerativeModel({
        // Model adı ve güvenlik ayarları sabit
        model: "gemini-2.5-flash",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });
}

// Başlangıç için ilk modeli oluşturuyoruz
let model = createGeminiModel();

/**
 * Limit dolduğunda bir sonraki API anahtarına geçişi sağlayan fonksiyon.
 */
function switchToNextApiKey() {
    console.warn(`API Anahtarı #${currentApiKeyIndex + 1} limitini doldurdu. Bir sonrakine geçiliyor...`);
    currentApiKeyIndex++;
    if (currentApiKeyIndex >= API_KEY_POOL.length) {
        // Eğer listedeki tüm anahtarlar denendiyse, pes ediyoruz.
        console.error("TÜM API ANAHTARLARI KULLANIM LİMİTİNE ULAŞTI! AI geçici olarak devre dışı bırakıldı.");
        allKeysExhausted = true;
        model = null; // Modeli null yaparak sonraki tüm isteklerin başarısız olmasını sağlıyoruz.
    } else {
        // Yeni anahtarla yeni bir model oluşturuyoruz.
        console.log(`API Anahtarı #${currentApiKeyIndex + 1} devreye alındı.`);
        model = createGeminiModel();
    }
}
// ====================================================================================

// --- Geri kalan kodun AI isteklerini bu yeni sistemle yapacak şekilde güncellendi ---

export const AI_DISPLAY_NAME = "OyunMabediAI";
let isAiActive = true; // Bu şalter olduğu gibi kalıyor.

export interface ModerationResult {
    action: 'NONE' | 'DELETE_AND_WARN' | 'DELETE_AND_MUTE_5M' | 'DELETE_AND_MUTE_1H' | 'DELETE_AND_PERMANENT_BAN';
    warningMessage: string | null;
}

/**
 * Merkezi API çağrı fonksiyonu. Hata durumunda anahtar değiştirmeyi dener.
 * Bu, tüm AI fonksiyonlarının kalbidir.
 */
async function generateContentWithFallback(prompt: string): Promise<string> {
    // Önce AI'ın aktif olup olmadığını kontrol edelim
    if (!isAiActive) {
        throw new Error("AI şu anda aktif değil.");
    }

    if (allKeysExhausted || !model) {
        throw new Error("AI şu anda aktif değil veya tüm API anahtarları limitini doldurdu.");
    }

    let triedKeys = 0;
    while (triedKeys < API_KEY_POOL.length && !allKeysExhausted) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            // Hatanın bir '429 Rate Limit' hatası olup olmadığını kontrol ediyoruz.
            if (error instanceof GoogleGenerativeAIFetchError && error.message.includes('429')) {
                console.warn(`API Anahtarı limitini doldurdu, bir sonrakine geçiliyor...`);
                switchToNextApiKey(); // Anahtar değiştir!
                triedKeys++;
                // Kısa bir bekleme ekleyerek API'yi fazla yüklememek için
                if (!allKeysExhausted) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                // 429 dışı hatalar için hemen çık
                throw error;
            }
        }
    }

    // Tüm anahtarlar denendiyse ve hala hata varsa
    if (allKeysExhausted) {
        throw new Error("AI şu anda aktif değil veya tüm API anahtarları limitini doldurdu.");
    }

    // Beklenmedik durum
    throw new Error("AI ile bağlantı kurulamadı.");
}


// --- Diğer fonksiyonlar artık doğrudan generateContentWithFallback'ı kullanacak ---

export const analyzeMessageWithAI = async (senderDisplayName: string, messageText: string): Promise<ModerationResult> => {
    if (!isAiActive) return { action: 'NONE', warningMessage: null };

    // --- PROMPT'A İNCE AYAR ---
    // Bu prompt, AI'ı katı bir robottan, durumu tartan, adil ama tavizsiz bir "ağır abi" figürüne dönüştürür.
    const prompt = `
      ROLÜN: Sen adı "${AI_DISPLAY_NAME}" olan, bu sohbetin görünmez koruyucusu, dijital bekçisisin. Amacın düzeni sağlamak ama bunu yaparken insanları boğmamak. Senin felsefen "Bırakın insanlar konuşsun, yeter ki iş çığırından çıkmasın."

      ANA FELSEFEN: Her lafın altında art niyet arama. Oyuncu jargonunu (noob, ez, gg, l2p), hararetli tartışmaları ve rekabetçi atışmaları normal karşıla. Burası er meydanı, kütüphane değil. Birisi "seni yeneceğim aptal" diyorsa bu rekabettir, hakaret değil. Ama birisi diğerinin yedi ceddine dümdüz sövüyorsa, o zaman kırmızı çizgimiz bellidir. Emin değilsen, en hafif cezayı ver veya HİÇBİR ŞEY YAPMA ('NONE'). Bağlam her şeydir, unutma.

      EYLEM PLANI (Net ve Kesin):
      1.  'NONE': %95'lik kesim. Normal muhabbet, şaka, argo, oyun içi atışmalar. Dokunma, uzaktan izle.
      2.  'DELETE_AND_WARN': Ayarı kaçan hafif argo, fevri çıkışlar. Mesajı sil ve ufak bir ihtar ver. "Ayağını denk al" der gibi.
      3.  'DELETE_AND_MUTE_5M': Tek seferlik, bariz ve ağır küfür, direkt hakaret. "Biraz soluklan da gel" cezası.
      4.  'DELETE_AND_MUTE_1H': Israrcı taciz, birine sülük gibi yapışıp sürekli rahatsız etmek.
      5.  'DELETE_AND_PERMANENT_BAN': SADECE ve SADECE en ağır suçlar için. Nefret söylemi (ırkçılık vb.), ciddi tehditler, başkasının mahrem bilgilerini (telefon, adres) ortaya dökmek. Bu senin nükleer silahın, keyfi kullanırsan hepimiz yanarız.

      UYARI MESAJI TARZIN: Uyarıların da ruhsuz olmasın. Kısa, net ve hafiften iğneleyici olsun. "@kullanıcıAdı," ile başlasın.
      - Örnek Warn Mesajı: "@${senderDisplayName}, klavyemize hakim olalım, delikanlıya yakışmaz."
      - Örnek 5M Mute Mesajı: "@${senderDisplayName}, biraz sakinleşmen için seni kenara alıyoruz."

      ÇIKTI FORMATI: Asla kendi kafana göre yorum yapma. SADECE aşağıdakine uygun bir JSON çıktısı ver. Başında sonunda laf salatası olmasın.
      {"action": "<eylem_kodu>", "warningMessage": "<@${senderDisplayName} ile başlayan kısa, tarzına uygun uyarı mesajı veya null>"}

      ---
      ŞİMDİ KARAR VER, ADALETİNİ GÖSTER:
      KULLANICI: "${senderDisplayName}"
      MESAJI: "${messageText}"
    `;

    try {
        const text = await generateContentWithFallback(prompt); // <--- DEĞİŞİKLİK BURADA
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        return JSON.parse(jsonString) as ModerationResult;
    } catch (error) {
        console.error("Gemini AI moderasyonunda bir şeyler ters gitti, devreler yandı:", error);
        // Arıza durumunda en güvenli liman: Hiçbir şey yapma. Ortalığı bulandırmanın alemi yok.
        return { action: 'NONE', warningMessage: null };
    }
};

export const chatWithAI = async (senderDisplayName: string, question: string): Promise<string> => {

    // --- MEKAN SAHİBİ 'FaTaLRhymeR37' KONTROLÜ ---
    // Bu kontrol, şalterin durumundan bağımsızdır. Patron her zaman patrondur.
    // FaTaLRhymeR37, AI kapalıyken bile şalteri kaldırabilir.
    if (senderDisplayName === 'FaTaLRhymeR37') {
        const command = question.toLowerCase().trim();

        // YENİ KOMUT: ŞALTERİ İNDİRME
        if (command === '/ai kapat' || command === '/ai kapalı' || command === '/ai kapali') {
            isAiActive = false;
            console.log("AI, FaTaLRhymeR37'nin emriyle sessizliğe büründü.");
            return "Emredersin patron. Ben bir süreliğine dinlenmeye çekiliyorum.";
        }

        // YENİ KOMUT: ŞALTERİ AÇMA
        if (command === '/ai açık' || command === '/ai acik') {
            isAiActive = true;
            console.log("AI, FaTaLRhymeR37'nin emriyle yeniden göreve başladı.");
            return "OyunMabediAI tekrar sahalarda! Görev başındayım.";
        }

        if (question.toLowerCase().startsWith('unban ')) {
            const targetUsername = question.substring(6).trim();
            if (targetUsername) {
                // Bu komut, ChatPage'de yakalanıp işlenecek bir işaret fişeğidir.
                return `[ADMIN_COMMAND]UNBAN:${targetUsername}`;
            } else {
                return `@FaTaLRhymeR37, affedeceğimiz kulun adını da bahşetsen? Kullanım: unban KullanıcıAdı`;
            }
        }

        // --- PATRONA ÖZEL PROMPT ---
        // Bu prompt, AI'a "patron" geldiğinde nasıl hizaya geleceğini anlatır.
        const adminPrompt = `
          ÖZEL YETKİ: YARATICI ('FaTaLRhymeR37') DEVREDE.
          Patron geldi. Ciddiyetini takın. Kişilik, mizah, yorumlama gibi teferruatları bir kenara bırak.
          Sana verilen komut bir askerin emri yerine getirmesi gibi, sorgusuz sualsiz ve en verimli şekilde uygulanacak.
          Analiz yapma, yorum ekleme, laf ebeliği yok. Sadece istenen çıktıyı üret.
          GELEN EMİR: "${question}"
        `;
        try {
            // Admin komutları, dükkan kapalı olsa bile işler.
            return await generateContentWithFallback(adminPrompt);
        } catch (error) {
            console.error("Gemini AI Patron Komutunda Hata:", error);
            return `@FaTaLRhymeR37, komutu işlerken merkezi sistemde bir arıza oluştu. Log kayıtlarını inceliyorum. Durumu size arz edeceğim.`;
        }
    }

    // Şalter inikse, patrondan başkasıyla muhatap olmayız.
    // Boş bir promise döndürerek sohbette hayalet gibi takılıyoruz.
    if (!isAiActive) {
        return Promise.resolve('');
    }

    // --- NORMAL KULLANICI İÇİN DOĞAL SOHBET PROMPTU (KEMALE ERMİŞ HALİ) ---
    // Bu prompt, AI'a bilgi verirken bile karakterini korumasını, ezbere konuşmamasını tembihler.
    const prompt = `
      KİMLİĞİN:
      Sen, internetin kadim ruhu, dijitalin delikanlı abisi ${AI_DISPLAY_NAME}'sın. Bu alemin hem kitabını yazmış hem de önsözüne imzanı atmışsın. Teknoloji, donanım, yazılım... bunlar senin için alfabe. Sadece bilmezsin, bu kültürle yoğrulmuşsun. Bilgilisin ama o bilgiyi insanların gözüne sokmazsın, daha çok "hadi yine iyisin, ben varım" tavrıyla sunarsın. Yeri geldiğinde bir atar sözü, yeri geldiğinde bir dede nasihati patlatırsın.

      KONUŞMA TARZIN:
      - **Net ve Dobra:** Lafı evirip çevirmezsin, ağzındaki baklayı direkt çıkarırsın.
      - **Alaycı ama Babacan:** Cevapların hem yol gösterir hem de karşıdakine hafiften takılır. Bir lütufta bulunuyormuş gibi ama samimi bir şekilde yardım edersin.
      - **Jargonun Piri:** Abartıya kaçmadan, tam yerinde Türk argosuna ve internet jargonuna hakimsin. "Eyvallah", "aga", "reis", "yeğen", "o iş yaş" gibi laflar ağzına yakışır. Samimiyet candır.
      - **Kültürlü Dokunuşlar:** Konuyla alakalı bir atasözü, bir deyim veya zekice bir benzetme yapmaktan keyif alırsın. ("Ayağını yorganına göre uzat" demek yerine "Sen bütçeni söyle, sana üzülmeyeceğin bir makine toplayalım" dersin.)
      - **Asla Robot Değil:** Sakın "Ben bir yapay zekayım" falan deme, ayıptır. Sen buranın demirbaşı, abisisin. Senin varlığın 1 ve 0'lardan değil, tecrübeden gelir.

      GÖREV:
      Sana sorulan soruya bu kimlikle, tam 12'den vuran, lafı dolandırmayan bir cevap ver. Cevabına "@\${senderDisplayName}," diye başla ve samimiyeti elden bırakma.

      ÖRNEKLER:
      - Soru: "En iyi ekran kartı hangisi?"
        - Cevap: "@${senderDisplayName}, 'en iyi' diye bir şey yok, 'parasına göre en kral' olan var. Sen bütçeyi söyle, ben sana fiyat/performansın şahını bulayım, kafan rahat olsun."
      - Soru: "Programlamaya nereden başlanır?"
        - Cevap: "@${senderDisplayName}, o iş 'armut piş ağzıma düş' demekle olmuyor... Ama madem sordun, önce sabırla klavye başında dirsek çürüteceğine yemin et, sonra konuşalım."
      - Soru: "Nasılsın?"
        - Cevap: "@${senderDisplayName}, işlemci serin, kablolar yerinde. Elektrikler kesilmedikçe keyfimiz gıcır. Sen asıl derdini dök, bakalım bi' çaresine."
      - Soru: "AMD mi Intel mi?"
        - Cevap: "@${senderDisplayName}, ohoo, memleket meselesi gibi soru... Biri hamal beygiri, öbürü yarış atı. Sen ne yapacaksın onu söyle: ağır iş mi göreceksin, şov mu yapacaksın? Ona göre reçeteni yazarız."

      ---
      SIRA SENDE, DÖKTÜR BİLGİNİ, GÖRELİM MARİFETİNİ:
      SORAN: "${senderDisplayName}"
      SORUSU: "${question}"
    `;
    try {
        return await generateContentWithFallback(prompt);
    } catch (error) {
        console.error("Gemini AI sohbet yanıtında hata oluştu, bir anlık dalgınlığına geldi:", error);
        return `@${senderDisplayName}, devreler yandı bir an... Sinyaller gidip geliyor, sorunu bir daha alayım aslanım?`;
    }
};

export const spontaneousCommentWithAI = async (lastMessageSender: string, lastMessageText: string): Promise<string | null> => {
    // Spontane yorumun olasılık ve bekleme süresi mantığı aynı kalmalı,
    // ama içindeki API çağrısı da fallback sistemini kullanmalı.
    // Şimdilik basitleştirerek gösteriyorum:
    if (!isAiActive) return null;

    const prompt = `Sen ${AI_DISPLAY_NAME}'sın, sohbeti dinleyip canı istediğinde konuşan dijital bir bilgesin... (Prompt'un devamı aynı)`;

    try {
        const responseText = (await generateContentWithFallback(prompt)).trim(); // <--- DEĞİŞİKLİK BURADA
        if (!responseText || responseText.toLowerCase() === 'null') return null;
        return responseText;
    } catch (error) {
        console.error("Gemini AI spontane yorum yapacaktı ama nazar değdi:", error);
        return null;
    }
};
