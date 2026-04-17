"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPost } from "./actions";
import {
    Image as ImageIcon, X, MessageSquare, Loader2,
    Check, Users2, Trophy, Clock,
    ChevronLeft, ChevronRight, Plus
} from "lucide-react";
import imageCompression from "browser-image-compression";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// Shared Components
import { PostItem } from "@/components/social/PostItem";
import { TournamentSidebarItem } from "@/components/tournaments/TournamentSidebarItem";
import { OpenCourtSidebarItem } from "@/components/courts/OpenCourtSidebarItem";

// Utils
import { timeAgo, formatDateAR, formatDateTimeAR } from "@/lib/utils";

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

const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function HomeClient({ initialPosts, currentUser, upcomingTournaments, ongoingTournaments, upcomingOpenCourts }: HomeClientProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [selectedImages, setSelectedImages] = useState<{ id: string, file: File, preview: string }[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [postState, setPostState] = useState<ActionState>('idle');

    // Memoize permission check
    const canPost = useMemo(() =>
        currentUser?.role.split(',').some(r => r === 'superadmin' || r === 'club'),
        [currentUser?.role]);

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(capitalizeFirstLetter(e.target.value));
    }, []);

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
                    fileType: 'image/webp'
                };

                const cBlob = await imageCompression(file, options);
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

    const removeImage = useCallback((id: string) => {
        setSelectedImages(prev => {
            const filtered = prev.filter(img => img.id !== id);
            const removed = prev.find(img => img.id === id);
            if (removed) URL.revokeObjectURL(removed.preview);
            return filtered;
        });
    }, []);

    const moveImage = useCallback((index: number, direction: 'left' | 'right') => {
        setSelectedImages(prev => {
            const newIndex = direction === 'left' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const updated = [...prev];
            const [moved] = updated.splice(index, 1);
            updated.splice(newIndex, 0, moved);
            return updated;
        });
    }, []);

    const handlePost = async () => {
        if (!content.trim() && selectedImages.length === 0) return;

        setPostState('loading');
        const uploadToast = toast.loading("Publicando...");

        try {
            let imageUrls: string[] = [];

            if (selectedImages.length > 0) {
                imageUrls = await Promise.all(
                    selectedImages.map(img => uploadImage(img.file))
                );
            }

            await createPost(content, imageUrls.length > 0 ? imageUrls : null);

            setPostState('success');
            toast.success("Publicado en la comunidad", { id: uploadToast });
            setContent("");
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

                    <div className="xl:hidden mb-12 overflow-hidden px-2">
                        <MobileTournamentBar
                            ongoing={ongoingTournaments}
                            upcoming={upcomingTournaments}
                            formatDateAR={formatDateAR}
                        />
                    </div>

                    {/* Compose Post */}
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

                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            {idx > 0 && (
                                                                <button onClick={() => moveImage(idx, 'left')} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-colors">
                                                                    <ChevronLeft className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => removeImage(img.id)} className="p-1.5 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white backdrop-blur-md transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                            {idx < selectedImages.length - 1 && (
                                                                <button onClick={() => moveImage(idx, 'right')} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-colors">
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
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
                                <PostItem
                                    key={post.id}
                                    post={post}
                                    currentUser={currentUser}
                                    formatDateTimeAR={formatDateTimeAR}
                                    timeAgo={timeAgo}
                                    capitalizeFirstLetter={capitalizeFirstLetter}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar ── */}
                <aside className="hidden xl:flex flex-col w-[340px] gap-12 sticky top-24 self-start">

                    {/* Tournaments List */}
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
                                    <TournamentSidebarItem key={t.id} t={t} formatDateAR={formatDateAR} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ongoing Tournaments */}
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
                                    <TournamentSidebarItem key={t.id} t={t} formatDateAR={formatDateAR} isOngoing />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Open Courts */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-300">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-black italic flex items-center gap-2">
                                <Users2 className="w-3.5 h-3.5 text-blue-500" /> Cancha Abierta
                            </h2>
                            <Link href="/cancha-abierta" className="text-[10px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors">Unirse</Link>
                        </div>
                        {upcomingOpenCourts.length === 0 ? (
                            <EmptyState text="No hay partidos abiertos" />
                        ) : (
                            <div className="flex flex-col">
                                {upcomingOpenCourts.map(oc => (
                                    <OpenCourtSidebarItem key={oc.id} oc={oc} formatDateAR={formatDateAR} />
                                ))}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

function MobileTournamentBar({ ongoing, upcoming, formatDateAR }: { ongoing: TournamentQuickView[], upcoming: TournamentQuickView[], formatDateAR: any }) {
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
                        <TournamentSidebarItem t={t} formatDateAR={formatDateAR} isOngoing={t.status === 'en_curso' || t.status === 'en_eliminatorias'} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="text-xs font-bold text-slate-400 text-center py-8 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed italic uppercase tracking-widest">{text}</p>;
}