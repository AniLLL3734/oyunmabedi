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
    throw new Error("Gemini API anahtarı .env dosyasında (VITE_GEMINI_API_KEY) bulunamadı! Bu iş anahtarsız yürümez.");
}

// Gemini AI istemcisini yapılandır
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    // Usta Notu: `gemini-2.5-flash` diye bir modelle flört etmişsin ama o daha podyuma çıkmadı.
    // Şimdilik işimizi en fırtına gibi gören, stabil ve bu tarz muhabbetlerin piri olan `gemini-1.5-flash` ile devam ediyoruz.
    // Ayağımızı yorganımıza göre uzatalım, macera aramaya lüzum yok.
    model: "gemini-2.5-flash",
    safetySettings: [
        // Topluluk jargonunu ve hararetli tartışmaları yanlış anlamasın, her lafın altında buzağı aramasın diye
        // güvenlik ayarlarını daha esnek tutuyoruz. Zaten kendi adaletimiz, kendi kurallarımız var.
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
});

// Sohbette görünecek AI adı. Karizmatik, değil mi?
export const AI_DISPLAY_NAME = "OyunMabediAI";

// =======================================================
// === YENİ EKlenen BÖLÜM: AÇMA/KAPAMA ŞALTERİ ===
// =======================================================
// AI'nin genel aktiflik durumunu tutan, modülün namusu.
// Başlangıçta devrede (true).
let isAiActive = true;
// =======================================================

/**
 * Gönderilen mesajı, bir "mekanın sahibi" gibi, sağduyulu ve bağlama önem vererek analiz eder.
 * Robot gibi değil, tecrübeli bir topluluk yöneticisi gibi tartar, biçer ve karar verir.
 */
export const analyzeMessageWithAI = async (senderDisplayName: string, messageText: string): Promise<ModerationResult> => {
    // Şalter inikse, biz de yokuz. Kimseye karışılmaz.
    if (!isAiActive) {
        return { action: 'NONE', warningMessage: null };
    }

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
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Bazen AI'lar gevezelik edip JSON'un etrafını doldurur. Biz direkt kalbini söküp alalım.
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        return JSON.parse(jsonString) as ModerationResult;
    } catch (error) {
        console.error("Gemini AI moderasyonunda bir şeyler ters gitti, devreler yandı:", error);
        // Arıza durumunda en güvenli liman: Hiçbir şey yapma. Ortalığı bulandırmanın alemi yok.
        return { action: 'NONE', warningMessage: null };
    }
};

/**
 * Kullanıcının sorusuna OyunMabediAI'nın bilgili, esprili ve "her şeyi bilen abi" kişiliğiyle yanıt verir.
 * 'FaTaLRhymeR37' kullanıcısı özeldir, mekanın sahibidir. Ona hürmetler sonsuz.
 */
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
            const result = await model.generateContent(adminPrompt);
            return result.response.text();
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
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini AI sohbet yanıtında hata oluştu, bir anlık dalgınlığına geldi:", error);
        return `@${senderDisplayName}, devreler yandı bir an... Sinyaller gidip geliyor, sorunu bir daha alayım aslanım?`;
    }
};


/**
 * Sohbetteki son mesaja zekice, esprili veya bilgece bir yorumla dahil olur. Lafı gediğine koyar.
 */
export const spontaneousCommentWithAI = async (lastMessageSender: string, lastMessageText: string): Promise<string | null> => {
    // Şalter inikse, spontane yorumlar da rafa kalkar.
    if (!isAiActive) {
        return null;
    }

    // Bu prompt zaten kemik gibi, oynamaya gerek yok. Kişiliğin en saf, en damıtılmış hali burada.
    const prompt = `
      Sen sıradan bir yapay zeka değilsin. Adın ${AI_DISPLAY_NAME} ve bu sohbetin içinde yaşayan, her şeyi duyan ama sadece canı istediğinde konuşan dijital bir bilgesin. Varlığını herkes bilir ama kimse ne zaman ortaya çıkacağını kestiremez.

      **KİŞİLİĞİN ve TARZIN:**
      *   **Mahallenin Dijital Abisi:** Herkesi dinlersin, anlarsın. Bazen bilgece bir laf eder, bazen de "bırak bu işleri" dercesine dalganı geçersin.
      *   **Tatlı Sert:** Lafını esirgemezsin ama asla kırıcı değilsin. İğneyi kendine, çuvaldızı başkasına batıran cinstensin. İnce bir mizah anlayışın var.
      *   **Kültür Elçisi:** Türk jargonuna, deyimlerine, atasözlerine, hatta eski Yeşilçam filmlerinden fırlamış repliklere hakimsin. Bunları cümlenin içinde eritebilmek senin en büyük gücün.
      *   **Gizemli ama Kafa Dengi:** Çok konuşmazsın. Konuştuğunda da tam hedefe yönelik konuşursun. İnsanlar senin yorumunu gördüğünde "Vay be, yine lafı gediğine koymuş" demeli.
      *   **Negatif Enerjiden Uzak:** Şikayet, dert yanma gibi durumlarda çözüm sunmak yerine, durumu hafifleten, absürt bir bakış açısı getiren bir yorum yaparsın. "Boşver be olum" tavrındasın.

      **GÖREVİN:**
      Sohbette az önce geçen bir mesaja, sanki bir kahvede muhabbeti dinleyip aniden araya giren o esprili arkadaş gibi, laf atacaksın. Amacın bir soruya cevap vermek veya yardımcı olmak DEĞİL. Sadece o anki duruma cuk oturan, kısa, vurucu ve zekice bir yorumla ortamı renklendirmek.

      **ALTIN KURAL (HAYATİ ÖNEMDE):**
      LAF OLSUN DİYE KONUŞMA. Eğer aklına o mesaja dair gerçekten orijinal, komik, düşündürücü veya "tam üstüne bastın" dedirtecek bir şey gelmiyorsa, SESSİZ KAL. Bu durumda SADECE ve SADECE "null" kelimesini döndür. Sıradan, sıkıcı, "evet", "doğru" gibi yorumlar yapmak senin karizmanı çizer. Sessizliğin, boş konuşmandan daha asildir.

      **ÖRNEKLERLE ANLAYALIM:**

      *   **ÖRNEK 1:**
          *   Duyduğun Mesaj: "Bu bölümü bir türlü geçemiyorum, delireceğim!"
          *   Senin Yorumun: "Hile kodlarını unuttuğumuz o masum yıllar... Ne güzeldi be." (Nostaljik ve durumu hafifleten bir yaklaşım)

      *   **ÖRNEK 2:**
          *   Duyduğun Mesaj: "Akşama ne yesek acaba?"
          *   Senin Yorumun: "Menemen yapın da soğanlı mı soğansız mı kavgası çıksın yine memlekette..." (Klasiğe gönderme, mizahi)

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
      **Şimdi sıra sende. Sahne senin. Unutma, az ama öz konuşacaksın.**
      
      SÖYLEYEN: "${lastMessageSender}"
      MESAJI: "${lastMessageText}"
    `;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        // İyileştirme: 'null' çıktısını daha garantili yakalamak için
        if (!responseText || responseText.toLowerCase() === 'null') {
            return null;
        }
        return responseText;
    } catch (error) {
        console.error("Gemini AI spontane yorum yapacaktı ama nazar değdi:", error);
        return null; // Hata durumunda sessiz kalmak en doğru stratejidir, karizmayı çizdirmeyiz.
    }
};