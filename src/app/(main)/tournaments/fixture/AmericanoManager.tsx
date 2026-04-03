"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings,
    BarChart3, Check, X, RefreshCw, Dice5, Info, Pencil, RotateCcw,
    UserCheck, Zap, Settings2, Trash2, ArrowRight, Share2, Download, Search, CreditCard, Plus, Printer, ListFilter, LayoutGrid, Minus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveTournamentFixture, resetTournamentStatus } from "./actions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface AmericanoManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    readOnly?: boolean;
    isLoggedIn?: boolean;
}

type Player = { id: string; name: string; category?: string };
type Group = { id: string; name: string; players: Player[] };

type Match = {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    score1?: number;
    score2?: number;
    played: boolean;
    confirmed: boolean;
    roundIndex?: number;
    courtNumber?: number;
};

type BracketSlot = Player | "BYE" | null;

type BracketMatch = {
    id: string;
    round: number;
    slot: number;
    team1: BracketSlot;
    team2: BracketSlot;
    score1?: number;
    score2?: number;
    confirmed: boolean;
    winnerId?: string;
    winnerName?: string;
};

function getSeedingOrder(size: number) {
    if (size <= 1) return [1];
    let rounds = Math.log2(size);
    let order = [1, 2];
    for (let r = 1; r < rounds; r++) {
        let nextOrder = [];
        let sum = Math.pow(2, r + 1) + 1;
        for (let i = 0; i < order.length; i++) {
            if (i % 2 === 0) {
                nextOrder.push(order[i]);
                nextOrder.push(sum - order[i]);
            } else {
                nextOrder.push(sum - order[i]);
                nextOrder.push(order[i]);
            }
        }
        order = nextOrder;
    }
    return order;
}

