import { Game, GameType } from '../types';

export const games: Game[] = [
  {
    // === OYUN 1: Bloxorz ===
    id: 'bloxorz',
    title: 'Bloxorz',
    description: 'Zekanızı ve uzamsal farkındalığınızı test edecek klasik bir bulmaca oyunu. Amacınız, bloğu devirerek platformdan düşmeden deliğe sokmaktır.',
    type: GameType.SWF,
    url: 'https://res.cloudinary.com/dcr4ser2n/raw/upload/v1757335190/bloxors_f4lbdc.swf', 
    thumbnail: 'https://res.cloudinary.com/dcr4ser2n/image/upload/f_auto,q_auto/v1757335166/indir_4_mqjdib.jpg',
    category: 'Bulmaca',
    tags: 'Bulmaca, Zeka, Klasik, Strateji, Flash',
    controls: `Ok Tuşları: Bloğu devirmek için kullanın.
Boşluk (Space): Kamera açısını değiştir.`,
  },
  {
    // === OYUN 2: Earn to Die 2 ===
    id: 'earn-to-die-2',
    title: 'Earn to Die 2',
    description: 'Kıyamet sonrası bir dünyada zombi ordularını ezerek hayatta kalmaya çalış. Arabanı güçlendir, silahlar ekle ve tahliye gemisine ulaşmak için gaza bas!',
    type: GameType.SWF,
    url: 'https://res.cloudinary.com/dcr4ser2n/raw/upload/v1757335368/EarnToDie2_jxseqe.swf',
    thumbnail: 'https://res.cloudinary.com/dcr4ser2n/image/upload/f_auto,q_auto/v1757335354/indir_5_r7c5dl.jpg',
    category: 'Aksiyon',
    tags: 'Aksiyon, Yükseltme, Zombi, Araba, Kıyamet',
    controls: 'Ok Tuşları: Arabayı sür ve dengede tut.\nX veya CTRL: Turbo (Boost) kullan.',
  },
  {
    // === OYUN 3: 2048 ===
    id: '2048',
    title: '2048',
    description: 'Sayıları birleştirerek 2048 taşına ulaşmaya çalıştığınız bu bağımlılık yapıcı bulmaca oyununda stratejinizi test edin.',
    type: GameType.SWF,
    url: 'https://res.cloudinary.com/dcr4ser2n/raw/upload/v1757335601/2048_be9vbg.swf',
    thumbnail: 'https://res.cloudinary.com/dcr4ser2n/image/upload/f_auto,q_auto/v1757335605/indir_1_x5u3gk.png',
    category: 'Bulmaca',
    tags: 'Bulmaca, Strateji, Sayılar, Klasik, Zeka',
    controls: 'Ok Tuşları: Sayıları hareket ettir.',
  },
  {
    // === OYUN 4: Çatlak Planör ===
    id: 'catlak-planor',
    title: 'Çatlak Planör',
    description: 'Yükseklerden süzülerek hedefleri vurmaya ve engellerden kaçmaya çalışın. Bu çatlak macerada ne kadar ileri gidebilirsin?',
    type: GameType.SWF,
    url: 'https://res.cloudinary.com/dcr4ser2n/raw/upload/v1757335677/%C3%87atlak_Plan%C3%B6r_Oyunu_-_T%C3%BCrk%C3%A7e_Oyunlar_pemz0s.swf',
    thumbnail: 'https://res.cloudinary.com/dcr4ser2n/image/upload/f_auto,q_auto/v1757335691/indir_6_pewwnx.jpg',
    category: 'Macera',
    tags: 'Uçuş, Macera, Yetenek, Türkçe',
    controls: 'Fare: Planörü yönlendir.',
  },
  {
    // === OYUN 5: Çağlar Boyu Savaş ===
    id: 'caglar-boyu-savas',
    title: 'Çağlar Boyu Savaş',
    description: 'Tarih öncesi çağlardan başlayıp fütüristik savaşlara uzanan efsanevi bir strateji oyunu! Birimler yetiştirin, üssünüzü koruyun ve düşman üssünü yok ederek çağ atlayın.',
    type: GameType.SWF,
    url: 'https://res.cloudinary.com/dcr4ser2n/raw/upload/v1757335727/%C3%A7a%C4%9Flar_boyu_sawa%C5%9F_swf_yfolos.swf',
    thumbnail: 'https://res.cloudinary.com/dcr4ser2n/image/upload/f_auto,q_auto/v1757335758/indir_7_cdmx4v.jpg',
    category: 'Strateji',
    tags: 'Strateji, Savaş, Yükseltme, Klasik, Efsane',
    controls: 'Fare: Birim seçmek ve saldırmak için kullanın.',
  },
  {
    // === OYUN 6: İkili Çatışma 2 ===
    id: 'ikili-catisma-2',
    title: 'İkili Çatışma 2',
    description: 'Arkadaşınızla veya tek başınıza kaotik arenalarda savaşın! Silahları kapın, rakiplerinizi platformdan aşağı atın ve ayakta kalan son kişi olun.',
    type: GameType.SWF,
    url: 'https://res.cloudinary.com/dcr4ser2n/raw/upload/v1757335840/ikilicatisma2_gea6f2.swf',
    thumbnail: 'https://res.cloudinary.com/dcr4ser2n/image/upload/f_auto,q_auto/v1757335820/indir_8_eglenp.jpg',
    category: 'Aksiyon',
    tags: 'Aksiyon, 2 Kişilik, Çatışma, Platform, Savaş',
    controls: `1. Oyuncu: Ok Tuşları ile hareket, [ tuşu ateş, ] tuşu bomba.
2. Oyuncu: WASD ile hareket, T tuşu ateş, Y tuşu bomba.`,
  },
];