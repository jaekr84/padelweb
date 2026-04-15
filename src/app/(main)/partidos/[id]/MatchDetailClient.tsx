"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Calendar, Clock, MapPin, Users, Trophy, User,
    X, Check, Trash2, ArrowLeft, MessageCircle, Share2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { joinPublicMatch, leavePublicMatch, cancelPublicMatch } from "../actions";

type MatchWithData = {
    id: string;
    creatorId: string;
    date: string;
    time: string;
    location: string;
    city: string;
    category: string | null;
    gender: string | null;
    description: string | null;
    totalSlots: number | null;
    status: string;
    creator: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        imageUrl: string | null;
        category: string | null;
    };
    registrations: {
        userId: string | null;
        guestName: string | null;
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
            category: string | null;
        } | null;
    }[];
};

interface MatchDetailClientProps {
    match: MatchWithData;
    isLoggedIn: boolean;
    currentUserId?: string;
}

export default function MatchDetailClient({ match, isLoggedIn, currentUserId }: MatchDetailClientProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const isCreator = match.creatorId === currentUserId;
    const isJoined = match.registrations.some(r => r.userId === currentUserId);
    const spotsFull = match.registrations.length;
    const totalSlots = match.totalSlots || 4;
    const remaining = Math.max(0, totalSlots - spotsFull);

    const handleAction = async () => {
        if (!isLoggedIn) {
            router.push("/login");
            return;
        }

        setLoading(true);
        try {
            if (isJoined) {
                await leavePublicMatch(match.id);
            } else {
                await joinPublicMatch(match.id);
            }
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("¿Estás seguro de que querés cancelar este partido?")) return;

        setLoading(true);
        try {
            await cancelPublicMatch(match.id);
            router.push("/partidos");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("es-AR", { weekday: 'long', day: "2-digit", month: "long" });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header / Nav */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <Link href="/partidos" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-900" />
                </Link>
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Detalle del Partido</h1>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <Share2 className="w-5 h-5 text-slate-400" />
                    </button>
                    {isCreator && (
                        <button onClick={handleCancel} className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 pb-32 space-y-8">
                {/* Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                >
                    <div className="bg-slate-900 p-12 text-white relative">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px]" />
                        </div>
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                            <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Categoría {match.category} • {match.gender}
                            </div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
                                Partido en <span className="text-blue-400">{match.location}</span>
                            </h2>
                            <p className="text-white/60 font-medium uppercase tracking-widest text-xs">{match.city}</p>
                        </div>
                    </div>

                    <div className="p-12 space-y-12">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                                        <p className="text-lg font-black text-slate-900 capitalize">{formatDate(match.date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</p>
                                        <p className="text-lg font-black text-slate-900">{match.time} HS</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</p>
                                        <p className="text-lg font-black text-slate-900">{match.location}</p>
                                    </div>
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${match.location}, ${match.city}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-12 px-6 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                    >
                                        <Share2 className="w-4 h-4" /> {/* Using Share2 as a proxy if map icon unavailable, but I'll check if I can use a generic map icon */}
                                        CÓMO LLEGAR
                                    </a>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidad</p>
                                        <p className="text-lg font-black text-slate-900">
                                            {spotsFull}/{totalSlots} <span className="text-slate-400 font-medium text-sm">JUGADORES</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Description */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sobre este partido</h3>
                            <p className="text-slate-600 font-medium leading-relaxed italic">
                                {match.description || "El organizador no agregó una descripción adicional para este partido."}
                            </p>
                        </div>

                        {/* Organizer */}
                        <div className="bg-slate-50 rounded-[2rem] p-8 flex items-center justify-between border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 relative bg-slate-50 flex items-center justify-center">
                                    {match.creator.imageUrl ? (
                                        <Image
                                            src={match.creator.imageUrl}
                                            alt={match.creator.firstName || "User"}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <User className="w-7 h-7 text-slate-300" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organizado por</p>
                                    <h4 className="text-lg font-black text-slate-900">
                                        {match.creator.firstName} {match.creator.lastName}
                                    </h4>
                                </div>
                            </div>
                            <div className="text-center bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nivel</p>
                                <p className="text-xs font-black text-blue-600 uppercase italic">Cat {match.creator.category}</p>
                            </div>
                        </div>

                        {/* Players list */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Jugadores Confirmados</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {match.registrations.map((reg, idx) => (
                                    <div key={reg.userId || `guest-${idx}`} className="flex items-center justify-between p-4 bg-white border border-blue-100/50 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden relative bg-blue-50 flex items-center justify-center shrink-0">
                                                {reg.user?.imageUrl ? (
                                                    <Image src={reg.user.imageUrl} alt="Player" fill className="object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-blue-500" />
                                                )}
                                            </div>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {reg.user ? `${reg.user.firstName} ${reg.user.lastName}` : reg.guestName}
                                                {reg.userId === match.creatorId && <span className="ml-2 text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Org</span>}
                                                {!reg.user && <span className="ml-2 text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Guest</span>}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-black text-blue-500 uppercase italic">
                                            {reg.user?.category ? `Cat ${reg.user.category}` : "Invitado"}
                                        </div>
                                    </div>
                                ))}
                                {Array.from({ length: remaining }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 border border-dashed border-green-200 bg-green-50/30 rounded-2xl animate-pulse">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-green-500" />
                                        </div>
                                        <span className="font-bold text-green-600/60 text-sm italic tracking-tight">Buscando jugador...</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button className="h-16 w-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    {isCreator ? (
                        <button disabled className="flex-1 h-16 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                            <Trophy className="w-4 h-4" />
                            Esperando Jugadores
                        </button>
                    ) : (
                        <button
                            onClick={handleAction}
                            disabled={loading || (remaining === 0 && !isJoined)}
                            className={`flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isJoined
                                ? 'bg-red-50 text-red-600 shadow-red-500/10 hover:bg-red-100'
                                : remaining === 0
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-blue-600'
                                }`}
                        >
                            {loading ? "PROCESANDO..." : isJoined ? (
                                <>
                                    <X className="w-4 h-4" />
                                    ABANDONAR PARTIDO
                                </>
                            ) : remaining === 0 ? (
                                "PARTIDO LLENO"
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    UNIRME A JUGARHORA
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