export default function AmericanoManager({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus,
    readOnly = false,
    isLoggedIn = true
}: AmericanoManagerProps) {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [bracket, setBracket] = useState<BracketMatch[]>(initialBracket);
    const [saving, setSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [step, setStep] = useState<"setup" | "done" | "qual" | "elim">(
        initialStatus === "setup" ? "setup" :
            (initialStatus === "en_eliminatorias" || initialStatus === "finalizado") ? "elim" : "done"
    );
    const [qualCount, setQualCount] = useState(4); // Default manually adjustable advancement
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [present, setPresent] = useState<Set<string>>(new Set((initialGroups[0]?.players || []).map((p: Player) => p.id)));
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    const isGroupStageFinished = matches.every(m => m.confirmed);
    const totalGroupMatches = matches.length;
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const progressPercent = totalGroupMatches > 0 ? (confirmedGroupMatches / totalGroupMatches) * 100 : 0;

    const computeStandings = useCallback(() => {
        const group = groups[0]; // Single group for Americano
        if (!group) return [];
        const groupMatches = matches.filter(m => m.confirmed);

        const standings = group.players.map((p) => ({
            playerId: p.id,
            player: p,
            points: 0, // Game difference
            matchesPlayed: 0,
            won: 0,
            lost: 0,
            gamesWon: 0,
            gamesLost: 0,
        }));

        groupMatches.forEach(m => {
            if (m.score1 === undefined || m.score2 === undefined) return;
            const p1 = standings.find((s) => s.playerId === m.team1.id);
            const p2 = standings.find((s) => s.playerId === m.team2.id);

            if (p1 && p2) {
                p1.matchesPlayed++;
                p2.matchesPlayed++;
                p1.gamesWon += m.score1;
                p1.gamesLost += m.score2;
                p2.gamesWon += m.score2;
                p2.gamesLost += m.score1;
                p1.points += (m.score1 - m.score2);
                p2.points += (m.score2 - m.score1);
                if (m.score1 > m.score2) {
                    p1.won++;
                    p2.lost++;
                } else if (m.score2 > m.score1) {
                    p2.won++;
                    p1.lost++;
                }
            }
        });

        return standings.sort((a, b) =>
            (b.won - a.won) ||
            (b.points - a.points) ||
            (b.gamesWon - a.gamesWon)
        );
    }, [groups, matches]);

    const standings = useMemo(() => computeStandings(), [computeStandings]);

    const handleConfirmScore = async (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match || match.score1 === undefined || match.score2 === undefined) return;
        if (match.score1 === match.score2) {
            toast.error("No se permiten empates");
            return;
        }

        const updatedMatches = matches.map(m => m.id === matchId ? { ...m, confirmed: true } : m);
        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches: updatedMatches,
            bracket,
        });
        if (res.ok) {
            setMatches(updatedMatches);
            toast.success("Marcador guardado");
        } else {
            toast.error("Error al guardar: " + res.error);
        }
        setSaving(false);
    };

    const handleEditScore = (matchId: string) => {
        setMatches(matches.map(m => m.id === matchId ? { ...m, confirmed: false } : m));
    };

    const handleScoreChange = (matchId: string, s1: string, s2: string) => {
        setMatches(matches.map(m => {
            if (m.id !== matchId) return m;
            return {
                ...m,
                score1: s1 === "" ? undefined : parseInt(s1, 10),
                score2: s2 === "" ? undefined : parseInt(s2, 10),
                played: s1 !== "" && s2 !== ""
            };
        }));
    };

    const handleSimulateScores = async () => {
        if (!confirm("¿Simular resultados aleatorios (puntos 1-7) para todos los partidos sin confirmar?")) return;

        const updatedMatches = matches.map(m => {
            if (m.confirmed) return m;
            let s1 = Math.floor(Math.random() * 7) + 1;
            let s2 = Math.floor(Math.random() * 7) + 1;
            if (s1 === s2) s1 = s1 === 7 ? 6 : s1 + 1;
            return { ...m, score1: s1, score2: s2, played: true, confirmed: true };
        });

        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches: updatedMatches,
            bracket,
        });

        if (res.ok) {
            setMatches(updatedMatches);
            toast.success("Resultados simulados correctamente");
        } else {
            toast.error("Error al simular: " + res.error);
        }
        setSaving(false);
    };

    const generateBracket = async () => {
        const topPlayers = standings.slice(0, qualCount);
        if (topPlayers.length < 2) {
            toast.error("Se necesitan al menos 2 clasificados");
            return;
        }

        const numRounds = Math.ceil(Math.log2(qualCount));
        const bracketSize = Math.pow(2, numRounds);
        const seedPositions = getSeedingOrder(bracketSize);

        let newBracket: BracketMatch[] = [];
        for (let r = 0; r < numRounds; r++) {
            const matchesInRound = Math.pow(2, r);
            for (let s = 0; s < matchesInRound; s++) {
                newBracket.push({
                    id: `b_${r}_${s}`,
                    round: r,
                    slot: s,
                    team1: null,
                    team2: null,
                    confirmed: false,
                });
            }
        }

        const firstRoundIdx = numRounds - 1;
        const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);

        for (let i = 0; i < seedPositions.length; i += 2) {
            const mIdx = i / 2;
            const s1 = seedPositions[i];
            const s2 = seedPositions[i + 1];
            const match = firstRoundMatches[mIdx];
            if (match) {
                match.team1 = (topPlayers[s1 - 1]?.player || "BYE") as BracketSlot;
                match.team2 = (topPlayers[s2 - 1]?.player || "BYE") as BracketSlot;
                if ((match.team1 as any) === "BYE" || (match.team2 as any) === "BYE") {
                    match.confirmed = true;
                    const winner = (match.team1 as any) === "BYE" ? match.team2 : match.team1;
                    if (winner && winner !== "BYE") {
                        match.winnerId = (winner as Player).id;
                        match.winnerName = (winner as Player).name;
                    }
                }
            }
        }

        // Advance logic (simplified)
        const computeAdvanced = (b: BracketMatch[]) => {
            const result = [...b];
            for (let r = numRounds - 1; r > 0; r--) {
                const currentRound = result.filter(m => m.round === r);
                currentRound.forEach(m => {
                    if (m.confirmed && m.winnerId) {
                        const nextMatch = result.find(nm => nm.round === r - 1 && nm.slot === Math.floor(m.slot / 2));
                        if (nextMatch) {
                            const winner = [m.team1, m.team2].find(t => t !== null && (t as any) !== "BYE" && (t as Player)?.id === m.winnerId);
                            if (m.slot % 2 === 0) nextMatch.team1 = winner as Player;
                            else nextMatch.team2 = winner as Player;
                        }
                    }
                });
            }
            return result;
        };

        const finalBracket = computeAdvanced(newBracket);
        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: finalBracket,
        });

        if (res.ok) {
            setBracket(finalBracket);
            setStep("elim");
            toast.success("Llaves generadas correctamente");
        } else {
            toast.error("Error al generar llaves: " + res.error);
        }
        setSaving(false);
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        setBracket(bracket.map(m => m.id === matchId ? {
            ...m,
            score1: s1 === "" ? undefined : parseInt(s1, 10),
            score2: s2 === "" ? undefined : parseInt(s2, 10),
        } : m));
    };

    const handleBracketConfirm = async (matchId: string) => {
        const target = bracket.find(m => m.id === matchId);
        if (!target || target.score1 === undefined || target.score2 === undefined) return;
        if (target.score1 === target.score2) {
            toast.error("No se permiten empates");
            return;
        }

        const winner = target.score1 > target.score2 ? target.team1 : target.team2;
        const updated = bracket.map(m => m.id === matchId ? {
            ...m,
            confirmed: true,
            winnerId: (winner as Player).id,
            winnerName: (winner as Player).name
        } : m);

        // Auto-advance
        const totalRounds = Math.max(...updated.map(m => m.round)) + 1;
        let finalBracket = [...updated];
        for (let r = totalRounds - 1; r > 0; r--) {
            const current = finalBracket.filter(m => m.round === r);
            current.forEach(m => {
                const next = finalBracket.find(nm => nm.round === r - 1 && nm.slot === Math.floor(m.slot / 2));
                if (next && m.confirmed && m.winnerId) {
                    const winnerP = [m.team1, m.team2].find(t => t !== null && (t as any) !== "BYE" && (t as Player)?.id === m.winnerId);
                    if (m.slot % 2 === 0) next.team1 = winnerP as Player;
                    else next.team2 = winnerP as Player;
                }
            });
        }

        setSaving(true);
        const isFinal = target.round === 0;
        const res = await saveTournamentFixture({
            tournamentId,
            phase: isFinal ? "finalizado" : "eliminatorias",
            groups,
            matches,
            bracket: finalBracket,
            championName: isFinal ? (winner as Player).name : undefined,
        });

        if (res.ok) {
            setBracket(finalBracket);
            toast.success("Resultado guardado");
            if (isFinal) setShowSuccessModal(true);
        } else {
            toast.error("Error: " + res.error);
        }
        setSaving(false);
    };

    const stepperSteps = [
        { id: "done", label: "Partidos", icon: Swords, completed: isGroupStageFinished },
        { id: "qual", label: "Ranking", icon: BarChart3, completed: step === "elim" },
        { id: "elim", label: "Eliminatorias", icon: Trophy, completed: initialStatus === "finalizado" },
    ];

    const currentStepIdx = stepperSteps.findIndex(s => s.id === step);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* ── Fixed Header / Navigation ── */}
            <header className="sticky top-0 z-[60] bg-background/60 backdrop-blur-3xl border-b border-border/50">
                <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-3 text-foreground/40 hover:text-foreground transition-all px-4 py-2 hover:bg-muted rounded-2xl"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Volver</span>
                        </button>

                        <div className="h-10 w-px bg-border/30 hidden md:block" />

                        {/* DESKTOP STEPPER */}
                        <div className="hidden lg:flex items-center gap-2">
                            {(() => {
                                const steps = [
                                    { id: "setup", label: "Participantes", icon: Users2, active: step === "setup", completed: step !== "setup" },
                                    { id: "done", label: "Partidos", icon: Swords, active: step === "done", completed: step === "qual" || step === "elim" },
                                    { id: "qual", label: "Ranking", icon: BarChart3, active: step === "qual", completed: step === "elim" },
                                    { id: "elim", label: "Playoffs", icon: Trophy, active: step === "elim", completed: initialStatus === "finalizado" },
                                ];

                                return steps.map((s, idx) => {
                                    const Icon = s.icon;
                                    const isAccessible = s.id === "setup" || s.id === "done" || (s.id === "qual" && isGroupStageFinished) || (s.id === "elim" && (isGroupStageFinished || bracket.length > 0));

                                    return (
                                        <div key={s.id} className="flex items-center">
                                            <button
                                                onClick={() => isAccessible && setStep(s.id as any)}
                                                disabled={!isAccessible}
                                                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl transition-all ${s.active
                                                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                                                    : s.completed
                                                        ? "text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                                                        : isAccessible
                                                            ? "text-foreground/60 hover:bg-muted/80"
                                                            : "opacity-30 cursor-not-allowed"
                                                    }`}
                                            >
                                                <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${s.active ? "animate-pulse" : ""}`} />
                                                <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest hidden sm:block">
                                                    {s.label}
                                                </span>
                                                {s.completed && <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 ml-1" />}
                                            </button>
                                            {idx < 3 && <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 mx-0.5 lg:mx-1 text-border/40" />}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/5 border border-blue-500/20 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            {initialStatus === "finalizado" ? "Torneo Finalizado" : "En Vivo"}
                        </div>

                        {!readOnly && (
                            <Link
                                href={`/tournaments/${tournamentId}/edit`}
                                className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/60 hover:text-foreground hover:bg-muted transition-all"
                                title="Configuración"
                            >
                                <Settings className="w-4 h-4" />
                            </Link>
                        )}

                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/60 hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Page content ── */}
            <div className="w-full max-w-6xl mx-auto px-4 py-8 pb-32">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-[-0.05em] italic uppercase leading-[0.9]">
                        {tournamentName}
                    </h1>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        Gestión de Torneo Americano
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === "setup" && (
                        <motion.div
                            key="setup-stage"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-12"
                        >
                            <div className="max-w-4xl mx-auto w-full space-y-8 pb-32">
                                <div className="text-center space-y-4">
                                    <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter uppercase italic mb-3">Lista de Asistencia</h2>
                                    <p className="text-blue-600 text-xs font-black uppercase tracking-[0.3em]">Verificación de Jugadores y Presentismo</p>
                                </div>

                                {/* Control Bar */}
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-2xl">
                                    <div className="relative flex-1 w-full">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                                        <input
                                            type="text"
                                            placeholder="Buscar participante..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-muted/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all placeholder:text-foreground/20"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => {
                                                const allIds = (initialGroups[0]?.players || []).map((p: Player) => p.id);
                                                setPaid(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                            }}
                                            className="flex-1 md:flex-none px-6 py-4 bg-blue-500/10 text-blue-500 rounded-2xl font-black uppercase text-[9px] tracking-widest border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                                        >
                                            Todo Pago
                                        </button>
                                        <button
                                            onClick={() => {
                                                const allIds = (initialGroups[0]?.players || []).map((p: Player) => p.id);
                                                setPresent(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                            }}
                                            className="flex-1 md:flex-none px-6 py-4 bg-emerald-500/10 text-emerald-500 rounded-2xl font-black uppercase text-[9px] tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                                        >
                                            Todo Ok
                                        </button>
                                    </div>
                                    {/* Players Table */}
                                    <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-border/50">
                                                <tr>
                                                    <th className="px-8 py-6">Jugador</th>
                                                    <th className="px-8 py-6">Categoría</th>
                                                    <th className="px-8 py-6 text-center">Pago</th>
                                                    <th className="px-8 py-6 text-center">Asistencia</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {(initialGroups[0]?.players || []).filter((p: Player) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p: Player) => {
                                                    const isPresent = present.has(p.id);
                                                    const isPaid = paid.has(p.id);
                                                    return (
                                                        <tr
                                                            key={p.id}
                                                            className={`group transition-all hover:bg-muted/30 ${isPresent ? "bg-emerald-500/[0.02]" : ""}`}
                                                        >
                                                            <td className="px-8 py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${isPresent ? "bg-emerald-500 text-white" : "bg-muted text-foreground/20"}`}>
                                                                        <Users2 className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-black uppercase italic text-sm">{p.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{p.category || "D"}</span>
                                                            </td>
                                                            <td className="px-8 py-5 text-center">
                                                                <button
                                                                    onClick={() => setPaid(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                                                        return next;
                                                                    })}
                                                                    className={`w-10 h-10 rounded-xl inline-flex items-center justify-center border transition-all ${isPaid
                                                                        ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                                                        : "bg-muted/50 border-border/50 text-foreground/20 hover:border-blue-500/30 hover:text-blue-500"
                                                                        }`}
                                                                >
                                                                    <CreditCard className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                            <td className="px-8 py-5 text-center">
                                                                <button
                                                                    onClick={() => setPresent(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                                                        return next;
                                                                    })}
                                                                    className={`w-10 h-10 rounded-xl inline-flex items-center justify-center border transition-all ${isPresent
                                                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                                                                        : "bg-muted/50 border-border/50 text-foreground/20 hover:border-emerald-500/30 hover:text-emerald-500"
                                                                        }`}
                                                                >
                                                                    <UserCheck className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-6">
                                    <button
                                        onClick={() => setStep("done")}
                                        disabled={present.size < 2}
                                        className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                    >
                                        Continuar ({present.size})
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === "done" && (
                        <motion.div
                            key="matches-stage"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-12"
                        >
                            {/* Progress Bar */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-foreground/70">
                                    <span>Progreso Partidos Americano</span>
                                    <div className="flex items-center gap-3">
                                        {!readOnly && progressPercent < 100 && (
                                            <button
                                                onClick={handleSimulateScores}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/30 rounded-lg text-[9px] font-black tracking-widest transition-all group"
                                            >
                                                <Dice5 className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                                                Simular Todo
                                            </button>
                                        )}
                                        <span>{confirmedGroupMatches} / {totalGroupMatches} Partidos</span>
                                    </div>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden border border-border">
                                    <motion.div
                                        className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-16">
                                {Array.from(new Set(matches.map(m => m.roundIndex ?? 0))).sort((a, b) => a - b).map(roundIdx => (
                                    <div key={roundIdx} className="space-y-8">
                                        <div className="flex items-center gap-6 px-2">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                                            <div className="flex flex-col items-center">
                                                <h3 className="text-xl font-black uppercase italic tracking-[0.2em] text-foreground/20">Ronda {roundIdx + 1}</h3>
                                                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-500/30">Bloque Horario</p>
                                            </div>
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {matches
                                                .filter(m => (m.roundIndex ?? 0) === roundIdx)
                                                .sort((a, b) => (a.courtNumber ?? 0) - (b.courtNumber ?? 0))
                                                .map((match) => (
                                                    <div key={match.id} className="relative group">
                                                        <div className="absolute -top-3 left-8 px-4 py-1 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest z-10 shadow-lg shadow-blue-600/20">
                                                            Cancha {match.courtNumber || "?"}
                                                        </div>
                                                        
                                                        <div className={`p-8 bg-card/40 backdrop-blur-xl border-2 rounded-[2.5rem] transition-all duration-500 flex flex-col gap-6 shadow-2xl relative overflow-hidden group-hover:scale-[1.02] ${match.confirmed ? "border-emerald-500/20 shadow-emerald-500/5" : "border-border/50 hover:border-blue-500/30"}`}>
                                                            {match.confirmed && (
                                                                <div className="absolute top-0 right-0 p-4">
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                                </div>
                                                            )}

                                                            <div className="space-y-6">
                                                                <div className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${match.score1! > match.score2! ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/30"}`}>
                                                                    <span className={`text-sm font-black uppercase italic break-words flex-1 pr-4 ${match.score1! > match.score2! ? "text-blue-500" : "text-foreground/70"}`}>
                                                                        {match.team1.name}
                                                                    </span>
                                                                    {match.confirmed ? (
                                                                        <span className="text-2xl font-black italic">{match.score1}</span>
                                                                    ) : (
                                                                        <div className="flex items-center bg-muted/30 rounded-2xl border border-border/50 overflow-hidden h-11">
                                                                            <button 
                                                                                onClick={() => handleScoreChange(match.id, Math.max(0, (match.score1 || 0) - 1).toString(), (match.score2 || 0).toString())}
                                                                                className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40"
                                                                            >
                                                                                <Minus className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                value={match.score1 ?? ""}
                                                                                onChange={(e) => handleScoreChange(match.id, e.target.value, (match.score2 || 0).toString())}
                                                                                className="w-10 h-full bg-transparent text-center text-sm font-black outline-none"
                                                                                placeholder="0"
                                                                            />
                                                                            <button 
                                                                                onClick={() => handleScoreChange(match.id, ((match.score1 || 0) + 1).toString(), (match.score2 || 0).toString())}
                                                                                className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40"
                                                                            >
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${match.score2! > match.score1! ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/30"}`}>
                                                                    <span className={`text-sm font-black uppercase italic break-words flex-1 pr-4 ${match.score2! > match.score1! ? "text-blue-500" : "text-foreground/70"}`}>
                                                                        {match.team2.name}
                                                                    </span>
                                                                    {match.confirmed ? (
                                                                        <span className="text-2xl font-black italic">{match.score2}</span>
                                                                    ) : (
                                                                        <div className="flex items-center bg-muted/30 rounded-2xl border border-border/50 overflow-hidden h-11">
                                                                            <button 
                                                                                onClick={() => handleScoreChange(match.id, (match.score1 || 0).toString(), Math.max(0, (match.score2 || 0) - 1).toString())}
                                                                                className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40"
                                                                            >
                                                                                <Minus className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                value={match.score2 ?? ""}
                                                                                onChange={(e) => handleScoreChange(match.id, (match.score1 || 0).toString(), e.target.value)}
                                                                                className="w-10 h-full bg-transparent text-center text-sm font-black outline-none"
                                                                                placeholder="0"
                                                                            />
                                                                            <button 
                                                                                onClick={() => handleScoreChange(match.id, (match.score1 || 0).toString(), ((match.score2 || 0) + 1).toString())}
                                                                                className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40"
                                                                            >
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {!readOnly && (
                                                                <div className="pt-2">
                                                                    {match.confirmed ? (
                                                                        <button
                                                                            onClick={() => handleEditScore(match.id)}
                                                                            className="w-full py-4 rounded-2xl border-2 border-border/50 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-muted transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5" />
                                                                            Editar Resultado
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleConfirmScore(match.id)}
                                                                            disabled={match.score1 === undefined || match.score2 === undefined || saving}
                                                                            className="w-full py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                                                                        >
                                                                            <Check className="w-4 h-4" />
                                                                            Confirmar Resultado
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Actions */}
                            {isGroupStageFinished && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]"
                                >
                                    <button
                                        onClick={() => setStep("qual")}
                                        className="px-12 py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse group-hover:animate-none">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                        Finalizar Cronograma y Ver Ranking
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {step === "qual" && (
                        <motion.div
                            key="qual-stage"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-10"
                        >
                            {/* Standings Table */}
                            <div className="lg:col-span-8 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight">Ranking Oficial Americano</h2>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Todos los partidos confirmados
                                    </div>
                                </div>

                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-border/50">
                                            <tr>
                                                <th className="px-8 py-6">Pos</th>
                                                <th className="px-8 py-6">Jugador</th>
                                                <th className="px-8 py-6 text-center">PG</th>
                                                <th className="px-8 py-6 text-center">PP</th>
                                                <th className="px-8 py-6 text-center">Puntos</th>
                                                <th className="px-8 py-6 text-center">Promedio</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {standings.map((s, idx) => {
                                                const isQualifying = idx < qualCount;
                                                return (
                                                    <motion.tr
                                                        key={s.playerId}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className={`group transition-colors ${isQualifying ? "bg-blue-500/[0.03]" : ""}`}
                                                    >
                                                        <td className="px-8 py-6">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black italic shadow-inner ${idx === 0 ? "bg-amber-500 text-white" :
                                                                idx === 1 ? "bg-slate-300 text-slate-700" :
                                                                    idx === 2 ? "bg-orange-400 text-white" :
                                                                        "bg-muted text-foreground/40"
                                                                }`}>
                                                                {idx + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-sm font-black uppercase flex items-center gap-3">
                                                                {s.player.name}
                                                                {isQualifying && <Zap className="w-3.5 h-3.5 text-blue-500" />}
                                                            </p>
                                                        </td>
                                                        <td className="px-8 py-6 text-center font-black text-emerald-500">{s.won}</td>
                                                        <td className="px-8 py-6 text-center font-black text-red-500">{s.lost}</td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className={`font-black text-sm ${s.points > 0 ? "text-blue-500" : s.points < 0 ? "text-orange-500" : "text-foreground/20"}`}>
                                                                {s.points > 0 ? `+${s.points}` : s.points}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-center text-[10px] font-black text-foreground/30">
                                                            {s.matchesPlayed > 0 ? (s.won / s.matchesPlayed).toFixed(2) : "0.00"}
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Configuration / Playoff Preview Sidebar */}
                            <div className="lg:col-span-4 space-y-8">
                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 shadow-2xl sticky top-32 space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-black uppercase italic flex items-center gap-3">
                                            <Settings2 className="w-6 h-6 text-blue-500" />
                                            Fase Final
                                        </h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 leading-relaxed">
                                            Configurá cuántos jugadores avanzan al cuadro de eliminación directa.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
                                            Clasificados (Top Ranking)
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                min="2"
                                                max={standings.length}
                                                value={qualCount}
                                                onChange={(e) => setQualCount(Math.min(standings.length, Math.max(2, parseInt(e.target.value) || 0)))}
                                                className="flex-1 bg-muted/50 border border-border/50 rounded-2xl px-6 py-5 font-black text-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {[2, 4, 8, 16, 32].filter(n => n <= standings.length).map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setQualCount(n)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${qualCount === n
                                                        ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                                        : "bg-muted/50 border-border/50 text-foreground/40 hover:bg-muted"
                                                        }`}
                                                >
                                                    {n === 2 ? "Final" : n === 4 ? "Semis" : n === 8 ? "4tos" : n === 16 ? "8vos" : n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                                            <Settings className="w-3.5 h-3.5" />
                                            Previsualización
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-xs font-bold uppercase italic">
                                                <span className="text-foreground/40">Tamaño del Cuadro</span>
                                                <span className="text-blue-500 font-black">{Math.pow(2, Math.ceil(Math.log2(qualCount)))}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold uppercase italic">
                                                <span className="text-foreground/40">Jugadores Clasificados</span>
                                                <span className="text-foreground font-black">{qualCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold uppercase italic">
                                                <span className="text-foreground/40">Pasos Directos (BYEs)</span>
                                                <span className="text-orange-500 font-black">{Math.pow(2, Math.ceil(Math.log2(qualCount))) - qualCount}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={generateBracket}
                                        disabled={saving}
                                        className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-2xl shadow-blue-600/30 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        Generar Eliminatorias
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === "elim" && (
                        <motion.div
                            key="elim-stage"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-12"
                        >
                            {bracket.length === 0 ? (
                                <div className="text-center py-40 rounded-[3rem] border-4 border-dashed border-border/30 bg-muted/20 flex flex-col items-center gap-6">
                                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                                        <Trophy className="w-12 h-12 text-foreground/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-black uppercase italic text-foreground/40">El cuadro no ha sido generado</p>
                                        <p className="text-sm font-medium text-foreground/20">Finalizá la fase de grupos para comenzar las eliminatorias</p>
                                    </div>
                                    <button onClick={() => setStep("qual")} className="px-8 py-4 bg-muted hover:bg-border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                                        Volver al Ranking
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Scroll Hint */}
                                    <div className="flex items-center gap-3 mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30 overflow-hidden">
                                        <Share2 className="w-4 h-4 translate-y-px" />
                                        <span>Deslizá horizontalmente para ver el cuadro completo</span>
                                        <div className="h-px flex-1 bg-border/30" />
                                    </div>

                                    {/* BRACKET VIEWPORT */}
                                    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-x-auto pb-20 no-scrollbar cursor-grab active:cursor-grabbing">
                                        <div className="min-w-max px-[max(1rem,calc((100vw-1200px)/2))] flex gap-16 items-center">
                                            {Array.from(new Set(bracket.map(m => m.round))).sort((a, b) => b - a).map((round, rIdx, arr) => (
                                                <div key={round} className="flex flex-col gap-12">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <span className="px-6 py-2 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                                                            {round === 0 ? "🏆 Gran Final" : round === 1 ? "Semifinales" : `Ronda ${round + 1}`}
                                                        </span>
                                                        <div className="w-px h-8 bg-gradient-to-b from-blue-500/50 to-transparent" />
                                                    </div>

                                                    <div className="flex flex-col justify-around gap-12 min-h-[600px]">
                                                        {bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot).map(m => (
                                                            <motion.div
                                                                key={m.id}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className={`relative group ${m.confirmed ? "opacity-80" : ""}`}
                                                            >
                                                                <div className={`w-[380px] bg-card/40 backdrop-blur-xl border-2 rounded-[2.5rem] p-8 transition-all duration-500 ${m.confirmed ? "border-emerald-500/30" : "border-border/50 hover:border-blue-500/30 hover:translate-x-2"
                                                                    }`}>
                                                                    <div className="space-y-6">
                                                                        {[m.team1, m.team2].map((team, idx) => (
                                                                            <div key={idx} className="flex items-center justify-between gap-4">
                                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                                    <div className={`w-1.5 h-8 rounded-full ${m.winnerId === (team as Player)?.id ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-border/30"}`} />
                                                                                    <span className={`text-xs font-black uppercase break-words ${m.winnerId === (team as Player)?.id ? "text-emerald-500" :
                                                                                        team === "BYE" ? "text-foreground/20 italic" : "text-foreground/60"
                                                                                        }`}>
                                                                                        {team === "BYE" ? "PASO DIRECTO" : (team as Player)?.name || "Esperando..."}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center bg-muted/30 rounded-2xl border border-border/50 overflow-hidden h-11">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const current = idx === 0 ? (m.score1 ?? 0) : (m.score2 ?? 0);
                                                                                            handleBracketScore(m.id, idx === 0 ? Math.max(0, current - 1).toString() : (m.score1?.toString() || "0"), idx === 1 ? Math.max(0, current - 1).toString() : (m.score2?.toString() || "0"));
                                                                                        }}
                                                                                        disabled={m.confirmed || readOnly || team === "BYE"}
                                                                                        className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40 hover:text-foreground disabled:opacity-0"
                                                                                    >
                                                                                        <Minus className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={idx === 0 ? (m.score1 ?? "") : (m.score2 ?? "")}
                                                                                        onChange={(e) => handleBracketScore(m.id, idx === 0 ? e.target.value : (m.score1?.toString() || ""), idx === 1 ? e.target.value : (m.score2?.toString() || ""))}
                                                                                        disabled={m.confirmed || team === "BYE" || !team || readOnly}
                                                                                        className="w-10 h-full bg-transparent text-center font-black text-sm focus:outline-none no-spin-buttons placeholder:text-foreground/10"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const current = idx === 0 ? (m.score1 ?? 0) : (m.score2 ?? 0);
                                                                                            handleBracketScore(m.id, idx === 0 ? (current + 1).toString() : (m.score1?.toString() || "0"), idx === 1 ? (current + 1).toString() : (m.score2?.toString() || "0"));
                                                                                        }}
                                                                                        disabled={m.confirmed || readOnly || team === "BYE"}
                                                                                        className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40 hover:text-foreground disabled:opacity-0"
                                                                                      >
                                                                                          <Plus className="w-3.5 h-3.5" />
                                                                                      </button>
                                                                                  </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {!m.confirmed && m.team1 && m.team2 && m.team1 !== "BYE" && m.team2 !== "BYE" && !readOnly && (
                                                                        <button
                                                                            onClick={() => handleBracketConfirm(m.id)}
                                                                            disabled={m.score1 === undefined || m.score2 === undefined || m.score1 === m.score2}
                                                                            className={`w-full mt-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${(m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2)
                                                                                ? "bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-500"
                                                                                : "bg-muted text-foreground/20 cursor-not-allowed border border-border/50"
                                                                                }`}
                                                                        >
                                                                            Confirmar Resultado
                                                                        </button>
                                                                    )}

                                                                    {m.confirmed && !readOnly && (
                                                                        <div className="absolute -right-3 -top-3 flex items-center gap-1.5">
                                                                             {!(m.team1 === "BYE" || m.team2 === "BYE") && (
                                                                                <button
                                                                                    onClick={() => setBracket(bracket.map(bm => bm.id === m.id ? { ...bm, confirmed: false } : bm))}
                                                                                    className="bg-card border border-border/50 p-2.5 rounded-2xl text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-xl"
                                                                                >
                                                                                    <Pencil className="w-4 h-4" />
                                                                                </button>
                                                                             )}
                                                                            <div className="bg-emerald-500 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20 border border-emerald-400/50">
                                                                                <Check className="w-4 h-4" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Final Champion Display */}
                                            <div className="flex flex-col items-center gap-12 ml-8">
                                                <div className="flex flex-col items-center gap-4">
                                                    <span className="px-6 py-2 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/20">
                                                        🏆 CAMPEÓN
                                                    </span>
                                                    <div className="w-px h-8 bg-gradient-to-b from-amber-500/50 to-transparent" />
                                                </div>
                                                <div className="w-[380px] h-[520px] rounded-[4rem] bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-4 border-amber-500/30 flex flex-col items-center justify-center text-center p-12 relative overflow-hidden group shadow-2xl">
                                                    <motion.div
                                                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                                                        transition={{ duration: 5, repeat: Infinity }}
                                                        className="mb-12 p-8 bg-amber-500 text-white rounded-full shadow-2xl shadow-amber-500/40"
                                                    >
                                                        <Trophy className="w-20 h-20" />
                                                    </motion.div>

                                                    {(() => {
                                                        const finalMatch = bracket.find(m => m.round === 0);
                                                        if (finalMatch?.confirmed && finalMatch.winnerName) {
                                                            return (
                                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 relative z-10">
                                                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-amber-500">Victoria Final</p>
                                                                    <h3 className="text-4xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                                                                        {finalMatch.winnerName}
                                                                    </h3>
                                                                    <div className="flex items-center justify-center gap-2 pt-6">
                                                                        <div className="px-6 py-3 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase">Fase Finalizada</div>
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        }
                                                        return <p className="text-xs font-black uppercase tracking-widest text-foreground/20 italic">En Competencia</p>;
                                                    })()}

                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full -z-10 group-hover:bg-amber-500/20 transition-all duration-1000" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Floater for Reset */}
                                    {!readOnly && (
                                        <div className="fixed bottom-10 right-10 flex items-center gap-4 z-[100]">
                                            <button
                                                onClick={() => {
                                                    if (confirm("¿Desactivar eliminatorias y volver a ajustar el ranking?")) {
                                                        setStep("qual");
                                                    }
                                                }}
                                                className="px-6 py-4 bg-muted border border-border/50 text-foreground/60 hover:text-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl backdrop-blur-xl"
                                            >
                                                <RotateCcw className="w-4 h-4 inline-block mr-2" />
                                                Regenerar Cuadro
                                            </button>
                                        </div>
                                    )}

                                    {/* Finalize Tournament Action Bar (Bottom) */}
                                    {(() => {
                                        const finalMatch = bracket.find(m => m.round === 0);
                                        if (finalMatch?.confirmed && initialStatus !== "finalizado" && !readOnly) {
                                            const champName = finalMatch.winnerName || "Campeón";
                                            return (
                                                <div className="mt-12 p-8 bg-emerald-600/5 border border-emerald-600/20 rounded-3xl max-w-4xl mx-auto relative overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                                <Trophy className="w-6 h-6 text-emerald-600" />
                                                            </div>
                                                            <div>
                                                                <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground">¡Torneo Finalizado!</h2>
                                                                <p className="text-emerald-700/60 text-[10px] font-black uppercase tracking-widest mt-1">Ya puedes guardar los resultados oficiales</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                setSaving(true);
                                                                await saveTournamentFixture({
                                                                    tournamentId,
                                                                    phase: "finalizado",
                                                                    groups: [], // Americano doesn't use groups the same way 
                                                                    matches: [], // Use appropriate fields
                                                                    bracket,
                                                                    championName: champName
                                                                });
                                                                setSaving(false);
                                                                setShowSuccessModal(true);
                                                                setTimeout(() => router.refresh(), 2000);
                                                            }}
                                                            disabled={saving}
                                                            className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest italic rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trophy className="w-4 h-4" />}
                                                            Finalizar Torneo
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-24">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-card border border-border/50 shadow-2xl rounded-[3rem] p-12 text-center"
                        >
                            <div className="mb-8 w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
                                <Trophy className="w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">¡Torneo Finalizado!</h2>
                            <p className="text-foreground/60 text-sm mb-12">Se han completado todos los partidos y ya hay un campeón oficial.</p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Genial, cerrar
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
