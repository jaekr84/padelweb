"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerForTournament } from "./actions";
import { Check, UserPlus, Users, Trophy, MapPin, Calendar, Info, Search, User } from "lucide-react";

type Tournament = {
    id: string;
    name: string;
    description: string | null;
    surface: string | null;
    startDate: string | null;
    endDate: string | null;
    categories: string[] | null;
    imageUrl: string | null;
    modalidad: { mode: string; participacion: string; genero: string; tipoTorneo: string } | null;
};

type CurrentUser = { id: string; name: string; email: string };

type Step = "info" | "team" | "confirm" | "success";

function getSurfaceLabel(surface: string | null) {
    const map: Record<string, string> = {
        cesped: "Césped Verde", cesped_azul: "Césped Azul",
        cemento: "Hormigón", indoor: "Indoor",
    };
    return surface ? (map[surface] || surface) : "—";
}

export default function RegisterForm({ tournament, currentUser }: { tournament: Tournament; currentUser: CurrentUser }) {
    const isIndividual = tournament.modalidad?.participacion === "individual";
    const cats = tournament.categories ?? [];
    const hasCategories = cats.length > 0 && cats[0] !== "libre";

    const steps: { id: Step; label: string }[] = isIndividual
        ? [{ id: "info", label: "Torneo" }, { id: "confirm", label: "Confirmar" }, { id: "success", label: "Listo" }]
        : [{ id: "info", label: "Torneo" }, { id: "team", label: "Pareja" }, { id: "confirm", label: "Confirmar" }, { id: "success", label: "Listo" }];

    const [step, setStep] = useState<Step>("info");
    const [category, setCategory] = useState(cats[0] ?? "Libre");
    const [agreed, setAgreed] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [regError, setRegError] = useState<string | null>(null);

    // Pareja mode state
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Header Background Glow */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-blue-600/10 via-blue-600/5 to-transparent pointer-events-none" />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-24 relative z-10">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/tournaments" className="px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/10 text-sm font-bold backdrop-blur-md transition-colors shadow-sm">
                        ← Volver
                    </Link>
                    <div className="text-sm font-bold text-slate-500 shadow-sm px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 backdrop-blur-md">
                        Inscripción Oficial
                    </div>
                </div>

                {/* Step indicator */}
                <div className="mb-8 relative flex justify-between max-w-lg mx-auto">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-0 bg-blue-600 transition-all duration-500 rounded-full" style={{ width: \`\${(stepIdx / (steps.length - 1)) * 100}%\` }} />
                    </div>
                    {steps.map((s, i) => (
                        <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm ${i < stepIdx ? "bg-blue-600 text-white shadow-blue-500/30" :
                                    i === stepIdx ? "bg-white dark:bg-slate-800 text-blue-600 border-2 border-blue-600 shadow-blue-500/20" :
                                        "bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                }`}>
                                {i < stepIdx ? <Check className="w-4 h-4" /> : (i + 1)}
                            </div>
                            <span className={`text-xs font-bold absolute -bottom-6 whitespace-nowrap hidden sm:block ${i <= stepIdx ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-12 sm:mt-16 bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/20 dark:shadow-none">

                    {/* ═══ STEP: Torneo info ═══ */}
                    {step === "info" && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Banner */}
                            <div className="relative h-48 sm:h-56 w-full flex items-center justify-center bg-slate-900 overflow-hidden">
                                {tournament.imageUrl ? (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10" />
                                        <img src={tournament.imageUrl} alt={tournament.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                    </>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 z-10 flex items-center justify-center">
                                        <Trophy className="w-20 h-20 text-white/50" />
                                    </div>
                                )}
                                <h1 className="relative z-20 text-3xl sm:text-4xl font-extrabold text-white tracking-tight px-6 text-center max-w-xl self-end mb-6 drop-shadow-md">
                                    {tournament.name}
                                </h1>
                            </div>

                            <div className="p-6 sm:p-8">
                                {tournament.description && <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">{tournament.description}</p>}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                    {tournament.startDate && (
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Fecha</div>
                                                <div className="font-bold text-slate-900 dark:text-white">{tournament.startDate}{tournament.endDate && tournament.endDate !== tournament.startDate ? ` → ${tournament.endDate}` : ""}</div>
                                            </div>
                                        </div>
                                    )}
                                    {tournament.surface && (
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Superficie</div>
                                                <div className="font-bold text-slate-900 dark:text-white capitalize">{getSurfaceLabel(tournament.surface)}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                            {isIndividual ? <User className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Modalidad</div>
                                            <div className="font-bold text-slate-900 dark:text-white">{isIndividual ? "Individual" : "En Pareja"}</div>
                                        </div>
                                    </div>
                                    {tournament.modalidad?.genero && (
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Género</div>
                                                <div className="font-bold text-slate-900 dark:text-white capitalize">{tournament.modalidad.genero === "mixto" ? "Mixto" : tournament.modalidad.genero === "hombre" ? "Solo Hombres" : "Solo Mujeres"}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Category selector */}
                                {hasCategories && (
                                    <div className="mb-8">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">Seleccioná tu categoría</label>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {cats.map((cat) => (
                                                <button
                                                    key={cat}
                                                    className={`py-3 px-2 rounded-2xl font-bold text-sm transition-all border ${category === cat ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25 scale-[1.02]" : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                                                    onClick={() => setCategory(cat)}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] text-lg flex items-center justify-center gap-2" onClick={goNext}>
                                    {isIndividual ? "Continuar" : "Elegir pareja"} →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ STEP: Pareja (solo si es pareja) ═══ */}
                    {step === "team" && !isIndividual && (
                        <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8 text-center mt-4">
                                <h2 className="text-2xl font-extrabold mb-2 text-slate-900 dark:text-white">Tu pareja de juego</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                                    Elegí tu compañero/a{hasCategories ? <> para la categoría <strong className="text-blue-500">{category}</strong></> : ""}.
                                </p>
                            </div>

                            {/* Player 1: current user */}
                            <div className="mb-8 space-y-3 relative">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Jugador 1: Vos</div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-4 flex items-center gap-4 relative overflow-hidden shadow-sm">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
                                    <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-lg flex items-center justify-center shadow-inner relative z-10 shrink-0">
                                        {currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="relative z-10 overflow-hidden">
                                        <div className="font-bold text-lg text-slate-900 dark:text-white truncate pr-16">{currentUser.name}</div>
                                        <div className="text-sm text-slate-500 truncate">{currentUser.email}</div>
                                    </div>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md">
                                        You
                                    </div>
                                </div>
                            </div>

                            {/* Divider link */}
                            <div className="flex justify-center -my-3 relative z-10">
                                <div className="bg-white dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-700/50 w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                                    <UserPlus className="w-5 h-5 text-slate-400" />
                                </div>
                            </div>

                            {/* Player 2 */}
                            <div className="space-y-3 mb-10 pt-4">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Jugador 2: Compañero/a</div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 shadow-sm">
                                    <div className="flex bg-slate-200 dark:bg-slate-950 p-1 rounded-xl mb-6 shadow-inner relative">
                                        <button
                                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all z-10 ${partnerMode === "search" ? "text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                            onClick={() => switchMode("search")}
                                        >
                                            Buscar Jugador
                                        </button>
                                        <button
                                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all z-10 ${partnerMode === "guest" ? "text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                            onClick={() => switchMode("guest")}
                                        >
                                            Añadir Invitado
                                        </button>
                                        <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-800 rounded-lg shadow-sm transition-all duration-300 ease-out z-0" style={{ left: partnerMode === "search" ? "4px" : "calc(50% + 0px)" }} />
                                    </div>

                                    {partnerMode === "guest" ? (
                                        <div className="animate-in fade-in duration-300 relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                                                placeholder="Nombre del invitado..."
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                autoFocus
                                            />
                                            <p className="text-xs text-slate-500 mt-3 text-center px-4 font-medium leading-relaxed">
                                                Un invitado no tiene cuenta en la plataforma, pero aparecerá en los fixtures con el nombre ingresado.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in duration-300 relative">
                                            <Search className="absolute left-4 top-[26px] -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium transition-all"
                                                placeholder="Buscar usuario registrado..."
                                                value={search}
                                                onChange={(e) => { setSearch(e.target.value); setPartnerName(""); }}
                                                onFocus={() => setFocused(true)}
                                                onBlur={() => setTimeout(() => setFocused(false), 150)}
                                            />
                                            {partnerName && (
                                                <div className="mt-4 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-500/30 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center">
                                                            {partnerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="font-bold text-blue-900 dark:text-blue-100">{partnerName}</div>
                                                    </div>
                                                    <button className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" onClick={() => { setPartnerName(""); setSearch(""); }}>Cambiar</button>
                                                </div>
                                            )}
                                            {focused && !partnerName && search.trim() && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-xl z-20">
                                                    {search.trim().length < 2 ? (
                                                        <div className="text-center py-4 text-sm text-slate-500">Mínimo 2 caracteres...</div>
                                                    ) : (
                                                        <button
                                                            className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors group"
                                                            onMouseDown={() => { setPartnerName(search.trim()); setSearch(""); }}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors tracking-widest font-bold text-xs">
                                                                ?
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Usar "{search.trim()}"</div>
                                                                <div className="text-xs text-slate-500">Como nombre temporal</div>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-4 mt-8">
                                <button className="w-full sm:w-1/3 px-6 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={goBack}>Volver</button>
                                <button className="w-full sm:w-2/3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] text-lg" disabled={!filledTeam} onClick={goNext}>
                                    Siguiente Paso →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ STEP: Confirmar ═══ */}
                    {step === "confirm" && (
                        <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8 mt-4">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-900 shadow-sm relative z-10">
                                    <Check className="w-8 h-8 text-blue-500" />
                                </div>
                                <h2 className="text-2xl font-extrabold mb-2 text-slate-900 dark:text-white">Confirmá tu inscripción</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Revisá los datos finales antes de confirmar formalmente tu plaza.</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-inner space-y-4 mb-8">
                                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                                    <span className="text-slate-500 text-sm font-bold">Torneo</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{tournament.name}</span>
                                </div>
                                {hasCategories && (
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                                        <span className="text-slate-500 text-sm font-bold">Categoría</span>
                                        <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-lg">{category}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                                    <span className="text-slate-500 text-sm font-bold">Modalidad</span>
                                    <span className="font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-700/50 px-3 py-1 rounded-lg">
                                        {isIndividual ? "Individual" : "En Pareja"}
                                    </span>
                                </div>

                                <div className="pt-2" />

                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4 relative overflow-hidden">
                                    <div className="w-1 absolute left-0 top-0 bottom-0 bg-blue-500" />
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500">1</div>
                                    <div className="font-bold">{currentUser.name}</div>
                                </div>

                                {!isIndividual && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4 relative overflow-hidden">
                                        <div className="w-1 absolute left-0 top-0 bottom-0 bg-blue-500" />
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500">2</div>
                                        <div className="font-bold flex items-center gap-2">
                                            {partnerDisplayName}
                                            {partnerMode === "guest" && <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Invitado</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {regError && (
                                <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-bold flex items-start gap-3">
                                    <span className="text-xl leading-none">⚠️</span> {regError}
                                </div>
                            )}

                            <label className="flex items-start gap-4 p-4 rounded-2xl border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-800 cursor-pointer transition-colors group mb-8">
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all ${agreed ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-600 text-transparent"}`}>
                                    <Check className="w-4 h-4" strokeWidth={3} />
                                </div>
                                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="hidden" />
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                    Confirmo que los datos ingresados son correctos y acepto el reglamento general del torneo, así como las condiciones de participación.
                                </span>
                            </label>

                            <div className="flex flex-col-reverse sm:flex-row gap-4">
                                <button className="w-full sm:w-1/3 px-6 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={goBack}>Volver</button>
                                <button className="w-full sm:w-2/3 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:hover:bg-green-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-500/30 active:scale-[0.98] text-lg overflow-hidden relative" disabled={!agreed || isPending} onClick={handleConfirm}>
                                    {isPending ? (
                                        <div className="flex items-center justify-center gap-3 relative z-10">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 relative z-10">
                                            <Check className="w-5 h-5" /> Confirmar Inscripción
                                        </div>
                                    )}
                                    {isPending && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ STEP: Éxito ═══ */}
                    {step === "success" && (
                        <div className="p-8 sm:p-12 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-8 relative border-8 border-white dark:border-slate-900/40 shadow-xl overflow-hidden">
                                <div className="absolute inset-0 bg-green-400/20 animate-ping opacity-50" />
                                <Check className="w-10 h-10 relative z-10" strokeWidth={3} />
                            </div>
                            <h2 className="text-3xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight">¡Inscribiste tu plaza!</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-sm mb-10 leading-relaxed">
                                {isIndividual
                                    ? <>Tu participación individual en <strong>{tournament.name}</strong> está asegurada.</>
                                    : <>El equipo de <strong>{currentUser.name}</strong> y <strong>{partnerDisplayName}</strong> ya está dentro del torneo.</>
                                }
                                {hasCategories && <span className="block mt-2">Vas a jugar en <strong>{category}</strong>.</span>}
                            </p>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 w-full text-left border border-slate-200 dark:border-slate-700/50 mb-10 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-green-500/5 to-transparent pointer-events-none" />
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Próximos pasos</div>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Asegurate de abonar la inscripción antes del cierre para aparecer en el fixture. Las llaves se generarán automáticamente.</div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:justify-center">
                                <Link href="/tournaments" className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-center">
                                    Ver otros torneos
                                </Link>
                                <Link href="/feed" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-center">
                                    Ir al inicio →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
