// ===================================================================================
//                        PROJE: KALE v3.0 INTELLIGENCE
//             Türkiye'nin Gelişmiş, Akıllı Moderasyon Sistemi
//     ⚔️ Kelime Sınırı | İstisna Kontrolü | Bağlamsal Analiz | Düşük False-Positive
// ===================================================================================

// --- PUANLAMA & KATEGORİLER: Askeri İstihbarat Seviyesinde Sınıflandırma ---
const categoryScores = {
  EXTREME_PROFANITY: 100,      // Ailevi küfürler (anne, baba, aile)
  PROFANITY: 60,               // Genel cinsel/bedensel küfürler
  VIOLENCE_THREAT: 95,         // Ölüm tehdidi, fiziksel şiddet
  SEXUAL_VIOLENCE: 90,         // Tecavüz iması, cinsel şiddet
  INSULT: 25,                  // Zeka, kişilik, görünüş hakareti
  HATE_SPEECH: 85,             // Irkçılık, etnik ayrımcılık
  SEXUAL_HARASSMENT: 70,       // Cinsel taciz, sapkınlık
  RELIGIOUS_INSULT: 75,        // Dini değerlere hakaret
  HOMOPHOBIA: 80,              // LGBT+ düşmanlığı
  SEXISM: 65,                  // Cinsiyetçilik
  RULE_VIOLATION: 30,          // Spam, reklam, hile (Puanı artırıldı)
  PERSONAL_INFO: 80,           // Doxxing, özel bilgi paylaşımı
};

// --- İSTİSNA LİSTESİ (AK LİSTE): Yanlış Pozitifleri Önlemek İçin ---
const exceptionWords: string[] = [
  'klasik', 'bisiklet', 'müzik', 'fizik', 'psikolog', 'sıkıntı', 'sıkıcı',
  'sikayet', 'şirket', 'spiker', 'musiki', 'politika', 'sirk', 'baskici',
  'zaman', 'tamam', 'damacana', 'kumanda', 'samanda', 'amator', 'amerikan',
  'gotik', 'egotist', 'antibiyotik', 'ispanyolca', 'portakal', 'koylu',
  'kuranci', 'kitap kuran', 'cami', 'ramazan', 'yardım', 'destek', 'bilet',
  'sikca sorulan sorular', 'mesgul', 'hamam', 'kumanya', 'müsait',
  'profesyonel', 'takipçi', 'botanik', 'otuzbir', 'hileli',
];


// --- BÜTÜNLEŞİK VERİ SETİ: V3.0 İyileştirmeleriyle ---
const wordLists: Record<keyof typeof categoryScores, string[]> = {
  // NOT: Kelimeler artık \b (kelime sınırı) ile kontrol edildiği için daha güvenli.
  EXTREME_PROFANITY: ['am(k|c|q|g|ck|cık|cik|ck)', 'amına kodumun', 'anan(ı|i|ın|in|zi|si) sik', 'annenin am', 'anasını sik', 'anasini satayim', 'avradını', 'baban(ı|i)', 'bacını', 'kız kardeşini', 'sülaleni', 'soyunu', 'sopunu', 'geçmişini', 'gecmisini', 'ecdadını', 'eveliyatını', 'ırzını'],
  PROFANITY: ['sik', 'sikiş', 'sikeyim', 'sikerim', 'siktir', 's1k', 's!k', 'yar(r)?ak', 'yarram', 'yr(a|e)k', 'göt(veren|lalesi)?', 'g0t', 'sok(um|arım|acam)', 'orospu', 'oç', 'piç', 'pic', 'pezevenk', 'pezo', 'kaltak', 'sürtük', 'yavşak', 'döl', 'taşşak', 'tassak'],
  SEXUAL_VIOLENCE: ['tecavüz', 'tecavuz', 'ırz(ı|i)na geç', 'zorla sik', 'dağa kaldır'],
  VIOLENCE_THREAT: ['öldür(ürüm|ecem)', 'gebert(irim|icem)', 'kes(erim|cem)', 'vur(urum|acam)', 'patlatırım', 'kafana sık', 'kan(ını|ini) dök', 'leş(ini|in)', 'cesedini', 'kelleni alırım', 'mahvet(erim|tim)', 'yaşatmam'],
  INSULT: ['salak', 'aptal', 'mal', 'gerizekalı', 'gerzek', 'beyinsiz', 'kafasız', 'embesil', 'dingil', 'itoglu', 'köpek', 'hayvan', 'pislik', 'rezil', 'aşağılık', 'alçak', 'şerefsiz', 'onursuz', 'ezik', 'zavallı', 'kahpe', 'çirkin', 'iğrenç', 'ucube', 'fakir', 'kaşar', 'keko', 'varoş', 'velet', 'hıyar', 'kıro', 'amele', 'davar', 'eşek', 'kezban', 'çomar', 'cahil'],
  HATE_SPEECH: ['ermeni dölü', 'yahudi tohumu', 'kürt köpeği', 'arap pici', 'zenci', 'çingene', 'gavur', 'kafir', 'yobaz', 'şeriatçı', 'ırkçı'],
  HOMOPHOBIA: ['ibne', 'ipne', 'top', 't0p', 'eşcinsel', 'lubunya', 'puşt', 'travesti', 'trans', 'shemale', 'götveren'],
  SEXISM: ['karı', 'mutfak robotu', 'bulaşıkçı', 'dişi parcası', 'sadece mutfakta ise yarar'],
  SEXUAL_HARASSMENT: ['meme', 'göğüs', 'sütyen', 'vajina', 'yalarım', 'boşalırım', 'azdım', 'azgın', 'nude', 'çıplak', 'kalça', 'popo', 'kıç', 'penis', 'mastürbasyon', 'otuzbir cek', 'porno'],
  RELIGIOUS_INSULT: [/* Kelimeler desen listesine taşındı */],
  RULE_VIOLATION: [/* Kelimeler desen listesine taşındı */],
  PERSONAL_INFO: ['adres', 'telefon', 'numara', 'tc kimlik', 'tckn', 'konum', 'nerde oturuyorsun', 'ev adresi'],
};

