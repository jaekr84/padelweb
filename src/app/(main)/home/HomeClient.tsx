"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPost, addComment, updateComment, deleteComment, updatePost, deletePost } from "./actions";
import {
    Image as ImageIcon, X, MessageSquare, Send, Loader2, Pencil, Trash2,
    Check, RotateCcw, Calendar, Users, Users2, User, Trophy, MapPin, Clock
} from "lucide-react";
import imageCompression from "browser-image-compression";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── Helpers ────────────────────────────────────────────────────────────────

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

function formatDateTimeAR(dateStr: string | null) {
    if (!dateStr) return "TBD";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDateAR(dateStr: string | null) {
    if (!dateStr) return "TBD";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

// ── Types ──────────────────────────────────────────────────────────────────

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

interface TournamentQuickView {
    id: string;
    name: string;
    startDate: string | null;
    status: string;
    imageUrl: string | null;
    clubName: string | null;
    createdByUserId: string | null;
    categories: any;
    modalidad: any;
    type: string;
}

interface OpenCourtQuickView {
    id: string;
    name: string;
    date: string;
    time: string;
    totalSlots: number | null;
    clubName: string | null;
    registrationCount: number;
}

interface HomeClientProps {
    initialPosts: Post[];
    currentUser: {
        id: string;
        name: string | null;
        imageUrl: string | null;
        role: string;
    } | null;
    upcomingTournaments: TournamentQuickView[];
    ongoingTournaments: TournamentQuickView[];
    upcomingOpenCourts: OpenCourtQuickView[];
}

type ActionState = 'idle' | 'loading' | 'success';

// ── Services ───────────────────────────────────────────────────────────────

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

// ── Main Component ─────────────────────────────────────────────────────────

export default function HomeClient({ initialPosts, currentUser, upcomingTournaments, ongoingTournaments, upcomingOpenCourts }: HomeClientProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [postState, setPostState] = useState<ActionState>('idle');

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(capitalizeFirstLetter(e.target.value));
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImagePreview(URL.createObjectURL(file));

        try {
            const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
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

        setPostState('loading');
        try {
            let imageUrl = null;
            if (compressedFile) {
                imageUrl = await uploadImage(compressedFile);
            }

            await createPost(content, imageUrl);

            setPostState('success');
            toast.success("Publicado exitosamente");
            setContent("");
            setImagePreview(null);
            setCompressedFile(null);
            router.refresh();

            // Reset button state after 2 seconds
            setTimeout(() => setPostState('idle'), 2000);
        } catch (err: any) {
            toast.error(err.message || "Error al publicar");
            setPostState('idle');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans selection:bg-emerald-500/20 relative">
            {/* CSS KEYFRAMES & GLOBAL STYLES */}
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
            `}</style>

            {/* Ambient background glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
            </div>

            {/* Header Section */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-6">
                <div className="max-w-6xl mx-auto flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-1"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/80">Comunidad ACAP</p>
                            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
                                <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">La mejor comunidad de Pádel</span>
                            </h1>
                        </motion.div>
                    </div>
                </div>
            </div>


            <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row pt-8 px-4 md:px-6 gap-8 justify-center">

                {/* ── Main Feed (Left Column) ── */}
                <div className="w-full max-w-2xl flex flex-col">

                    {/* Mobile Quick Access Bar (Visible only on mobile/tablet) */}
                    <div className="xl:hidden mb-8 overflow-hidden">
                        <MobileTournamentBar 
                            ongoing={ongoingTournaments} 
                            upcoming={upcomingTournaments} 
                        />
                    </div>

                    {/* Compose Post */}
                    {(currentUser?.role === "superadmin" || currentUser?.role === "club") && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-5 mb-8 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-slate-100"
                        >
                            <div className="flex gap-4 mb-4">
                                <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                                    {currentUser.imageUrl ? (
                                        <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" priority sizes="40px" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-slate-100 text-slate-500 uppercase">
                                            {currentUser.name?.charAt(0) || "U"}
                                        </div>
                                    )}
                                </div>
                                <textarea
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder="¿Qué novedades hay en el club?"
                                    className="w-full bg-transparent resize-none text-slate-900 placeholder-slate-400 outline-none text-base pt-2 min-h-[60px]"
                                />
                            </div>

                            {imagePreview && (
                                <div className="relative mb-4 ml-14 bg-slate-100 rounded-2xl overflow-hidden group aspect-video border border-slate-200">
                                    <Image src={imagePreview} fill className="object-cover" alt="Preview" unoptimized sizes="(max-width: 768px) 100vw, 672px" />
                                    <button
                                        onClick={() => { setImagePreview(null); setCompressedFile(null); }}
                                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full text-slate-900 shadow-sm transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 ml-14">
                                <label className="p-2 -ml-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full cursor-pointer transition-colors">
                                    <ImageIcon className="w-5 h-5" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>

                                <button
                                    onClick={handlePost}
                                    disabled={postState !== 'idle' || (!content.trim() && !compressedFile)}
                                    className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2
                                        ${postState === 'success'
                                            ? 'bg-emerald-500 text-white shadow-emerald-500/30 shadow-md'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900'
                                        }`}
                                >
                                    {postState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {postState === 'success' && <Check className="w-4 h-4" />}
                                    {postState === 'loading' ? "Enviando..." : postState === 'success' ? "Publicado" : "Publicar"}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Posts List */}
                    <div className="flex flex-col gap-6">
                        {initialPosts.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <p className="text-slate-900 font-semibold text-sm">No hay publicaciones aún.</p>
                                <p className="text-slate-500 text-sm mt-1">Sé el primero en iniciar la conversación.</p>
                            </div>
                        ) : (
                            initialPosts.map(post => (
                                <PostItem key={post.id} post={post} currentUser={currentUser} />
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar (Desktop only) ── */}
                <aside className="hidden xl:flex flex-col w-[340px] gap-6 sticky top-24 self-start">

                    {/* Tournaments Card */}
                    <SidebarCard title="Próximos Torneos" icon={<Trophy className="w-4 h-4 text-emerald-600" />} link="/tournaments" linkText="Ver calendario">
                        {upcomingTournaments.length === 0 ? (
                            <EmptyState text="No hay torneos próximos" />
                        ) : (
                            upcomingTournaments.map(t => (
                                <TournamentItem key={t.id} t={t} />
                            ))
                        )}
                    </SidebarCard>

                    {/* Ongoing Tournaments Card */}
                    <SidebarCard title="En Curso" icon={<Clock className="w-4 h-4 text-amber-500" />} link="/tournaments" linkText="Ver resultados">
                        {ongoingTournaments.length === 0 ? (
                            <EmptyState text="No hay torneos activos" />
                        ) : (
                            ongoingTournaments.map(t => (
                                <TournamentItem key={t.id} t={t} isOngoing />
                            ))
                        )}
                    </SidebarCard>

                    {/* Open Courts Card */}
                    <SidebarCard title="Cancha Abierta" icon={<Users className="w-4 h-4 text-blue-600" />} link="/cancha-abierta" linkText="Unirse a un partido">
                        {upcomingOpenCourts.length === 0 ? (
                            <EmptyState text="No hay partidos abiertos" />
                        ) : (
                            upcomingOpenCourts.map(oc => {
                                const available = (oc.totalSlots || 0) - (oc.registrationCount || 0);
                                const isFull = available <= 0;

                                return (
                                    <div key={oc.id} className="group flex flex-col gap-2.5 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                                        <div className="flex justify-between items-start gap-2">
                                            <h3 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">{oc.name}</h3>
                                            <div className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-md ${isFull ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
                                                {isFull ? 'Completo' : `${available} libres`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-slate-500 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="font-medium">{formatDateAR(oc.date)} {oc.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="font-medium line-clamp-1 truncate">{oc.clubName || "Club"}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </SidebarCard>
                </aside>
            </div>
        </div>
    );
}

function MobileTournamentBar({ ongoing, upcoming }: { ongoing: TournamentQuickView[], upcoming: TournamentQuickView[] }) {
    if (ongoing.length === 0 && upcoming.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Torneos en Curso</h2>
                <Link href="/tournaments" className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Ver todos</Link>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar snap-x snap-mandatory">
                {[...ongoing, ...upcoming].map((t) => (
                    <div key={t.id} className="min-w-[280px] snap-center">
                        <TournamentItem t={t} isOngoing={t.status === 'en_curso' || t.status === 'playoffs'} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Sidebar Helper Components ──────────────────────────────────────────────

function SidebarCard({ title, icon, link, linkText, children }: any) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-slate-100">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
                    <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                </div>
                <Link href={link} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">{linkText}</Link>
            </div>
            <div className="flex flex-col gap-3">
                {children}
            </div>
        </motion.div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">{text}</p>;
}

function TournamentItem({ t, isOngoing = false }: { t: TournamentQuickView, isOngoing?: boolean }) {
    const modal = typeof t.modalidad === 'string' ? JSON.parse(t.modalidad) : t.modalidad;
    const isParejas = modal?.participacion === 'parejas' || !modal?.participacion;
    let cats = [];
    try { cats = typeof t.categories === 'string' ? JSON.parse(t.categories) : (t.categories || []); } catch (e) { }
    const catLabel = Array.isArray(cats) && cats.length > 0 ? (cats[0] === 'libre' ? 'Libre' : cats.join(", ")) : "N/A";

    return (
        <Link 
            href={`/tournaments/${t.id}`}
            className="group flex flex-col gap-2.5 p-4 rounded-[2rem] bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 border border-slate-100 hover:border-emerald-500/20 relative overflow-hidden"
        >
            {/* Hover Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur" />
            
            <div className="relative z-10 flex justify-between items-start gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900 leading-tight line-clamp-1 group-hover:text-emerald-600 transition-colors uppercase italic">{t.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>{t.clubName || "Acap"}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className={t.type === 'americano' ? 'text-blue-500' : 'text-emerald-500'}>
                            {t.type === 'americano' ? 'Americano' : 'Libre'}
                        </span>
                    </div>
                </div>
                <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-slate-300 group-hover:text-emerald-500 group-hover:border-emerald-500/20 transition-all">
                    <Send className="w-3 h-3 rotate-45" />
                </div>
            </div>

            <div className="relative z-10 flex items-center justify-between mt-1">
                <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                        {isOngoing ? <Clock className="w-3.5 h-3.5 text-amber-500" /> : <Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                        <span className="group-hover:text-slate-900 transition-colors">
                            {isOngoing
                                ? (t.status === 'en_curso' ? 'Fase de Grupos' : 'Playoffs')
                                : formatDateAR(t.startDate)
                            }
                        </span>
                    </div>
                </div>
                <span className="shrink-0 text-[9px] font-black px-2.5 py-1 bg-white border border-slate-100 text-slate-500 rounded-lg group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all">
                    {catLabel}
                </span>
            </div>
        </Link>
    );
}

// ── Post Component ─────────────────────────────────────────────────────────

function PostItem({ post, currentUser }: { post: Post, currentUser: any }) {
    const router = useRouter();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [commentState, setCommentState] = useState<ActionState>('idle');
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostContent, setEditPostContent] = useState(post.content || "");
    const [isUpdatingPost, setIsUpdatingPost] = useState(false);
    const [isDeletingPost, setIsDeletingPost] = useState(false);

    const isPostOwner = currentUser?.id === post.user.id;

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCommentText(capitalizeFirstLetter(e.target.value));
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || commentState === 'loading') return;

        setCommentState('loading');
        try {
            await addComment(post.id, commentText);
            setCommentState('success');
            toast.success("Comentario enviado");
            setCommentText("");
            router.refresh();
            setTimeout(() => setCommentState('idle'), 2000);
        } catch (err: any) {
            toast.error("Error al enviar comentario");
            setCommentState('idle');
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
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="group bg-white rounded-[2rem] p-5 sm:p-7 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-slate-100 transition-all"
        >
            {/* Author */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 relative">
                        {post.user.imageUrl ? (
                            <Image src={post.user.imageUrl} alt={post.user.name || ""} fill unoptimized className="object-cover" sizes="44px" />
                        ) : (
                            <span className="text-sm font-bold text-slate-500 uppercase">{userInitials}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-slate-900">{post.user.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold uppercase tracking-wide">
                                {post.user.role === 'jugador' ? 'Jugador' : post.user.role === 'club' ? 'Club' : post.user.role === 'superadmin' ? 'Administrador' : 'Usuario'}
                            </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{formatDateTimeAR(post.createdAt)}</span>
                    </div>
                </div>

                {isPostOwner && !isEditingPost && (
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => { setIsEditingPost(true); setEditPostContent(post.content || ""); }}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDeletePost}
                            disabled={isDeletingPost}
                            className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-full transition-colors disabled:opacity-50"
                        >
                            {isDeletingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                {isEditingPost ? (
                    <div className="flex flex-col gap-3 mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <textarea
                            value={editPostContent}
                            onChange={(e) => setEditPostContent(capitalizeFirstLetter(e.target.value))}
                            className="w-full bg-transparent border-none outline-none text-[15px] text-slate-900 placeholder-slate-400 resize-none min-h-[100px]"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setIsEditingPost(false); setEditPostContent(post.content || ""); }}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" /> Cancelar
                            </button>
                            <button
                                onClick={handleUpdatePost}
                                disabled={isUpdatingPost || !editPostContent.trim()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
                            >
                                {isUpdatingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar Cambios
                            </button>
                        </div>
                    </div>
                ) : (
                    post.content && (
                        <p className="text-slate-800 text-[15px] leading-relaxed mb-5 whitespace-pre-wrap">
                            {post.content}
                        </p>
                    )
                )}

                {post.imageUrl && (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden mb-4 bg-slate-100 aspect-video w-full">
                        <Image src={post.imageUrl} fill unoptimized className="object-cover" alt="Publicación" sizes="(max-width: 768px) 100vw, 672px" />
                    </div>
                )}

                {/* Interaction Row */}
                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-slate-50"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm font-semibold">{post.comments?.length || 0} Comentarios</span>
                    </button>
                </div>

                {/* Comments Section */}
                <div className="mt-4 pt-5 border-t border-slate-100 flex flex-col gap-5">
                    {post.comments && post.comments.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {(showComments ? post.comments : post.comments.slice(-3)).map(comment => (
                                <CommentItem key={comment.id} comment={comment} currentUser={currentUser} />
                            ))}

                            {!showComments && post.comments.length > 3 && (
                                <button
                                    onClick={() => setShowComments(true)}
                                    className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors pl-12 text-left"
                                >
                                    Ver los {post.comments.length - 3} comentarios restantes...
                                </button>
                            )}
                        </div>
                    )}

                    {/* Comment Input */}
                    {currentUser && (
                        <form onSubmit={handleComment} className="flex gap-3 items-center mt-2">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                                {currentUser.imageUrl ? (
                                    <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" sizes="36px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                                        {currentUser.name?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={handleCommentChange}
                                    placeholder="Escribe un comentario..."
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-full py-2.5 px-5 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim() || commentState === 'loading'}
                                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all flex items-center justify-center
                                        ${commentState === 'success'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:bg-slate-200 disabled:text-slate-500'
                                        }`}
                                >
                                    {commentState === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                                        commentState === 'success' ? <Check className="w-3.5 h-3.5" /> :
                                            <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ── Comment Component ──────────────────────────────────────────────────────

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
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative mt-1">
                {comment.user.imageUrl ? (
                    <Image src={comment.user.imageUrl} alt="" fill unoptimized className="object-cover" sizes="36px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-slate-500 uppercase">
                        {comment.user.name?.charAt(0) || "U"}
                    </div>
                )}
            </div>
            <div className="flex flex-col flex-1">
                <div className={`flex flex-col flex-1 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 ${isEditing ? 'ring-1 ring-slate-300 bg-white' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-slate-900">{comment.user.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] font-medium text-slate-400">{timeAgo(comment.createdAt)}</span>
                            {isOwner && !isEditing && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                    <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-md transition-colors">
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm("¿Seguro que quieres borrar este comentario?")) handleDelete(); }}
                                        disabled={isDeleting}
                                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(capitalizeFirstLetter(e.target.value))}
                                className="w-full bg-transparent border-none outline-none text-[13px] text-slate-900 placeholder-slate-400 resize-none min-h-[40px]"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => { setIsEditing(false); setEditText(comment.content); }}
                                    className="px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating || !editText.trim()}
                                    className="px-2 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
                                >
                                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[13px] text-slate-700 leading-relaxed font-normal">{comment.content}</p>
                    )}
                </div>
            </div>
        </div>
    );
}