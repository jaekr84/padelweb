"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings,
    BarChart3, Check, X, RefreshCw, Dice5, Info, Pencil, RotateCcw,
    UserCheck, Zap
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

type Player = { id: string; name: string };
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
    const isGroupStageFinished = matches.every(m => m.confirmed);
    const [activeTab, setActiveTab] = useState<"dashboard" | "groups" | "bracket">(
        initialBracket.length > 0 ? "bracket" : (initialMatches.every(m => m.confirmed) ? "dashboard" : "groups")
    );
    const [bracket, setBracket] = useState<BracketMatch[]>(initialBracket);
    const [step, setStep] = useState<"done" | "qual" | "elim">(
        (initialStatus === "en_eliminatorias" || initialStatus === "finalizado") ? "elim" : "done"
    );
    const [qualCount, setQualCount] = useState(4); // Default to top 4 for Americano
    const [saving, setSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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
                if (m.score1 > m.score2) p1.won++;
                else if (m.score2 > m.score1) p2.won++;
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
            setActiveTab("bracket");
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


    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-foreground/60 hover:text-foreground transition-colors font-bold uppercase tracking-widest text-[10px]">
                            <ArrowLeft className="w-4 h-4" />
                            Volver
                        </button>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter">{tournamentName}</h1>
                    </div>
                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[8px] font-black uppercase tracking-widest">
                        Método Americano
                    </div>
                </div>
                
                <div className="max-w-6xl mx-auto mt-6">
                    <div className="flex items-center justify-center max-w-xl mx-auto relative px-4">
                        {/* Connecting Lines */}
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-muted -translate-y-1/2 z-0" />
                        
                        {(["groups", "dashboard", "bracket"] as const).map((tab, idx) => {
                            const isPast = (activeTab === "dashboard" && tab === "groups") || 
                                           (activeTab === "bracket" && (tab === "groups" || tab === "dashboard"));
                            const isCurrent = activeTab === tab;
                            const Icon = tab === "groups" ? Swords : tab === "dashboard" ? BarChart3 : Trophy;
                            const label = tab === "groups" ? "Partidos" : tab === "dashboard" ? "Ranking" : "Cuadro";

                            return (
                                <div key={tab} className="flex-1 flex flex-col items-center relative z-10">
                                    <button
                                        onClick={() => setActiveTab(tab)}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                                            isCurrent ? "bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/20 scale-110" : 
                                            isPast ? "bg-emerald-500 border-emerald-400 text-white shadow-lg" : 
                                            "bg-card border-border text-foreground/20 hover:border-foreground/20"
                                        }`}
                                    >
                                        {isPast ? <Check className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                    </button>
                                    <span className={`mt-2 text-[8px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${isCurrent ? "text-blue-500" : isPast ? "text-emerald-500" : "text-foreground/20"}`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {activeTab === "dashboard" && (
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Standings */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-black uppercase italic flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-500" />
                                Ranking Grupo Único
                            </h2>
                            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                                <table className="w-full text-left">
                                    <thead className="bg-muted text-[9px] font-black uppercase tracking-widest text-foreground/40">
                                        <tr>
                                            <th className="px-4 py-3">Pos</th>
                                            <th className="px-4 py-3">Pareja</th>
                                            <th className="px-4 py-3 text-center">PG</th>
                                            <th className="px-4 py-3 text-center">DIF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {standings.map((s, idx) => (
                                            <tr key={s.playerId} className={idx < qualCount ? "bg-emerald-500/5" : ""}>
                                                <td className="px-4 py-4 text-sm font-black italic">{idx + 1}</td>
                                                <td className="px-4 py-4 text-sm font-black uppercase truncate max-w-[150px]">{s.player.name}</td>
                                                <td className="px-4 py-4 text-sm text-center font-bold text-emerald-500">{s.won}</td>
                                                <td className="px-4 py-4 text-sm text-center font-bold text-blue-500">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-black uppercase italic flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" />
                                Próximos Pasos
                            </h2>
                            {step === "done" && (
                                <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                                    <p className="text-sm text-foreground/60">
                                        Una vez finalizados todos los partidos del grupo, podrás generar las llaves eliminatorias.
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Parejas que clasifican:</label>
                                            <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">Total: {standings.length}</span>
                                        </div>
                                        <div className="relative group">
                                            <input 
                                                type="number"
                                                min="2"
                                                max={standings.length}
                                                value={qualCount} 
                                                onChange={(e) => setQualCount(Math.min(standings.length, Math.max(2, parseInt(e.target.value) || 0)))}
                                                className="w-full bg-muted border border-border rounded-2xl px-5 py-4 font-black text-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-foreground/20 pointer-events-none group-focus-within:text-blue-500/40 transition-colors">
                                                <Users2 className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase">Lugares</span>
                                            </div>
                                        </div>
                                        <p className="text-[8px] text-foreground/30 font-bold uppercase italic leading-relaxed">
                                            {qualCount > 0 && Math.pow(2, Math.ceil(Math.log2(qualCount))) > qualCount && (
                                                `Se generará un cuadro de ${Math.pow(2, Math.ceil(Math.log2(qualCount)))} con ${Math.pow(2, Math.ceil(Math.log2(qualCount))) - qualCount} BYEs (pasos directos).`
                                            )}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={generateBracket}
                                        disabled={!isGroupStageFinished || saving}
                                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-900/20 disabled:opacity-50 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        Generar Eliminatorias y Avanzar
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    
                                    <div className="pt-6 mt-6 border-t border-border/50">
                                        <p className="text-[10px] font-black uppercase text-foreground/20 text-center mb-4 italic">¿Necesitás cambiar la configuración o agregar jugadores?</p>
                                        <button 
                                            onClick={async () => {
                                                if (confirm("¿Estás seguro? Se borrarán los resultados cargados y volverás a la fase de configuración.")) {
                                                    setSaving(true);
                                                    const res = await resetTournamentStatus(tournamentId);
                                                    if (res.ok) {
                                                        router.push(`/tournaments/${tournamentId}/fixture`);
                                                    } else {
                                                        toast.error("Error al reiniciar: " + res.error);
                                                    }
                                                    setSaving(false);
                                                }
                                            }}
                                            className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Reiniciar Estructura / Fase Previa
                                        </button>
                                    </div>
                                </div>
                            )}
                            {step === "elim" && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center">
                                    <Trophy className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-black uppercase italic text-emerald-500">Torneo en Eliminatorias</h3>
                                    <p className="text-sm text-foreground/60 mt-2">Seguí el progreso en la pestaña "Cuadro"</p>
                                    <button onClick={() => setActiveTab("bracket")} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Ver Cuadro</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "groups" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight">Cronograma de Partidos</h2>
                            {!readOnly && !isGroupStageFinished && (
                                <button 
                                    onClick={handleSimulateScores}
                                    disabled={saving}
                                    className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <Dice5 className="w-4 h-4" />
                                    Simular Resultados (Testing)
                                </button>
                            )}
                        </div>
                        <div className="grid gap-4 pb-20">
                            {matches.map((m) => (
                                <div key={m.id} className={`bg-card border rounded-3xl transition-all ${m.confirmed ? "border-emerald-500/30 opacity-75" : "border-border shadow-lg"}`}>
                                    <div className="flex items-center justify-between p-6">
                                        <div className="flex-1 text-right pr-4">
                                            <p className="text-sm font-black uppercase">{m.team1.name}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number"
                                                value={m.score1 ?? ""}
                                                onChange={(e) => handleScoreChange(m.id, e.target.value, m.score2?.toString() || "")}
                                                disabled={m.confirmed || readOnly}
                                                className="w-12 h-12 bg-muted border border-border rounded-xl text-center font-black text-xl appearance-none"
                                            />
                                            <span className="text-foreground/20 font-black">-</span>
                                            <input 
                                                type="number"
                                                value={m.score2 ?? ""}
                                                onChange={(e) => handleScoreChange(m.id, m.score1?.toString() || "", e.target.value)}
                                                disabled={m.confirmed || readOnly}
                                                className="w-12 h-12 bg-muted border border-border rounded-xl text-center font-black text-xl appearance-none"
                                            />
                                        </div>

                                        <div className="flex-1 text-left pl-4">
                                            <p className="text-sm font-black uppercase">{m.team2.name}</p>
                                        </div>

                                        <div className="ml-6 flex items-center">
                                            {!readOnly && (
                                                m.confirmed ? (
                                                    <button 
                                                        onClick={() => handleEditScore(m.id)} 
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white border border-blue-500/20 rounded-xl transition-all font-black uppercase text-[8px] tracking-widest"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        Editar
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleConfirmScore(m.id)}
                                                        disabled={m.score1 === undefined || m.score2 === undefined || saving}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${m.score1 !== undefined && m.score2 !== undefined ? "bg-emerald-600 text-white shadow-lg" : "bg-muted text-foreground/20"}`}
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isGroupStageFinished && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-8 text-center">
                                    <button 
                                        onClick={() => setActiveTab("dashboard")}
                                        className="px-12 py-6 bg-blue-600 text-white rounded-3xl font-black uppercase italic tracking-widest shadow-2xl shadow-blue-600/30 flex items-center gap-3 mx-auto"
                                    >
                                        <BarChart3 className="w-6 h-6" />
                                        Ver Ranking y Clasificar
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "bracket" && (
                    <div className="space-y-8 overflow-x-auto pb-12">
                        {bracket.length === 0 ? (
                            <div className="text-center py-20 bg-muted/50 rounded-3xl border-2 border-dashed border-border">
                                <Trophy className="w-16 h-16 text-foreground/10 mx-auto mb-4" />
                                <p className="text-foreground/40 font-black uppercase tracking-widest">El cuadro aún no ha sido generado</p>
                            </div>
                        ) : (
                            <div className="flex gap-12 min-w-max p-4">
                                {Array.from(new Set(bracket.map(m => m.round))).sort((a, b) => b - a).map(round => (
                                    <div key={round} className="w-64 space-y-8">
                                        <h3 className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 py-2 bg-muted rounded-full sticky top-0">
                                            {round === 0 ? "Gran Final" : round === 1 ? "Semifinales" : `Ronda ${round}`}
                                        </h3>
                                        <div className="space-y-8 flex flex-col justify-around h-full min-h-[400px]">
                                            {bracket.filter(m => m.round === round).map(m => (
                                               <div key={m.id} className={`bg-card border rounded-2xl p-4 shadow-xl relative ${m.confirmed ? "border-emerald-500/30" : "border-border"}`}>
                                                   <div className="space-y-3">
                                                       {[m.team1, m.team2].map((team, idx) => (
                                                           <div key={idx} className="flex items-center justify-between gap-2">
                                                               <span className={`text-[10px] font-black uppercase truncate ${m.winnerId === (team as Player)?.id ? "text-emerald-500" : "text-foreground/60"}`}>
                                                                   {team === "BYE" ? "PASO DIRECTO" : (team as Player)?.name || "???"}
                                                               </span>
                                                               <input 
                                                                   type="number"
                                                                   value={idx === 0 ? (m.score1 ?? "") : (m.score2 ?? "")}
                                                                   onChange={(e) => handleBracketScore(m.id, idx === 0 ? e.target.value : (m.score1?.toString() || ""), idx === 1 ? e.target.value : (m.score2?.toString() || ""))}
                                                                   disabled={m.confirmed || team === "BYE" || !team}
                                                                   className="w-8 h-8 bg-muted rounded-lg text-center font-bold text-xs"
                                                               />
                                                           </div>
                                                       ))}
                                                   </div>
                                                   {!m.confirmed && m.team1 && m.team2 && m.team1 !== "BYE" && m.team2 !== "BYE" && (
                                                       <button 
                                                           onClick={() => handleBracketConfirm(m.id)}
                                                           className="w-full mt-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                                                        >
                                                           Confirmar
                                                       </button>
                                                   )}
                                                    {m.confirmed && (
                                                        <div className="absolute -right-2 -top-2 flex gap-1">
                                                            <button 
                                                                onClick={() => setBracket(bracket.map(bm => bm.id === m.id ? { ...bm, confirmed: false } : bm))}
                                                                className="bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-500 transition-all border-2 border-card"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="bg-emerald-500 text-white p-1 rounded-full border-2 border-card shadow-lg">
                                                                <Check className="w-3.5 h-3.5" />
                                                            </div>
                                                        </div>
                                                    )}
                                               </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
