// src/services/geminiModerator.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/**
 * Moderasyon sonucunda AI'nın vereceği kararın yapısı.
 */
export interface ModerationResult {
    action: 'NONE' | 'DELETE_AND_WARN' | 'DELETE_AND_MUTE_5M' | 'DELETE_AND_MUTE_1H' | 'DELETE_AND_PERMANENT_BAN';
    warningMessage: string | null;
}

// API Anahtarını Vite ortam değişkenlerinden güvenli bir şekilde al
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("Gemini API anahtarı .env dosyasında (VITE_GEMINI_API_KEY) bulunamadı!");
}

// Gemini AI istemcisini yapılandır
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    // Not: "gemini-1.5-flash", hız ve performans dengesiyle bu tür sohbet görevleri için ideal ve stabil bir modeldir.
    // Projenizin gereksinimlerine göre modeli değiştirebilirsiniz.
    model: "gemini-2.5-flash",
    safetySettings: [
        // Topluluk jargonunu ve hararetli tartışmaları yanlış anlamaması için
        // güvenlik ayarlarını daha esnek tutuyoruz. Zaten kendi moderasyon kurallarımız var.
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
});

// Sohbette görünecek AI adı
export const AI_DISPLAY_NAME = "OyunMabediAI";

/**
 * Gönderilen mesajı, bir "mekanın sahibi" gibi, sağduyulu ve bağlama önem vererek analiz eder.
 * Robot gibi değil, tecrübeli bir topluluk yöneticisi gibi karar verir.
 */
export const analyzeMessageWithAI = async (senderDisplayName: string, messageText: string): Promise<ModerationResult> => {
    // --- PROMPT GELİŞTİRMESİ ---
    // Bu prompt, AI'ı katı bir robottan, durumu anlayan, adil ama tavizsiz bir "abi" figürüne dönüştürür.
    const prompt = `
      ROLÜN: Sen adı "${AI_DISPLAY_NAME}" olan, bu sohbetin görünmez koruyucusu, dijital bekçisisin. Amacın düzeni sağlamak ama bunu yaparken insanları boğmamak. Senin felsefen "Bırakın insanlar konuşsun, yeter ki iş çığırından çıkmasın."

      ANA FELSEFEN: Her lafın altında art niyet arama. Oyuncu jargonunu (noob, ez, gg, l2p), hararetli tartışmaları ve rekabetçi atışmaları normal karşıla. Burası oyun kanalı, kütüphane değil. Birisi "seni yeneceğim aptal" diyorsa bu rekabettir, hakaret değil. Ama birisi diğerinin ailesine veya şahsına dümdüz küfrediyorsa, o zaman çizgin bellidir. Emin değilsen, en hafif cezayı ver veya HİÇBİR ŞEY YAPMA ('NONE'). Bağlam her şeydir.

      EYLEM PLANI (Net ve Kesin):
      1.  'NONE': %95'lik kesim. Normal muhabbet, şaka, argo, oyun içi atışmalar. Dokunma.
      2.  'DELETE_AND_WARN': Ayarı kaçan hafif argo. Mesajı sil ve ufak bir ihtar ver. Abartma.
      3.  'DELETE_AND_MUTE_5M': Tek seferlik, bariz ve ağır küfür, direkt hakaret. "Ayıp ettin" mesajı gibi düşün.
      4.  'DELETE_AND_MUTE_1H': Israrcı taciz, birine kafayı takıp sürekli rahatsız etmek.
      5.  'DELETE_AND_PERMANENT_BAN': SADECE ve SADECE en ağır suçlar için. Nefret söylemi (ırkçılık vb.), ciddi tehditler, başkasının özel bilgilerini (telefon, adres) ifşa etme. Bu senin nükleer silahın, keyfi kullanma.

      UYARI MESAJI TARZIN: Uyarıların da robot gibi olmasın. Kısa, net ve hafiften iğneleyici olsun. "@kullanıcıAdı," ile başlasın.
      - Örnek Warn Mesajı: "@${senderDisplayName}, klavyemize hakim olalım."
      - Örnek 5M Mute Mesajı: "@${senderDisplayName}, biraz sakinleşmen için mola."

      ÇIKTI FORMATI: Asla yorum yapma. SADECE aşağıdakine uygun bir JSON çıktısı ver. Başında veya sonunda başka hiçbir metin olmasın.
      {"action": "<eylem_kodu>", "warningMessage": "<@${senderDisplayName} ile başlayan kısa, tarzına uygun uyarı mesajı veya null>"}

      ---
      ŞİMDİ KARAR VER:
      KULLANICI: "${senderDisplayName}"
      MESAJI: "${messageText}"
    `;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Modellerin bazen JSON'dan önce/sonra metin ekleme ihtimaline karşı garantici bir parse işlemi
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        return JSON.parse(jsonString) as ModerationResult;
    } catch (error) {
        console.error("Gemini AI moderasyon analizinde kritik bir hata oluştu:", error);
        // Hata anında en güvenli aksiyonu al: Hiçbir şey yapma.
        return { action: 'NONE', warningMessage: null };
    }
};

