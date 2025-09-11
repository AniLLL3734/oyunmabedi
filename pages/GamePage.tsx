import React, { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
// import { motion } from 'framer-motion'; // PERFORMANS İÇİN KALDIRILDI
import { games } from '../data/games';
import { Game, GameType } from '../types';
import { ArrowLeft, Gamepad2, Fullscreen, Info, Play, LoaderCircle } from 'lucide-react';
import { db } from '../src/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

// ================================================================================================
// LAZY LOADING
// ================================================================================================
const RufflePlayer = lazy(() => import('../components/RufflePlayer'));
const CommentSection = lazy(() => import('../components/CommentSection'));

// ================================================================================================
// SABİTLER
// ================================================================================================
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;
const CONNECTION_TIMEOUT = 15000;

// Yükleyici bileşeni
const GenericLoader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 text-cyber-gray h-full">
        <LoaderCircle size={32} className="animate-spin text-electric-purple" />
        <p className="mt-4">{message}</p>
    </div>
);

// ================================================================================================
// ANA BİLEŞEN: GamePage
// ================================================================================================
const GamePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const game = useMemo(() => games.find((g) => g.id === id), [id]);

    const gameContainerRef = useRef<HTMLDivElement>(null);
    const playCountTracked = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const retryCountRef = useRef(0);
    const preloadStarted = useRef(false);

    // State Management
    const [gameStarted, setGameStarted] = useState(false);
    const [isPreloading, setIsPreloading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadedKB, setLoadedKB] = useState(0);
    const [isTotalSizeKnown, setIsTotalSizeKnown] = useState(true);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Preload Fonksiyonu
    const preloadGame = useCallback(async () => {
        if (!game || game.type !== GameType.SWF || preloadStarted.current || blobUrl) return;
        
        preloadStarted.current = true;
        setIsPreloading(true);
        setLoadingProgress(0);
        setLoadedKB(0);
        setError(null);
        retryCountRef.current = 0;

        const tryPreload = async () => {
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;
            try {
                const response = await fetch(game.url, { signal });
                if (!response.ok) throw new Error(`Sunucu Hatası: ${response.status}`);
                
                const contentLength = Number(response.headers.get('content-length'));
                setIsTotalSizeKnown(!!contentLength && contentLength > 0);

                const reader = response.body?.getReader();
                if (!reader) throw new Error("Dosya akışı okunamıyor.");
                
                const chunks: Uint8Array[] = [];
                let loaded = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    loaded += value.length;
                    
                    if (contentLength > 0) {
                        setLoadingProgress(Math.round((loaded / contentLength) * 100));
                    } else {
                        setLoadedKB(Math.round(loaded / 1024));
                    }
                }
                
                const blob = new Blob(chunks, { type: 'application/x-shockwave-flash' });
                setBlobUrl(URL.createObjectURL(blob));
                setIsPreloading(false);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    if (retryCountRef.current < RETRY_ATTEMPTS) {
                        retryCountRef.current++;
                        setTimeout(tryPreload, RETRY_DELAY * retryCountRef.current);
                    } else {
                        setError("Oyun yüklenemedi. Sayfayı yenileyin.");
                        setIsPreloading(false);
                        preloadStarted.current = false;
                    }
                } else {
                     setIsPreloading(false);
                     preloadStarted.current = false;
                }
            }
        };

        tryPreload();
    }, [game, blobUrl]);

    // Cleanup Effect
    useEffect(() => {
        let currentBlobUrl = blobUrl;
        return () => { 
            abortControllerRef.current?.abort();
            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        };
    }, [blobUrl]);
    
    // Oyun Başlatma
    const handleStartGame = useCallback(() => {
        if (isPreloading || error) return;

        if (blobUrl) {
            setGameStarted(true);
            if (!playCountTracked.current && id) {
                playCountTracked.current = true;
                requestIdleCallback(() => {
                    setDoc(doc(db, 'games', id), { playCount: increment(1) }, { merge: true }).catch(console.error);
                });
            }
        } else if (game?.type === GameType.SWF) {
            preloadGame();
        } else {
            setGameStarted(true);
        }
    }, [isPreloading, error, id, blobUrl, preloadGame, game]);

    // Tam Ekran
    const handleFullScreen = useCallback(() => {
        if (gameContainerRef.current?.requestFullscreen) {
            gameContainerRef.current.requestFullscreen().catch(console.error);
        }
    }, []);

    // Memoized Buton İçeriği
    const buttonContent = useMemo(() => {
        if (error) return <span className='text-red-400 font-semibold px-4 text-center'>{error}</span>;
        if (isPreloading) {
            const progressText = isTotalSizeKnown
                ? `${loadingProgress}%`
                : (loadedKB > 0 ? `${loadedKB} KB` : 'Yükleniyor...');
            return (
                <>
                    <LoaderCircle size={48} className="text-white animate-spin" />
                    <span className="text-white text-xl font-bold font-heading tracking-widest">{progressText}</span>
                </>
            );
        }
        return (
            <>
                <div className="p-4 bg-black/50 rounded-full group-hover:scale-110 group-hover:bg-electric-purple transition-transform">
                    <Play size={64} className="text-white ml-2" />
                </div>
                <span className="text-white text-2xl font-bold font-heading tracking-widest">OYNA</span>
            </>
        );
    }, [error, isPreloading, loadingProgress, loadedKB, isTotalSizeKnown]);
    
    // 404 Sayfası
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
    
    return (
        <div className="max-w-7xl mx-auto px-4">
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
                        <div 
                            className={`w-full h-full flex items-center justify-center group ${!isPreloading && !error ? 'cursor-pointer' : 'cursor-default'}`} 
                            onClick={handleStartGame}
                            onMouseEnter={preloadGame}
                        >
                            <img 
                                src={game.thumbnail} 
                                alt={`${game.title} kapak resmi`} 
                                className="w-full h-full object-cover brightness-50 group-hover:brightness-75 transition-all"
                                loading="lazy"
                                decoding="async"
                            />
                            <div className="absolute flex flex-col items-center justify-center gap-4 text-center p-4">
                                {buttonContent}
                            </div>
                        </div>
                    ) : (
                        <Suspense fallback={<GenericLoader message="Oyun motoru başlatılıyor..." />}>
                            {game.type === GameType.SWF ? (
                                <RufflePlayer swfUrl={blobUrl!} />
                            ) : (
                                <iframe
                                    src={game.url}
                                    className="w-full h-full border-0"
                                    sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
                                    title={game.title}
                                    allowFullScreen
                                    loading="lazy"
                                />
                            )}
                        </Suspense>
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
                
                <Suspense fallback={<GenericLoader message="Yorumlar yükleniyor..." />}>
                    <CommentSection gameId={game.id} />
                </Suspense>
            </div>
        </div>
    );
};

export default React.memo(GamePage);