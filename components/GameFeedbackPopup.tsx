import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SendHorizonal, ThumbsUp, ThumbsDown } from 'lucide-react';
import { db } from '../src/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../src/contexts/AuthContext';

interface GameFeedbackPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSent: () => void;
  gameId: string;
  gameTitle: string;
}

const GameFeedbackPopup: React.FC<GameFeedbackPopupProps> = ({ isOpen, onClose, onFeedbackSent, gameId, gameTitle }) => {
  const { user, userProfile } = useAuth();
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!feedbackMessage.trim() && !rating) || !user) return;
    
    setIsSending(true);
    setFeedbackError('');
    
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user.uid,
        displayName: userProfile?.displayName || user.displayName || 'Anonim',
        message: feedbackMessage,
        rating: rating,
        isRead: false,
        createdAt: serverTimestamp(),
        source: 'game_exit',
        gameId: gameId,
        gameTitle: gameTitle
      });
      
      setFeedbackMessage('');
      setRating(null);
      setFeedbackSent(true);
      
      // Call the parent callback to handle post-send actions
      onFeedbackSent();
    } catch (error) {
      console.error("Geri bildirim gönderilemedi:", error);
      setFeedbackError('Geri bildirim gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDontShowAgain = () => {
    // Store in localStorage that the user doesn't want to see this popup for this specific game
    const dontShowGames = JSON.parse(localStorage.getItem('dontShowFeedbackForGames') || '[]');
    if (!dontShowGames.includes(gameId)) {
      dontShowGames.push(gameId);
      localStorage.setItem('dontShowFeedbackForGames', JSON.stringify(dontShowGames));
    }
    onClose();
  };

  const handleDontShowForAnyGame = () => {
    // Store in localStorage that the user doesn't want to see this popup for any game
    localStorage.setItem('gameFeedbackPreference', 'dontShow');
    onClose();
  };

  // Handle navigation after feedback is sent
  useEffect(() => {
    if (feedbackSent) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedbackSent, onClose]);

  // Reset feedback state when popup is closed
  useEffect(() => {
    if (!isOpen) {
      // Reset all states when popup is closed
      setFeedbackMessage('');
      setRating(null);
      setFeedbackSent(false);
      setFeedbackError('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-dark-gray border-2 border-electric-purple rounded-xl p-6 max-w-lg w-full relative"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-cyber-gray hover:text-ghost-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="mb-6 text-center">
              <h2 className="text-2xl font-heading text-ghost-white mb-2">"{gameTitle}" Oyununu Beğendiniz mi?</h2>
              <p className="text-cyber-gray">
                Deneyiminizi bizimle paylaşır mısınız? Geri bildiriminiz, platformu daha iyi hale getirmemize yardımcı olur.
              </p>
            </div>

            {feedbackSent ? (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-green-900/50 border border-green-700/50 rounded-lg text-green-300">
                <ThumbsUp size={48} className="mb-4" />
                <h3 className="text-2xl font-bold">Teşekkürler!</h3>
                <p>Görüşleriniz bizim için çok değerli. Platformu geliştirmemizde bize yardımcı olduğunuz için teşekkür ederiz.</p>
                <div className="mt-4 text-sm text-cyber-gray">
                  <p>Yönlendiriliyorsunuz...</p>
                </div>
              </div>
            ) : (
              <>
                {feedbackError && (
                  <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-red-300 mb-4">
                    <p>{feedbackError}</p>
                  </div>
                )}

                <div className="flex justify-center gap-8 mb-6">
                  <button
                    onClick={() => setRating('positive')}
                    className={`p-4 rounded-full border-2 transition-all ${
                      rating === 'positive'
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-cyber-gray hover:border-green-500 hover:bg-green-500/10'
                    }`}
                  >
                    <ThumbsUp size={32} />
                  </button>
                  <button
                    onClick={() => setRating('negative')}
                    className={`p-4 rounded-full border-2 transition-all ${
                      rating === 'negative'
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-cyber-gray hover:border-red-500 hover:bg-red-500/10'
                    }`}
                  >
                    <ThumbsDown size={32} />
                  </button>
                </div>

                <form onSubmit={handleSendFeedback} className="space-y-4">
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Deneyiminizi daha detaylı anlatmak ister misiniz? (isteğe bağlı)"
                    className="w-full p-3 bg-space-black h-24 text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple"
                    maxLength={500}
                  />
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={isSending || (!feedbackMessage.trim() && !rating)}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-electric-purple text-white font-bold rounded-md disabled:bg-cyber-gray"
                    >
                      {isSending ? 'Gönderiliyor...' : <>Gönder <SendHorizonal size={18} /></>}
                    </button>
                    <button
                      type="button"
                      onClick={handleDontShowAgain}
                      className="flex-1 p-3 bg-dark-gray text-cyber-gray font-bold rounded-md border border-cyber-gray/50 hover:bg-cyber-gray/10 transition-colors"
                    >
                      Bu oyun için bir daha gösterme
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleDontShowForAnyGame}
                    className="w-full p-2 text-cyber-gray text-sm hover:text-ghost-white transition-colors"
                  >
                    Tüm oyunlar için geri bildirim istemiyorum
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameFeedbackPopup;