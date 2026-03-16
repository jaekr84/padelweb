"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerForTournament } from "./actions";
import {
    Check, UserPlus, Users, Trophy, MapPin,
    Calendar, Info, Search, User, ArrowLeft, ChevronRight
} from "lucide-react";

type Tournament = {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    categories: any;
    imageUrl: string | null;
    modalidad: any; // Can be object or string from DB
};

type CurrentUser = { id: string; name: string; email: string };

type Step = "info" | "team" | "confirm" | "success";


function Initials({ name }: { name: string }) {
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    return <span>{initials}</span>;
}

export default function RegisterForm({ tournament, currentUser }: { tournament: Tournament; currentUser: CurrentUser }) {
    // Safety check for categories
    let cats: string[] = [];
    try {
        if (Array.isArray(tournament.categories)) {
            cats = tournament.categories;
        } else if (typeof tournament.categories === 'string' && tournament.categories.trim().startsWith('[')) {
            cats = JSON.parse(tournament.categories);
        } else if (typeof tournament.categories === 'string' && tournament.categories.trim() !== '') {
            cats = [tournament.categories.trim()];
        }
    } catch (e) {
        console.error("Error parsing categories:", e);
    }

    // Safety check for modalidad
    let mod: any = tournament.modalidad;
    try {
        if (typeof tournament.modalidad === 'string' && tournament.modalidad.trim().startsWith('{')) {
            mod = JSON.parse(tournament.modalidad);
        }
    } catch (e) {
        console.error("Error parsing modalidad:", e);
    }

    const isIndividual = mod?.participacion === "individual";

    const hasCategories = cats.length > 0 && cats[0] !== "libre";

    const steps: { id: Step; label: string }[] = isIndividual
        ? [{ id: "info", label: "Torneo" }, { id: "confirm", label: "Confirmar" }, { id: "success", label: "Listo" }]
        : [{ id: "info", label: "Torneo" }, { id: "team", label: "Pareja" }, { id: "confirm", label: "Confirmar" }, { id: "success", label: "Listo" }];

    const [step, setStep] = useState<Step>("info");
    const [category, setCategory] = useState(cats[0] ?? "Libre");
    const [agreed, setAgreed] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [regError, setRegError] = useState<string | null>(null);

    const [partnerMode, setPartnerMode] = useState<"search" | "guest">("search");
    const [guestName, setGuestName] = useState("");
    const [partnerName, setPartnerName] = useState("");
    const [search, setSearch] = useState("");
    const [focused, setFocused] = useState(false);

    const switchMode = (mode: "search" | "guest") => {
        setPartnerMode(mode);
        setPartnerName("");
        setGuestName("");
        setSearch("");
    };

    const handleConfirm = () => {
        setRegError(null);
        startTransition(async () => {
            try {
                await registerForTournament({
                    tournamentId: tournament.id,
                    category: hasCategories ? category : null,
                    partnerName: isIndividual ? null : partnerDisplayName || null,
                    partnerUserId: null,
                    isGuestPartner: !isIndividual && partnerMode === "guest",
                });
                setStep("success");
            } catch (err) {
                setRegError(err instanceof Error ? err.message : "Error al confirmar la inscripción");
            }
        });
    };

    const filledTeam = isIndividual
        ? true
        : partnerMode === "guest" ? guestName.trim().length > 0 : partnerName.trim().length > 0;

    const stepIdx = steps.findIndex((s) => s.id === step);

    const goNext = () => {
        if (isIndividual) {
            if (step === "info") setStep("confirm");
        } else {
            if (step === "info") setStep("team");
            else if (step === "team") setStep("confirm");
        }
    };

    const goBack = () => {
        if (isIndividual) {
            if (step === "confirm") setStep("info");
        } else {
            if (step === "team") setStep("info");
            else if (step === "confirm") setStep("team");
        }
    };

    const partnerDisplayName = partnerMode === "guest" ? guestName.trim() : partnerName.trim();

    /* ────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-background overflow-x-hidden">

            {/* ── Ambient glow ── */}
            <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-600/8 to-transparent pointer-events-none z-0" />

            {/* ── Content ── */}
            <div className="relative z-10 max-w-lg mx-auto px-4 pt-5 pb-28">

                {/* ── Top bar ── */}
                <div className="flex items-center justify-between mb-6">
                    <Link
                        href="/tournaments"
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Link>
                    <div className="px-3 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                        Inscripción
                    </div>
                </div>

                {/* ── Step bar (hidden on success) ── */}
                {step !== "success" && (
                    <div className="mb-8">
                        {/* Progress track */}
                        <div className="relative flex items-center justify-between">
                            <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-muted">
                                <div
                                    className="absolute top-0 bottom-0 left-0 bg-blue-600 transition-all duration-500"
                                    style={{ width: `${(stepIdx / (steps.length - 1)) * 100}%` }}
                                />
                            </div>
                            {steps.filter(s => s.id !== "success").map((s, i) => {
                                const realIdx = steps.findIndex(st => st.id === s.id);
                                const done = realIdx < stepIdx;
                                const active = realIdx === stepIdx;
                                return (
                                    <div key={s.id} className="relative flex flex-col items-center gap-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all border ${done
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : active
                                                ? "bg-slate-900 border-blue-500 text-blue-400"
                                                : "bg-slate-900 border-slate-700 text-slate-600"
                                            }`}>
                                            {done ? <Check className="w-3.5 h-3.5" /> : (realIdx + 1)}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest absolute -bottom-5 whitespace-nowrap ${realIdx <= stepIdx ? "text-slate-300" : "text-slate-600"
                                            }`}>
                                            {s.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────
                    STEP: info
                ───────────────────────────────────────── */}
                {step === "info" && (
                    <div className="mt-10 animate-in fade-in slide-in-from-bottom-3 duration-300">

                        {/* Tournament card */}
                        <div className="bg-slate-900 border border-border rounded-3xl overflow-hidden shadow-2xl mb-6">
                            {/* Banner image */}
                            <div className="relative h-44 w-full bg-muted flex items-end">
                                {tournament.imageUrl ? (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent z-10" />
                                        <img
                                            src={tournament.imageUrl}
                                            alt={tournament.name}
                                            className="absolute inset-0 w-full h-full object-cover opacity-70"
                                        />
                                    </>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-800 to-slate-900 flex items-center justify-center">
                                        <Trophy className="w-16 h-16 text-slate-700" />
                                    </div>
                                )}
                                <h1 className="relative z-20 text-2xl font-black italic uppercase tracking-tight text-white px-5 pb-5 leading-tight">
                                    {tournament.name}
                                </h1>
                            </div>

                            {/* Info pills */}
                            <div className="p-4 space-y-3">
                                {tournament.description && (
                                    <p className="text-slate-400 text-sm leading-relaxed border-b border-border pb-3">
                                        {tournament.description}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    {tournament.startDate && (
                                        <div className="bg-muted border border-slate-700 rounded-2xl p-3 flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center shrink-0">
                                                <Calendar className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fecha</p>
                                                <p className="text-xs font-bold text-slate-200 leading-tight">
                                                    {tournament.startDate}
                                                    {tournament.endDate && tournament.endDate !== tournament.startDate && ` → ${tournament.endDate}`}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-muted border border-slate-700 rounded-2xl p-3 flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center shrink-0">
                                            {isIndividual ? <User className="w-4 h-4 text-purple-400" /> : <Users className="w-4 h-4 text-purple-400" />}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Modalidad</p>
                                            <p className="text-xs font-bold text-slate-200">{isIndividual ? "Individual" : "En Pareja"}</p>
                                        </div>
                                    </div>
                                    {mod?.genero && (
                                        <div className="bg-muted border border-slate-700 rounded-2xl p-3 flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center shrink-0">
                                                <Info className="w-4 h-4 text-amber-400" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Género</p>
                                                <p className="text-xs font-bold text-slate-200 capitalize">
                                                    {mod.genero === "mixto" ? "Mixto" : mod.genero === "hombre" ? "Hombres" : "Mujeres"}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Category selector */}
                        {hasCategories && (
                            <div className="bg-slate-900 border border-border rounded-3xl p-4 mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Seleccioná tu categoría</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {cats.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategory(cat)}
                                            className={`py-3 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border ${category === cat
                                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                                                : "bg-muted border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={goNext}
                            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            {isIndividual ? "Continuar" : "Elegir pareja"}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ─────────────────────────────────────────
                    STEP: team (solo pareja)
                ───────────────────────────────────────── */}
                {step === "team" && !isIndividual && (
                    <div className="mt-10 animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">

                        <div className="text-center mb-2">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Tu pareja</h2>
                            <p className="text-slate-500 text-xs mt-1">
                                Elegí tu compañero/a{hasCategories ? <> — categoría <strong className="text-blue-400">{category}</strong></> : ""}
                            </p>
                        </div>

                        {/* Jugador 1 */}
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2 pl-1">Jugador 1 · Vos</p>
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-2xl" />
                                <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 text-blue-300 font-black text-sm flex items-center justify-center shrink-0 ml-2">
                                    <Initials name={currentUser.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white text-sm truncate">{currentUser.name}</p>
                                    <p className="text-slate-500 text-[10px] truncate">{currentUser.email}</p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-950 border border-blue-800 text-blue-400 px-2 py-1 rounded-lg shrink-0">Tú</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-muted border border-slate-700 flex items-center justify-center">
                                <UserPlus className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        {/* Jugador 2 */}
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2 pl-1">Jugador 2 · Compañero/a</p>
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                                {/* Mode toggle */}
                                <div className="flex m-3 mb-0 bg-muted rounded-xl p-1 relative">
                                    <button
                                        onClick={() => switchMode("search")}
                                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all z-10 ${partnerMode === "search" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                                    >
                                        Buscar Jugador
                                    </button>
                                    <button
                                        onClick={() => switchMode("guest")}
                                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all z-10 ${partnerMode === "guest" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                                    >
                                        Invitado
                                    </button>
                                    <div
                                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-700 border border-slate-600 rounded-lg transition-all duration-300 z-0"
                                        style={{ left: partnerMode === "search" ? "4px" : "calc(50%)" }}
                                    />
                                </div>

                                <div className="p-3">
                                    {partnerMode === "guest" ? (
                                        <div className="relative animate-in fade-in duration-200">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                className="w-full bg-muted border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                                                placeholder="Nombre del invitado..."
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                autoFocus
                                            />
                                            <p className="text-[10px] text-slate-600 mt-2 text-center px-2">
                                                Aparecerá en el fixture con este nombre.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative animate-in fade-in duration-200">
                                            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                                            <input
                                                className="w-full bg-muted border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                                                placeholder="Buscar jugador registrado..."
                                                value={search}
                                                onChange={(e) => { setSearch(e.target.value); setPartnerName(""); }}
                                                onFocus={() => setFocused(true)}
                                                onBlur={() => setTimeout(() => setFocused(false), 150)}
                                            />

                                            {partnerName && (
                                                <div className="mt-2 bg-blue-950 border border-blue-800 rounded-xl p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-900 border border-blue-700 text-blue-300 font-black text-[10px] flex items-center justify-center">
                                                            <Initials name={partnerName} />
                                                        </div>
                                                        <span className="font-bold text-blue-100 text-sm">{partnerName}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => { setPartnerName(""); setSearch(""); }}
                                                        className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
                                                    >
                                                        Cambiar
                                                    </button>
                                                </div>
                                            )}

                                            {focused && !partnerName && search.trim() && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-muted border border-slate-700 rounded-xl p-2 shadow-2xl z-20">
                                                    {search.trim().length < 2 ? (
                                                        <p className="text-center py-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mínimo 2 caracteres</p>
                                                    ) : (
                                                        <button
                                                            className="w-full text-left p-3 rounded-lg hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                                            onMouseDown={() => { setPartnerName(search.trim()); setSearch(""); }}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 font-black text-xs">?</div>
                                                            <div>
                                                                <p className="font-bold text-sm text-white">Usar "{search.trim()}"</p>
                                                                <p className="text-[10px] text-slate-500">Como nombre temporal</p>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nav buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={goBack}
                                className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 border border-slate-700 hover:bg-muted hover:text-white transition-all"
                            >
                                Volver
                            </button>
                            <button
                                onClick={goNext}
                                disabled={!filledTeam}
                                className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
                            >
                                Siguiente <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────
                    STEP: confirm
                ───────────────────────────────────────── */}
                {step === "confirm" && (
                    <div className="mt-10 animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">

                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl bg-blue-950 border border-blue-800 flex items-center justify-center mx-auto mb-3">
                                <Check className="w-7 h-7 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Confirmá tu inscripción</h2>
                            <p className="text-slate-500 text-xs mt-1">Revisá los datos antes de confirmar.</p>
                        </div>

                        {/* Summary card */}
                        <div className="bg-slate-900 border border-border rounded-3xl overflow-hidden">
                            {/* Torneo header */}
                            <div className="bg-muted border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Torneo</p>
                                <p className="text-sm font-black text-white">{tournament.name}</p>
                            </div>

                            <div className="p-4 space-y-2.5">
                                {hasCategories && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-950 border border-blue-800 text-blue-400 px-2.5 py-1 rounded-lg">{category}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modalidad</span>
                                    <span className="text-xs font-bold text-slate-300">{isIndividual ? "Individual" : "En Pareja"}</span>
                                </div>

                                <div className="border-t border-border pt-3 space-y-2">
                                    {/* Player 1 */}
                                    <div className="bg-muted border border-slate-700 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600" />
                                        <div className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-black text-slate-400 ml-1.5">1</div>
                                        <span className="font-bold text-white text-sm truncate">{currentUser.name}</span>
                                    </div>

                                    {/* Player 2 */}
                                    {!isIndividual && (
                                        <div className="bg-muted border border-slate-700 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600" />
                                            <div className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-black text-slate-400 ml-1.5">2</div>
                                            <span className="font-bold text-white text-sm truncate flex items-center gap-2 flex-1 min-w-0">
                                                <span className="truncate">{partnerDisplayName}</span>
                                                {partnerMode === "guest" && (
                                                    <span className="bg-slate-700 border border-slate-600 text-slate-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0">Invitado</span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {regError && (
                            <div className="p-4 rounded-2xl bg-red-950 border border-red-800 text-red-400 text-sm font-bold flex items-start gap-3">
                                <span className="shrink-0">⚠️</span> {regError}
                            </div>
                        )}

                        {/* Términos */}
                        <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900 border border-border cursor-pointer hover:border-slate-700 transition-colors">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all ${agreed ? "bg-blue-600 border-blue-600 text-white" : "border-slate-600 text-transparent"
                                }`}>
                                <Check className="w-3 h-3" strokeWidth={3} />
                            </div>
                            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="hidden" />
                            <span className="text-xs font-medium text-slate-400 leading-relaxed">
                                Confirmo que los datos son correctos y acepto el reglamento del torneo.
                            </span>
                        </label>

                        {/* Nav buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={goBack}
                                className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 border border-slate-700 hover:bg-muted hover:text-white transition-all"
                            >
                                Volver
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!agreed || isPending}
                                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
                            >
                                {isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────
                    STEP: success
                ───────────────────────────────────────── */}
                {step === "success" && (
                    <div className="mt-16 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
                        {/* Icon */}
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-950 border border-emerald-800 flex items-center justify-center shadow-2xl shadow-emerald-600/10">
                                <Check className="w-10 h-10 text-emerald-400" strokeWidth={2.5} />
                            </div>
                            <div className="absolute inset-0 rounded-3xl border border-emerald-500/30 animate-ping" />
                        </div>

                        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">
                            ¡Plaza confirmada!
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-8">
                            {isIndividual
                                ? <>Tu participación en <strong className="text-white">{tournament.name}</strong> está asegurada.</>
                                : <>El equipo de <strong className="text-white">{currentUser.name}</strong> y <strong className="text-white">{partnerDisplayName}</strong> están dentro del torneo.</>
                            }
                            {hasCategories && <span className="block mt-1.5">Categoría: <strong className="text-blue-400">{category}</strong></span>}
                        </p>

                        {/* Next steps */}
                        <div className="bg-slate-900 border border-border rounded-2xl p-4 w-full text-left mb-8">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Próximos pasos</p>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Asegurate de abonar la inscripción antes del cierre. Las llaves se generarán automáticamente.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <Link
                                href="/tournaments"
                                className="w-full py-4 rounded-2xl border border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-muted hover:text-white transition-all text-center"
                            >
                                Ver otros torneos
                            </Link>
                            <Link
                                href="/home"
                                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-[10px] uppercase tracking-widest text-center"
                            >
                                Ir al inicio →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
