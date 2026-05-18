"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPost } from "./actions";
import {
    Image as ImageIcon, X, MessageSquare, Loader2,
    Check, Users2, Trophy, Clock,
    ChevronLeft, ChevronRight, Plus,
    Activity, Zap, Compass, Share2
} from "lucide-react";
import imageCompression from "browser-image-compression";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// Shared Components
import { PostItem } from "@/components/social/PostItem";
import { TournamentSidebarItem } from "@/components/tournaments/TournamentSidebarItem";
import { OpenCourtSidebarItem } from "@/components/courts/OpenCourtSidebarItem";
import PlayerCard from "@/components/PlayerCard";

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
    playerProfileData?: {
        player: {
            firstName: string;
            lastName: string;
            imageUrl: string | null;
            category: string;
            side: string;
            points: number;
            clubName: string;
            gender?: string | null;
        };
        stats: {
            pj: number;
            pg: number;
            pp: number;
            wr: number;
            trofeos: number;
        };
        history: any[];
    } | null;
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

export default function HomeClient({
    initialPosts,
    currentUser,
    upcomingTournaments,
    ongoingTournaments,
    upcomingOpenCourts,
    playerProfileData
}: HomeClientProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [selectedImages, setSelectedImages] = useState<{ id: string, file: File, preview: string }[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [postState, setPostState] = useState<ActionState>('idle');

    // Memoize permission check
    const canPost = useMemo(() =>
        currentUser?.role.split(',').some(r => r === 'superadmin' || r === 'club'),
        [currentUser?.role]);

    // Computed Stats for HUD Panel
    const totalActiveTournaments = useMemo(() => ongoingTournaments.length + upcomingTournaments.length, [ongoingTournaments, upcomingTournaments]);
    const totalOpenSlots = useMemo(() => upcomingOpenCourts.length, [upcomingOpenCourts]);

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(capitalizeFirstLetter(e.target.value));
    }, []);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const totalAfterAdd = selectedImages.length + files.length;
        if (totalAfterAdd > 10) {
            toast.error("Máximo 10 fotos por publicación");
            return;
        }

        setIsOptimizing(true);
        const optimizationToast = toast.loading("Optimizando imágenes para la red...");

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
            toast.success(`${files.length} imágenes procesadas con éxito`, { id: optimizationToast });
        } catch (err) {
            toast.error("Error al comprimir imágenes", { id: optimizationToast });
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
        const uploadToast = toast.loading("Transmitiendo publicación...");

        try {
            let imageUrls: string[] = [];

            if (selectedImages.length > 0) {
                imageUrls = await Promise.all(
                    selectedImages.map(img => uploadImage(img.file))
                );
            }

            await createPost(content, imageUrls.length > 0 ? imageUrls : null);

            setPostState('success');
            toast.success("Publicado en la comunidad ACAP", { id: uploadToast });
            setContent("");
            selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
            setSelectedImages([]);
            router.refresh();

            setTimeout(() => setPostState('idle'), 2000);
        } catch (err: any) {
            toast.error(err.message || "Fallo en la publicación", { id: uploadToast });
            setPostState('idle');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/40 text-slate-900 pb-24 font-sans selection:bg-azul-primary/20 relative overflow-x-hidden">
            {/* Elegant grid background and ambient glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:32px_32px] opacity-100" />
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-celeste/5 rounded-full blur-[140px] opacity-60" />
                <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-azul-primary/5 rounded-full blur-[140px] opacity-60" />
            </div>

            {/* Header Section */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 py-4 px-4 sm:px-6">
                <div className="max-w-[1300px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-azul-primary animate-pulse" />
                            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-celeste">Comunidad A.C.A.P.</p>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tight leading-none text-slate-900">
                            Dashboard <span className="text-azul-primary">Social</span>
                        </h1>
                    </motion.div>

                    {/* Integrated Live HUD Stats Console */}
                    <div className="flex items-center gap-2 sm:gap-3 bg-slate-100/60 border border-slate-200/40 rounded-2xl p-1.5 shrink-0 self-start sm:self-center">
                        <div className="px-3 py-1.5 flex items-center gap-2 border-r border-slate-200/30">
                            <Trophy className="w-3.5 h-3.5 text-celeste" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-800 leading-none">{totalActiveTournaments}</span>
                                <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Torneos</span>
                            </div>
                        </div>

                        <div className="px-3 py-1.5 flex items-center gap-2">
                            <Users2 className="w-3.5 h-3.5 text-emerald-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-800 leading-none">{totalOpenSlots}</span>
                                <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Canchas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-[1300px] mx-auto flex flex-col xl:flex-row pt-6 px-3 sm:px-6 gap-8 justify-center">

                {/* ── Main Feed Column ── */}
                <div className="w-full xl:max-w-[760px] flex flex-col gap-6">

                    {/* Mobile Tournaments Bar */}
                    <div className="xl:hidden mb-2 overflow-hidden">
                        <MobileTournamentBar
                            ongoing={ongoingTournaments}
                            upcoming={upcomingTournaments}
                            formatDateAR={formatDateAR}
                        />
                    </div>

                    {/* Compose Post Center */}
                    {canPost && currentUser && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-200/70 rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] relative overflow-hidden"
                        >
                            {/* Decorative crop marks for advanced HUD styling */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-azul-primary/20" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-azul-primary/20" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-azul-primary/20" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-azul-primary/20" />

                            <div className="flex gap-4">
                                {/* Compact User Avatar */}
                                <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 relative">
                                    {currentUser.imageUrl ? (
                                        <Image src={currentUser.imageUrl} alt={currentUser.name || ""} fill unoptimized className="object-cover" sizes="40px" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-black bg-slate-100 text-slate-450 uppercase italic">
                                            {currentUser.name?.charAt(0) || "U"}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Advanced Text Area */}
                                    <textarea
                                        value={content}
                                        onChange={handleContentChange}
                                        placeholder="¿Qué novedades o anuncios hay en el club hoy?"
                                        className="w-full bg-transparent resize-none text-slate-800 placeholder-slate-400 outline-none text-sm font-medium pt-1 min-h-[90px] leading-relaxed"
                                    />

                                    {/* WebP Compressed Previews */}
                                    {selectedImages.length > 0 && (
                                        <div className="flex gap-3 overflow-x-auto py-3 px-1 no-scrollbar snap-x">
                                            <AnimatePresence mode="popLayout">
                                                {selectedImages.map((img, idx) => (
                                                    <motion.div
                                                        key={img.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.85 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.85 }}
                                                        className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden border border-slate-200/60 bg-slate-50 snap-start group"
                                                    >
                                                        <Image src={img.preview} fill className="object-cover" alt="Preview" unoptimized />

                                                        <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                                            {idx > 0 && (
                                                                <button onClick={() => moveImage(idx, 'left')} className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all active:scale-90">
                                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => removeImage(img.id)} className="p-1 bg-rose-500 hover:bg-rose-600 rounded-full text-white transition-all active:scale-90">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                            {idx < selectedImages.length - 1 && (
                                                                <button onClick={() => moveImage(idx, 'right')} className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all active:scale-90">
                                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-slate-950/80 backdrop-blur-md text-[8px] font-black text-white rounded-md uppercase tracking-widest">
                                                            {idx + 1}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>

                                            {selectedImages.length < 10 && (
                                                <label className="w-28 h-28 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 hover:border-azul-primary/50 hover:bg-azul-primary/5 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-azul-primary transition-all cursor-pointer">
                                                    <Plus className="w-5 h-5" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Añadir</span>
                                                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Bar */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <label className="p-2 -ml-2 text-slate-400 hover:text-azul-primary hover:bg-azul-primary/5 rounded-full cursor-pointer transition-all relative active:scale-95">
                                            <ImageIcon className="w-5 h-5" />
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                                            {selectedImages.length > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-celeste text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                                    {selectedImages.length}
                                                </span>
                                            )}
                                        </label>

                                        <button
                                            onClick={handlePost}
                                            disabled={postState !== 'idle' || isOptimizing || (!content.trim() && selectedImages.length === 0)}
                                            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-md
                                                ${postState === 'success'
                                                    ? 'bg-azul-primary text-white shadow-azul-primary/20'
                                                    : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none'
                                                }`}
                                        >
                                            {postState === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                                            {postState === 'success' && <Check className="w-3 h-3" />}
                                            {postState === 'loading' ? "Publicando..." : postState === 'success' ? "Publicado" : "Publicar"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Social Feed Post List */}
                    <div className="flex flex-col gap-5">
                        {initialPosts.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                                <div className="w-12 h-12 bg-slate-50 text-slate-455 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MessageSquare className="w-5 h-5 text-azul-primary" />
                                </div>
                                <p className="text-slate-800 font-black uppercase text-xs tracking-wider">Sin Novedades</p>
                                <p className="text-slate-400 text-xs mt-1">Aún no hay publicaciones en esta comunidad.</p>
                            </div>
                        ) : (
                            initialPosts.map((post, idx) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
                                >
                                    <PostItem
                                        post={post}
                                        currentUser={currentUser}
                                        formatDateTimeAR={formatDateTimeAR}
                                        timeAgo={timeAgo}
                                        capitalizeFirstLetter={capitalizeFirstLetter}
                                    />
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar Panels (Desktop) ── */}
                <aside className="hidden xl:flex flex-col w-[320px] gap-6 sticky top-[80px] self-start shrink-0">

                    {/* User Profile Card & 10 Latest Matches (If logged in & profile data exists) */}
                    {currentUser && playerProfileData && (
                        <div className="flex flex-col gap-6">
                            {/* Player Card Frame */}
                            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] backdrop-blur-md relative overflow-hidden flex flex-col items-center">
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-right from-azul-primary to-celeste" />
                                
                                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                    <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800 flex items-center gap-2 italic">
                                        <Zap size={11} className="text-azul-primary animate-pulse" />
                                        Tu Ficha Oficial
                                    </h2>
                                    <Link
                                        href="/profile"
                                        className="text-[8px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors animate-pulse"
                                    >
                                        Mi Perfil
                                    </Link>
                                </div>

                                {/* Scaled Player Card without clipping */}
                                <div className="w-full flex justify-center h-[365px] items-start overflow-visible">
                                    <div className="transform scale-[0.68] origin-top shrink-0">
                                        <PlayerCard
                                            player={{
                                                firstName: playerProfileData.player.firstName,
                                                lastName: playerProfileData.player.lastName,
                                                imageUrl: playerProfileData.player.imageUrl,
                                                category: playerProfileData.player.category,
                                                side: playerProfileData.player.side,
                                                points: playerProfileData.player.points,
                                                clubName: playerProfileData.player.clubName,
                                                gender: playerProfileData.player.gender
                                            }}
                                            stats={{
                                                pj: playerProfileData.stats.pj,
                                                pg: playerProfileData.stats.pg,
                                                pp: playerProfileData.stats.pp,
                                                wr: playerProfileData.stats.wr,
                                                trofeos: playerProfileData.stats.trofeos
                                            }}
                                            isCurrentUser={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 5 Latest Matches List */}
                            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] backdrop-blur-md relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-right from-azul-primary to-celeste" />
                                
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                                    <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800 flex items-center gap-2 italic">
                                        <Trophy size={11} className="text-azul-primary" />
                                        Tus Últimos 5 Partidos
                                    </h2>
                                    <span className="text-[8px] font-black uppercase italic text-celeste">Bitácora</span>
                                </div>

                                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                                    {playerProfileData.history.length === 0 ? (
                                        <EmptyState text="Sin partidos registrados" />
                                    ) : (
                                        playerProfileData.history.slice(0, 5).map((match, i) => {
                                            const matchDate = match.date 
                                                ? new Date(match.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) 
                                                : "---";
                                            const isWin = match.isWin === true;
                                            const isLoss = match.isWin === false;
                                            
                                            return (
                                                <div 
                                                    key={i} 
                                                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 transition-all group"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-1.5 h-6 rounded-full shrink-0 ${isWin ? "bg-azul-primary shadow-[0_0_8px_rgba(0,119,255,0.4)]" : isLoss ? "bg-rojo shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-slate-300"}`} />
                                                        
                                                        <div className="min-w-0 flex flex-col">
                                                            <span className="text-[9px] font-black uppercase truncate text-slate-900 group-hover:text-azul-primary transition-colors leading-normal">{match.tournament}</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[7px] font-black uppercase px-1 py-0.2 bg-white border border-slate-200 text-slate-400 tracking-widest leading-none">{match.type}</span>
                                                                <span className="text-[7.5px] font-bold text-slate-500 truncate">{match.opponent}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-[7.5px] font-black italic ${isWin ? "text-azul-primary" : isLoss ? "text-rojo" : "text-slate-400"}`}>
                                                                {isWin ? "VICTORIA" : isLoss ? "DERROTA" : "COMPLETO"}
                                                            </span>
                                                            <span className="text-[10px] font-black italic tracking-tighter text-slate-800 leading-none tabular-nums mt-0.5">{match.score}</span>
                                                        </div>
                                                        
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 tabular-nums bg-white border border-slate-200 px-1.5 py-1 rounded-md leading-none">
                                                            {matchDate}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active & Ongoing Tournaments Section */}
                    <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-right from-amber-500/80 to-celeste/80" />

                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                            <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800 flex items-center gap-2 italic">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                Torneos Activos
                            </h2>
                            <Link
                                href="/tournaments"
                                className="text-[8px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors"
                            >
                                Ver Todo
                            </Link>
                        </div>

                        {ongoingTournaments.length === 0 ? (
                            <EmptyState text="No hay torneos en curso" />
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {ongoingTournaments.slice(0, 3).map(t => (
                                    <TournamentSidebarItem key={t.id} t={t} formatDateAR={formatDateAR} isOngoing />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Tournaments Section */}
                    <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-right from-azul-primary to-celeste" />

                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                            <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800 flex items-center gap-2 italic">
                                <span className="w-1.5 h-1.5 bg-azul-primary rounded-full" />
                                Próximos Torneos
                            </h2>
                            <Link
                                href="/tournaments"
                                className="text-[8px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors"
                            >
                                Inscribirse
                            </Link>
                        </div>

                        {upcomingTournaments.length === 0 ? (
                            <EmptyState text="Sin torneos programados" />
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {upcomingTournaments.slice(0, 3).map(t => (
                                    <TournamentSidebarItem key={t.id} t={t} formatDateAR={formatDateAR} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Open Courts Telemetry Panel */}
                    <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-right from-emerald-500 to-azul-primary" />

                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                            <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800 flex items-center gap-2 italic">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Canchas Abiertas
                            </h2>
                            <Link
                                href="/cancha-abierta"
                                className="text-[8px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors"
                            >
                                Reservar
                            </Link>
                        </div>

                        {upcomingOpenCourts.length === 0 ? (
                            <EmptyState text="Sin partidos abiertos" />
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {upcomingOpenCourts.slice(0, 3).map(oc => (
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
        <div className="flex flex-col gap-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-3xl mb-2">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-azul-primary rounded-full animate-pulse" />
                    Torneos Activos
                </h2>
                <Link href="/tournaments" className="text-[8px] font-black uppercase tracking-widest text-azul-primary">Ver todos</Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-1 px-1 no-scrollbar snap-x snap-mandatory">
                {[...ongoing, ...upcoming].map((t) => (
                    <div key={t.id} className="min-w-[270px] max-w-[270px] snap-center">
                        <TournamentSidebarItem t={t} formatDateAR={formatDateAR} isOngoing={t.status === 'en_curso' || t.status === 'en_eliminatorias'} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <p className="text-[8px] font-black text-slate-400 text-center py-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800/40 border-dashed italic uppercase tracking-widest">
            {text}
        </p>
    );
}