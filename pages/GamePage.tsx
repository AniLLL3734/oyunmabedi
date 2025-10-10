import React, { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { games } from '../data/games';
import { GameType } from '../types';
import { ArrowLeft, Gamepad2, Fullscreen, Info, Play, LoaderCircle } from 'lucide-react';
import { db } from '../src/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';
import GameSplashScreen from '../components/GameSplashScreen';

const RufflePlayer = lazy(() => import('../components/RufflePlayer'));
const CommentSection = lazy(() => import('../components/CommentSection'));
const GameFeedbackPopup = lazy(() => import('../components/GameFeedbackPopup'));

const GenericLoader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 text-cyber-gray h-full">
        <LoaderCircle size={32} className="animate-spin text-electric-purple" />
        <p className="mt-4">{message}</p>
    </div>
);

const GamePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const game = useMemo(() => games.find((g) => g.id === id), [id]);

    const gameContainerRef = useRef<HTMLDivElement>(null);
    const playCountTracked = useRef(false);

    const [gameStarted, setGameStarted] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [showSplashScreen, setShowSplashScreen] = useState(false);
    const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
    const [canNavigate, setCanNavigate] = useState(true);
    
    // ========================================================================
    // YENİ EKLENEN KOD: HTML5 OYUNLARI İÇİN SAHTE YÜKLEME SİMÜLASYONU
    // ========================================================================
    useEffect(() => {
        // Bu etki sadece splash screen görünür olduğunda VE oyun tipi HTML5 olduğunda çalışsın.
        if (showSplashScreen && game?.type === GameType.HTML5) {
            
            // `loadingProgress` state'ini yavaş yavaş 100'e çıkaran bir zamanlayıcı başlat.
            const progressInterval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(progressInterval); // %100'e ulaştığında zamanlayıcıyı temizle.
                        return 100;
                    }
                    // Her 100 milisaniyede %5 artır (Toplam 2 saniye sürer).
                    return prev + 5;
                });
            }, 100);

            // Component DOM'dan kaldırılırsa zamanlayıcıyı temizle (bellek sızıntısını önler).
            return () => clearInterval(progressInterval);
        }
    }, [showSplashScreen, game]); // Sadece bu değerler değiştiğinde çalışır.
    // ========================================================================


    const handleSplashScreenComplete = useCallback(() => {
        setShowSplashScreen(false);
        setGameStarted(true);
        if (!playCountTracked.current && id) {
            playCountTracked.current = true;
            requestIdleCallback(() => {
                setDoc(doc(db, 'games', id), { playCount: increment(1) }, { merge: true }).catch(console.error);
            });
        }
    }, [id]);

    const handleStartGame = useCallback(() => {
        if (showSplashScreen || gameStarted) return;
        setLoadingProgress(0); // Progress'i her seferinde sıfırla.
        setShowSplashScreen(true);
    }, [showSplashScreen, gameStarted]);

    const handleFullScreen = useCallback(() => {
        if (gameContainerRef.current?.requestFullscreen) {
            gameContainerRef.current.requestFullscreen().catch(console.error);
        }
    }, []);

    // Check if user has opted out of feedback for this game
    const shouldShowFeedback = useCallback(() => {
        if (!gameStarted || !id) {
            console.log('Feedback check - game not started or no ID:', { gameStarted, id });
            return false;
        }
        
        // Check global preference
        const globalPreference = localStorage.getItem('gameFeedbackPreference');
        if (globalPreference === 'dontShow') {
            console.log('Feedback check - global preference disabled');
            return false;
        }
        
        // Check game-specific preference
        const dontShowGames = JSON.parse(localStorage.getItem('dontShowFeedbackForGames') || '[]');
        if (dontShowGames.includes(id)) {
            console.log('Feedback check - game specific preference disabled:', id);
            return false;
        }
        
        console.log('Feedback check - should show feedback for game:', id);
        return true;
    }, [gameStarted, id]);

    // Handle navigation away from the game page
    const handleNavigationAway = useCallback((e: React.MouseEvent) => {
        // Only show feedback popup if user has played a game
        if (gameStarted && canNavigate) {
            const shouldShow = shouldShowFeedback();
            console.log('Checking if feedback should show:', { gameStarted, canNavigate, shouldShow });
            if (shouldShow) {
                e.preventDefault();
                console.log('Showing feedback popup');
                setShowFeedbackPopup(true);
                setCanNavigate(false);
                return false;
            }
        }
        return true;
    }, [gameStarted, canNavigate, shouldShowFeedback]);

    // Add event listener for beforeunload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Show feedback popup when user tries to leave the page after playing a game
            if (gameStarted && canNavigate) {
                const shouldShow = shouldShowFeedback();
                console.log('Before unload check:', { gameStarted, canNavigate, shouldShow });
                if (shouldShow) {
                    e.preventDefault();
                    e.returnValue = ''; // Required for Chrome
                    setShowFeedbackPopup(true);
                    setCanNavigate(false);
                    return ''; // Required for other browsers
                }
            }
        };

        // Add event listener for when user tries to leave the page
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [gameStarted, canNavigate, shouldShowFeedback]);

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            if (gameStarted && canNavigate) {
                const shouldShow = shouldShowFeedback();
                console.log('Pop state check:', { gameStarted, canNavigate, shouldShow });
                if (shouldShow) {
                    // Prevent default navigation
                    window.history.pushState(null, '', window.location.href);
                    setShowFeedbackPopup(true);
                    setCanNavigate(false);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        
        // Push initial state to enable back button detection
        window.history.pushState(null, '', window.location.href);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [gameStarted, canNavigate, shouldShowFeedback]);

    // Reset canNavigate when game starts
    useEffect(() => {
        if (gameStarted) {
            setCanNavigate(true);
        }
    }, [gameStarted]);

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
        <>
            <GameSplashScreen
                gameTitle={game.title}
                gameThumbnail={game.thumbnail}
                gameType={game.type} 
                loadingProgress={loadingProgress}
                isVisible={showSplashScreen}
                onComplete={handleSplashScreenComplete}
            />

            <div className="max-w-7xl mx-auto px-4">
                <Link 
                    to="/" 
                    className="inline-flex items-center gap-2 text-cyber-gray hover:text-electric-purple my-6 transition-colors"
                    onClick={handleNavigationAway}
                >
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
                            className="w-full h-full flex items-center justify-center group cursor-pointer"
                            onClick={handleStartGame}
                        >
                            <img 
                                src={game.thumbnail} 
                                alt={`${game.title} kapak resmi`} 
                                className="w-full h-full object-cover brightness-50 group-hover:brightness-75 transition-all"
                                loading="lazy"
                            />
                            <div className="absolute flex flex-col items-center justify-center gap-4 text-center p-4">
                               <div className="p-4 bg-black/50 rounded-full group-hover:scale-110 group-hover:bg-electric-purple transition-transform">
                                   <Play size={64} className="text-white ml-2" />
                               </div>
                               <span className="text-white text-2xl font-bold font-heading tracking-widest">OYNA</span>
                            </div>
                        </div>
                    ) : (
                        <Suspense fallback={<GenericLoader message="Oyun motoru başlatılıyor..." />}>
                            {game.type === GameType.SWF ? (
                                <RufflePlayer swfUrl={game.url} />
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
            
            <Suspense fallback={null}>
                <GameFeedbackPopup 
                    isOpen={showFeedbackPopup}
                    onClose={() => {
                        setShowFeedbackPopup(false);
                        setCanNavigate(true);
                    }}
                    onFeedbackSent={() => {
                        // Allow navigation after feedback is sent
                        setTimeout(() => {
                            setCanNavigate(true);
                            setShowFeedbackPopup(false);
                        }, 2000);
                    }}
                    gameId={game.id}
                    gameTitle={game.title}
                />
            </Suspense>
        </>
    );
};

export default React.memo(GamePage);