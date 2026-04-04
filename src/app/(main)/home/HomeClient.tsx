"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPost, addComment, updateComment, deleteComment, updatePost, deletePost } from "./actions";
import { Image as ImageIcon, X, MessageSquare, Send, Loader2, Pencil, Trash2, Check, RotateCcw } from "lucide-react";
import imageCompression from "browser-image-compression";
import Image from "next/image";
import { motion } from "framer-motion";

// ── Time Ago helper ────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
}

// ── Types ────────────────────────────────────────────────────────────────
interface Post {
    id: string;
    content: string | null;
    imageUrl: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        role: string;
        imageUrl: string | null;
    };
    comments: Comment[];
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        imageUrl: string | null;
    };
}

interface HomeClientProps {
    initialPosts: Post[];
    currentUser: {
        id: string;
        name: string | null;
        imageUrl: string | null;
        role: string;
    } | null;
}

// ── Upload ───────────────────────────────────────────────────────────────
const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al subir la imagen");
    }
    const data = await res.json();
    return data.url;
};

// ── Component ────────────────────────────────────────────────────────────
export default function HomeClient({ initialPosts, currentUser }: HomeClientProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [isPosting, setIsPosting] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create initial preview to show something fast
        const localPreview = URL.createObjectURL(file);
        setImagePreview(localPreview);

        try {
            // Compress using browser-image-compression
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1200,
                useWebWorker: true
            };
            const cBlob = await imageCompression(file, options);
            const cFile = new File([cBlob], "post.jpg", { type: "image/jpeg" });

            setCompressedFile(cFile);
            setImagePreview(URL.createObjectURL(cFile));
            toast.success("Imagen optimizada para red");
        } catch (err) {
            toast.error("Error al procesar la imagen");
            setImagePreview(null);
            setCompressedFile(null);
        }
    };

    const handlePost = async () => {
        if (!content.trim() && !compressedFile) return;

        setIsPosting(true);
        try {
            let imageUrl = null;
            if (compressedFile) {
                imageUrl = await uploadImage(compressedFile);
            }

            await createPost(content, imageUrl);
            toast.success("Publicado");

            // Reset
            setContent("");
            setImagePreview(null);
            setCompressedFile(null);

            router.refresh(); // Refresh data
        } catch (err: any) {
            toast.error(err.message || "Error al publicar");
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-emerald-500/30">
            {/* CSS KEYFRAMES */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #10b981, #3b82f6, #06b6d4, #10b981);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 2rem;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-button:hover::before {
                    opacity: 1;
                }
                .glass-card {
                    background-color: color-mix(in srgb, var(--card) 90%, transparent);
                    backdrop-filter: blur(20px);
                    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
                }
                .glass-card:hover {
                    border-color: rgba(16, 185, 129, 0.5);
                }
            `}</style>

            {/* Ambient glow */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col pt-6 md:pt-12 px-4 md:px-6">

                {/* ── Header ── */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 px-1 text-center md:text-left"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500/80 mb-1">
                        A.C.A.P.
                    </p>
                    <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight text-foreground mb-2">
                        Comunidad <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">Feed</span>
                    </h1>
                </motion.div>

                {/* ── Compose Post ── */}
                {currentUser?.role === "superadmin" && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card rounded-[2rem] p-5 mb-8 shadow-xl"
                    >
                        <div className="flex gap-3 mb-3">
                            <div className="w-10 h-10 shrink-0 bg-muted rounded-full overflow-hidden border border-border relative">
                                {currentUser.imageUrl ? (
                                    <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" priority sizes="40px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-muted text-muted-foreground uppercase">
                                        {currentUser.name?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="¿Qué está pasando en la cancha?"
                                className="w-full bg-transparent resize-none text-foreground placeholder-muted-foreground outline-none text-sm pt-2 min-h-[60px]"
                            />
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative mb-3 mr-2 bg-muted/50 rounded-2xl overflow-hidden group aspect-video">
                                <Image src={imagePreview} fill className="object-cover" alt="Preview" unoptimized sizes="(max-width: 768px) 100vw, 672px" />
                                <button
                                    onClick={() => { setImagePreview(null); setCompressedFile(null); }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t border-border pt-3">
                            <label className="p-2 -ml-2 text-emerald-500 hover:bg-emerald-500/10 rounded-full cursor-pointer transition-colors">
                                <ImageIcon className="w-5 h-5" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>

                            <button
                                onClick={handlePost}
                                disabled={isPosting || (!content.trim() && !compressedFile)}
                                className="glow-button px-6 py-2 bg-foreground border border-border hover:border-emerald-500/50 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-full text-[11px] font-black uppercase tracking-widest text-background transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                            >
                                {isPosting ? "Enviando..." : "Publicar"}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ── Posts List ── */}
                <div className="flex flex-col gap-4">
                    {initialPosts.length === 0 ? (
                        <div className="text-center py-20 glass-card rounded-3xl">
                            <p className="text-foreground/80 font-bold text-sm">No hay publicaciones aún.</p>
                            <p className="text-muted-foreground text-xs mt-1">Sé el primero en publicarlo.</p>
                        </div>
                    ) : (
                        initialPosts.map(post => (
                            <PostItem key={post.id} post={post} currentUser={currentUser} />
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}

function PostItem({ post, currentUser }: { post: Post, currentUser: any }) {
    const router = useRouter();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostContent, setEditPostContent] = useState(post.content || "");
    const [isUpdatingPost, setIsUpdatingPost] = useState(false);
    const [isDeletingPost, setIsDeletingPost] = useState(false);

    const isPostOwner = currentUser?.id === post.user.id;

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addComment(post.id, commentText);
            setCommentText("");
            toast.success("Comentario enviado");
            router.refresh();
        } catch (err: any) {
            toast.error("Error al enviar comentario");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePost = async () => {
        if (!editPostContent.trim() || editPostContent === post.content) {
            setIsEditingPost(false);
            return;
        }
        setIsUpdatingPost(true);
        try {
            await updatePost(post.id, editPostContent);
            setIsEditingPost(false);
            router.refresh();
            toast.success("Publicación actualizada");
        } catch (err) {
            toast.error("Error al actualizar");
        } finally {
            setIsUpdatingPost(false);
        }
    };

    const handleDeletePost = async () => {
        if (!confirm("¿Seguro que quieres borrar esta publicación? Se eliminarán también todos los comentarios.")) return;
        setIsDeletingPost(true);
        try {
            await deletePost(post.id);
            router.refresh();
            toast.success("Publicación eliminada");
        } catch (err) {
            toast.error("Error al eliminar");
            setIsDeletingPost(false);
        }
    };

    const userInitials = post.user.name?.charAt(0) || "U";

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="group glass-card rounded-[2rem] p-5 sm:p-6 shadow-sm transition-all relative overflow-hidden"
        >
            {/* Highlight glow for post card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Author */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted border border-border rounded-full flex items-center justify-center overflow-hidden shrink-0 relative">
                        {post.user.imageUrl ? (
                            <Image src={post.user.imageUrl} alt={post.user.name || ""} fill unoptimized className="object-cover" sizes="40px" />
                        ) : (
                            <span className="text-sm font-bold text-muted-foreground uppercase">{userInitials}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{post.user.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-bold uppercase tracking-wider">
                                {post.user.role === 'jugador' ? 'Jugador' : post.user.role === 'club' ? 'Club' : post.user.role === 'superadmin' ? 'Administrador' : 'Usuario'}
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
                    </div>
                </div>

                {isPostOwner && !isEditingPost && (
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => {
                                setIsEditingPost(true);
                                setEditPostContent(post.content || "");
                            }} 
                            className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-full transition-colors"
                            title="Editar publicación"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={handleDeletePost}
                            disabled={isDeletingPost}
                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-colors disabled:opacity-50"
                            title="Borrar publicación"
                        >
                            {isDeletingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                {isEditingPost ? (
                    <div className="flex flex-col gap-3 mb-4 bg-muted/50 p-4 rounded-2xl border border-blue-500/30">
                        <textarea
                            value={editPostContent}
                            onChange={(e) => setEditPostContent(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground resize-none min-h-[100px]"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setIsEditingPost(false); setEditPostContent(post.content || ""); }}
                                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdatePost}
                                disabled={isUpdatingPost || !editPostContent.trim()}
                                className="px-4 py-2 text-xs font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
                            >
                                {isUpdatingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                ) : (
                    post.content && (
                        <p className="text-foreground text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                            {post.content}
                        </p>
                    )
                )}

                {post.imageUrl && (
                    <div className="relative rounded-2xl border border-border overflow-hidden mb-3 bg-muted aspect-video w-full">
                        <Image
                            src={post.imageUrl}
                            fill
                            unoptimized
                            className="object-cover"
                            alt="Publicación"
                            sizes="(max-width: 768px) 100vw, 672px"
                        />
                    </div>
                )}

                {/* Interaction Row */}
                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 transition-colors py-1 pr-2"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-[11px] font-bold">{post.comments?.length || 0}</span>
                    </button>
                </div>

                {/* Comments Section */}
                <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-4">
                    {/* Comments List (Conditional or Preview) */}
                    {post.comments && post.comments.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {(showComments ? post.comments : post.comments.slice(-3)).map(comment => (
                                <CommentItem 
                                    key={comment.id} 
                                    comment={comment} 
                                    currentUser={currentUser} 
                                />
                            ))}

                            {!showComments && post.comments.length > 3 && (
                                <button
                                    onClick={() => setShowComments(true)}
                                    className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors pl-11 text-left"
                                >
                                    Ver los {post.comments.length - 3} comentarios restantes...
                                </button>
                            )}
                        </div>
                    )}

                    {/* Comment Input */}
                    {currentUser && (
                        <form onSubmit={handleComment} className="flex gap-3 items-center">
                            <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden shrink-0 relative">
                                {currentUser.imageUrl ? (
                                    <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" sizes="32px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                                        {currentUser.name?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder="Escribe un comentario..."
                                    className="w-full bg-muted/80 border border-border/50 focus:border-emerald-500/50 rounded-full py-2.5 px-4 pr-10 text-xs text-foreground placeholder-muted-foreground outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim() || isSubmitting}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 disabled:opacity-30 disabled:hover:bg-transparent p-1.5 hover:bg-emerald-500/10 rounded-full transition-all"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function CommentItem({ comment, currentUser }: { comment: any, currentUser: any }) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = currentUser?.id === comment.user.id;

    const handleUpdate = async () => {
        if (!editText.trim() || editText === comment.content) {
            setIsEditing(false);
            return;
        }
        setIsUpdating(true);
        try {
            await updateComment(comment.id, editText);
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            toast.error("Error al actualizar");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteComment(comment.id);
            router.refresh();
            toast.success("Comentario eliminado");
        } catch (err) {
            toast.error("Error al eliminar");
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex gap-3 group/comment">
            <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden shrink-0 relative">
                {comment.user.imageUrl ? (
                    <Image src={comment.user.imageUrl} alt="" fill unoptimized className="object-cover" sizes="32px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                        {comment.user.name?.charAt(0) || "U"}
                    </div>
                )}
            </div>
            <div className="flex flex-col flex-1">
                <div className={`flex flex-col flex-1 bg-muted/40 border border-border/50 rounded-2xl px-4 py-3 ${isEditing ? 'ring-1 ring-emerald-500/30' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-foreground">{comment.user.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground opacity-60">{timeAgo(comment.createdAt)}</span>
                            {isOwner && !isEditing && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                    <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-blue-500/10 text-blue-500 rounded-full transition-colors">
                                        <Pencil className="w-2.5 h-2.5" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirm("¿Seguro que quieres borrar este comentario?")) handleDelete();
                                        }} 
                                        disabled={isDeleting}
                                        className="p-1 hover:bg-red-500/10 text-red-500 rounded-full transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {isEditing ? (
                        <div className="flex flex-col gap-2 py-1">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder-muted-foreground resize-none min-h-[40px]"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setIsEditing(false); setEditText(comment.content); }}
                                    className="p-1 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                    title="Cancelar"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating || !editText.trim()}
                                    className="p-1 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                                    title="Guardar"
                                >
                                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-foreground/80 leading-relaxed font-medium">{comment.content}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
