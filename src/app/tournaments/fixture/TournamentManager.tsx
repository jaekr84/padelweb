"use client";

import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings,
    BarChart3, Check, FlaskConical, AlertTriangle, X, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveTournamentFixture } from "./actions";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export interface TournamentManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    readOnly?: boolean;
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
};

export default function TournamentManager({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus,
    readOnly = false
}: TournamentManagerProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"dashboard" | "groups" | "bracket">("dashboard");
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [bracket, setBracket] = useState<BracketMatch[]>(initialBracket);
    const [step, setStep] = useState<"done" | "elim">(
        (initialStatus === "en_eliminatorias" || initialStatus === "finalizado") ? "elim" : "done"
    );
    const [qualPerGroup, setQualPerGroup] = useState(2);
    const [saving, setSaving] = useState(false);
    const [showDevPanel, setShowDevPanel] = useState(false);
    const [seedingGroups, setSeedingGroups] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ─── DEV: Seed fake players into groups and regenerate all matches ───
    const FAKE_NAMES = [
        "Pablo Ruiz", "Diego Torres", "Martín López", "Sebastián García",
        "Andrés Pérez", "Lucas Sánchez", "Nicolás Fernández", "Matías González",
        "Rodrigo Díaz", "Tomás Álvarez", "Facundo Romero", "Ignacio Moreno",
        "Gustavo Jiménez", "Federico Herrera", "Ramiro Medina", "Santiago Molina",
    ];

    function generateRoundRobinMatches(group: Group): Match[] {
        const players = group.players;
        const newMatches: Match[] = [];
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                newMatches.push({
                    id: `m_${group.id}_${i}_${j}_${Date.now()}`,
                    groupId: group.id,
                    team1: players[i],
                    team2: players[j],
                    played: false,
                    confirmed: false,
                });
            }
        }
        return newMatches;
    }

    async function seedFakePlayers(playersPerGroup = 4) {
        setSeedingGroups(true);
        let nameIndex = 0;
        const seededGroups: Group[] = groups.map((g) => {
            const newPlayers: Player[] = [];
            for (let i = 0; i < playersPerGroup; i++) {
                newPlayers.push({
                    id: `fake_${g.id}_${i}_${Date.now()}`,
                    name: FAKE_NAMES[nameIndex++ % FAKE_NAMES.length],
                });
            }
            return { ...g, players: [...g.players, ...newPlayers] };
        });

        const newMatches = seededGroups.flatMap(generateRoundRobinMatches);
        setGroups(seededGroups);
        setMatches(newMatches);

        // Persist to DB
        try {
            await saveTournamentFixture({
                tournamentId,
                phase: "grupos",
                groups: seededGroups,
                matches: newMatches,
                bracket: [],
            });
        } catch (e) {
            console.error("[DEV seed]", e);
        }
        setSeedingGroups(false);
        setShowDevPanel(false);
    }

    async function clearPlayers() {
        setSeedingGroups(true);
        const emptyGroups: Group[] = groups.map((g) => ({ ...g, players: [] }));
        setGroups(emptyGroups);
        setMatches([]);
        try {
            await saveTournamentFixture({
                tournamentId,
                phase: "grupos",
                groups: emptyGroups,
                matches: [],
                bracket: [],
            });
        } catch (e) {
            console.error("[DEV clear]", e);
        }
        setSeedingGroups(false);
    }

    // ─── Renderizado Condicional ───
    const showDevLink = !readOnly && process.env.NODE_ENV === 'development';

    // Golden Rule: Detect if all matches are confirmed to enable Eliminatorias
    const isGroupStageFinished = useMemo(() => {
        return matches.length > 0 && matches.every(m => m.confirmed);
    }, [matches]);

    const totalGroupMatches = matches.length;
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const progressPercent = totalGroupMatches > 0
        ? Math.round((confirmedGroupMatches / totalGroupMatches) * 100)
        : 0;

    // ─── Shared Logic ───
    const computeStandings = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupMatches = matches.filter(m => m.groupId === groupId && m.confirmed);

        const standings = group.players.map(p => ({
            playerId: p.id,
            player: p,
            points: 0,
            matchesPlayed: 0,
            h2hNote: "",
        }));

        groupMatches.forEach(m => {
            if (m.score1 === undefined || m.score2 === undefined) return;
            const p1 = standings.find(s => s.playerId === m.team1.id);
            const p2 = standings.find(s => s.playerId === m.team2.id);
            if (p1 && p2) {
                p1.matchesPlayed++;
                p2.matchesPlayed++;
                p1.points += (m.score1 - m.score2);
                p2.points -= (m.score1 - m.score2);
            }
        });

        return standings.sort((a, b) => b.points - a.points);
    };

    const handleScoreChange = (matchId: string, s1: string, s2: string) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            const score1 = s1 === "" ? undefined : parseInt(s1, 10);
            const score2 = s2 === "" ? undefined : parseInt(s2, 10);
            const isPlayed = s1 !== "" && s2 !== "";

            return {
                ...m,
                score1,
                score2,
                played: isPlayed,
                // Optional: Auto-confirm if both are numbers? User asked for auto-save.
                // However, let's keep confirmation as a deliberate action for UX clarity 
                // OR auto-save the DRAFT and show a "Saving..." indicator.
            };
        }));
    };

    const handleConfirmScore = async (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match || match.score1 === undefined || match.score2 === undefined) return;

        const updatedMatches = matches.map(m => {
            if (m.id !== matchId) return m;
            return { ...m, confirmed: true };
        });
        setMatches(updatedMatches);

        setSaving(true);
        try {
            await saveTournamentFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                matches: updatedMatches,
                bracket: bracket,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleEditScore = (matchId: string) => {
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, confirmed: false } : m));
    };

    const generateBracket = async () => {
        const allQualifiers: { player: Player; seed: number }[] = [];
        groups.forEach(g => {
            const standings = computeStandings(g.id);
            standings.slice(0, qualPerGroup).forEach((s, idx) => {
                allQualifiers.push({ player: s.player, seed: idx + 1 });
            });
        });

        const numParticipants = allQualifiers.length;
        const numRounds = Math.ceil(Math.log2(numParticipants));
        const bracketSize = Math.pow(2, numRounds);

        const newBracket: BracketMatch[] = [];
        for (let r = numRounds - 1; r >= 0; r--) {
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

        const firstRound = numRounds - 1;
        const firstRoundMatches = newBracket.filter(m => m.round === firstRound);
        allQualifiers.forEach((q, idx) => {
            const matchIdx = Math.floor(idx / 2);
            const isTeam2 = idx % 2 === 1;
            const match = firstRoundMatches[matchIdx];
            if (match) {
                if (!isTeam2) match.team1 = q.player;
                else match.team2 = q.player;
            }
        });

        setBracket(newBracket);
        setStep("elim");

        setSaving(true);
        await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: newBracket,
        });
        setSaving(false);
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        setBracket(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            return {
                ...m,
                score1: s1 === "" ? undefined : parseInt(s1, 10),
                score2: s2 === "" ? undefined : parseInt(s2, 10),
            };
        }));
    };

    const advanceBracketWinners = (currentBracket: BracketMatch[], totalRounds: number) => {
        for (let r = totalRounds - 1; r > 0; r--) {
            const roundMatches = currentBracket.filter(m => m.round === r);
            roundMatches.forEach(m => {
                if (m.confirmed && m.winnerId) {
                    const nextRound = r - 1;
                    const nextSlot = Math.floor(m.slot / 2);
                    const isTeam2 = m.slot % 2 === 1;
                    const nextMatch = currentBracket.find(nm => nm.round === nextRound && nm.slot === nextSlot);
                    if (nextMatch) {
                        const winner = [m.team1, m.team2].find(t => t !== null && t !== "BYE" && (t as Player).id === m.winnerId);
                        if (isTeam2) nextMatch.team2 = winner as Player;
                        else nextMatch.team1 = winner as Player;
                    }
                }
            });
        }
    };

    const handleBracketConfirm = async (matchId: string) => {
        let finalBracket: BracketMatch[] = [];
        setBracket(prev => {
            const updated = prev.map(m => {
                if (m.id !== matchId) return m;
                if (m.score1 === undefined || m.score2 === undefined) return m;
                const winnerId = m.score1 > m.score2
                    ? (m.team1 as Player)?.id
                    : (m.team2 as Player)?.id;
                return { ...m, confirmed: true, winnerId };
            });
            const totalRounds = updated.length > 0 ? Math.max(...updated.map(m => m.round)) + 1 : 0;
            advanceBracketWinners(updated, totalRounds);
            finalBracket = [...updated];
            return finalBracket;
        });

        setSaving(true);
        const isFinal = finalBracket.find(m => m.id === matchId)?.round === 0;
        await saveTournamentFixture({
            tournamentId,
            phase: isFinal ? "finalizado" : "eliminatorias",
            groups,
            matches,
            bracket: finalBracket,
        });
        setSaving(false);
    };

    const handleBracketEdit = (matchId: string) => {
        setBracket(prev => prev.map(m => m.id === matchId ? { ...m, confirmed: false } : m));
    };

    const roundsArr = useMemo(() => {
        const rounds = bracket.map(m => m.round);
        return Array.from(new Set(rounds)).sort((a, b) => b - a);
    }, [bracket]);

    const totalRounds = roundsArr.length;

    const slotName = (t: BracketSlot) => {
        if (t === null) return "En espera";
        if (t === "BYE") return "BYE";
        return (t as Player).name;
    };

    const roundLabel = (r: number) => {
        if (r === 0) return "Final 🏆";
        if (r === 1) return "Semifinal";
        if (r === 2) return "Cuartos";
        if (r === 3) return "Octavos";
        return `Ronda ${totalRounds - r}`;
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const championMatch = bracket.find(m => m.round === 0 && m.confirmed);
    const championPlayer = championMatch?.winnerId
        ? [championMatch.team1, championMatch.team2].find(t => t !== null && t !== "BYE" && (t as Player).id === championMatch.winnerId) as Player
        : null;

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">

            {/* ── Sticky Header — full viewport width ── */}
            <header className="sticky top-0 bg-background border-b border-border z-[60]">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    {/* Top row: back + status */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px] shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver
                        </button>
                        <div className="flex items-center gap-2">
                            {readOnly && (
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-muted hover:bg-slate-700 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 border border-slate-700 hover:border-slate-600"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
                                    Actualizar
                                </button>
                            )}
                            <div className="px-3 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                {initialStatus === "finalizado" ? "Finalizado" : "En Vivo"}
                            </div>
                        </div>
                    </div>

                    {/* Tournament name */}
                    <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter italic uppercase text-center leading-tight mb-3">
                        {tournamentName}
                    </h1>

                    {/* Tab Navigation */}
                    <div className="flex p-1 bg-muted border border-slate-700 rounded-xl max-w-xs mx-auto">
                        <button
                            onClick={() => setStep("done")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${step === "done"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                : "text-slate-400 hover:text-white hover:bg-slate-700"
                                }`}
                        >
                            <Users2 className="w-3.5 h-3.5" />
                            Grupos
                        </button>
                        {(isGroupStageFinished || bracket.length > 0 || initialStatus === "finalizado") && (
                            <button
                                onClick={() => setStep("elim")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${step === "elim"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                                    }`}
                            >
                                <Trophy className="w-3.5 h-3.5" />
                                Playoffs
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Page content ── */}
            <div className="max-w-2xl mx-auto px-4 py-6 pb-32">

                {/* ── DEV TESTING PANEL ── */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowDevPanel(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <FlaskConical className="h-3.5 w-3.5" />
                        Panel de Pruebas
                        {showDevPanel ? <X className="h-3 w-3 ml-1" /> : null}
                    </button>

                    {showDevPanel && (
                        <div className="mt-3 bg-amber-950/30 border border-amber-500/25 rounded-2xl p-4 flex flex-col gap-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-amber-300 text-xs font-bold">Modo Desarrollo</p>
                                    <p className="text-amber-400/60 text-[10px] mt-0.5">
                                        Datos ficticios para probar el flujo. Eliminá este panel cuando termines.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => seedFakePlayers(4)}
                                    disabled={seedingGroups}
                                    className="flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    <Users2 className="h-3.5 w-3.5" />
                                    {seedingGroups ? "Cargando..." : "+ 4 jugadores / grupo"}
                                </button>
                                <button
                                    onClick={() => seedFakePlayers(6)}
                                    disabled={seedingGroups}
                                    className="flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    <Users2 className="h-3.5 w-3.5" />
                                    {seedingGroups ? "Cargando..." : "+ 6 jugadores / grupo"}
                                </button>
                                <button
                                    onClick={clearPlayers}
                                    disabled={seedingGroups}
                                    className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    {seedingGroups ? "Limpiando..." : "Limpiar todo"}
                                </button>
                            </div>

                            {groups.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {groups.map(g => (
                                        <span key={g.id} className="px-2.5 py-1 bg-amber-900/30 border border-amber-700/30 rounded-full text-[9px] text-amber-400 font-bold">
                                            {g.name}: {g.players.length} jugadores
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <AnimatePresence mode="wait">
                    {step === "done" && (
                        <motion.div
                            key="groups-stage"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-12"
                        >
                            {/* Progress Bar */}
                            <div className="max-w-2xl mx-auto space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Progreso Fase de Grupos</span>
                                    <span>{confirmedGroupMatches} / {totalGroupMatches} Partidos</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden border border-slate-700">
                                    <motion.div
                                        className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                </div>
                            </div>

                            {/* Groups Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {groups.map((g) => {
                                    const standings = computeStandings(g.id);
                                    const groupMatches = matches.filter(m => m.groupId === g.id);
                                    return (
                                        <div key={g.id} className="space-y-6">
                                            {/* Standings table */}
                                            <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-xl">
                                                <div className="bg-muted px-6 py-5 border-b border-slate-700 flex items-center justify-between">
                                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-blue-400">{g.name}</h3>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Posiciones</span>
                                                </div>
                                                <div className="p-4">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-700">
                                                                <th className="pb-3 pr-3">#</th>
                                                                <th className="pb-3">Jugador</th>
                                                                <th className="pb-3 px-3 text-center">PJ</th>
                                                                <th className="pb-3 px-3 text-center">Pts</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800">
                                                            {standings.map((s, idx) => {
                                                                return (
                                                                    <tr key={s.playerId} className="hover:bg-muted/50 transition-colors">
                                                                        <td className="py-3 pr-3 text-xs font-black italic text-slate-500">#{idx + 1}</td>
                                                                        <td className="py-3 font-bold text-sm tracking-tight text-white">{s.player.name}</td>
                                                                        <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">{s.matchesPlayed}</td>
                                                                        <td className="py-3 px-3 text-center font-black text-blue-400">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Matches list */}
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Partidos · {g.name}</p>
                                                <div className="space-y-2">
                                                    {groupMatches.map(m => (
                                                        <div
                                                            key={m.id}
                                                            className={`rounded-2xl overflow-hidden transition-all duration-300 border ${m.confirmed
                                                                ? "bg-emerald-950 border-emerald-800"
                                                                : "bg-slate-900 border-slate-700"
                                                                }`}
                                                        >
                                                            {/* Team 1 */}
                                                            <div className={`px-3 py-2.5 flex items-center justify-between border-l-4 border-blue-500 ${m.confirmed && m.score1! > m.score2! ? "bg-blue-500/10" : ""}`}>
                                                                <span className={`text-xs font-bold uppercase tracking-tight truncate ${m.confirmed && m.score1! > m.score2! ? "text-blue-300 font-black" : "text-blue-400"}`}>
                                                                    {m.team1.name}
                                                                </span>
                                                                {m.confirmed && (
                                                                    <span className={`text-base font-black ml-2 shrink-0 ${m.score1! > m.score2! ? "text-blue-400" : "text-slate-500"}`}>{m.score1}</span>
                                                                )}
                                                            </div>

                                                            {/* Score row or divider */}
                                                            <div className="px-3 py-2 bg-muted border-y border-slate-700 flex items-center gap-2">
                                                                {!m.confirmed && !readOnly ? (
                                                                    <>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                            className="flex-1 min-w-0 h-9 bg-blue-500/20 text-blue-200 rounded-lg text-center font-black border border-blue-500/40 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-blue-400/50 text-base"
                                                                            placeholder="0"
                                                                        />
                                                                        <span className="text-slate-500 font-bold text-xs shrink-0">vs</span>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                            className="flex-1 min-w-0 h-9 bg-rose-500/20 text-rose-200 rounded-lg text-center font-black border border-rose-500/40 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none transition-all placeholder:text-rose-400/50 text-base"
                                                                            placeholder="0"
                                                                        />
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleConfirmScore(m.id)}
                                                                                className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-all active:scale-90 ${m.played ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex-1 min-w-0 flex items-center justify-center h-9 bg-slate-800/50 text-blue-400 rounded-lg font-black text-base border border-blue-500/20">
                                                                            {m.score1 !== undefined ? m.score1 : "-"}
                                                                        </div>
                                                                        <span className="text-slate-500 font-bold text-xs shrink-0">vs</span>
                                                                        <div className="flex-1 min-w-0 flex items-center justify-center h-9 bg-slate-800/50 text-rose-400 rounded-lg font-black text-base border border-rose-500/20">
                                                                            {m.score2 !== undefined ? m.score2 : "-"}
                                                                        </div>
                                                                        {m.confirmed && !readOnly && (
                                                                            <button
                                                                                onClick={() => handleEditScore(m.id)}
                                                                                className="w-9 h-9 shrink-0 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/20 transition-all active:scale-90"
                                                                            >
                                                                                <Settings className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Team 2 + edit */}
                                                            <div className={`px-3 py-2.5 flex items-center justify-between border-l-4 border-rose-500 ${m.confirmed && m.score2! > m.score1! ? "bg-rose-500/10" : ""}`}>
                                                                <span className={`text-xs font-bold uppercase tracking-tight truncate ${m.confirmed && m.score2! > m.score1! ? "text-rose-300 font-black" : "text-rose-400"}`}>
                                                                    {m.team2.name}
                                                                </span>
                                                                {m.confirmed && (
                                                                    <span className={`text-base font-black ml-2 shrink-0 ${m.score2! > m.score1! ? "text-rose-400" : "text-slate-500"}`}>{m.score2}</span>
                                                                )}
                                                            </div>

                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ActionBar / Tournament finalization action */}
                            {!readOnly && (
                                <div className="p-6 bg-blue-950 border border-blue-800 rounded-3xl max-w-2xl mx-auto relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                                        <div className="space-y-3">
                                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Fase de Grupos</h2>
                                            <div className="flex items-center gap-3 justify-center md:justify-start">
                                                <div className="px-4 py-2.5 bg-muted rounded-xl border border-slate-700 flex items-center gap-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clasifican:</p>
                                                    <div className="flex items-center gap-2">
                                                        <button className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-sm text-white hover:bg-slate-600 transition-colors" onClick={() => setQualPerGroup(q => Math.max(1, q - 1))}>−</button>
                                                        <span className="text-sm font-black text-white w-4 text-center">{qualPerGroup}</span>
                                                        <button className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-sm text-white hover:bg-slate-600 transition-colors" onClick={() => setQualPerGroup(q => Math.min(10, q + 1))}>+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={generateBracket}
                                            disabled={!isGroupStageFinished}
                                            className={`w-full md:w-auto px-8 py-4 font-black uppercase tracking-widest italic rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 text-sm ${isGroupStageFinished
                                                ? "bg-blue-600 hover:bg-blue-500 text-white"
                                                : "bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600"
                                                }`}
                                        >
                                            {isGroupStageFinished ? "Generar Playoffs →" : "Finalizá los grupos"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === "elim" && (
                        <motion.div
                            key="bracket-stage"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6 pb-20"
                        >
                            {/* ── Champion Banner (appears at top on mobile when tournament done) ── */}
                            {(() => {
                                const finalMatch = bracket.find(m => m.round === 0);
                                if (finalMatch?.confirmed && finalMatch.winnerId) {
                                    const allPlayers = groups.flatMap(g => g.players);
                                    const champ = allPlayers.find(p => p.id === finalMatch.winnerId);
                                    if (champ) return (
                                        <div className="space-y-3">
                                            {/* Champion banner */}
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="relative bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 rounded-3xl p-6 text-black overflow-hidden shadow-2xl shadow-yellow-500/20"
                                            >
                                                {/* Shimmer */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="w-16 h-16 rounded-2xl bg-black/15 flex items-center justify-center shrink-0">
                                                        <Trophy className="w-9 h-9 drop-shadow-lg" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70">Campeón del Torneo</p>
                                                        <h2 className="text-2xl font-black italic uppercase tracking-tight leading-tight truncate">{champ.name}</h2>
                                                        <p className="text-[11px] font-bold opacity-60 mt-0.5">¡Felicidades!</p>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* Finalizar Torneo button — visible solo si aún no finalizó */}
                                            {initialStatus !== "finalizado" && !readOnly && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.2 }}
                                                >
                                                    <button
                                                        onClick={async () => {
                                                            setSaving(true);
                                                            await saveTournamentFixture({
                                                                tournamentId,
                                                                phase: "finalizado",
                                                                championName: champ.name,
                                                                groups,
                                                                matches,
                                                                bracket,
                                                            });
                                                            setSaving(false);
                                                            alert("¡Torneo finalizado con éxito!");
                                                            router.refresh();
                                                        }}
                                                        disabled={saving}
                                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 border border-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                Guardando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trophy className="w-4 h-4" />
                                                                Finalizar Torneo
                                                            </>
                                                        )}
                                                    </button>
                                                </motion.div>
                                            )}

                                            {/* Torneo ya finalizado — estado de lectura */}
                                            {initialStatus === "finalizado" && (
                                                <div className="w-full py-3 bg-muted border border-slate-700 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">
                                                    Torneo Finalizado
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* ── Rounds: vertical stack on mobile, horizontal scroll on desktop ── */}

                            {/* MOBILE: vertical stacked rounds */}
                            <div className="md:hidden space-y-8">
                                {roundsArr.map((r, rIdx) => {
                                    const roundMatches = bracket.filter(m => m.round === r);
                                    return (
                                        <div key={r} className="space-y-3">
                                            {/* Round header */}
                                            <div className="flex items-center gap-3 px-1">
                                                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-blue-600/30">
                                                    R{roundsArr.length - rIdx}
                                                </div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
                                                    {roundLabel(r)}
                                                </h3>
                                                <div className="flex-1 h-px bg-slate-700" />
                                                <span className="text-[10px] font-bold text-slate-500">{roundMatches.length} partido{roundMatches.length !== 1 ? "s" : ""}</span>
                                            </div>

                                            {/* Matches */}
                                            <div className="space-y-2">
                                                {roundMatches.map((m) => {
                                                    const isWinner1 = m.confirmed && m.winnerId === (m.team1 as any)?.id;
                                                    const isWinner2 = m.confirmed && m.winnerId === (m.team2 as any)?.id;
                                                    const isBye = m.team2 === "BYE";
                                                    const canPlay = !m.confirmed && m.team1 && m.team2 && !isBye;

                                                    return (
                                                        <div key={m.id} className={`rounded-2xl overflow-hidden border transition-all duration-300 ${m.confirmed
                                                            ? "bg-slate-950 border-slate-800"
                                                            : "bg-slate-900 border-slate-700"
                                                            }`}>
                                                            {/* Team 1 row */}
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-blue-500 ${isWinner1 ? "bg-blue-500/10" : "bg-slate-800/10"}`}>
                                                                <span className={`text-sm font-black uppercase tracking-tight truncate ${isWinner1 ? "text-blue-300 font-black" : "text-blue-400"}`}>
                                                                    {m.team1 ? slotName(m.team1) : "En espera..."}
                                                                </span>
                                                                {m.confirmed && (
                                                                    <span className={`text-lg font-black ml-3 shrink-0 ${isWinner1 ? "text-blue-400" : "text-slate-500"}`}>{m.score1}</span>
                                                                )}
                                                            </div>

                                                            {/* Score input or divider */}
                                                            <div className="px-3 py-2 bg-muted border-y border-slate-700 flex items-center gap-2">
                                                                {canPlay && !readOnly ? (
                                                                    <>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            className="flex-1 min-w-0 h-10 bg-blue-500/20 border border-blue-500/40 text-blue-100 rounded-xl text-center text-base font-black placeholder:text-blue-400/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                                            placeholder="0"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                        />
                                                                        <div className="w-4 text-center text-slate-500 font-black text-sm shrink-0">vs</div>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            className="flex-1 min-w-0 h-10 bg-rose-500/20 border border-rose-500/40 text-rose-100 rounded-xl text-center text-base font-black placeholder:text-rose-400/50 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                                                                            placeholder="0"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                        />
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleBracketConfirm(m.id)}
                                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${(m.score1 !== undefined && m.score2 !== undefined) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex-1 min-w-0 h-10 bg-slate-800/50 border border-blue-500/20 rounded-xl flex items-center justify-center text-base font-black text-blue-400">
                                                                            {m.score1 !== undefined ? m.score1 : "-"}
                                                                        </div>
                                                                        <div className="w-4 text-center text-slate-500 font-black text-sm shrink-0">vs</div>
                                                                        <div className="flex-1 min-w-0 h-10 bg-slate-800/50 border border-rose-500/20 rounded-xl flex items-center justify-center text-base font-black text-rose-400">
                                                                            {m.score2 !== undefined ? m.score2 : "-"}
                                                                        </div>
                                                                        {m.confirmed && !readOnly && !isBye && (
                                                                            <button
                                                                                onClick={() => handleBracketEdit(m.id)}
                                                                                className="w-10 h-10 shrink-0 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/20 transition-all active:scale-[0.9] shrink-0"
                                                                            >
                                                                                <Settings className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Team 2 row */}
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-rose-500 ${isWinner2 ? "bg-rose-500/10" : "bg-slate-800/10"}`}>
                                                                <span className={`text-sm font-black uppercase tracking-tight truncate ${isWinner2 ? "text-rose-300 font-black" : "text-rose-400"}`}>
                                                                    {isBye ? "BYE — Pasa automático" : m.team2 ? slotName(m.team2) : "En espera..."}
                                                                </span>
                                                                {m.confirmed && !isBye && (
                                                                    <span className={`text-lg font-black ml-3 shrink-0 ${isWinner2 ? "text-rose-400" : "text-slate-500"}`}>{m.score2}</span>
                                                                )}
                                                            </div>

                                                            {/* Edit button on confirmed */}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* DESKTOP: horizontal scroll bracket */}
                            <div className="hidden md:block overflow-x-auto pb-12 cursor-grab active:cursor-grabbing">
                                <div className="inline-flex gap-12 min-w-full px-4">
                                    {roundsArr.map((r, rIdx) => (
                                        <div key={r} className="flex-shrink-0 w-72 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-blue-600/20">
                                                    R{roundsArr.length - rIdx}
                                                </div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">{roundLabel(r)}</h3>
                                            </div>

                                            <div className="space-y-6">
                                                {bracket.filter(m => m.round === r).map((m) => {
                                                    const isWinner1 = m.confirmed && m.winnerId === (m.team1 as any)?.id;
                                                    const isWinner2 = m.confirmed && m.winnerId === (m.team2 as any)?.id;
                                                    const isBye = m.team2 === "BYE";

                                                    return (
                                                        <div key={m.id} className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${m.confirmed ? "border-slate-700" : "border-slate-700 hover:border-blue-600/50"
                                                            }`}>
                                                            {/* Team 1 */}
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-blue-500 ${isWinner1 ? "bg-blue-500/10" : "bg-slate-800/20"}`}>
                                                                <span className={`text-xs font-black truncate uppercase tracking-tight ${isWinner1 ? "text-blue-300 font-black" : "text-blue-400"}`}>
                                                                    {m.team1 ? slotName(m.team1) : "En espera..."}
                                                                </span>
                                                                {m.confirmed && <span className={`text-sm font-black ml-2 shrink-0 ${isWinner1 ? "text-blue-400" : "text-slate-500"}`}>{m.score1}</span>}
                                                            </div>

                                                            {/* Score or divider */}
                                                            <div className="p-2.5 bg-muted border-y border-slate-700 flex items-center gap-2">
                                                                {!m.confirmed && m.team1 && m.team2 && !isBye && !readOnly ? (
                                                                    <>
                                                                        <input
                                                                            type="number"
                                                                            className="flex-1 h-8 bg-blue-500/20 border border-blue-500/40 text-blue-100 rounded-lg text-center text-base font-black placeholder:text-blue-400/50 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                            placeholder="0"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                        />
                                                                        <span className="text-slate-500 text-xs font-bold shrink-0">vs</span>
                                                                        <input
                                                                            type="number"
                                                                            className="flex-1 h-8 bg-rose-500/20 border border-rose-500/40 text-rose-100 rounded-lg text-center text-base font-black placeholder:text-rose-400/50 focus:ring-1 focus:ring-rose-500 outline-none"
                                                                            placeholder="0"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                        />
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleBracketConfirm(m.id)}
                                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${(m.score1 !== undefined && m.score2 !== undefined) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                                                                            >
                                                                                <Check className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : m.confirmed && !isBye ? (
                                                                    <>
                                                                        <div className="flex-1 h-8 bg-slate-800/50 text-blue-400 rounded-lg flex items-center justify-center text-base font-black border border-blue-500/20">
                                                                            {m.score1 !== undefined ? m.score1 : "-"}
                                                                        </div>
                                                                        <span className="text-slate-500 text-xs font-bold shrink-0">vs</span>
                                                                        <div className="flex-1 h-8 bg-slate-800/50 text-rose-400 rounded-lg flex items-center justify-center text-base font-black border border-rose-500/20">
                                                                            {m.score2 !== undefined ? m.score2 : "-"}
                                                                        </div>
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleBracketEdit(m.id)}
                                                                                className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/20 transition-all active:scale-[0.9]"
                                                                            >
                                                                                <Settings className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <div className="w-full h-px bg-slate-700 my-1" />
                                                                )}
                                                            </div>

                                                            {/* Team 2 */}
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-rose-500 ${isWinner2 ? "bg-rose-500/10" : "bg-slate-800/20"}`}>
                                                                <span className={`text-xs font-black truncate uppercase tracking-tight ${isWinner2 ? "text-rose-300 font-black" : "text-rose-400"}`}>
                                                                    {isBye ? "BYE (Pasa)" : m.team2 ? slotName(m.team2) : "En espera..."}
                                                                </span>
                                                                {m.confirmed && !isBye && <span className={`text-sm font-black ml-2 shrink-0 ${isWinner2 ? "text-rose-400" : "text-slate-500"}`}>{m.score2}</span>}
                                                            </div>

                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
