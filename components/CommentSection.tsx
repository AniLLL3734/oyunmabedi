// DOSYA: components/CommentSection.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { Send, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Comment {
    id: string;
    uid: string;
    displayName: string;
    text: string;
    createdAt: any;
}

interface CommentSectionProps {
    gameId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ gameId }) => {
    const { user, isAdmin } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!gameId) return;
        const commentsRef = collection(db, 'games', gameId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
        });
        return unsubscribe;
    }, [gameId]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim() === '' || !user || isSubmitting) return;

        setIsSubmitting(true);
        const commentsRef = collection(db, 'games', gameId, 'comments');
        
        try {
            await addDoc(commentsRef, {
                uid: user.uid,
                displayName: user.displayName,
                text: newComment,
                createdAt: serverTimestamp(),
            });
            setNewComment('');
        } catch(error) {
            console.error("Yorum eklenirken hata oluştu:", error);
            alert("Yorumunuz eklenemedi. Lütfen daha sonra tekrar deneyin.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!isAdmin) return;
        const commentRef = doc(db, 'games', gameId, 'comments', commentId);
        await deleteDoc(commentRef);
    }

    return (
        <div className="mt-12">
            <h2 className="text-3xl font-heading mb-6 border-l-4 border-electric-purple pl-4">Tartışma Terminali</h2>
            {user ? (
                <form onSubmit={handleAddComment} className="flex gap-4 mb-8">
                    <input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Bu oyun hakkında bir yorum bırak..."
                        className="flex-1 p-3 bg-space-black text-ghost-white rounded-md border border-cyber-gray/50 focus:ring-2 focus:ring-electric-purple focus:outline-none"
                    />
                    <button type="submit" disabled={!newComment.trim() || isSubmitting} className="p-3 bg-electric-purple text-white rounded-md hover:bg-opacity-80 transition-all disabled:bg-cyber-gray/50 disabled:cursor-not-allowed">
                        <Send />
                    </button>
                </form>
            ) : (
                <p className="text-center text-cyber-gray mb-8">Yorum yapmak için <Link to="/login" className="text-electric-purple underline">giriş yapmalısın.</Link></p>
            )}

            <div className="space-y-6">
                {comments.map(comment => (
                    <div key={comment.id} className="flex gap-4 group">
                        <Link to={`/profile/${comment.uid}`} className="w-12 h-12 rounded-full bg-electric-purple flex items-center justify-center font-bold flex-shrink-0 text-lg hover:scale-110 transition-transform">
                            {comment.displayName?.charAt(0).toUpperCase()}
                        </Link>
                        <div className="flex-1 bg-dark-gray/50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <Link to={`/profile/${comment.uid}`} className="font-bold text-ghost-white hover:text-electric-purple">{comment.displayName}</Link>
                                {comment.createdAt && <p className="text-xs text-cyber-gray">{new Date(comment.createdAt.seconds * 1000).toLocaleString()}</p>}
                            </div>
                            <p className="text-cyber-gray mt-2 break-words">{comment.text}</p>
                        </div>
                         {isAdmin && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                                <Trash2 size={16} />
                            </button>
                         )}
                    </div>
                ))}
                 {comments.length === 0 && <p className="text-center text-cyber-gray py-8">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>}
            </div>
        </div>
    );
};

export default CommentSection;