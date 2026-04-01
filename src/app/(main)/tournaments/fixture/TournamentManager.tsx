"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings,
    BarChart3, Check, X, RefreshCw, Dice5, Info, Pencil, RotateCcw
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

// ── Shared Helper Functions ──
function getSeedingOrder(size: number) {
    if (size <= 1) return [1];
    let rounds = Math.log2(size);
    let order = [1, 2];
    for (let r = 1; r < rounds; r++) {
        let nextOrder = [];
        let sum = Math.pow(2, r + 1) + 1;
        for (let i = 0; i < order.length; i++) {
            // Fold odd positions differently to ensure standard tennis-style brackets
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

const MATCH_COLORS = [
    { bg: "bg-blue-600/15", border: "border-blue-600", text: "text-blue-700" },
    { bg: "bg-emerald-600/15", border: "border-emerald-600", text: "text-emerald-700" },
    { bg: "bg-amber-600/20", border: "border-amber-600", text: "text-amber-700" },
    { bg: "bg-rose-600/15", border: "border-rose-600", text: "text-rose-700" },
    { bg: "bg-violet-600/15", border: "border-violet-600", text: "text-violet-700" },
    { bg: "bg-orange-600/20", border: "border-orange-600", text: "text-orange-700" },
    { bg: "bg-cyan-600/15", border: "border-cyan-600", text: "text-cyan-700" },
    { bg: "bg-fuchsia-600/15", border: "border-fuchsia-600", text: "text-fuchsia-700" },
    { bg: "bg-lime-600/20", border: "border-lime-600", text: "text-lime-700" },
    { bg: "bg-indigo-600/15", border: "border-indigo-600", text: "text-indigo-700" },
];

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
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hoveredMatchIdx, setHoveredMatchIdx] = useState<number | null>(null);
    const [qualifierOverrides, setQualifierOverrides] = useState<Record<number, Player | "BYE">>({});
    const [isReplacingPlayer, setIsReplacingPlayer] = useState<number | null>(null);
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");

    const selectedPlayer = useMemo(() => {
        if (!selectedPlayerId) return null;
        return groups.flatMap(g => g.players).find(p => p.id === selectedPlayerId);
    }, [selectedPlayerId, groups]);

    const playerGroupMatches = useMemo(() => {
        if (!selectedPlayerId) return [];
        return matches.filter(m => m.team1.id === selectedPlayerId || m.team2.id === selectedPlayerId);
    }, [selectedPlayerId, matches]);

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

            const p1 = standings.find((s: any) => s.playerId === m.team1.id);
            const p2 = standings.find((s: any) => s.playerId === m.team2.id);

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

        const rankFIPGroup = (players: any[], matchesToAnalyze: any[], metricIndex: number = 0): any[] => {
            if (players.length === 0) return [];
            if (players.length === 1) return players;

            // FIP Rule: If exactly 2 players are tied, ALWAYS resolve by Head-to-Head first.
            if (players.length === 2) {
                const [a, b] = players;
                const match = matchesToAnalyze.find(m =>
                    m.team1 && m.team2 &&
                    ((m.team1.id === a.playerId && m.team2.id === b.playerId) ||
                        (m.team1.id === b.playerId && m.team2.id === a.playerId)) &&
                    m.confirmed
                );

                if (match) {
                    const aIsTeam1 = match.team1!.id === a.playerId;
                    const aScore = aIsTeam1 ? match.score1! : match.score2!;
                    const bScore = aIsTeam1 ? match.score2! : match.score1!;
                    if (aScore !== bScore) {
                        return aScore > bScore ? [a, b] : [b, a];
                    }
                }
                // If they tied their match (rare) or haven't played, fall back to the current metric
            }

            const metrics = [
                (p: any) => p.won,
                (p: any) => p.points,      // Game Difference
                (p: any) => p.gamesWon,    // Ultimate fallback for Padel
            ];

            // If we ran out of metrics, keep them in arbitrary order
            if (metricIndex >= metrics.length) return players;

            const metricFn = metrics[metricIndex];

            // Group players by current metric
            const groupsByMetric = new Map<number, any[]>();
            for (const p of players) {
                const val = metricFn(p);
                if (!groupsByMetric.has(val)) groupsByMetric.set(val, []);
                groupsByMetric.get(val)!.push(p);
            }

            // Sort subgroup keys descending (higher is better)
            const sortedVals = Array.from(groupsByMetric.keys()).sort((a, b) => b - a);

            let result: any[] = [];
            for (const val of sortedVals) {
                const subGroup = groupsByMetric.get(val)!;
                // Recursively rank this subgroup with the NEXT metric.
                // If this subgroup drops to size 2, rankFIPGroup automatically catches it and applies Head-to-Head!
                const rankedSubGroup = rankFIPGroup(subGroup, matchesToAnalyze, metricIndex + 1);
                result = result.concat(rankedSubGroup);
            }

            return result;
        };

        return rankFIPGroup(standings, groupMatches);
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
    }, [groups, matches, qualPerGroup, computeStandings]);

    const finalQualifiers = useMemo(() => {
        return sortedQualifiers.map((q, idx) => {
            const seed = idx + 1;
            const override = qualifierOverrides[seed];
            if (override === "BYE") {
                return {
                    ...q,
                    isOverride: true,
                    isByeOverride: true
                };
            }
            if (override) {
                return {
                    ...q,
                    player: override,
                    playerId: override.id,
                    isOverride: true
                };
            }
            return q;
        });
    }, [sortedQualifiers, qualifierOverrides]);

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

            const seedPositions = getSeedingOrder(bracketSize);
            const pairings: { t1: BracketSlot, t2: BracketSlot }[] = [];

            // We pair them in order: (Seed at pos 0 vs Seed at pos 1), (Seed at pos 2 vs Seed at pos 3)...
            for (let i = 0; i < seedPositions.length; i += 2) {
                const s1 = seedPositions[i];
                const s2 = seedPositions[i + 1];

                const q1 = finalQualifiers[s1 - 1];
                const q2 = finalQualifiers[s2 - 1];

                let p1: BracketSlot = (q1 && s1 <= totalQuals) ? q1.player : "BYE";
                let p2: BracketSlot = (q2 && s2 <= totalQuals) ? q2.player : "BYE";

                // --- Administrative Overrides ---
                // If either has a manual BYE override, the other one passes
                if (q1?.isByeOverride) {
                    p1 = q1.player;
                    p2 = "BYE";
                } else if (q2?.isByeOverride) {
                    p1 = "BYE";
                    p2 = q2.player;
                }

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
            newBracket = computeAdvancedBracket(newBracket, numRounds);

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

    function computeAdvancedBracket(currentBracket: BracketMatch[], totalRounds: number): BracketMatch[] {
        // Explicitly deep clone everything to avoid any shared reference bugs
        const safeBracket = currentBracket.map(m => ({ ...m }));
        
        for (let r = totalRounds - 1; r > 0; r--) {
            const roundMatches = safeBracket.filter(m => m.round === r);
            roundMatches.forEach(m => {
                const nextRound = r - 1;
                const nextSlot = Math.floor(m.slot / 2);
                const isTeam2 = m.slot % 2 === 1;
                const nextMatch = safeBracket.find(nm => nm.round === nextRound && nm.slot === nextSlot);
                
                if (nextMatch) {
                    if (m.confirmed && m.winnerId) {
                        let winner = [m.team1, m.team2].find(t => t !== null && (t as any) !== "BYE" && (t as Player).id === m.winnerId);
                        
                        // Robust fallback in case m.winnerId isn't exactly matching identity:
                        if (!winner && m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) {
                            winner = m.score1 > m.score2 ? m.team1 : m.team2;
                        }

                        if (isTeam2) nextMatch.team2 = winner as Player || null;
                        else nextMatch.team1 = winner as Player || null;

                        // Recursive auto-advance if the newly filled match has a BYE
                        if (nextMatch.team1 && nextMatch.team2) {
                            if ((nextMatch.team1 as any) === "BYE" || (nextMatch.team2 as any) === "BYE") {
                                nextMatch.confirmed = true;
                                const advancingTeam = (nextMatch.team1 as any) !== "BYE" ? nextMatch.team1 : nextMatch.team2;
                                nextMatch.winnerId = (advancingTeam as Player)?.id || undefined;
                                nextMatch.winnerName = (advancingTeam as Player)?.name || undefined;
                            }
                        }
                    } else {
                        // Clear the slot if not confirmed properly
                        if (isTeam2) nextMatch.team2 = null;
                        else nextMatch.team1 = null;
                    }
                }
            });
        }
        return safeBracket;
    }


    const handleBracketConfirm = async (matchId: string) => {
        const targetMatch = bracket.find(m => m.id === matchId);
        if (!targetMatch || targetMatch.score1 === undefined || targetMatch.score2 === undefined) return;

        if (targetMatch.score1 === targetMatch.score2) {
            toast.error("No se permiten empates en las llaves eliminatorias");
            return;
        }

        const updated = bracket.map(m => {
            if (m.id !== matchId) return { ...m };
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
        const finalBracket = computeAdvancedBracket(updated, totalRounds);

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
                                            router.push(`/tournaments/${tournamentId}/fixture`);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 text-foreground/60 hover:text-foreground transition-colors font-bold uppercase tracking-widest text-[10px] shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver
                                </button>
                                {!readOnly && (
                                    <Link
                                        href={`/tournaments/${tournamentId}/edit`}
                                        className="flex items-center gap-1.5 text-foreground/60 hover:text-foreground transition-colors font-bold uppercase tracking-widest text-[10px] shrink-0 border-l border-border pl-3"
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
                                    className="flex items-center gap-1.5 px-3 py-1 bg-muted hover:bg-accent text-foreground/60 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 border border-border"
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
                                : "text-foreground/60 hover:text-foreground hover:bg-accent"
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
                                    : "text-foreground/60 hover:text-foreground hover:bg-accent"
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
                                    : "text-foreground/60 hover:text-foreground hover:bg-accent"
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
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-foreground/60">
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
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Posiciones</span>
                                            </div>

                                            <div className="p-4 border-b border-border/50 bg-card/50">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-[10px] uppercase font-black tracking-widest text-foreground/40 border-b border-border">
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
                                                                <td className="py-3 pr-3 text-xs font-black italic text-foreground/30">#{idx + 1}</td>
                                                                <td className="py-3 font-bold text-sm tracking-tight text-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{s.player.name}</td>
                                                                <td className="py-3 px-3 text-center text-xs font-bold text-foreground/50">{s.matchesPlayed}</td>
                                                                <td className="py-3 px-3 text-center text-xs font-bold text-emerald-600">{s.won}</td>
                                                                <td className="py-3 px-3 text-center font-black text-blue-600">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Matches list within the same card */}
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="px-6 py-3 bg-muted/30 border-b border-border/50">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Partidos · {g.name}</p>
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
                                                            <div className={`px-3 py-2 flex items-center justify-between border-l-4 border-blue-600 ${m.confirmed && m.score1! > m.score2! ? "bg-blue-600/10" : ""}`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className={`text-[11px] font-bold uppercase tracking-tight truncate block ${m.confirmed && m.score1! > m.score2! ? "text-blue-700 font-black" : "text-blue-600"}`}>
                                                                        {m.team1.name}
                                                                    </span>
                                                                </div>
                                                                {m.confirmed && (
                                                                    <span className={`text-sm font-black ml-2 shrink-0 ${m.score1! > m.score2! ? "text-blue-700" : "text-foreground/40"}`}>{m.score1}</span>
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
                                                                        <span className="text-foreground/60 font-bold text-[10px] shrink-0">vs</span>
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
                                                                                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-all active:scale-90 ${m.played && m.score1 !== m.score2 ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-muted text-foreground/60 cursor-not-allowed"}`}
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
                                                                        <span className="text-foreground/60 font-bold text-[10px] shrink-0">vs</span>
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
                                                            <div className={`px-3 py-2 flex items-center justify-between border-l-4 border-rose-600 ${m.confirmed && m.score2! > m.score1! ? "bg-rose-600/10" : ""}`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className={`text-[11px] font-bold uppercase tracking-tight truncate block ${m.confirmed && m.score2! > m.score1! ? "text-rose-700 font-black" : "text-rose-600"}`}>
                                                                        {m.team2.name}
                                                                    </span>
                                                                </div>
                                                                {m.confirmed && (
                                                                    <span className={`text-sm font-black ml-2 shrink-0 ${m.score2! > m.score1! ? "text-rose-700" : "text-foreground/40"}`}>{m.score2}</span>
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
                                <div className="p-10 bg-blue-600/5 border border-blue-600/20 rounded-[2.5rem] w-full relative overflow-hidden shadow-2xl shadow-blue-500/5">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.3)]" />

                                    <div className="flex flex-row items-center justify-between gap-12">
                                        <div className="flex items-center gap-12">
                                            <div className="space-y-1">
                                                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-foreground whitespace-nowrap leading-none">Fase de Grupos</h2>
                                                <p className="text-[10px] font-black text-blue-600/80 uppercase tracking-widest pl-1">Configuración de avance</p>
                                            </div>

                                            <div className="h-12 w-px bg-border/50 hidden md:block" />

                                            <div className="flex items-center gap-8">
                                                <div className="px-6 py-4 bg-muted/40 rounded-3xl border border-border/50 flex items-center gap-8 shadow-inner">
                                                    <div className="flex flex-col items-start leading-none gap-1">
                                                        <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Clasifican</p>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 italic">por grupo</p>
                                                    </div>
                                                      <div className="flex items-center gap-5">
                                                        <button
                                                            className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl text-foreground hover:bg-muted transition-all active:scale-90 disabled:opacity-20 shadow-sm"
                                                            onClick={() => setQualPerGroup(q => Math.max(1, q - 1))}
                                                            disabled={qualPerGroup <= 1}
                                                        >
                                                            −
                                                        </button>
                                                        <span className="text-3xl font-black text-foreground w-10 text-center tabular-nums drop-shadow-sm">{qualPerGroup}</span>
                                                        <button
                                                            className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl text-foreground hover:bg-muted transition-all active:scale-90 disabled:opacity-20 shadow-sm"
                                                            onClick={() => {
                                                                const minGroupSize = groups.length > 0 ? Math.min(...groups.map(g => g.players.length)) : 4;
                                                                setQualPerGroup(q => Math.min(minGroupSize, q + 1));
                                                            }}
                                                            disabled={qualPerGroup >= (groups.length > 0 ? Math.min(...groups.map(g => g.players.length)) : 4)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {groups.length > 0 && (
                                                    <div className="hidden lg:flex flex-col items-start leading-tight border-l border-border/30 pl-8">
                                                        <span className="text-[10px] font-black text-foreground/60 uppercase opacity-60 tracking-widest mb-1">Capacidad Máxima</span>
                                                        <span className="text-sm font-black text-foreground uppercase tracking-tight italic">
                                                            {Math.min(...groups.map(g => g.players.length))} POR GRUPO
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setStep("qual")}
                                            disabled={!isGroupStageFinished}
                                            className={`px-14 py-6 font-black uppercase tracking-widest italic rounded-2xl shadow-2xl transition-all hover:scale-[1.03] active:scale-95 text-xl whitespace-nowrap ${isGroupStageFinished
                                                ? "bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30"
                                                : "bg-muted text-foreground/20 cursor-not-allowed border border-border shadow-none"
                                                }`}
                                        >
                                            {isGroupStageFinished ? (
                                                <span className="flex items-center gap-3">
                                                    Ver Clasificados
                                                    <ChevronRight className="w-6 h-6" />
                                                </span>
                                            ) : (
                                                `Finalizar Grupos`
                                            )}
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
                            className="space-y-12 pb-20 px-4 md:px-12"
                        >
                            <div className="w-full">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter uppercase italic mb-2">Orden de Clasificados</h2>
                                    <p className="text-foreground/40 text-xs font-black uppercase tracking-widest">Ranking de mérito técnico y emparejamientos calculados</p>
                                </div>
                                {(() => {
                                    const totalQuals = sortedQualifiers.length;
                                    const bracketSize = totalQuals > 0 ? Math.pow(2, Math.ceil(Math.log2(totalQuals))) : 0;
                                    const numByes = bracketSize - totalQuals;

                                    return (
                                        <>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-8">
                                                {/* --- Rankings Tablas (Columna 1 y 2) --- */}
                                                {Array.from({ length: Math.min(qualPerGroup, 2) }).map((_, rankIdx) => {
                                                    const rank = rankIdx + 1;
                                                    const playersInRank = finalQualifiers.filter(q => q.groupRank === rank);
                                                    if (playersInRank.length === 0) return null;

                                                    return (
                                                        <div key={rank} className="space-y-4">
                                                            <div className="flex items-center gap-3 px-2">
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg ${rank === 1 ? "bg-amber-500 shadow-amber-500/20" :
                                                                    "bg-slate-400 shadow-slate-400/20"
                                                                    }`}>
                                                                    {rank}º
                                                                </div>
                                                                <h3 className="text-xl font-black text-foreground tracking-tight uppercase italic">
                                                                    {rank === 1 ? "Primeros de Grupo" : "Segundos de Grupo"}
                                                                </h3>
                                                            </div>

                                                            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                                                                <div className="overflow-x-auto">
                                                                                                    <table className="w-full text-left border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-muted/50 border-b border-border">
                                                                                <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/40 leading-none">Sem.</th>
                                                                                <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/40 leading-none text-center">+/-</th>
                                                                                <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/40 leading-none">Jugador</th>
                                                                                <th className="py-4 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/40 leading-none"></th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-border/50">
                                                                            {playersInRank.map((q) => {
                                                                                const seed = finalQualifiers.indexOf(q) + 1;
                                                                                const hasBye = seed <= numByes;

                                                                                // Opponent coloring logic
                                                                                const order = getSeedingOrder(bracketSize);
                                                                                const posInOrder = order.indexOf(seed);
                                                                                const matchIdx = Math.floor(posInOrder / 2);
                                                                                const colorSet = MATCH_COLORS[matchIdx % MATCH_COLORS.length];
                                                                                const isHovered = hoveredMatchIdx === matchIdx;

                                                                                return (
                                                                                    <tr
                                                                                        key={q.playerId}
                                                                                        onClick={() => setSelectedPlayerId(q.playerId)}
                                                                                        onMouseEnter={() => setHoveredMatchIdx(matchIdx)}
                                                                                        onMouseLeave={() => setHoveredMatchIdx(null)}
                                                                                        className={`transition-all group cursor-pointer border-l-4 ${isHovered
                                                                                                ? `${colorSet.border} ${colorSet.bg}`
                                                                                                : "border-transparent hover:bg-accent/30"
                                                                                            }`}
                                                                                    >
                                                                                        <td className="py-3 px-4">
                                                                                            <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center shadow-sm border transition-all ${isHovered
                                                                                                    ? `${colorSet.bg} ${colorSet.border}`
                                                                                                    : "bg-primary/10 border-primary/20"
                                                                                                }`}>
                                                                                                <span className={`text-[10px] font-black ${isHovered ? colorSet.text : "text-primary"}`}>
                                                                                                    #{seed}
                                                                                                </span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="py-3 px-4 text-center">
                                                                                            <span className={`text-[10px] font-black ${q.points >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                                                                {q.points > 0 ? "+" : ""}{q.points}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-3 px-4">
                                                                                            <div className="flex flex-col text-left">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className={`text-sm font-black italic tracking-tighter uppercase leading-none ${q.isByeOverride ? "text-amber-600" : "text-foreground"}`}>
                                                                                                        {q.player.name}
                                                                                                    </span>
                                                                                                    {q.isOverride && (
                                                                                                        <span className={`text-[8px] font-black italic uppercase px-1.5 py-0.5 rounded-sm leading-none shrink-0 ${q.isByeOverride ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                                                                                                            {q.isByeOverride ? "BYE ASIGNADO" : "REEMPLAZO"}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                                                                    <span className="text-[8px] font-black uppercase text-foreground/40">
                                                                                                        {q.groupName}
                                                                                                    </span>
                                                                                                    {hasBye && !q.isByeOverride && (
                                                                                                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-600 border border-amber-500/20 leading-none">
                                                                                                            BYE NATURAL
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="py-2.5 px-4 text-right">
                                                                                            <div className="flex items-center justify-end gap-1 opacity-100">
                                                                                                <button
                                                                                                    className="h-8 w-8 flex items-center justify-center text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setIsReplacingPlayer(seed);
                                                                                                    }}
                                                                                                    title="Cambiar Jugador"
                                                                                                >
                                                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                                                </button>
                                                                                                {qualifierOverrides[seed] && (
                                                                                                    <button
                                                                                                        className="h-8 w-8 flex items-center justify-center text-foreground/60 hover:bg-muted/10 rounded-full transition-colors"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            const newOverrides = { ...qualifierOverrides };
                                                                                                            delete newOverrides[seed];
                                                                                                            setQualifierOverrides(newOverrides);
                                                                                                        }}
                                                                                                        title="Restaurar Original"
                                                                                                    >
                                                                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                            {rank === 2 && numByes > 0 && (
                                                                <div className="p-6 bg-muted/20 border border-border rounded-[2rem] backdrop-blur-sm shadow-inner group transition-all hover:bg-muted/30">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                                                                            <Info className="w-5 h-5 text-amber-500" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest italic mb-0.5">BYEs: {numByes}</h4>
                                                                            <p className="text-[9px] text-foreground/50 font-medium leading-none">Las mejores semillas pasan directo.</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                            </div>

                                            <div className="space-y-8 mt-16 pt-12 border-t border-dashed border-border/50 animate-in fade-in slide-in-from-bottom duration-1000">
                                                <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
                                                    <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 mb-6 shadow-xl shadow-primary/5">
                                                        <Swords className="w-8 h-8 text-primary" />
                                                    </div>
                                                    <h3 className="text-4xl font-black italic uppercase tracking-tighter text-foreground leading-none mb-3">Enfrentamientos Previstos</h3>
                                                    <p className="text-xs font-black uppercase text-foreground/30 tracking-[0.35em]">Proyección técnica de la llave de eliminación directa</p>
                                                </div>

                                                <div className="bg-card border border-border rounded-[3.5rem] overflow-hidden shadow-2xl relative">
                                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                  <tr className="bg-muted/30 border-b border-border/50">
                                                                    <th className="py-2.5 px-6 text-[9px] uppercase font-black tracking-widest text-foreground/30 leading-none text-center w-20">Cruse</th>
                                                                    <th className="py-2.5 px-6 text-[9px] uppercase font-black tracking-widest text-foreground/30 leading-none">P1</th>
                                                                    <th className="py-2.5 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/30 leading-none text-center w-12"></th>
                                                                    <th className="py-2.5 px-6 text-[9px] uppercase font-black tracking-widest text-foreground/30 leading-none text-right">P2</th>
                                                                    <th className="py-2.5 px-8 text-[9px] uppercase font-black tracking-widest text-foreground/30 leading-none text-center w-32">Estado</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/10">
                                                                {(() => {
                                                                    const order = getSeedingOrder(bracketSize);
                                                                    const rows = [];
                                                                    for (let i = 0; i < order.length; i += 2) {
                                                                        const s1 = order[i];
                                                                        const s2 = order[i + 1];
                                                                        const p1 = finalQualifiers[s1 - 1];
                                                                        const p2 = finalQualifiers[s2 - 1];
                                                                        const matchIdx = i / 2;
                                                                        const colorSet = MATCH_COLORS[matchIdx % MATCH_COLORS.length];
                                                                        const isHovered = hoveredMatchIdx === matchIdx;

                                                                        rows.push(
                                                                            <tr
                                                                                key={matchIdx}
                                                                                onMouseEnter={() => setHoveredMatchIdx(matchIdx)}
                                                                                onMouseLeave={() => setHoveredMatchIdx(null)}
                                                                                className={`transition-all group cursor-pointer border-l-[6px] ${isHovered
                                                                                        ? `${colorSet.border} ${colorSet.bg} shadow-md`
                                                                                        : "border-transparent hover:bg-accent/30"
                                                                                    }`}
                                                                            >
                                                                                <td className="py-2 px-6 text-center">
                                                                                    <span className={`text-[10px] font-black italic tracking-widest ${isHovered ? colorSet.text : "text-foreground/60/20"}`}>
                                                                                        #{matchIdx + 1}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-2 px-6">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm transition-all ${isHovered ? "bg-white text-primary" : "bg-primary/5 text-primary border border-primary/10"}`}>
                                                                                            #{s1}
                                                                                        </div>
                                                                                        <div className="flex flex-col text-left">
                                                                                            <span className={`text-xs font-black italic uppercase tracking-tighter ${isHovered ? colorSet.text : "text-foreground"}`}>
                                                                                                {p1 ? p1.player.name : "BYE"}
                                                                                                {p1?.isByeOverride && <span className="ml-2 text-amber-500 font-bold tracking-widest">[BYE]</span>}
                                                                                            </span>
                                                                                            <span className={`text-[8px] font-black uppercase tracking-widest text-foreground/30`}>{p1 ? p1.groupName : "-"}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-2 px-4 text-center">
                                                                                    <span className="text-[9px] font-black text-foreground/60/20 italic">VS</span>
                                                                                </td>
                                                                                <td className="py-2 px-6 text-right">
                                                                                    <div className="flex items-center justify-end gap-3">
                                                                                        <div className="flex flex-col items-end text-right">
                                                                                            <span className={`text-xs font-black italic uppercase tracking-tighter ${isHovered ? colorSet.text : "text-foreground"}`}>
                                                                                                {p2 ? p2.player.name : "BYE"}
                                                                                                {p2?.isByeOverride && <span className="ml-2 text-amber-500 font-bold tracking-widest">[BYE]</span>}
                                                                                            </span>
                                                                                            <span className={`text-[8px] font-black uppercase tracking-widest text-foreground/30`}>{p2 ? p2.groupName : "-"}</span>
                                                                                        </div>
                                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm transition-all ${isHovered ? "bg-white text-primary" : "bg-primary/5 text-primary border border-primary/10"}`}>
                                                                                            #{s2}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-2 px-8 text-center whitespace-nowrap">
                                                                                    {(!p1 || !p2) ? (
                                                                                        <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-sm">
                                                                                            BYE
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className={`text-[8px] font-black uppercase ${isHovered ? "text-emerald-700 bg-emerald-500/10" : "text-blue-600/30"} px-2 py-0.5 rounded-sm transition-all`}>
                                                                                            LISTO
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    }
                                                                    return rows;
                                                                })()}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
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
                                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-900/60">Campeón del Torneo</p>
                                                        <h2 className="text-2xl font-black italic uppercase tracking-tight leading-tight truncate">{champName}</h2>
                                                        <p className="text-[11px] font-bold text-slate-900/50 mt-0.5">¡Felicidades!</p>
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
                                                <div className="w-full py-3 bg-muted border border-border rounded-2xl text-foreground/40 text-[10px] font-black uppercase tracking-widest text-center">
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
                                                className="px-4 py-2 bg-muted hover:bg-accent text-foreground/60 hover:text-white border border-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
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
                                    const roundMatches = bracket.filter(m => m.round === r).sort((a, b) => a.slot - b.slot);
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
                                                <span className="text-[10px] font-bold text-foreground/40">{roundMatches.length} partido{roundMatches.length !== 1 ? "s" : ""}</span>
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
                                                                    <span className={`text-lg font-black ml-3 shrink-0 ${isWinner1 ? "text-blue-700" : "text-foreground/40"}`}>{m.score1}</span>
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
                                                                        <div className="w-4 text-center text-foreground/30 font-black text-sm shrink-0">vs</div>
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
                                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${(m.score1 !== undefined && m.score2 !== undefined) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-muted text-foreground/60 cursor-not-allowed"}`}
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
                                                                        <div className="w-4 text-center text-foreground/30 font-black text-sm shrink-0">vs</div>
                                                                        <div className="flex-1 min-w-0 h-10 bg-background/50 border border-rose-500/20 rounded-xl flex items-center justify-center text-base font-black text-rose-700">
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
                                                                    {isBye ? "--- VACANTE ---" : m.team2 ? slotName(m.team2) : "En espera..."}
                                                                </span>
                                                                {m.confirmed && !isBye && (
                                                                    <span className={`text-lg font-black ml-3 shrink-0 ${isWinner2 ? "text-rose-700" : "text-foreground/40"}`}>{m.score2}</span>
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
                                                {bracket.filter(m => m.round === r).sort((a, b) => a.slot - b.slot).map((m) => {
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
                                                                {m.confirmed && <span className={`text-sm font-black ml-2 shrink-0 ${isWinner1 ? "text-blue-700" : "text-foreground/40"}`}>{m.score1}</span>}
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
                                                                        <span className="text-foreground/60 text-[10px] font-bold shrink-0">vs</span>
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
                                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${(m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-muted text-foreground/60 cursor-not-allowed"}`}
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
                                                                        <span className="text-foreground/60 text-[10px] font-bold shrink-0">vs</span>
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
                                                                        {isBye ? "--- VACANTE ---" : m.team2 ? slotName(m.team2) : "En espera..."}
                                                                    </span>
                                                                </div>
                                                                {m.confirmed && !isBye && <span className={`text-sm font-black ml-2 shrink-0 ${isWinner2 ? "text-rose-700" : "text-foreground/40"}`}>{m.score2}</span>}
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
            {/* Player Details Modal */}
            <AnimatePresence>
                {selectedPlayerId && selectedPlayer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPlayerId(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                            <Users2 className="w-7 h-7 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest leading-none mb-1">Campaña Fase de Grupos</p>
                                            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">{selectedPlayer.name}</h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPlayerId(null)}
                                        className="w-10 h-10 rounded-xl hover:bg-muted transition-colors flex items-center justify-center text-foreground/60 hover:text-foreground"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/60 pl-1">Partidos Disputados</h4>
                                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                        {playerGroupMatches.map(m => {
                                            const isTeam1 = m.team1.id === selectedPlayerId;
                                            const opponent = isTeam1 ? m.team2 : m.team1;
                                            const myScore = isTeam1 ? m.score1 : m.score2;
                                            const oppScore = isTeam1 ? m.score2 : m.score1;
                                            const isWinner = m.confirmed && myScore! > oppScore!;

                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`p-4 rounded-2xl border transition-all ${m.confirmed
                                                            ? isWinner
                                                                ? "bg-emerald-500/5 border-emerald-500/20"
                                                                : "bg-rose-500/5 border-rose-500/20"
                                                            : "bg-muted/10 border-border"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[8px] font-black uppercase text-foreground/60">Oponente</span>
                                                                {m.confirmed && (
                                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isWinner ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                        {isWinner ? "Victoria" : "Derrota"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="font-bold text-foreground text-sm truncate uppercase italic tracking-tight">{opponent.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border ${isWinner ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-600'}`}>
                                                                {myScore ?? "-"}
                                                            </div>
                                                            <span className="text-[10px] font-black text-foreground/60 uppercase">vs</span>
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border bg-muted border-border text-foreground/60`}>
                                                                {oppScore ?? "-"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {playerGroupMatches.length === 0 && (
                                            <div className="py-12 text-center text-foreground/60 italic text-sm">
                                                No se encontraron partidos para este jugador.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedPlayerId(null)}
                                    className="w-full py-4 bg-muted hover:bg-accent text-foreground font-black uppercase tracking-widest italic rounded-2xl transition-all"
                                >
                                    Cerrar Detalles
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            <p className="text-foreground/60 text-sm font-bold mb-8">
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

            {/* ─── Player Replacement Modal ─── */}
            <AnimatePresence>
                {isReplacingPlayer !== null && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                            onClick={() => setIsReplacingPlayer(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            <div className="p-10 pb-6 shrink-0">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-foreground leading-none">Sustitución</h3>
                                        <p className="text-[10px] text-foreground/60 uppercase font-black tracking-[0.2em] mt-3">Reemplazar Sembrado #{isReplacingPlayer}</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsReplacingPlayer(null)}
                                        className="rounded-full h-12 w-12 flex items-center justify-center hover:bg-muted text-foreground/50 hover:text-foreground transition-all"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* ─── Search Bar & Actions ─── */}
                                <div className="mb-6 flex items-center gap-4">
                                    <div className="relative flex-1 group">
                                        <input 
                                            type="text"
                                            placeholder="BUSCAR JUGADOR POR NOMBRE..."
                                            value={playerSearchQuery}
                                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                            className="w-full bg-muted/30 border-2 border-border/50 rounded-2xl h-14 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest text-foreground placeholder:text-foreground/60/30 focus:outline-none focus:border-primary/50 focus:bg-card transition-all"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60/40 group-focus-within:text-primary/50 transition-colors">
                                            <Users2 className="h-5 w-5" />
                                        </div>
                                        {playerSearchQuery && (
                                            <button 
                                                onClick={() => setPlayerSearchQuery("")}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/60/40 hover:text-foreground transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => {
                                            setQualifierOverrides(prev => ({
                                                ...prev,
                                                [isReplacingPlayer!]: "BYE"
                                            }));
                                            setIsReplacingPlayer(null);
                                            toast.success(`BYE asignado a la semilla #${isReplacingPlayer}`);
                                        }}
                                        className="h-14 px-8 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 border-2 border-amber-400/20 whitespace-nowrap"
                                    >
                                        <X className="h-4 w-4" />
                                        ASIGNAR BYE
                                    </button>
                                </div>

                                <div className="overflow-y-auto pr-2 -mr-2 custom-scrollbar flex-1 min-h-[350px] max-h-[60vh]">
                                    <div className="bg-muted/10 border border-border rounded-2xl overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-muted/50 border-b border-border">
                                                    <th className="py-3 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/60 leading-none">Jugador</th>
                                                    <th className="py-3 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/60 leading-none">Grupo</th>
                                                    <th className="py-3 px-4 text-[9px] uppercase font-black tracking-widest text-foreground/60 leading-none text-center">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {groups.flatMap(g => g.players)
                                                    .filter(player => 
                                                        player.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) || 
                                                        (player as any).email?.toLowerCase().includes(playerSearchQuery.toLowerCase())
                                                    )
                                                    .sort((a,b) => a.name.localeCompare(b.name)).map(player => {
                                                    const isAlreadyQual = finalQualifiers.some(q => q.playerId === player.id);
                                                    const isBeingReplaced = finalQualifiers[isReplacingPlayer - 1]?.playerId === player.id;
                                                    const group = groups.find(g => g.players.some(p => p.id === player.id));

                                                    return (
                                                        <tr 
                                                            key={player.id}
                                                            onClick={() => {
                                                                setQualifierOverrides(prev => ({
                                                                    ...prev,
                                                                    [isReplacingPlayer]: player
                                                                }));
                                                                setIsReplacingPlayer(null);
                                                                toast.success(`Jugador reemplazado por ${player.name}`);
                                                            }}
                                                            className={`group transition-all cursor-pointer ${
                                                                isBeingReplaced 
                                                                    ? "bg-primary/10" 
                                                                    : "hover:bg-accent"
                                                            }`}
                                                        >
                                                            <td className="py-1 px-4">
                                                                <span className="font-bold text-[11px] uppercase italic tracking-tight text-foreground truncate max-w-[150px] inline-block">{player.name}</span>
                                                            </td>
                                                            <td className="py-1 px-4">
                                                                <span className="text-[9px] font-black text-foreground/60 uppercase opacity-50 whitespace-nowrap">{group?.name || "-"}</span>
                                                            </td>
                                                            <td className="py-1 px-4 text-center">
                                                                {isBeingReplaced ? (
                                                                    <div className="flex justify-center">
                                                                        <Check className="h-3.5 w-3.5 text-primary" />
                                                                    </div>
                                                                ) : isAlreadyQual ? (
                                                                    <span className="text-[7px] font-black italic text-foreground/60/30 uppercase tracking-widest">OK</span>
                                                                ) : (
                                                                    <span className="text-[7px] font-black italic text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100">SEL.</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="p-10 pt-4 shrink-0 bg-muted/20 border-t border-border">
                                <button 
                                    onClick={() => setIsReplacingPlayer(null)}
                                    className="w-full h-16 rounded-[1.2rem] font-black uppercase tracking-[0.2em] text-[10px] border-2 border-border hover:bg-accent transition-all active:scale-95"
                                >
                                    Cancelar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