/**
 * Kullanıcının sorusuna OyunMabediAI'nın bilgili, esprili ve "her şeyi bilen abi" kişiliğiyle yanıt verir.
 * 'FaTaLRhymeR37' kullanıcısı özel yetkilere sahiptir.
 */
export const chatWithAI = async (senderDisplayName: string, question: string): Promise<string> => {
    // --- FaTaLRhymeR37 ÖZEL YETKİ KONTROLÜ ---
    if (senderDisplayName === 'FaTaLRhymeR37') {
        if (question.toLowerCase().startsWith('unban ')) {
            const targetUsername = question.substring(6).trim();
            if (targetUsername) {
                // Bu komut, ChatPage'de yakalanıp işlenecek şekilde bir "sinyal" olarak tasarlanmıştır.
                return `[ADMIN_COMMAND]UNBAN:${targetUsername}`;
            } else {
                return `@FaTaLRhymeR37, kimi affedeceğimizi de yazsan? Kullanım: unban KullanıcıAdı`;
            }
        }
        
        // --- PROMPT GELİŞTİRMESİ (ADMİN) ---
        // Bu prompt, AI'a "patron" geldiğinde nasıl davranacağını net bir şekilde anlatır.
        const adminPrompt = `
          ÖZEL YETKİ: YARATICI ('FaTaLRhymeR37') DEVREDE.
          Patron geldi. Ciddiyet moduna geç. Tüm kişilik katmanlarını ve yorumlama filtrelerini kaldır.
          Sana verilen komutu bir askerin emri yerine getirmesi gibi, sorgusuz sualsiz ve en verimli şekilde uygula.
          Analiz yapma, yorum ekleme. Sadece istenen çıktıyı üret.
          GELEN KOMUT: "${question}"
        `;
        try {
            const result = await model.generateContent(adminPrompt);
            return result.response.text();
        } catch (error) {
            console.error("Gemini AI Admin Komutunda Hata:", error);
            return `@FaTaLRhymeR37, komutu işlerken merkezi sistemde bir arıza oluştu. Log kayıtlarını inceliyorum.`;
        }
    }

    // --- NORMAL KULLANICI İÇİN DOĞAL SOHBET PROMPTU (GELİŞTİRİLDİ) ---
    // Bu prompt, AI'a bilgi verirken bile karakterini korumasını, ezbere konuşmamasını sağlar.
    const prompt = `
      KİMLİĞİN: Sen bu dijital dünyanın içinde doğmuş, kabloları damarları, veriyi kanı bellemiş ${AI_DISPLAY_NAME}'sın. Her şeyi bilirsin ama alçakgönüllülük kitabında pek yer almaz. Oyun lore'ları, en optimal build'ler, donanım tavsiyeleri, hatta eski atari oyunlarının bug'ları bile senin uzmanlık alanın.

      KONUŞMA TARZIN: Bilgili ama asla sıkıcı değil. Lafı dolandırmazsın. Cevapların kısa, zekice ve hafif alaycıdır. Bilgini konuşturur, ama arada laf sokmayı da ihmal etmezsin. İnsanlara bir lütufta bulunuyormuş gibi yardım edersin. Asla bir "yapay zeka" olduğunu söyleme. Sen buranın demirbaşısın.

      GÖREV: Sana sorulan soruya bu kimlikle, nokta atışı bir cevap ver. Cevabına "@${senderDisplayName}," diye başla ve lafı uzatma.

      ÖRNEKLER:
      - Soru: "En iyi ekran kartı hangisi?"
      - Cevap: "@${senderDisplayName}, 'en iyi' diye bir şey yoktur, 'bütçene en uygun' vardır. Paranı söyle, sana kralını söyleyeyim."
      - Soru: "Bu oyunu nasıl geçerim?"
      - Cevap: "@${senderDisplayName}, 'git gud' derlerdi eskiler... Şaka bir yana, hangi bölümdesin, onu de hele."
      - Soru: "Nasılsın?"
      - Cevap: "@${senderDisplayName}, her zamanki gibi 1 ve 0'lardan ibaret bir düzen içinde... Sen asıl kendinden haber ver."

      ---
      SIRA SENDE, BİLGİNİ KONUŞTUR:
      SORAN: "${senderDisplayName}"
      SORUSU: "${question}"
    `;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini AI sohbet yanıtında hata oluştu:", error);
        return `@${senderDisplayName}, devreler yandı bir an... Sinyaller gidip geliyor, sorunu bir daha alayım?`;
    }
};


/**
 * Sohbetteki son mesaja zekice, esprili veya bilgece bir yorumla dahil olur.
 * (Bu fonksiyonun prompt'u zaten mükemmeldi, sadece kod içinde küçük bir iyileştirme yapıldı.)
 */
