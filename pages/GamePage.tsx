import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { games } from '../data/games';
import RufflePlayer from '../components/RufflePlayer';
import { Game, GameType } from '../types';
import { ArrowLeft, Gamepad2, Fullscreen, Info, Play, LoaderCircle } from 'lucide-react';
import { db } from '../src/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';
import CommentSection from '../components/CommentSection';

// Framer Motion için sayfa geçiş animasyonları
const pageVariants = {
    initial: { opacity: 0, scale: 0.9 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 0.9 },
};
const pageTransition = {
    type: 'spring',
    stiffness: 260,
    damping: 20,
} as const;

// Oyun sayfası bileşeni
const GamePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const game: Game | undefined = games.find((g) => g.id === id);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const playCountTracked = useRef(false);

    // Akıllı ön yükleme için gerekli state'ler
    const [gameStarted, setGameStarted] = useState(false);
    const [isPreloading, setIsPreloading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Akıllı Önden Yükleme Effect'i: Sayfa açıldığında oyunu arka planda indirmeye başlar.
    useEffect(() => {
        // Eğer oyun bulunamazsa veya SWF değilse işlem yapma.
        if (!game || game.type !== GameType.SWF) {
            setIsPreloading(false);
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const preloadGame = async () => {
            setIsPreloading(true);
            setLoadingProgress(0);
            setError(null);
            console.log(`[Preload] ${game.title} indirmesi başlatıldı.`);

            try {
                const response = await fetch(game.url, { signal });
                if (!response.ok) {
                    throw new Error(`Dosya sunucudan yüklenemedi (status: ${response.status})`);
                }
                
                const total = Number(response.headers.get('content-length'));
                if (!total) {
                  console.warn('[Preload] Content-Length başlığı bulunamadı, ilerleme çubuğu gösterilemeyecek.');
                }
                let loaded = 0;

                const reader = response.body?.getReader();
                if (!reader) throw new Error("Sunucu yanıtının gövdesi okunamıyor.");

                // Veriyi akış olarak oku ve indirme ilerlemesini anlık güncelle
                const stream = new ReadableStream({
                    async start(controller) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            loaded += value.length;
                            if (total > 0) {
                                setLoadingProgress(Math.round((loaded / total) * 100));
                            }
                            controller.enqueue(value);
                        }
                        controller.close();
                    },
                });

                // Akışı bir Blob nesnesine dönüştür (hafızada tutulan dosya)
                const blob = await new Response(stream).blob();
                setBlobUrl(URL.createObjectURL(blob));
                setIsPreloading(false);
                console.log(`[Preload] ${game.title} başarıyla indirildi ve hafızaya alındı.`);

            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("[Preload] Hata:", err);
                    setError("Oyun indirilirken bir hata oluştu. İnternet bağlantınızı kontrol edip sayfayı yenileyin.");
                    setIsPreloading(false);
                }
            }
        };

        preloadGame();

        return () => {
            // Kullanıcı sayfadan ayrılırsa, devam eden indirmeyi iptal et
            controller.abort();
            console.log(`[Preload] ${game?.title} indirmesi iptal edildi.`);
            // Hafızada oluşturulan geçici Blob URL'yi temizle
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [id, game]); // id veya game değişirse effect'i yeniden çalıştır

    // "Tam Ekran" butonunun fonksiyonu
    const handleFullScreen = () => {
        if (gameContainerRef.current && gameStarted) {
            gameContainerRef.current.requestFullscreen().catch(err => {
              console.error(`Tam ekran modu hatası: ${err.message} (${err.name})`);
            });
        }
    };
    
    // "Oyna" butonuna tıklandığında oyunu başlatır
    const handleStartGame = () => {
        if (isPreloading || error) return;
        
        setGameStarted(true);

        if (!playCountTracked.current && id) {
            playCountTracked.current = true;
            const gameRef = doc(db, 'games', id);
            setDoc(gameRef, { playCount: increment(1) }, { merge: true });
        }
    };
    
    // Eğer URL'deki id ile eşleşen bir oyun bulunamazsa 404 sayfası gösterilir
    if (!game) {
        return (
          <div className="text-center py-20">
            <h1 className="text-4xl font-heading">404 - Sinyal Kayboldu</h1>
            <p className="mt-4 text-cyber-gray">Aradığınız simülasyon bu evrende bulunamadı.</p>
            <Link to="/" className="mt-8 inline-block bg-electric-purple text-ghost-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all">
              Ana Üsse Dön
            </Link>
          </div>
        );
    }
    
    // İndirme durumuna göre "Oyna" butonunun içeriğini dinamik olarak oluşturan fonksiyon
    const getButtonContent = () => {
        if (error) return <span className='text-red-400 font-semibold px-4'>{error}</span>;
        if (isPreloading) return (
            <>
                <LoaderCircle size={48} className="text-white animate-spin" />
                <span className="text-white text-xl font-bold font-heading tracking-widest">{loadingProgress}%</span>
            </>
        );
        return (
            <>
                <div className="p-4 bg-black/50 rounded-full group-hover:scale-110 group-hover:bg-electric-purple transition-transform">
                    <Play size={64} className="text-white ml-2" />
                </div>
                <span className="text-white text-2xl font-bold font-heading tracking-widest">OYNA</span>
            </>
        );
    };

    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="max-w-7xl mx-auto px-4" // Sayfaya genel bir padding ekleyelim
        >
            <Link to="/" className="inline-flex items-center gap-2 text-cyber-gray hover:text-electric-purple my-6 transition-colors">
                <ArrowLeft size={20} />
                <span>Diğer Simülasyonlara Dön</span>
            </Link>

            <div className="bg-dark-gray p-4 md:p-8 rounded-lg border border-cyber-gray/50">
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-3xl md:text-4xl font-bold font-heading">{game.title}</h1>
                    <button onClick={handleFullScreen} disabled={!gameStarted} className="flex items-center gap-2 bg-cyber-gray/50 text-ghost-white py-2 px-3 rounded-md hover:bg-electric-purple group transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Tam Ekran">
                        <Fullscreen className="text-ghost-white group-hover:text-white" size={20} />
                        <span className="hidden md:block">Tam Ekran</span>
                    </button>
                </div>
                
                <div ref={gameContainerRef} className="w-full aspect-video bg-space-black rounded-md overflow-hidden border border-cyber-gray/50 mb-6 relative">
                    {!gameStarted ? (
                        <div className={`w-full h-full flex items-center justify-center group ${!isPreloading && !error ? 'cursor-pointer' : 'cursor-default'}`} onClick={handleStartGame}>
                            <img src={game.thumbnail} alt={`${game.title} kapak resmi`} className="w-full h-full object-cover brightness-50 group-hover:brightness-75 transition-all" />
                            <div className="absolute flex flex-col items-center justify-center gap-4 text-center">
                               {getButtonContent()}
                            </div>
                        </div>
                    ) : (
                        game.type === GameType.SWF ? (
                            <RufflePlayer swfUrl={blobUrl!} />
                        ) : (
                            <iframe
                                src={game.url}
                                className="w-full h-full border-0"
                                sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
                                title={game.title}
                                allowFullScreen
                            ></iframe>
                        )
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                        <h2 className="text-2xl font-heading mb-3 flex items-center gap-2"><Gamepad2 size={24} className="text-electric-purple"/>Kontrol Protokolleri</h2>
                        <p className="text-ghost-white whitespace-pre-wrap font-mono bg-space-black p-4 rounded-md">{game.controls}</p>
                    </div>
                    <div>
                        <h2 className="text-2xl font-heading mb-3 flex items-center gap-2"><Info size={24} className="text-electric-purple"/>Simülasyon Özeti</h2>
                        <p className="text-cyber-gray">{game.description}</p>
                    </div>
                </div>
                
                <CommentSection gameId={game.id} />

            </div>
        </motion.div>
    );
};

export default GamePage;