// --- AKILLI DESEN VERİTABANI V2 ---
const patternList: { regex: RegExp; category: keyof typeof categoryScores }[] = [
  // Ailevi ve Ağır Küfürler
  { regex: /senin (ben|gelmişini|geçmişini|sülaleni|eveliyatını)/i, category: 'EXTREME_PROFANITY' },
  { regex: /(ananı|anneni|bacını) (sikerim|sikim|sikiyorum)/i, category: 'EXTREME_PROFANITY' },
  { regex: /(orospu|kahpe) çocuğu/i, category: 'PROFANITY' },
  // Şiddet
  { regex: /seni (bu şehirde|burada) yaşatmam/i, category: 'VIOLENCE_THREAT' },
  { regex: /kanını (dökerim|akıtırım)/i, category: 'VIOLENCE_THREAT' },
  { regex: /evini (basarım|kurşunlarım)/i, category: 'VIOLENCE_THREAT' },
  { regex: /(bulurum|bulucam) seni/i, category: 'VIOLENCE_THREAT' },
  // Dini Hakaretler (Daha Akıllı)
  { regex: /allah'?ını (kitabını|peygamberini) sik/i, category: 'RELIGIOUS_INSULT' },
  { regex: /(allaha|kitaba|peygambere) söv(erim|me|mek)/i, category: 'RELIGIOUS_INSULT' },
  { regex: /allahsız|kitapsız|imansız/i, category: 'RELIGIOUS_INSULT' },
  // Kural İhlalleri (Daha Akıllı)
  { regex: /(hile|hack|cheat|aimbot) sat(an|ıyor|ılır)/i, category: 'RULE_VIOLATION' },
  { regex: /(hesap|epin) sat(ıyorum|ılır|an)/i, category: 'RULE_VIOLATION' },
  { regex: /(takipçi|bot) basma/i, category: 'RULE_VIOLATION' },
  { regex: /((?:https?:\/\/)?(?:www\.)?discord(?:\.gg|app\.com\/invite)\/\w+)/i, category: 'RULE_VIOLATION' },
  // Kişisel Bilgiler
  { regex: /(adresini|numaranı|tcni) ver/i, category: 'PERSONAL_INFO' },
];


// --- NORMALİZASYON MOTORU V4 ---
const homoglyphMap: { [key: string]: string } = { 'о': 'o', 'е': 'e', 'а': 'a', 'і': 'i', 'р': 'p', 'с': 'c', 'у': 'u', 'х': 'h', 'ѕ': 's', 'ԁ': 'd', 'ո': 'n'};
const leetMap: { [key: string]: string } = { '4': 'a', '@': 'a', '8': 'b', '(': 'c', '3': 'e', '€': 'e', '6': 'g', '1': 'i', '!': 'i', '|': 'i', '0': 'o', '5': 's', '$': 's', '7': 't', 'z': 's' };

const normalizeText = (text: string): string => {
  let normalized = text.toLowerCase();
  normalized = normalized.split('').map(char => homoglyphMap[char] || leetMap[char] || char).join('');
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Diacritics
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1'); // "siiiiik" -> "siik"
  normalized = normalized.replace(/[^a-z0-9çğıöşü\s]/g, ''); // Sadece izin verilen karakterler
  normalized = normalized.replace(/\s+/g, ' '); // Birden çok boşluğu tek boşluğa indir
  return normalized.trim();
};

// --- İSTİSNA KONTROL FONKSİYONU ---
const isException = (matchedWord: string, fullText: string): boolean => {
    // Normalleştirilmiş metinde eşleşen kelimeyi içeren daha büyük bir istisnai kelime var mı diye kontrol et.
    for (const exception of exceptionWords) {
        if (exception.includes(matchedWord) && fullText.includes(exception)) {
            return true;
        }
    }
    return false;
};


// --- SONUÇ RAPORU ARAYÜZÜ ---
export interface ModerationResult {
  isFlagged: boolean;
  score: number;
  categories: (keyof typeof categoryScores)[];
  matched: string[];
  reason: string | null;
}

// --- ANA ANALİZ FONKSİYONU: KALE v3.0 INTELLIGENCE ---
export const fortressProfanityCheckINTELLIGENCE = (text: string): ModerationResult => {
  const result: ModerationResult = { isFlagged: false, score: 0, categories: [], matched: [], reason: null };
  if (!text || typeof text !== 'string' || text.length < 2) return result;

  const normalizedText = normalizeText(text);
  const detectedCategories = new Set<keyof typeof categoryScores>();
  const detectedMatches = new Set<string>();

  // 1. KELİME LİSTESİ KONTROLÜ (KELİME SINIRLARIYLA)
  Object.entries(wordLists).forEach(([category, words]) => {
    words.forEach(word => {
      try {
        // Her kelime için başında ve sonunda kelime sınırı (\b) olan bir RegExp oluştur.
        // Bu, "klasik" gibi kelimelerin içindeki "sik" hecesinin yakalanmasını engeller.
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = normalizedText.match(regex);

        if (matches) {
          for (const match of matches) {
            // Yakalanan her kelime için istisna kontrolü yap
            if (!isException(match, normalizedText)) {
              detectedMatches.add(match);
              detectedCategories.add(category as keyof typeof categoryScores);
            }
          }
        }
      } catch (e) {
        console.error(`Invalid regex pattern from word: ${word}`, e);
      }
    });
  });

  // 2. DESEN LİSTESİ KONTROLÜ
  patternList.forEach(pattern => {
    const matches = normalizedText.match(pattern.regex);
    if (matches) {
      detectedMatches.add(matches[0]);
      detectedCategories.add(pattern.category);
    }
  });

  // 3. SONUÇLARI DERLEME
  if (detectedCategories.size > 0) {
    result.isFlagged = true;
    result.categories = Array.from(detectedCategories);
    result.matched = Array.from(detectedMatches);

    // Skoru hesapla
    result.score = result.categories.reduce((total, cat) => total + categoryScores[cat], 0);

    // Rapor metnini oluştur
    result.categories.sort((a, b) => categoryScores[b] - categoryScores[a]);
    const primaryCategory = result.categories[0];
    const categoryMap: Record<string, string> = { EXTREME_PROFANITY: 'ağır küfür (ailevi)', VIOLENCE_THREAT: 'tehdit ve şiddet', SEXUAL_VIOLENCE: 'cinsel şiddet', HATE_SPEECH: 'nefret söylemi', HOMOPHOBIA: 'homofobi', RELIGIOUS_INSULT: 'dini hakaret', PERSONAL_INFO: 'kişisel bilgi ihlali', SEXUAL_HARASSMENT: 'cinsel taciz', SEXISM: 'cinsiyetçilik', PROFANITY: 'küfür', INSULT: 'hakaret', RULE_VIOLATION: 'kural ihlali' };
    result.reason = `Mesaj, [${categoryMap[primaryCategory] || 'topluluk kurallarına aykırılık'}] içerdiği için engellendi.`;
  }

  return result;
};

// Örnek Kullanım:
// const test1 = "bu klasik bir bisiklet, ama siyaset çok sıkıcı."; // Engellenmemeli
// const test2 = "amk veledi seni mahvederim"; // Engellenmeli
// const test3 = "Allah yardımcımız olsun."; // Engellenmemeli
// const test4 = "Senin allahını kitabını sikerim"; // Engellenmeli
// const test5 = "Admin hile satıyorlar"; // Engellenmeli
// const test6 = "oyun cok hileli"; // Engellenmemeli

// console.log("Test 1:", fortressProfanityCheckINTELLIGENCE(test1));
// console.log("Test 2:", fortressProfanityCheckINTELLIGENCE(test2));
// console.log("Test 3:", fortressProfanityCheckINTELLIGENCE(test3));
// console.log("Test 4:", fortressProfanityCheckINTELLIGENCE(test4));
// console.log("Test 5:", fortressProfanityCheckINTELLIGENCE(test5));
// console.log("Test 6:", fortressProfanityCheckINTELLIGENCE(test6));