"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPost, addComment, updateComment, deleteComment, updatePost, deletePost } from "./actions";
import {
    Image as ImageIcon, X, MessageSquare, Send, Loader2, Pencil, Trash2,
    Check, RotateCcw, Calendar, Users, Users2, User, Trophy, MapPin, Clock,
    ChevronLeft, ChevronRight, Plus
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
    images?: string[] | null;
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
    registrationsCount: number;
    registrants: { name: string, imageUrl: string | null }[];
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
    const [selectedImages, setSelectedImages] = useState<{ id: string, file: File, preview: string }[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [postState, setPostState] = useState<ActionState>('idle');

    // Helper to check if user has permission to post (superadmin or club)
    const canPost = currentUser?.role.split(',').some(r => r === 'superadmin' || r === 'club');

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(capitalizeFirstLetter(e.target.value));
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limit to 10 photos
        const totalAfterAdd = selectedImages.length + files.length;
        if (totalAfterAdd > 10) {
            toast.error("Máximo 10 fotos por publicación");
            return;
        }

        setIsOptimizing(true);
        const optimizationToast = toast.loading("Optimizando imágenes...");

        try {
            const newImages: { id: string, file: File, preview: string }[] = [];

            for (const file of files) {
                const options = {
                    maxSizeMB: 0.8,
                    maxWidthOrHeight: 1400,
                    useWebWorker: true,
                    fileType: 'image/webp' // Target WebP for better compression
                };

                const cBlob = await imageCompression(file, options);
                // Create a WebP file from the blob
                const cFile = new File([cBlob], "post.webp", { type: "image/webp" });

                newImages.push({
                    id: crypto.randomUUID(),
                    file: cFile,
                    preview: URL.createObjectURL(cFile)
                });
            }

            setSelectedImages(prev => [...prev, ...newImages]);
            toast.success(`${files.length} imágenes listas`, { id: optimizationToast });
        } catch (err) {
            toast.error("Error al procesar algunas imágenes", { id: optimizationToast });
        } finally {
            setIsOptimizing(false);
        }
    };

    const removeImage = (id: string) => {
        setSelectedImages(prev => {
            const filtered = prev.filter(img => img.id !== id);
            // Clean up memory
            const removed = prev.find(img => img.id === id);
            if (removed) URL.revokeObjectURL(removed.preview);
            return filtered;
        });
    };

    const moveImage = (index: number, direction: 'left' | 'right') => {
        const newIndex = direction === 'left' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= selectedImages.length) return;

        const updated = [...selectedImages];
        const [moved] = updated.splice(index, 1);
        updated.splice(newIndex, 0, moved);
        setSelectedImages(updated);
    };

    const handlePost = async () => {
        if (!content.trim() && selectedImages.length === 0) return;

        setPostState('loading');
        const uploadToast = toast.loading("Publicando...");

        try {
            let imageUrls: string[] = [];

            if (selectedImages.length > 0) {
                // Parallel upload of all images
                imageUrls = await Promise.all(
                    selectedImages.map(img => uploadImage(img.file))
                );
            }

            await createPost(content, imageUrls.length > 0 ? imageUrls : null);

            setPostState('success');
            toast.success("Publicado en la comunidad", { id: uploadToast });
            setContent("");
            // Revoke URLs to free memory
            selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
            setSelectedImages([]);
            router.refresh();

            setTimeout(() => setPostState('idle'), 2000);
        } catch (err: any) {
            toast.error(err.message || "Error al publicar", { id: uploadToast });
            setPostState('idle');
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-24 font-sans selection:bg-azul-primary/20 relative">
            {/* CSS KEYFRAMES & GLOBAL STYLES */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #1e40af, #0ea5e9, #1e40af);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
            `}</style>

            {/* Ambient background glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-celeste/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-azul-primary/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
            </div>

            {/* Header Section */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-3 sm:px-6">
                <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-1"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-celeste">Comunidad ACAP</p>
                            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
                                <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(14,165,233,0.3)]">La mejor comunidad de Pádel</span>
                            </h1>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-[1440px] mx-auto flex flex-col md:flex-row pt-8 px-2 md:px-4 gap-12 justify-center">

                {/* ── Main Feed (Left Column) ── */}
                <div className="w-full max-w-3xl flex flex-col px-4 sm:px-0">

                    {/* Mobile Quick Access Bar (Visible only on mobile/tablet) */}
                    <div className="xl:hidden mb-12 overflow-hidden px-2">
                        <MobileTournamentBar
                            ongoing={ongoingTournaments}
                            upcoming={upcomingTournaments}
                        />
                    </div>

                    {/* Compose Post (Seamless) */}
                    {canPost && currentUser && (
                        <div className="py-8 mb-4 border-b border-slate-300">
                            <div className="flex gap-4 mb-4">
                                <div className="w-12 h-12 shrink-0 bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                                    {currentUser.imageUrl ? (
                                        <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" priority sizes="48px" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-base font-black bg-slate-50 text-slate-400 uppercase italic">
                                            {currentUser.name?.charAt(0) || "U"}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <textarea
                                        value={content}
                                        onChange={handleContentChange}
                                        placeholder="¿Qué novedades hay en el club?"
                                        className="w-full bg-transparent resize-none text-slate-900 placeholder-slate-400 outline-none text-lg font-medium pt-2 min-h-[80px]"
                                    />

                                    {selectedImages.length > 0 && (
                                        <div className="flex gap-3 overflow-x-auto py-4 px-1 no-scrollbar snap-x">
                                            <AnimatePresence mode="popLayout">
                                                {selectedImages.map((img, idx) => (
                                                    <motion.div
                                                        key={img.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="relative w-32 h-32 shrink-0 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 snap-start group"
                                                    >
                                                        <Image src={img.preview} fill className="object-cover" alt="Preview" unoptimized />

                                                        {/* Overlays */}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            {idx > 0 && (
                                                                <button
                                                                    onClick={() => moveImage(idx, 'left')}
                                                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-colors"
                                                                >
                                                                    <ChevronLeft className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => removeImage(img.id)}
                                                                className="p-1.5 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white backdrop-blur-md transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                            {idx < selectedImages.length - 1 && (
                                                                <button
                                                                    onClick={() => moveImage(idx, 'right')}
                                                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-colors"
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Index Badge */}
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-[9px] font-black text-white rounded-md uppercase tracking-tighter">
                                                            {idx + 1}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>

                                            {selectedImages.length < 10 && (
                                                <label className="w-32 h-32 shrink-0 rounded-2xl border-2 border-dashed border-slate-100 hover:border-celeste/50 hover:bg-celeste/5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-celeste transition-all cursor-pointer">
                                                    <Plus className="w-6 h-6" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Añadir</span>
                                                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4">
                                        <label className="p-2 -ml-2 text-slate-400 hover:text-celeste hover:bg-celeste/5 rounded-full cursor-pointer transition-colors relative">
                                            <ImageIcon className="w-6 h-6" />
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                                            {selectedImages.length > 0 && (
                                                <span className="absolute top-1 right-1 w-4 h-4 bg-celeste text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                                    {selectedImages.length}
                                                </span>
                                            )}
                                        </label>

                                        <button
                                            onClick={handlePost}
                                            disabled={postState !== 'idle' || isOptimizing || (!content.trim() && selectedImages.length === 0)}
                                            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3
                                                ${postState === 'success'
                                                    ? 'bg-azul-primary text-white shadow-azul-primary/30 shadow-lg'
                                                    : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                                                }`}
                                        >
                                            {postState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {postState === 'success' && <Check className="w-4 h-4" />}
                                            {postState === 'loading' ? "Enviando..." : postState === 'success' ? "Publicado" : "Publicar Ahora"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Posts List */}
                    <div className="flex flex-col gap-4">
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
                <aside className="hidden xl:flex flex-col w-[340px] gap-12 sticky top-24 self-start">

                    {/* Tournaments List (Flat) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-300">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-black italic flex items-center gap-2">
                                <Trophy className="w-3.5 h-3.5 text-celeste" /> Próximos Torneos
                            </h2>
                            <Link href="/tournaments" className="text-[10px] font-black uppercase tracking-widest text-azul-primary hover:text-azul-dark transition-colors">Ver Todo</Link>
                        </div>
                        {upcomingTournaments.length === 0 ? (
                            <EmptyState text="No hay torneos próximos" />
                        ) : (
                            <div className="flex flex-col">
                                {upcomingTournaments.map(t => (
                                    <TournamentItem key={t.id} t={t} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ongoing Tornaments (Flat) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-300">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-black italic flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-amber-500" /> En Curso
                            </h2>
                            <Link href="/tournaments" className="text-[10px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors">Resultados</Link>
                        </div>
                        {ongoingTournaments.length === 0 ? (
                            <EmptyState text="No hay torneos activos" />
                        ) : (
                            <div className="flex flex-col">
                                {ongoingTournaments.map(t => (
                                    <TournamentItem key={t.id} t={t} isOngoing />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Open Courts (Flat) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-300">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-black italic flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-blue-500" /> Cancha Abierta
                            </h2>
                            <Link href="/cancha-abierta" className="text-[10px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors">Unirse</Link>
                        </div>
                        {upcomingOpenCourts.length === 0 ? (
                            <EmptyState text="No hay partidos abiertos" />
                        ) : (
                            <div className="flex flex-col">
                                {upcomingOpenCourts.map(oc => {
                                    const available = (oc.totalSlots || 0) - (oc.registrationCount || 0);
                                    const isFull = available <= 0;

                                    return (
                                        <Link
                                            key={oc.id}
                                            href={`/cancha-abierta`}
                                            className="group flex flex-col gap-2 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-100 transition-colors px-2 -mx-2 rounded-xl"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className="text-xs font-black uppercase italic tracking-tighter text-slate-900 leading-tight line-clamp-1 group-hover:text-azul-primary transition-colors">{oc.name}</h3>
                                                <div className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${isFull ? 'bg-rojo/10 text-rojo' : 'bg-azul-primary/10 text-azul-primary'}`}>
                                                    {oc.registrationCount || 0}/{oc.totalSlots}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formatDateAR(oc.date)} {oc.time}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="truncate">{oc.clubName || "Club"}</span>
                                                </div>
                                            </div>

                                            {oc.totalSlots && oc.totalSlots > 0 && (
                                                <div className="w-full mt-1">
                                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        {(() => {
                                                            const percentage = Math.min(((oc.registrationCount || 0) / oc.totalSlots) * 100, 100);
                                                            let barColor = "bg-azul-primary";
                                                            if (percentage >= 90) barColor = "bg-rojo";
                                                            else if (percentage >= 70) barColor = "bg-celeste";
                                                            return (
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
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
                <Link href="/tournaments" className="text-[10px] font-black uppercase tracking-widest text-azul-primary">Ver todos</Link>
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

function EmptyState({ text }: { text: string }) {
    return <p className="text-xs font-bold text-slate-400 text-center py-8 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed italic uppercase tracking-widest">{text}</p>;
}

function TournamentItem({ t, isOngoing = false }: { t: TournamentQuickView, isOngoing?: boolean }) {
    const modal = typeof t.modalidad === 'string' ? JSON.parse(t.modalidad) : t.modalidad;
    let cats = [];
    try { cats = typeof t.categories === 'string' ? JSON.parse(t.categories) : (t.categories || []); } catch (e) { }
    const catLabel = Array.isArray(cats) && cats.length > 0 ? (cats[0] === 'libre' ? 'Libre' : cats.join(", ")) : "N/A";

    return (
        <Link
            href={`/tournaments/${t.id}`}
            className="group flex flex-col gap-2 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-100 transition-colors px-2 -mx-2 rounded-xl overflow-hidden relative"
        >
            <div className="relative z-10 flex justify-between items-start gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="text-xs font-black text-slate-900 leading-tight line-clamp-1 group-hover:text-azul-primary transition-colors uppercase italic tracking-tighter">{t.name}</h3>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                        <span>{t.clubName || "Acap"}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className={t.type === 'americano' ? 'text-azul-primary/70' : 'text-celeste/70'}>
                            {t.type === 'americano' ? 'Americano' : 'Libre'}
                        </span>
                    </div>
                </div>
                <div className="p-1.5 text-slate-300 group-hover:text-azul-primary transition-all">
                    <Send className="w-3 h-3 rotate-45" />
                </div>
            </div>

            <div className="relative z-10 flex items-center justify-between mt-1">
                <div className="flex items-center gap-3 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                        {isOngoing ? <Clock className="w-3 h-3 text-rojo" /> : <Calendar className="w-3 h-3 text-azul-primary" />}
                        <span className="group-hover:text-slate-700 transition-colors">
                            {isOngoing
                                ? (t.status === 'en_curso' ? 'Fase de Grupos' : 'Playoffs')
                                : formatDateAR(t.startDate)
                            }
                        </span>
                    </div>
                </div>
                <span className="shrink-0 text-[8px] font-black px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-md group-hover:bg-azul-primary group-hover:text-white group-hover:border-azul-primary transition-all uppercase tracking-widest">
                    {catLabel}
                </span>
            </div>

            {modal?.maxSlots > 0 && (
                <div className="relative z-10 w-full mt-1">
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        {(() => {
                            const percentage = Math.min(((t.registrationsCount || 0) / modal.maxSlots) * 100, 100);
                            let barColor = "bg-azul-primary";
                            if (percentage >= 90) barColor = "bg-rojo";
                            else if (percentage >= 70) barColor = "bg-celeste";
                            return (
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Registrants Facepile */}
            <div className="relative z-10 flex items-center gap-2 mt-1">
                <div className="flex -space-x-1.5">
                    {t.registrants && t.registrants.length > 0 ? (
                        t.registrants.map((reg, idx) => (
                            <div key={idx} className="w-5 h-5 rounded-full border border-white bg-slate-100 overflow-hidden relative shadow-sm">
                                {reg.imageUrl ? (
                                    <Image src={reg.imageUrl} alt={reg.name} fill className="object-cover" sizes="20px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-[6px] font-black text-slate-500 uppercase italic">
                                        {reg.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="w-5 h-5 rounded-full border border-white bg-slate-50 flex items-center justify-center">
                            <Users className="w-2.5 h-2.5 text-slate-300" />
                        </div>
                    )}
                </div>
                <span className="text-[9px] font-black text-slate-400 group-hover:text-azul-primary transition-colors uppercase tracking-widest">
                    {t.registrationsCount || 0}/{modal?.maxSlots || 0}
                </span>
            </div>
        </Link>
    );
}

// ── Post Media Components ──────────────────────────────────────────────────

function PostMedia({ images, fallbackUrl }: { images?: string[] | null, fallbackUrl?: string | null }) {
    const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
    const [carouselIndex, setCarouselIndex] = useState(0);

    // Safe parse images if it's a string (MySQL JSON sometimes comes back as string)
    let parsedImages: string[] = [];
    try {
        if (Array.isArray(images)) {
            parsedImages = images;
        } else if (typeof images === "string") {
            parsedImages = JSON.parse(images);
        }
    } catch (e) {
        console.error("Error parsing images:", e);
    }

    // Combine new 'images' JSON and legacy 'fallbackUrl'
    const allImages = parsedImages.length > 0 ? parsedImages : (fallbackUrl ? [fallbackUrl] : []);

    if (allImages.length === 0) return null;

    const count = allImages.length;

    const next = () => setCarouselIndex((prev) => (prev + 1) % count);
    const prev = () => setCarouselIndex((prev) => (prev - 1 + count) % count);

    return (
        <div className="mb-6 overflow-hidden">
            <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`grid gap-2 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative group/media
                            ${count === 1 ? 'grid-cols-1 aspect-auto' :
                                count === 2 ? 'grid-cols-2 aspect-[4/3]' :
                                    count === 3 ? 'grid-cols-3 aspect-[4/3]' :
                                        'grid-cols-2 aspect-square'}
                        `}
                    >
                        {count === 1 && (
                            <div
                                className="relative w-full h-full min-h-[300px] max-h-[600px] overflow-hidden cursor-pointer"
                                onClick={() => { setCarouselIndex(0); setViewMode('carousel'); }}
                            >
                                <Image
                                    src={allImages[0]}
                                    alt=""
                                    width={1200}
                                    height={800}
                                    className="w-full h-auto object-contain transition-transform group-hover/media:scale-[1.01] duration-700"
                                    unoptimized
                                />
                            </div>
                        )}

                        {count === 2 && allImages.map((img, i) => (
                            <div key={i} className="relative w-full h-full overflow-hidden cursor-pointer" onClick={() => { setCarouselIndex(i); setViewMode('carousel'); }}>
                                <Image src={img} fill alt="" className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700" unoptimized />
                            </div>
                        ))}

                        {count === 3 && (
                            <>
                                <div className="relative col-span-2 row-span-2 overflow-hidden cursor-pointer" onClick={() => { setCarouselIndex(0); setViewMode('carousel'); }}>
                                    <Image src={allImages[0]} fill alt="" className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700" unoptimized />
                                </div>
                                <div className="grid grid-rows-2 gap-2">
                                    <div className="relative w-full h-full overflow-hidden cursor-pointer" onClick={() => { setCarouselIndex(1); setViewMode('carousel'); }}>
                                        <Image src={allImages[1]} fill alt="" className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700" unoptimized />
                                    </div>
                                    <div className="relative w-full h-full overflow-hidden cursor-pointer" onClick={() => { setCarouselIndex(2); setViewMode('carousel'); }}>
                                        <Image src={allImages[2]} fill alt="" className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700" unoptimized />
                                    </div>
                                </div>
                            </>
                        )}

                        {count >= 4 && allImages.slice(0, 4).map((img, i) => (
                            <div key={i} className="relative w-full h-full overflow-hidden cursor-pointer" onClick={() => { setCarouselIndex(i); setViewMode('carousel'); }}>
                                <Image src={img} fill alt="" className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700" unoptimized />
                                {i === 3 && count > 4 && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                        <Plus className="w-8 h-8 mb-1" />
                                        <span className="text-lg font-black uppercase tracking-widest">{count - 4} más</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="carousel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-square flex flex-col items-center justify-center p-4 group/carousel"
                    >
                        {/* Back to Grid Button */}
                        <button
                            onClick={() => setViewMode('grid')}
                            className="absolute top-4 left-4 z-20 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10"
                        >
                            <ChevronLeft className="w-3 h-3" /> Volver
                        </button>

                        {/* Image Counter */}
                        <div className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                            {carouselIndex + 1} / {count}
                        </div>

                        {/* Current Image */}
                        <div className="relative w-full h-full flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={carouselIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="relative w-full h-full flex items-center justify-center"
                                >
                                    <Image
                                        src={allImages[carouselIndex]}
                                        alt=""
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Navigation Arrows */}
                        {count > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); prev(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); next(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
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
        <div className="group pb-12 mb-10 border-b border-slate-300 transition-all">
            {/* Author */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 relative">
                        {post.user.imageUrl ? (
                            <Image src={post.user.imageUrl} alt={post.user.name || ""} fill unoptimized className="object-cover" sizes="48px" />
                        ) : (
                            <span className="text-sm font-black text-slate-400 uppercase italic">{userInitials}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-black uppercase italic tracking-tighter text-slate-900">{post.user.name}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 font-black uppercase tracking-widest border border-slate-100">
                                {post.user.role === 'jugador' ? 'Jugador' : post.user.role === 'club' ? 'Club' : post.user.role === 'superadmin' ? 'Administrador' : 'Usuario'}
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{formatDateTimeAR(post.createdAt)}</span>
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
                    <div className="flex flex-col gap-4 mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <textarea
                            value={editPostContent}
                            onChange={(e) => setEditPostContent(capitalizeFirstLetter(e.target.value))}
                            className="w-full bg-transparent border-none outline-none text-lg text-slate-900 placeholder-slate-400 resize-none min-h-[120px]"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setIsEditingPost(false); setEditPostContent(post.content || ""); }}
                                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" /> Cancelar
                            </button>
                            <button
                                onClick={handleUpdatePost}
                                disabled={isUpdatingPost || !editPostContent.trim()}
                                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
                            >
                                {isUpdatingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    post.content && (
                        <p className="text-slate-800 text-lg font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                            {post.content}
                        </p>
                    )
                )}

                <PostMedia images={post.images} fallbackUrl={post.imageUrl} />

                {/* Interaction Row */}
                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors py-2 px-3 -ml-3 rounded-xl hover:bg-slate-50 font-black uppercase tracking-widest text-[10px]"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments?.length || 0} Comentarios</span>
                    </button>
                </div>

                {/* Comments Section */}
                <div className="mt-4 pt-6 border-t border-slate-50 flex flex-col gap-5">
                    {post.comments && post.comments.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {(showComments ? post.comments : post.comments.slice(-3)).map(comment => (
                                <CommentItem key={comment.id} comment={comment} currentUser={currentUser} />
                            ))}

                            {!showComments && post.comments.length > 3 && (
                                <button
                                    onClick={() => setShowComments(true)}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-azul-primary transition-colors pl-12 text-left"
                                >
                                    Ver los {post.comments.length - 3} comentarios restantes...
                                </button>
                            )}
                        </div>
                    )}

                    {/* Comment Input */}
                    {currentUser && (
                        <form onSubmit={handleComment} className="flex gap-3 items-center mt-2">
                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 overflow-hidden shrink-0 relative">
                                {currentUser.imageUrl ? (
                                    <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" sizes="40px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-400 uppercase italic">
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
                                    className="w-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white rounded-2xl py-3 px-5 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim() || commentState === 'loading'}
                                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all flex items-center justify-center
                                        ${commentState === 'success'
                                            ? 'bg-azul-primary text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:bg-slate-200'
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
        </div>
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
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 overflow-hidden shrink-0 relative mt-1">
                {comment.user.imageUrl ? (
                    <Image src={comment.user.imageUrl} alt="" fill unoptimized className="object-cover" sizes="36px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-slate-400 uppercase italic">
                        {comment.user.name?.charAt(0) || "U"}
                    </div>
                )}
            </div>
            <div className="flex-1 flex flex-col gap-1">
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 relative group-hover/comment:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase italic tracking-tighter text-slate-900">{comment.user.name}</span>
                        {isOwner && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setIsEditing(true); setEditText(comment.content); }}
                                    className="p-1 hover:text-azul-primary transition-colors"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="p-1 hover:text-red-600 transition-colors"
                                >
                                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="flex flex-col gap-2">
                            <input
                                value={editText}
                                onChange={(e) => setEditText(capitalizeFirstLetter(e.target.value))}
                                className="w-full bg-transparent border-none outline-none text-sm text-slate-900"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold text-slate-500 uppercase">Cancelar</button>
                                <button onClick={handleUpdate} disabled={isUpdating} className="text-[10px] font-bold text-azul-primary uppercase">
                                    {isUpdating ? "..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{comment.content}</p>
                    )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">{timeAgo(comment.createdAt)}</span>
            </div>
        </div>
    );
}