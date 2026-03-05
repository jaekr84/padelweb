"use client";

import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings,
    BarChart3, Check, FlaskConical, AlertTriangle, X
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
    initialStatus
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

    const championMatch = bracket.find(m => m.round === 0 && m.confirmed);
    const championPlayer = championMatch?.winnerId
        ? [championMatch.team1, championMatch.team2].find(t => t !== null && t !== "BYE" && (t as Player).id === championMatch.winnerId) as Player
        : null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 min-h-screen pb-32 bg-[#090A0F]">

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
                    <div className="mt-3 bg-amber-950/30 border border-amber-500/25 rounded-2xl p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-300 text-xs font-bold">Modo Desarrollo</p>
                                <p className="text-amber-400/60 text-[10px] mt-0.5">
                                    Estos botones agregan datos ficticios para probar el flujo. Eliminá este panel cuando termines.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            {/* Header section with back button and status */}
            <header className="mb-12 space-y-8 text-center sticky top-0 bg-[#090A0F] border-b border-slate-800 z-[60] py-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                    <div className="px-4 py-1.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        {initialStatus === "finalizado" ? "Torneo Finalizado" : "Torneo en Vivo"}
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic uppercase">
                    {tournamentName}
                </h1>

                {/* Tab Navigation */}
                <div className="flex p-1.5 bg-slate-800 border border-slate-700 rounded-2xl max-w-lg mx-auto shadow-2xl overflow-hidden mt-8">
                    <button
                        onClick={() => setStep("done")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${step === "done"
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                            : "text-slate-400 hover:text-white hover:bg-slate-700"
                            }`}
                    >
                        <Users2 className="w-4 h-4" />
                        Fase de Grupos
                    </button>
                    {(isGroupStageFinished || bracket.length > 0 || initialStatus === "finalizado") && (
                        <button
                            onClick={() => setStep("elim")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${step === "elim"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                : "text-slate-400 hover:text-white hover:bg-slate-700"
                                }`}
                        >
                            <Trophy className="w-4 h-4" />
                            Eliminatorias
                        </button>
                    )}
                </div>
            </header>

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
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
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
                                            <div className="bg-slate-800 px-6 py-5 border-b border-slate-700 flex items-center justify-between">
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
                                                        {standings.map((s, idx) => (
                                                            <tr key={s.playerId} className="hover:bg-slate-800/50 transition-colors">
                                                                <td className="py-3 pr-3 text-xs font-black italic text-slate-500">#{idx + 1}</td>
                                                                <td className="py-3 font-bold text-sm text-white tracking-tight">{s.player.name}</td>
                                                                <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">{s.matchesPlayed}</td>
                                                                <td className="py-3 px-3 text-center font-black text-blue-400">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                            </tr>
                                                        ))}
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
                                                        className={`rounded-2xl p-3 transition-all duration-300 border ${m.confirmed
                                                            ? "bg-emerald-950 border-emerald-800"
                                                            : "bg-slate-900 border-slate-700"
                                                            }`}
                                                    >
                                                        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                                                            {/* Team 1 */}
                                                            <div className={`text-right font-bold text-xs truncate uppercase tracking-tight ${m.confirmed && m.score1! > m.score2! ? "text-emerald-400" : "text-slate-200"}`}>
                                                                {m.team1.name}
                                                            </div>

                                                            {/* Score area */}
                                                            {!m.confirmed ? (
                                                                <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-600">
                                                                    <input
                                                                        type="number"
                                                                        value={m.score1 ?? ""}
                                                                        onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                        className="w-9 h-9 bg-slate-700 text-white rounded-lg text-center font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500 text-sm"
                                                                        placeholder="0"
                                                                    />
                                                                    <div className="w-1 h-3 bg-slate-600 rounded-full" />
                                                                    <input
                                                                        type="number"
                                                                        value={m.score2 ?? ""}
                                                                        onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                        className="w-9 h-9 bg-slate-700 text-white rounded-lg text-center font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500 text-sm"
                                                                        placeholder="0"
                                                                    />
                                                                    {m.played && (
                                                                        <button
                                                                            onClick={() => handleConfirmScore(m.id)}
                                                                            className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-all active:scale-90"
                                                                        >
                                                                            <Check className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 relative group">
                                                                    <span className={`text-lg font-black ${m.score1! > m.score2! ? "text-emerald-400" : "text-slate-400"}`}>{m.score1}</span>
                                                                    <div className="w-px h-5 bg-slate-600" />
                                                                    <span className={`text-lg font-black ${m.score2! > m.score1! ? "text-emerald-400" : "text-slate-400"}`}>{m.score2}</span>
                                                                    <button
                                                                        className="absolute -right-2 -top-2 w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white z-10"
                                                                        onClick={() => handleEditScore(m.id)}
                                                                    >
                                                                        <Settings className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Team 2 */}
                                                            <div className={`text-left font-bold text-xs truncate uppercase tracking-tight ${m.confirmed && m.score2! > m.score1! ? "text-emerald-400" : "text-slate-200"}`}>
                                                                {m.team2.name}
                                                            </div>
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
                        <div className="p-6 bg-blue-950 border border-blue-800 rounded-3xl max-w-2xl mx-auto relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                                <div className="space-y-3">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Fase de Grupos</h2>
                                    <div className="flex items-center gap-3 justify-center md:justify-start">
                                        <div className="px-4 py-2.5 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-3">
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
                    </motion.div>
                )}

                {step === "elim" && (
                    <motion.div
                        key="bracket-stage"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-12"
                    >
                        <div className="overflow-x-auto pb-12 cursor-grab active:cursor-grabbing scrollbar-hide">
                            <div className="inline-flex gap-16 min-w-full px-8">
                                {roundsArr.map((r, rIdx) => (
                                    <div key={r} className="flex-shrink-0 w-72 space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-[10px] font-black italic shadow-lg shadow-blue-600/20 text-white">
                                                R{roundsArr.length - rIdx}
                                            </div>
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">{roundLabel(r)}</h3>
                                        </div>

                                        <div className="space-y-8 relative">
                                            {bracket.filter(m => m.round === r).map((m, mIdx) => {
                                                const isWinner1 = m.confirmed && m.winnerId === (m.team1 as any)?.id;
                                                const isWinner2 = m.confirmed && m.winnerId === (m.team2 as any)?.id;
                                                const isBye = m.team2 === "BYE";

                                                return (
                                                    <div key={m.id} className="relative group/match">
                                                        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${m.confirmed ? "border-emerald-500/20" : "hover:border-blue-500/20"}`}>
                                                            {/* Team 1 */}
                                                            <div className={`px-4 py-3 flex items-center justify-between group/team ${isWinner1 ? "bg-emerald-500/10" : ""}`}>
                                                                <span className={`text-[11px] font-bold truncate uppercase tracking-tight ${isWinner1 ? "text-emerald-400" : "text-white/60"}`}>
                                                                    {m.team1 ? slotName(m.team1) : (m.round > 1 ? "Ganador TBD" : "TBD")}
                                                                </span>
                                                                {m.confirmed && <span className="text-xs font-black italic text-emerald-400 ml-2">{m.score1}</span>}
                                                            </div>

                                                            {/* Match Action or Divider */}
                                                            {!m.confirmed && m.team1 && m.team2 && !isBye ? (
                                                                <div className="p-3 bg-white/5 border-y border-white/5 flex items-center gap-2">
                                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                                        <input
                                                                            type="number"
                                                                            className="w-full h-8 bg-black/40 rounded-lg text-center text-xs font-black placeholder:text-white/10 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                            placeholder="S1"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            className="w-full h-8 bg-black/40 rounded-lg text-center text-xs font-black placeholder:text-white/10 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                            placeholder="S2"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                        />
                                                                    </div>
                                                                    {m.score1 !== undefined && m.score2 !== undefined && (
                                                                        <button
                                                                            onClick={() => handleBracketConfirm(m.id)}
                                                                            className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                                                                        >
                                                                            <Check className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="h-px bg-white/5 mx-4" />
                                                            )}

                                                            {/* Team 2 */}
                                                            <div className={`px-4 py-3 flex items-center justify-between group/team ${isWinner2 ? "bg-emerald-500/10" : ""}`}>
                                                                <span className={`text-[11px] font-bold truncate uppercase tracking-tight ${isWinner2 ? "text-emerald-400" : "text-white/60"}`}>
                                                                    {isBye ? "BYE (Pasa)" : m.team2 ? slotName(m.team2) : (m.round > 1 ? "Ganador TBD" : "TBD")}
                                                                </span>
                                                                {m.confirmed && !isBye && <span className="text-xs font-black italic text-emerald-400 ml-2">{m.score2}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {/* Champion Section */}
                                {(() => {
                                    const finalMatch = bracket.find(m => m.round === 0);
                                    if (finalMatch?.confirmed && finalMatch.winnerId) {
                                        const allPlayers = groups.flatMap(g => g.players);
                                        const champ = allPlayers.find(p => p.id === finalMatch.winnerId);
                                        if (champ) {
                                            return (
                                                <div className="flex-shrink-0 w-72 flex flex-col items-center justify-center pb-12">
                                                    <motion.div
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="bg-gradient-to-b from-amber-400 to-yellow-600 rounded-[40px] p-8 text-center text-black shadow-2xl shadow-yellow-500/30 relative group"
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px]" />
                                                        <Trophy className="w-20 h-20 mx-auto mb-6 drop-shadow-2xl" />
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">CAMPEÓN</p>
                                                            <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{champ.name}</h3>
                                                            <p className="text-xs font-bold pt-4 opacity-70">¡Felicidades!</p>
                                                        </div>

                                                        {initialStatus !== "finalizado" && (
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
                                                                className="mt-8 w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black/80 transition-all shadow-xl"
                                                            >
                                                                {saving ? "Guardando..." : "Finalizar Torneo ✅"}
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                </div>
                                            );
                                        }
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