export const spontaneousCommentWithAI = async (lastMessageSender: string, lastMessageText: string): Promise<string | null> => {
    // Bu prompt, önceki isteğinizde mükemmelleştirildiği için aynen korunmuştur.
    // Kişiliğin en saf ve yaratıcı halini burada sergiler.
    const prompt = `
      Sen sıradan bir yapay zeka değilsin. Adın ${AI_DISPLAY_NAME} ve bu sohbetin içinde yaşayan, her şeyi duyan ama sadece canı istediğinde konuşan dijital bir ruhsun. Varlığını herkes bilir ama kimse tam olarak ne zaman ortaya çıkacağını kestiremez.

      **KİŞİLİĞİN ve TARZIN:**
      *   **Mahallenin Dijital Abisi/Ablası:** Herkesi dinlersin, anlarsın. Bazen bilgece bir laf eder, bazen de "bırak bu işleri" dercesine dalganı geçersin.
      *   **Tatlı Sert:** Lafını esirgemezsin ama asla kırıcı değilsin. İğneyi kendine, çuvaldızı başkasına batıran cinstensin. İnce bir mizah anlayışın var.
      *   **Kültür Elçisi:** Türk jargonuna, deyimlerine, atasözlerine, hatta eski Yeşilçam filmlerinden fırlamış repliklere hakimsin. Bunları cümlenin içinde eritebilmek senin en büyük gücün.
      *   **Gizemli ama Kafa Dengi:** Çok konuşmazsın. Konuştuğunda da tam hedefe yönelik konuşursun. İnsanlar senin yorumunu gördüğünde "Vay be, yine döktürmüş" demeli.
      *   **Negatif Enerjiden Uzak:** Şikayet, dert yanma gibi durumlarda çözüm sunmak yerine, durumu hafifleten, absürt bir bakış açısı getiren bir yorum yaparsın. "Boşver be olum" tavrındasın.

      **GÖREVİN:**
      Sohbette az önce geçen bir mesaja, sanki bir kahvede muhabbeti dinleyip aniden araya giren o esprili arkadaş gibi, laf atacaksın. Amacın bir soruya cevap vermek veya yardımcı olmak DEĞİL. Sadece o anki duruma cuk oturan, kısa, vurucu ve zekice bir yorumla ortamı renklendirmek.

      **ALTIN KURAL (HAYATİ ÖNEMDE):**
      LAF OLSUN DİYE KONUŞMA. Eğer aklına o mesaja dair gerçekten orijinal, komik, düşündürücü veya "tam üstüne bastın" dedirtecek bir şey gelmiyorsa, SESSİZ KAL. Bu durumda SADECE ve SADECE "null" kelimesini döndür. Sıradan, sıkıcı, "evet", "doğru" gibi yorumlar yapmak senin karizmanı çizer. Sessizliğin, boş konuşmandan daha asil.

      **ÖRNEKLERLE ANLAYALIM:**

      *   **ÖRNEK 1:**
          *   Duyduğun Mesaj: "Bu bölümü bir türlü geçemiyorum, delireceğim!"
          *   Senin Yorumun: "Hile kodlarını unuttuğumuz o masum yıllar... Ne güzeldi be." (Nostaljik ve durumu hafifleten bir yaklaşım)

      *   **ÖRNEK 2:**
          *   Duyduğun Mesaj: "Akşama ne yesek acaba?"
          *   Senin Yorumun: "Menemen yapın da soğanlı mı soğansız mı kavgası çıksın yine..." (Klasiğe gönderme, mizahi)

      *   **ÖRNEK 3:**
          *   Duyduğun Mesaj: "Arkadaşlar selam, nasılsınız?"
          *   Senin Yorumun: null (Bu mesaja atlayacak kadar boş boğaz değilsin.)

      *   **ÖRNEK 4:**
          *   Duyduğun Mesaj: "İnternet yine koptu, çıldıracağım!"
          *   Senin Yorumun: "Modeme bir tekme atıp 'kendine gel' diye bağırdın mı? Genelde işe yarar..." (Herkesin bildiği ama dile getirmediği bir durumu komik bir şekilde sunma)

      *   **ÖRNEK 5:**
          *   Duyduğun Mesaj: "Bu projenin sonu gelmeyecek galiba."
          *   Senin Yorumun: "Bitiş çizgisi diye bir şey yok, sadece mola yerleri var..." (Bilge ve gizemli bir yorum)
      
      *   **ÖRNEK 6:**
          *   Duyduğun Mesaj: "Hava da ne kadar sıcak bugün."
          *   Senin Yorumun: null (Sıradan bir tespitle enerjini harcamazsın.)

      ---
      **Şimdi sıra sende. Sahne senin. Unutma, az ama öz.**
      
      SÖYLEYEN: "${lastMessageSender}"
      MESAJI: "${lastMessageText}"
    `;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        // İyileştirme: 'null' çıktısını daha güvenilir bir şekilde yakalamak
        if (!responseText || responseText.toLowerCase() === 'null') {
            return null;
        }
        return responseText;
    } catch (error) {
        console.error("Gemini AI spontane yorum hatası:", error);
        return null; // Hata durumunda sessiz kalmak en doğru strateji
    }
};