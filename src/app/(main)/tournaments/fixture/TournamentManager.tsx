"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings,
    BarChart3, Check, X, RefreshCw, Dice5
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveTournamentFixture } from "./actions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface TournamentManagerProps {
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

export default function TournamentManager({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus,
    readOnly = false,
    isLoggedIn = true
}: TournamentManagerProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"dashboard" | "groups" | "bracket">("dashboard");
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [bracket, setBracket] = useState<BracketMatch[]>(initialBracket);
    const [step, setStep] = useState<"done" | "qual" | "elim">(
        (initialStatus === "en_eliminatorias" || initialStatus === "finalizado") ? "elim" : "done"
    );
    const [qualPerGroup, setQualPerGroup] = useState(2);
    const [saving, setSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // ─── Shared Logic ───
    const computeStandings = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupMatches = matches.filter(m => m.groupId === groupId && m.confirmed);

        const parsedPlayers = Array.isArray(group.players)
            ? group.players
            : typeof group.players === 'string'
                ? (() => { try { return JSON.parse(group.players as string); } catch { return []; } })()
                : [];

        const playersArray = Array.isArray(parsedPlayers) ? parsedPlayers : [];
        if (playersArray.length === 0) {
            console.warn(`[computeStandings] No players found for group ${groupId}`, group.players);
        }

        const standings = playersArray.map((p: Player) => ({
            playerId: p.id,
            player: p,
            points: 0,
            matchesPlayed: 0,
            won: 0,
            lost: 0,
            gamesWon: 0,
            gamesLost: 0,
        }));

        groupMatches.forEach(m => {
            if (m.score1 === undefined || m.score2 === undefined || m.score1 === null || m.score2 === null) return;
            if (!m.team1 || !m.team2) return;

            // Match by ID or Name to handle potential hydration mismatches
            const p1 = standings.find((s: any) => s.playerId === m.team1.id || (m.team1.name && s.player.name === m.team1.name));
            const p2 = standings.find((s: any) => s.playerId === m.team2.id || (m.team2.name && s.player.name === m.team2.name));

            if (p1 && p2) {
                p1.matchesPlayed++;
                p2.matchesPlayed++;

                const s1 = Number(m.score1);
                const s2 = Number(m.score2);

                p1.gamesWon += s1;
                p1.gamesLost += s2;
                p2.gamesWon += s2;
                p2.gamesLost += s1;

                p1.points += (s1 - s2);
                p2.points += (s2 - s1);

                if (s1 > s2) p1.won++;
                else if (s2 > s1) p2.won++;
            }
        });

        // Sort by priority:
        // 1. Matches won
        // 2. Head-to-head (if only 2 players are tied in wins)
        // 3. Points balance (game difference)
        // 4. Total games won
        return standings.sort((a: any, b: any) => {
            if (b.won !== a.won) return b.won - a.won;

            // Tie-break: Head-to-head
            const tiedOnWins = standings.filter((s: any) => s.won === a.won);
            if (tiedOnWins.length === 2) {
                const match = groupMatches.find(m =>
                    ((m.team1.id === a.playerId && m.team2.id === b.playerId) ||
                        (m.team1.id === b.playerId && m.team2.id === a.playerId)) &&
                    m.confirmed
                );

                if (match) {
                    const aIsTeam1 = match.team1.id === a.playerId;
                    const aScore = aIsTeam1 ? match.score1! : match.score2!;
                    const bScore = aIsTeam1 ? match.score2! : match.score1!;
                    if (aScore !== bScore) {
                        return bScore - aScore;
                    }
                }
            }

            if (b.points !== a.points) return b.points - a.points;
            return b.gamesWon - a.gamesWon;
        });
    };

    // Sync state with props when initial data changes (e.g. after router.refresh())
    useEffect(() => {
        setGroups(initialGroups);
        setMatches(initialMatches);
        setBracket(initialBracket);
    }, [initialGroups, initialMatches, initialBracket]);

    // ─── Renderizado Condicional ───

    // Golden Rule: Detect if all matches are confirmed to enable Eliminatorias
    const isGroupStageFinished = useMemo(() => {
        return matches.length > 0 && matches.every(m => m.confirmed);
    }, [matches]);

    const totalGroupMatches = matches.length;
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const progressPercent = totalGroupMatches > 0
        ? Math.round((confirmedGroupMatches / totalGroupMatches) * 100)
        : 0;

    const sortedQualifiers = useMemo(() => {
        const quals: any[] = [];
        groups.forEach(g => {
            const groupStandings = computeStandings(g.id);
            for (let i = 0; i < qualPerGroup; i++) {
                if (groupStandings[i]) {
                    quals.push({
                        ...groupStandings[i],
                        groupId: g.id,
                        groupName: g.name,
                        groupRank: i + 1
                    });
                }
            }
        });
        return quals.sort((a, b) =>
            (a.groupRank - b.groupRank) ||
            (b.won - a.won) ||
            (b.points - a.points) ||
            (b.gamesWon - a.gamesWon)
        );
    }, [groups, matches, qualPerGroup]);

    const handleSimulateResults = () => {
        const newMatches = matches.map(m => {
            if (m.confirmed) return m;
            // Generate random scores between 0 and 7
            let s1 = Math.floor(Math.random() * 8); // 0-7
            let s2 = Math.floor(Math.random() * 8); // 0-7
            // Avoid draws (though in padel some formats might have tie-breaks, 
            // for simple point calculation we just need a winner)
            if (s1 === s2) {
                if (s1 === 7) s2 = 6;
                else s2 = s1 + 1;
            }
            return {
                ...m,
                score1: s1,
                score2: s2,
                played: true,
                confirmed: true
            };
        });
        setMatches(newMatches);
        toast.success("Resultados simulados. ¡No olvides guardar!");
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

        if (match.score1 === match.score2) {
            toast.error("No se permiten empates en los partidos del torneo");
            return;
        }

        const updatedMatches = matches.map(m => {
            if (m.id !== matchId) return m;
            return { ...m, confirmed: true };
        });

        const loadingToast = toast.loading("Guardando resultado...");
        setSaving(true);
        try {
            const res = await saveTournamentFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                matches: updatedMatches,
                bracket: bracket,
            });
            toast.dismiss(loadingToast);
            if (res.ok) {
                setMatches(updatedMatches);
                toast.success("Marcador guardado");
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            console.error(err);
            toast.error("Error inesperado al guardar marcador");
        } finally {
            setSaving(false);
        }
    };

    const handleEditScore = (matchId: string) => {
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, confirmed: false } : m));
    };

    const generateBracket = async () => {
        console.log("[generateBracket] Iniciando proceso de generación profesional...");

        // 1. Collect all qualifiers based on the current qualPerGroup setting
        const allQualifiers: any[] = [];
        groups.forEach(g => {
            const groupStandings = computeStandings(g.id);
            for (let i = 0; i < qualPerGroup; i++) {
                if (groupStandings[i]) {
                    allQualifiers.push({
                        ...groupStandings[i],
                        groupId: g.id,
                        groupRank: i + 1
                    });
                }
            }
        });

        if (allQualifiers.length < 2) {
            toast.error("Se necesitan al menos 2 clasificados para generar playoffs");
            return;
        }

        // 2. Sort by merit to assign Seeds
        // Priority: Rank in group (1st, then 2nd...), then Wins, then Games Diff, then Games Won
        const sortedSeeds = [...allQualifiers].sort((a, b) =>
            (a.groupRank - b.groupRank) ||
            (b.won - a.won) ||
            (b.points - a.points) ||
            (b.gamesWon - a.gamesWon)
        );

        // 3. Determine Bracket Size
        const totalQuals = sortedSeeds.length;
        const numRounds = Math.ceil(Math.log2(totalQuals));
        const bracketSize = Math.pow(2, numRounds);

        const loadingToast = toast.loading(`Generando cuadro de ${bracketSize} para ${totalQuals} jugadores...`);
        setSaving(true);

        try {
            // Initialize empty bracket
            const newBracket: BracketMatch[] = [];
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

            // 4. Professional Seeding Order Logic
            // Generates a sequence like [1, 8, 4, 5, 2, 7, 3, 6] for size 8
            const getSeedingOrder = (size: number) => {
                let order = [1];
                while (order.length < size) {
                    const nextOrder = [];
                    const nextSum = order.length * 2 + 1;
                    for (const s of order) {
                        nextOrder.push(s);
                        nextOrder.push(nextSum - s);
                    }
                    order = nextOrder;
                }
                return order;
            };

            const seedPositions = getSeedingOrder(bracketSize);
            const pairings: { t1: BracketSlot, t2: BracketSlot }[] = [];

            // We pair them in order: (Seed at pos 0 vs Seed at pos 1), (Seed at pos 2 vs Seed at pos 3)...
            for (let i = 0; i < seedPositions.length; i += 2) {
                const s1 = seedPositions[i];
                const s2 = seedPositions[i + 1];

                // If seed is > totalQuals, it's a BYE
                const p1 = s1 <= totalQuals ? sortedSeeds[s1 - 1].player : "BYE";
                const p2 = s2 <= totalQuals ? sortedSeeds[s2 - 1].player : "BYE";

                pairings.push({ t1: p1, t2: p2 });
            }

            // Fill the first round (Round = numRounds - 1)
            const firstRoundIdx = numRounds - 1;
            const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);

            firstRoundMatches.forEach((m, idx) => {
                const pair = pairings[idx];
                m.team1 = pair.t1;
                m.team2 = pair.t2;

                // Auto-confirm BYEs
                if (m.team1 === "BYE" || m.team2 === "BYE") {
                    m.confirmed = true;
                    const winner = m.team1 === "BYE" ? m.team2 : m.team1;
                    if (winner && winner !== "BYE") {
                        m.winnerId = (winner as Player).id;
                        m.winnerName = (winner as Player).name;
                    }
                }
            });

            // Advance auto-winners to next rounds
            advanceBracketWinners(newBracket, numRounds);

            const res = await saveTournamentFixture({
                tournamentId,
                phase: "eliminatorias",
                groups,
                matches,
                bracket: newBracket,
            });

            toast.dismiss(loadingToast);
            if (res.ok) {
                setBracket(newBracket);
                setStep("elim");
                toast.success(`Cuadro de ${totalQuals} jugadores generado con éxito`);
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (e) {
            toast.dismiss(loadingToast);
            console.error(e);
            toast.error("Error al generar cuadro dinámico");
        } finally {
            setSaving(false);
        }
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

    function advanceBracketWinners(currentBracket: BracketMatch[], totalRounds: number) {

        for (let r = totalRounds - 1; r > 0; r--) {
            const roundMatches = currentBracket.filter(m => m.round === r);
            roundMatches.forEach(m => {
                if (m.confirmed && m.winnerId) {
                    const nextRound = r - 1;
                    const nextSlot = Math.floor(m.slot / 2);
                    const isTeam2 = m.slot % 2 === 1;
                    const nextMatch = currentBracket.find(nm => nm.round === nextRound && nm.slot === nextSlot);
                    if (nextMatch) {
                        const winner = [m.team1, m.team2].find(t => t !== null && (t as any) !== "BYE" && (t as Player).id === m.winnerId);
                        if (isTeam2) nextMatch.team2 = winner as Player;
                        else nextMatch.team1 = winner as Player;

                        // Recursive auto-advance if the newly filled match has a BYE
                        if (nextMatch.team1 && nextMatch.team2) {
                            if ((nextMatch.team1 as any) === "BYE" || (nextMatch.team2 as any) === "BYE") {
                                nextMatch.confirmed = true;
                                nextMatch.winnerId = (nextMatch.team1 as any) !== "BYE"
                                    ? (nextMatch.team1 as Player).id
                                    : (nextMatch.team2 as Player).id;
                            }
                        }
                    }
                }
            });
        }
    }


    const handleBracketConfirm = async (matchId: string) => {
        const targetMatch = bracket.find(m => m.id === matchId);
        if (!targetMatch || targetMatch.score1 === undefined || targetMatch.score2 === undefined) return;

        if (targetMatch.score1 === targetMatch.score2) {
            toast.error("No se permiten empates en las llaves eliminatorias");
            return;
        }

        const updated = bracket.map(m => {
            if (m.id !== matchId) return m;
            const winner = m.score1! > m.score2! ? m.team1 : m.team2;
            const winnerId = (winner as Player)?.id;
            const winnerName = (winner as Player)?.name;

            let finalWinnerName = winnerName;
            const isUUID = (str: string | null | undefined) => str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;
            if (!finalWinnerName || isUUID(finalWinnerName)) {
                const found = groups.flatMap(g => g.players).find(p => p.id === winnerId);
                if (found) finalWinnerName = found.name;
            }

            return { ...m, confirmed: true, winnerId, winnerName: finalWinnerName };
        });

        const totalRounds = updated.length > 0 ? Math.max(...updated.map(m => m.round)) + 1 : 0;
        advanceBracketWinners(updated, totalRounds);

        const finalBracket = updated;
        setBracket(finalBracket);

        const loadingToast = toast.loading("Confirmando resultado...");
        setSaving(true);
        const match = finalBracket.find(m => m.id === matchId);
        const isFinal = match?.round === 0;
        const championName = isFinal
            ? groups.flatMap(g => g.players).find(p => p.id === match?.winnerId)?.name
            : undefined;

        try {
            const res = await saveTournamentFixture({
                tournamentId,
                phase: isFinal ? "finalizado" : "eliminatorias",
                groups,
                matches,
                bracket: finalBracket,
                championName,
            });
            toast.dismiss(loadingToast);
            if (res.ok) {
                toast.success("Resultado de eliminatoria guardado");
                if (isFinal) setShowSuccessModal(true);
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            console.error(err);
            toast.error("Error inesperado al guardar resultado");
        } finally {
            setSaving(false);
        }
    };

    const handleBracketEdit = async (matchId: string) => {
        const updatedBracket = bracket.map(m => m.id === matchId ? { ...m, confirmed: false } : m);
        setBracket(updatedBracket);

        setSaving(true);
        try {
            await saveTournamentFixture({
                tournamentId,
                phase: "eliminatorias",
                groups,
                matches,
                bracket: updatedBracket,
            });
            toast.success("Partido habilitado para edición");
        } catch (err) {
            console.error(err);
            toast.error("Error al actualizar estado del partido");
        } finally {
            setSaving(false);
        }
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

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">

            {/* ── Sticky Header — full viewport width ── */}
            <header className={`sticky ${isLoggedIn ? 'top-0' : 'top-16'} bg-background/80 backdrop-blur-md border-b border-border z-[40]`}>
                <div className="w-full mx-auto px-4 md:px-8 py-3 md:py-4">
                    {isLoggedIn && (
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        if (step === "elim") {
                                            setStep("qual");
                                        } else if (step === "qual") {
                                            setStep("done");
                                        } else {
                                            router.push(`/tournaments/${tournamentId}/manage`);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-bold uppercase tracking-widest text-[10px] shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver
                                </button>
                                {!readOnly && (
                                    <Link
                                        href={`/tournaments/${tournamentId}/edit`}
                                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-bold uppercase tracking-widest text-[10px] shrink-0 border-l border-border pl-3"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Editar Info
                                    </Link>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-muted hover:bg-accent text-muted-foreground rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 border border-border"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
                                    {isRefreshing ? "..." : "Actualizar"}
                                </button>
                                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    {initialStatus === "finalizado" ? "Finalizado" : "En Vivo"}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoggedIn && (
                        <div className="flex items-center justify-center mb-2">
                            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {initialStatus === "finalizado" ? "Finalizado" : "En Vivo"}
                            </div>
                        </div>
                    )}

                    {/* Tournament name */}
                    <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter italic uppercase text-center leading-tight mb-3">
                        {tournamentName}
                    </h1>

                    {/* Tab Navigation */}
                    <div className="flex p-1 bg-muted border border-border rounded-xl max-w-sm mx-auto">
                        <button
                            onClick={() => setStep("done")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${step === "done"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                }`}
                        >
                            <Users2 className="w-3.5 h-3.5" />
                            Grupos
                        </button>
                        {isGroupStageFinished && (
                            <button
                                onClick={() => setStep("qual")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${step === "qual"
                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                Clasificados
                            </button>
                        )}
                        {(isGroupStageFinished || bracket.length > 0 || initialStatus === "finalizado") && (
                            <button
                                onClick={() => setStep("elim")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${step === "elim"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
            <div className="w-full mx-auto px-4 md:px-12 py-6 pb-32">


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
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <span>Progreso Fase de Grupos</span>
                                    <div className="flex items-center gap-3">
                                        {!readOnly && progressPercent < 100 && (
                                            <button
                                                onClick={handleSimulateResults}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/30 rounded-lg text-[9px] font-black tracking-widest transition-all group"
                                                title="Simular resultados aleatorios para pruebas"
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

                            {/* Groups Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                                {groups.map((g: any) => {
                                    const standings = computeStandings(g.id);
                                    const groupMatches = matches.filter(m => m.groupId === g.id);
                                    return (
                                        <div key={g.id} className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col h-fit">
                                            {/* Header + Standings table */}
                                            <div className="bg-muted px-6 py-5 border-b border-border flex items-center justify-between">
                                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-primary">{g.name}</h3>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Posiciones</span>
                                            </div>

                                            <div className="p-4 border-b border-border/50 bg-card/50">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border">
                                                            <th className="pb-3 pr-3">#</th>
                                                            <th className="pb-3">Jugador</th>
                                                            <th className="pb-3 px-3 text-center">PJ</th>
                                                            <th className="pb-3 px-3 text-center">PG</th>
                                                            <th className="pb-3 px-3 text-center">+/-</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/50">
                                                        {standings.map((s: any, idx: number) => (
                                                            <tr key={s.playerId} className="hover:bg-muted/50 transition-colors">
                                                                <td className="py-3 pr-3 text-xs font-black italic text-muted-foreground">#{idx + 1}</td>
                                                                <td className="py-3 font-bold text-sm tracking-tight text-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{s.player.name}</td>
                                                                <td className="py-3 px-3 text-center text-xs font-bold text-muted-foreground">{s.matchesPlayed}</td>
                                                                <td className="py-3 px-3 text-center text-xs font-bold text-emerald-500">{s.won}</td>
                                                                <td className="py-3 px-3 text-center font-black text-primary">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Matches list within the same card */}
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="px-6 py-3 bg-muted/30 border-b border-border/50">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Partidos · {g.name}</p>
                                                </div>
                                                <div className="p-4 space-y-2">
                                                    {groupMatches.map(m => (
                                                        <div
                                                            key={m.id}
                                                            className={`rounded-xl overflow-hidden transition-all duration-300 border ${m.confirmed
                                                                ? "bg-card border-border shadow-inner"
                                                                : "bg-muted/20 border-border/50"
                                                                }`}
                                                        >
                                                            {/* Team 1 */}
                                                            <div className={`px-3 py-2 flex items-center justify-between border-l-4 border-blue-500 ${m.confirmed && m.score1! > m.score2! ? "bg-blue-500/10" : ""}`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className={`text-[11px] font-bold uppercase tracking-tight truncate block ${m.confirmed && m.score1! > m.score2! ? "text-blue-600 font-black" : "text-blue-500"}`}>
                                                                        {m.team1.name}
                                                                    </span>
                                                                </div>
                                                                {m.confirmed && (
                                                                    <span className={`text-sm font-black ml-2 shrink-0 ${m.score1! > m.score2! ? "text-blue-600" : "text-muted-foreground"}`}>{m.score1}</span>
                                                                )}
                                                            </div>

                                                            {/* Score row */}
                                                            <div className="px-3 py-1.5 bg-muted/50 border-y border-border/30 flex items-center gap-2">
                                                                {!m.confirmed && !readOnly ? (
                                                                    <>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                            className="flex-1 min-w-0 h-8 bg-blue-500/10 text-blue-700 rounded-lg text-center font-black border border-blue-500/20 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-blue-400/50 text-sm"
                                                                            placeholder="0"
                                                                        />
                                                                        <span className="text-muted-foreground font-bold text-[10px] shrink-0">vs</span>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                            className="flex-1 min-w-0 h-8 bg-rose-500/10 text-rose-700 rounded-lg text-center font-black border border-rose-500/20 focus:ring-1 focus:ring-rose-500 outline-none transition-all placeholder:text-rose-400/50 text-sm"
                                                                            placeholder="0"
                                                                        />
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleConfirmScore(m.id)}
                                                                                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-all active:scale-90 ${m.played && m.score1 !== m.score2 ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                                                                            >
                                                                                <Check className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex-1 min-w-0 flex items-center justify-center h-8 bg-muted/30 text-blue-600 rounded-lg font-black text-sm border border-blue-500/10">
                                                                            {m.score1 !== undefined ? m.score1 : "-"}
                                                                        </div>
                                                                        <span className="text-muted-foreground font-bold text-[10px] shrink-0">vs</span>
                                                                        <div className="flex-1 min-w-0 flex items-center justify-center h-8 bg-muted/30 text-rose-600 rounded-lg font-black text-sm border border-rose-500/10">
                                                                            {m.score2 !== undefined ? m.score2 : "-"}
                                                                        </div>
                                                                        {m.confirmed && !readOnly && (
                                                                            <button
                                                                                onClick={() => handleEditScore(m.id)}
                                                                                className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/20 transition-all active:scale-90"
                                                                            >
                                                                                <Settings className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Team 2 */}
                                                            <div className={`px-3 py-2 flex items-center justify-between border-l-4 border-rose-500 ${m.confirmed && m.score2! > m.score1! ? "bg-rose-500/10" : ""}`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className={`text-[11px] font-bold uppercase tracking-tight truncate block ${m.confirmed && m.score2! > m.score1! ? "text-rose-600 font-black" : "text-rose-500"}`}>
                                                                        {m.team2.name}
                                                                    </span>
                                                                </div>
                                                                {m.confirmed && (
                                                                    <span className={`text-sm font-black ml-2 shrink-0 ${m.score2! > m.score1! ? "text-rose-600" : "text-muted-foreground"}`}>{m.score2}</span>
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
                                <div className="p-8 bg-blue-600/5 border border-blue-600/20 rounded-3xl max-w-4xl mx-auto relative overflow-hidden shadow-2xl shadow-blue-500/5">
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                                        <div className="space-y-3">
                                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Fase de Grupos</h2>
                                            <div className="flex items-center gap-3 justify-center md:justify-start">
                                                <div className="px-4 py-2.5 bg-muted rounded-xl border border-border flex items-center gap-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clasifican:</p>
                                                    <div className="flex items-center gap-2">
                                                        <button className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-sm text-foreground hover:bg-muted transition-colors" onClick={() => setQualPerGroup(q => Math.max(1, q - 1))}>−</button>
                                                        <span className="text-sm font-black text-foreground w-4 text-center">{qualPerGroup}</span>
                                                        <button className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-sm text-foreground hover:bg-muted transition-colors" onClick={() => setQualPerGroup(q => Math.min(10, q + 1))}>+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setStep("qual")}
                                            disabled={!isGroupStageFinished}
                                            className={`w-full md:w-auto px-8 py-4 font-black uppercase tracking-widest italic rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 text-sm ${isGroupStageFinished
                                                ? "bg-amber-500 hover:bg-amber-400 text-white"
                                                : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                                                }`}
                                        >
                                            {isGroupStageFinished ? "Ver Clasificados →" : `Finalizá los grupos (${totalGroupMatches - confirmedGroupMatches} restantes)`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === "qual" && (
                        <motion.div
                            key="qual-stage"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-12 pb-20 px-4"
                        >
                            <div className="max-w-4xl mx-auto">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter uppercase italic mb-2">Orden de Clasificados</h2>
                                    <p className="text-muted-foreground text-sm font-medium">Clasificados ordenados por mérito para el cuadro final</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                    {(() => {
                                        const totalQuals = sortedQualifiers.length;
                                        const bracketSize = totalQuals > 0 ? Math.pow(2, Math.ceil(Math.log2(totalQuals))) : 0;
                                        const numByes = bracketSize - totalQuals;

                                        return Array.from({ length: qualPerGroup }).map((_, rankIdx) => {
                                            const rank = rankIdx + 1;
                                            const playersInRank = sortedQualifiers.filter(q => q.groupRank === rank);
                                            if (playersInRank.length === 0) return null;

                                            return (
                                                <div key={rank} className="space-y-4">
                                                    <div className="flex items-center gap-3 px-2">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg ${rank === 1 ? "bg-amber-500 shadow-amber-500/20" :
                                                            rank === 2 ? "bg-slate-400 shadow-slate-400/20" :
                                                                "bg-emerald-500 shadow-emerald-500/20"
                                                            }`}>
                                                            {rank}º
                                                        </div>
                                                        <h3 className="text-xl font-black text-foreground tracking-tight uppercase italic">
                                                            {rank === 1 ? "Primeros de Grupo" : rank === 2 ? "Segundos de Grupo" : `${rank}os de Grupo`}
                                                        </h3>
                                                    </div>

                                                    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-muted/50 border-b border-border">
                                                                        <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-muted-foreground leading-none">Sem.</th>
                                                                        <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-muted-foreground leading-none">Jugador</th>
                                                                        <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-muted-foreground leading-none">Grupo</th>
                                                                        <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-muted-foreground leading-none text-center">PG</th>
                                                                        <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-muted-foreground leading-none text-center">+/-</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/50">
                                                                    {playersInRank.map((q) => {
                                                                        const globalIdx = sortedQualifiers.findIndex(sq => sq.playerId === q.playerId);
                                                                        const hasBye = (globalIdx + 1) <= numByes;

                                                                            return (
                                                                                <tr key={q.playerId} className="hover:bg-muted/30 transition-colors group">
                                                                                    <td className="py-3 px-4">
                                                                                        <div className="flex flex-col items-center justify-center gap-1.5 h-12">
                                                                                            <span className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                                                                                #{globalIdx + 1}
                                                                                            </span>
                                                                                            <div className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-sm border transition-all ${
                                                                                                hasBye 
                                                                                                ? "text-amber-600 bg-amber-500/10 border-amber-500/20" 
                                                                                                : "text-transparent bg-transparent border-transparent select-none"
                                                                                            }`}>
                                                                                                BYE
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3 px-4">
                                                                                        <div className="flex flex-col justify-center gap-1.5 h-12">
                                                                                            <div className="font-bold text-foreground tracking-tight whitespace-nowrap text-xs truncate max-w-[120px]">
                                                                                                {q.player.name}
                                                                                            </div>
                                                                                            <div className={`flex items-center gap-1 text-[9px] font-bold uppercase italic transition-all ${
                                                                                                hasBye 
                                                                                                ? "text-amber-500 opacity-100" 
                                                                                                : "text-transparent opacity-0 select-none"
                                                                                            }`}>
                                                                                                <Trophy className="w-2.5 h-2.5" />
                                                                                                Pasa Directo
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3 px-4">
                                                                                        <div className="flex items-center h-12">
                                                                                            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                                                                                {q.groupName}
                                                                                            </span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3 px-4 text-center font-bold text-emerald-500 text-xs">
                                                                                        <div className="flex items-center justify-center h-12">
                                                                                            {q.won}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3 px-4 text-center font-black text-primary text-xs">
                                                                                        <div className="flex items-center justify-center h-12">
                                                                                            {q.points > 0 ? `+${q.points}` : q.points}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Call to action to generate bracket */}
                                <div className="mt-20 flex flex-col items-center gap-6">
                                    <div className="bg-blue-600/10 border border-blue-600/20 p-8 rounded-[2rem] max-w-xl text-center backdrop-blur-sm">
                                        <Trophy className="w-10 h-10 text-blue-500 mx-auto mb-4" />
                                        <h3 className="text-blue-500 font-black uppercase tracking-widest text-xs mb-3">Siguiente Fase: Eliminatorias</h3>
                                        <p className="text-sm text-foreground/80 font-medium mb-0">
                                            El sistema emparejará a los **mejores primeros** contra los **peores clasificados** para garantizar un torneo meritocrático.
                                            Los BYEs (si existen) se asignarán automáticamente a las semillas más altas.
                                        </p>
                                    </div>

                                    <button
                                        onClick={generateBracket}
                                        disabled={saving}
                                        className="px-16 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest italic rounded-2xl shadow-2xl shadow-blue-600/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 disabled:opacity-50 text-base"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                Creando Llave...
                                            </>
                                        ) : (
                                            <>
                                                <Swords className="w-6 h-6" />
                                                Generar Cuadro de Eliminación
                                            </>
                                        )}
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
                            className="space-y-6 pb-20"
                        >
                            {/* ── Champion Banner (appears at top on mobile when tournament done) ── */}
                            {(() => {
                                const finalMatch = bracket.find(m => m.round === 0);
                                if (finalMatch?.confirmed && finalMatch.winnerId) {
                                    const winnerSlot = [finalMatch.team1, finalMatch.team2].find(t => t && t !== "BYE" && (t as Player).id === finalMatch.winnerId) as Player;

                                    // Robust check for champName: prefer winnerName IF it doesn't look like a UUID
                                    const isUUID = (str: string | null | undefined) => str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

                                    let champName = finalMatch.winnerName;
                                    if (!champName || isUUID(champName)) {
                                        // Try to find the name from the winnerSlot
                                        const slotName = winnerSlot?.name;
                                        if (slotName && !isUUID(slotName)) {
                                            champName = slotName;
                                        } else {
                                            // Final fallback: search in all players
                                            const foundPlayer = groups.flatMap(g => g.players).find(p => p.id === finalMatch.winnerId);
                                            champName = foundPlayer?.name || "Campeón";
                                        }
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {/* Champion banner */}
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="relative bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 rounded-3xl p-6 text-slate-950 overflow-hidden shadow-2xl shadow-yellow-500/20"
                                            >
                                                {/* Shimmer */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="w-16 h-16 rounded-2xl bg-black/15 flex items-center justify-center shrink-0">
                                                        <Trophy className="w-9 h-9 drop-shadow-lg" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70">Campeón del Torneo</p>
                                                        <h2 className="text-2xl font-black italic uppercase tracking-tight leading-tight truncate">{champName}</h2>
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
                                                                championName: champName,
                                                                groups,
                                                                matches,
                                                                bracket,
                                                            });
                                                            setSaving(false);
                                                            setShowSuccessModal(true);
                                                            setTimeout(() => router.refresh(), 2000);
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
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Finalizar Torneo
                                                            </>
                                                        )}
                                                    </button>
                                                </motion.div>
                                            )}

                                            {/* Torneo ya finalizado — estado de lectura */}
                                            {initialStatus === "finalizado" && (
                                                <div className="w-full py-3 bg-muted border border-border rounded-2xl text-muted-foreground text-[10px] font-black uppercase tracking-widest text-center">
                                                    Torneo Finalizado
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return (
                                    <div className="flex items-center justify-center py-4">
                                        {!readOnly && (
                                            <button
                                                onClick={generateBracket}
                                                disabled={saving || !isGroupStageFinished}
                                                className="px-4 py-2 bg-muted hover:bg-accent text-muted-foreground hover:text-white border border-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Regenerar Playoffs
                                            </button>
                                        )}
                                    </div>
                                );
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
                                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                                                    {roundLabel(r)}
                                                </h3>
                                                <div className="flex-1 h-px bg-border" />
                                                <span className="text-[10px] font-bold text-muted-foreground">{roundMatches.length} partido{roundMatches.length !== 1 ? "s" : ""}</span>
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
                                                            ? "bg-card border-border shadow-inner"
                                                            : "bg-muted/10 border-border"
                                                            }`}>
                                                            {/* Team 1 row */}
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-blue-500 ${isWinner1 ? "bg-blue-500/10" : ""}`}>
                                                                <span className={`text-sm font-black uppercase tracking-tight truncate ${isWinner1 ? "text-blue-700 font-black" : "text-blue-600"}`}>
                                                                    {m.team1 ? slotName(m.team1) : "En espera..."}
                                                                </span>
                                                                {m.confirmed && (
                                                                    <span className={`text-lg font-black ml-3 shrink-0 ${isWinner1 ? "text-blue-600" : "text-muted-foreground"}`}>{m.score1}</span>
                                                                )}
                                                            </div>

                                                            {/* Score input or divider */}
                                                            <div className="px-3 py-2 bg-muted/50 border-y border-border flex items-center gap-2">
                                                                {canPlay && !readOnly ? (
                                                                    <>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            className="flex-1 min-w-0 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-700 rounded-xl text-center text-base font-black placeholder:text-blue-400/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                                            placeholder="0"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                        />
                                                                        <div className="w-4 text-center text-muted-foreground font-black text-sm shrink-0">vs</div>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            className="flex-1 min-w-0 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-xl text-center text-base font-black placeholder:text-rose-400/50 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                                                                            placeholder="0"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                        />
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleBracketConfirm(m.id)}
                                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${(m.score1 !== undefined && m.score2 !== undefined) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex-1 min-w-0 h-10 bg-background/50 border border-blue-500/20 rounded-xl flex items-center justify-center text-base font-black text-blue-600">
                                                                            {m.score1 !== undefined ? m.score1 : "-"}
                                                                        </div>
                                                                        <div className="w-4 text-center text-muted-foreground font-black text-sm shrink-0">vs</div>
                                                                        <div className="flex-1 min-w-0 h-10 bg-background/50 border border-rose-500/20 rounded-xl flex items-center justify-center text-base font-black text-rose-600">
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
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-rose-500 ${isWinner2 ? "bg-rose-500/10" : ""}`}>
                                                                <span className={`text-sm font-black uppercase tracking-tight truncate ${isWinner2 ? "text-rose-700 font-black" : "text-rose-600"}`}>
                                                                    {isBye ? "BYE — Pasa automático" : m.team2 ? slotName(m.team2) : "En espera..."}
                                                                </span>
                                                                {m.confirmed && !isBye && (
                                                                    <span className={`text-lg font-black ml-3 shrink-0 ${isWinner2 ? "text-rose-600" : "text-muted-foreground"}`}>{m.score2}</span>
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
                                <div className="inline-flex gap-16 min-w-full px-4 py-8">
                                    {roundsArr.map((r, rIdx) => (
                                        <div key={r} className="flex-shrink-0 w-80 flex flex-col">
                                            <div className="flex items-center gap-3 mb-8 px-2">
                                                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-blue-600/20">
                                                    R{roundsArr.length - rIdx}
                                                </div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{roundLabel(r)}</h3>
                                            </div>

                                            <div className="flex-1 flex flex-col justify-around min-h-[600px] gap-8">
                                                {bracket.filter(m => m.round === r).map((m) => {
                                                    const isWinner1 = m.confirmed && m.winnerId === (m.team1 as any)?.id;
                                                    const isWinner2 = m.confirmed && m.winnerId === (m.team2 as any)?.id;
                                                    const isBye = m.team2 === "BYE";

                                                    return (
                                                        <div key={m.id} className={`bg-card border rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${m.confirmed ? "border-border" : "border-border hover:border-blue-600/50"
                                                            }`}>
                                                            {/* Team 1 */}
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-blue-500 ${isWinner1 ? "bg-blue-500/10" : ""}`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className={`text-xs font-black truncate uppercase tracking-tight block ${isWinner1 ? "text-blue-700 font-black" : "text-blue-600"}`}>
                                                                        {m.team1 ? slotName(m.team1) : "En espera..."}
                                                                    </span>
                                                                </div>
                                                                {m.confirmed && <span className={`text-sm font-black ml-2 shrink-0 ${isWinner1 ? "text-blue-600" : "text-muted-foreground"}`}>{m.score1}</span>}
                                                            </div>

                                                            {/* Score or divider */}
                                                            <div className="p-2 bg-muted/50 border-y border-border/50 flex items-center gap-2 px-3">
                                                                {!m.confirmed && m.team1 && m.team2 && !isBye && !readOnly ? (
                                                                    <div className="flex items-center gap-2 w-full min-w-0">
                                                                        <input
                                                                            type="number"
                                                                            className="flex-1 min-w-0 h-8 bg-blue-500/10 border border-blue-500/20 text-blue-700 rounded-lg text-center text-sm font-black placeholder:text-blue-400/50 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                            placeholder="0"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                        />
                                                                        <span className="text-muted-foreground text-[10px] font-bold shrink-0">vs</span>
                                                                        <input
                                                                            type="number"
                                                                            className="flex-1 min-w-0 h-8 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-lg text-center text-sm font-black placeholder:text-rose-400/50 focus:ring-1 focus:ring-rose-500 outline-none"
                                                                            placeholder="0"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                        />
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleBracketConfirm(m.id)}
                                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${(m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                                                                            >
                                                                                <Check className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : m.confirmed && !isBye ? (
                                                                    <div className="flex items-center gap-2 w-full min-w-0">
                                                                        <div className="flex-1 min-w-0 h-8 bg-background/50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-black border border-blue-500/20">
                                                                            {m.score1 !== undefined ? m.score1 : "-"}
                                                                        </div>
                                                                        <span className="text-muted-foreground text-[10px] font-bold shrink-0">vs</span>
                                                                        <div className="flex-1 min-w-0 h-8 bg-background/50 text-rose-600 rounded-lg flex items-center justify-center text-sm font-black border border-rose-500/20">
                                                                            {m.score2 !== undefined ? m.score2 : "-"}
                                                                        </div>
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => handleBracketEdit(m.id)}
                                                                                className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/20 transition-all active:scale-[0.9]"
                                                                            >
                                                                                <Settings className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-px bg-border flex-1 my-1" />
                                                                )}
                                                            </div>

                                                            {/* Team 2 */}
                                                            <div className={`px-4 py-3 flex items-center justify-between border-l-4 border-rose-500 ${isWinner2 ? "bg-rose-500/10" : ""}`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className={`text-xs font-black truncate uppercase tracking-tight block ${isWinner2 ? "text-rose-700 font-black" : "text-rose-600"}`}>
                                                                        {isBye ? "BYE (Pasa)" : m.team2 ? slotName(m.team2) : "En espera..."}
                                                                    </span>
                                                                </div>
                                                                {m.confirmed && !isBye && <span className={`text-sm font-black ml-2 shrink-0 ${isWinner2 ? "text-rose-600" : "text-muted-foreground"}`}>{m.score2}</span>}
                                                            </div>

                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Finalize Tournament Action Bar (Bottom) */}
                            {(() => {
                                const finalMatch = bracket.find(m => m.round === 0);
                                const winnerSlot = finalMatch ? [finalMatch.team1, finalMatch.team2].find(t => t && t !== "BYE" && (t as Player).id === finalMatch.winnerId) as Player : null;
                                const isUUID = (str: string | null | undefined) => str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

                                let champName = finalMatch?.winnerName;
                                if (!champName || isUUID(champName)) {
                                    const slotName = winnerSlot?.name;
                                    if (slotName && !isUUID(slotName)) {
                                        champName = slotName;
                                    } else {
                                        const foundPlayer = groups.flatMap(g => g.players).find(p => p.id === finalMatch?.winnerId);
                                        champName = foundPlayer?.name || "Campeón";
                                    }
                                }

                                if (finalMatch?.confirmed && champName && initialStatus !== "finalizado" && !readOnly) {
                                    return (
                                        <div className="mt-12 p-8 bg-emerald-600/5 border border-emerald-600/20 rounded-3xl max-w-4xl mx-auto relative overflow-hidden shadow-2xl shadow-emerald-500/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                        <Trophy className="w-6 h-6 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground">¡Final de Torneo!</h2>
                                                        <p className="text-emerald-700/60 text-[10px] font-black uppercase tracking-widest mt-1">Campeón: {champName}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        setSaving(true);
                                                        await saveTournamentFixture({
                                                            tournamentId,
                                                            phase: "finalizado",
                                                            championName: champName,
                                                            groups,
                                                            matches,
                                                            bracket,
                                                        });
                                                        setSaving(false);
                                                        setShowSuccessModal(true);
                                                        setTimeout(() => router.refresh(), 2000);
                                                    }}
                                                    disabled={saving}
                                                    className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest italic rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 text-sm flex items-center justify-center gap-2"
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSuccessModal(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-8 text-center shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-rose-500" />

                            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, delay: 0.2 }}
                                >
                                    <Trophy className="w-10 h-10 text-emerald-500" />
                                </motion.div>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full bg-emerald-500/5"
                                />
                            </div>

                            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-foreground mb-2">
                                ¡Torneo Finalizado!
                            </h3>
                            <p className="text-muted-foreground text-sm font-bold mb-8">
                                Los resultados han sido guardados y el campeón ha sido coronado con éxito.
                            </p>

                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                            >
                                Entendido
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
