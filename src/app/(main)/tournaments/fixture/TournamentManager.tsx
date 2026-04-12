"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings, Settings2,
    BarChart3, Check, X, RefreshCw, Dice5, Info, Pencil, RotateCcw,
    UserCheck, CreditCard, Search, Plus, Share2, Minus
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

type Player = { id: string; name: string; category?: string; club?: string; ranking?: number };
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
    const [step, setStep] = useState<"setup" | "done" | "qual" | "elim">(
        initialStatus === "setup" ? "setup" :
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

    const allPlayers = useMemo(() => initialGroups.flatMap(g => g.players), [initialGroups]);
    const [present, setPresent] = useState<Set<string>>(new Set(allPlayers.map(p => p.id)));
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

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

                if (s1 > s2) {
                    p1.won++;
                    p2.lost++;
                } else if (s2 > s1) {
                    p2.won++;
                    p1.lost++;
                }
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
        <div className="min-h-screen bg-background pb-20">
            {/* UNIFIED HEADER */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 transition-all">
                <div className="w-full px-4 md:px-8 lg:px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => {
                                if (step === "elim") setStep("qual");
                                else if (step === "qual") setStep("done");
                                else if (step === "done") setStep("setup");
                                else router.push("/admin/tournaments");
                            }}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Volver
                        </button>

                        <div className="h-8 w-[1px] bg-border/50 hidden md:block" />

                        <div className="hidden md:flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/60 leading-none mb-1">Torneo</span>
                            <span className="text-xs font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[150px] lg:max-w-[250px]">
                                {tournamentName}
                            </span>
                        </div>

                        <div className="h-8 w-[1px] bg-border/50 hidden md:block" />

                        {/* Navigation Stepper */}
                        <div className="hidden md:flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
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
            <div className="w-full px-4 md:px-8 lg:px-12 py-8 pb-32">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-[-0.05em] italic uppercase leading-[0.9]">
                        {tournamentName}
                    </h1>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        Gestión de Torneo Round Robin
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === "setup" && (
                        <motion.div
                            key="setup-stage"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-12 pb-20"
                        >
                            <div className="w-full space-y-8">
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
                                                const allIds = allPlayers.map(p => p.id);
                                                setPaid(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                            }}
                                            className="flex-1 md:flex-none px-6 py-4 bg-blue-500/10 text-blue-500 rounded-2xl font-black uppercase text-[9px] tracking-widest border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/5"
                                        >
                                            Todo Pago
                                        </button>
                                        <button
                                            onClick={() => {
                                                const allIds = allPlayers.map(p => p.id);
                                                setPresent(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                            }}
                                            className="flex-1 md:flex-none px-6 py-4 bg-emerald-500/10 text-emerald-500 rounded-2xl font-black uppercase text-[9px] tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
                                        >
                                            Todo Ok
                                        </button>
                                    </div>
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
                                            {allPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => {
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
                            key="groups-stage"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-12"
                        >
                            {/* Progress Bar */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-foreground/70">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {groups.map((g: any) => {
                                    const standings = computeStandings(g.id);
                                    const groupMatches = matches.filter(m => m.groupId === g.id);
                                    return (
                                        <motion.div
                                            key={g.id}
                                            className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-fit transition-all hover:shadow-blue-500/5 group"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            {/* Header + Standings table */}
                                            <div className="bg-muted px-8 py-6 border-b border-border/50 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-700 leading-none">{g.name}</h3>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mt-1">Clasificación en tiempo real</p>
                                                </div>
                                                <Users2 className="w-6 h-6 text-foreground/10 group-hover:text-blue-600/20 transition-colors" />
                                            </div>

                                            <div className="px-6 py-4 border-b border-border/30 bg-card/20">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-[9px] uppercase font-black tracking-widest text-foreground/40 border-b border-border/50">
                                                            <th className="pb-3 pr-3 italic">Pos</th>
                                                            <th className="pb-3 px-2">Jugador / Pareja</th>
                                                            <th className="pb-3 px-2 text-center">PJ</th>
                                                            <th className="pb-3 px-2 text-center">PG</th>
                                                            <th className="pb-3 px-2 text-center">+/-</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/20">
                                                        {standings.map((s: any, idx: number) => (
                                                            <tr key={s.playerId} className="hover:bg-blue-600/5 transition-colors group/row">
                                                                <td className="py-4 pr-3 text-xs font-black italic text-foreground/20 group-hover/row:text-blue-600/50">#{idx + 1}</td>
                                                                <td className="py-4 px-2 font-black text-sm tracking-tight text-foreground uppercase truncate max-w-[140px] italic">{s.player.name}</td>
                                                                <td className="py-4 px-2 text-center text-[10px] font-black tabular-nums text-foreground/40">{s.matchesPlayed}</td>
                                                                <td className="py-4 px-2 text-center text-sm font-black tabular-nums text-emerald-500">{s.won}</td>
                                                                <td className="py-4 px-2 text-center text-sm font-black tabular-nums text-blue-600 font-mono">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Matches list */}
                                            <div className="flex-1 flex flex-col min-h-0 bg-muted/10">
                                                <div className="px-8 py-3 bg-muted/30 border-b border-border/10 flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Programación de Encuentros</p>
                                                    <div className="flex gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600/30" />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-600/30" />
                                                    </div>
                                                </div>
                                                <div className="p-4 overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <tbody className="divide-y divide-border/20">
                                                            {groupMatches.map(m => (
                                                                <tr
                                                                    key={m.id}
                                                                    className={`group/row transition-all ${m.confirmed ? "opacity-60 bg-emerald-500/[0.01]" : ""}`}
                                                                >
                                                                    <td className="py-4 px-2">
                                                                        <span className={`text-[11px] font-black uppercase italic transition-colors ${m.confirmed && m.score1! > m.score2! ? "text-blue-600" : "text-foreground/60"}`}>
                                                                            {m.team1.name}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-2">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            {!m.confirmed && !readOnly ? (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <input
                                                                                        type="number"
                                                                                        value={m.score1 ?? ""}
                                                                                        onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                                        className="w-10 h-8 bg-background border border-border rounded-lg text-center font-black text-xs outline-none focus:border-blue-500"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <span className="text-[10px] font-black text-foreground/20 italic">VS</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={m.score2 ?? ""}
                                                                                        onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                                        className="w-10 h-8 bg-background border border-border rounded-lg text-center font-black text-xs outline-none focus:border-blue-500"
                                                                                        placeholder="0"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 font-black text-xs tabular-nums italic">
                                                                                    <span className={m.score1! > m.score2! ? "text-blue-600" : ""}>{m.score1}</span>
                                                                                    <span className="text-foreground/20">-</span>
                                                                                    <span className={m.score2! > m.score1! ? "text-blue-600" : ""}>{m.score2}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-2">
                                                                        <span className={`text-[11px] font-black uppercase italic transition-colors text-right block ${m.confirmed && m.score2! > m.score1! ? "text-blue-600" : "text-foreground/60"}`}>
                                                                            {m.team2.name}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-2 text-right">
                                                                        {!readOnly && (
                                                                            m.confirmed ? (
                                                                                <button
                                                                                    onClick={() => handleEditScore(m.id)}
                                                                                    className="p-2 text-foreground/20 hover:text-amber-500 transition-colors"
                                                                                >
                                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleConfirmScore(m.id)}
                                                                                    disabled={m.score1 === undefined || m.score2 === undefined || m.score1 === m.score2 || saving}
                                                                                    className={`p-2 rounded-lg transition-all ${m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2 ? "text-blue-600 hover:bg-blue-600 hover:text-white" : "text-foreground/10"}`}
                                                                                >
                                                                                    <Check className="w-4 h-4" />
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* ActionBar / Tournament finalization action */}
                            {!readOnly && (
                                <div className="p-6 md:p-8 bg-blue-600/5 border border-blue-600/20 rounded-[2.5rem] w-full relative overflow-hidden shadow-2xl shadow-blue-500/5 mt-12">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.3)]" />

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                            <div className="space-y-1">
                                                <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-foreground whitespace-nowrap leading-none text-left">Fase de Grupos</h2>
                                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest pl-1 text-left">Configuración de avance</p>
                                            </div>

                                            <div className="h-10 w-px bg-border/50 hidden sm:block" />

                                            <div className="flex items-center gap-4">
                                                <div className="px-4 py-2 md:px-5 md:py-3 bg-muted/40 rounded-3xl border border-border/50 flex items-center gap-4 md:gap-6 shadow-inner">
                                                    <div className="flex flex-col items-start leading-none gap-0.5">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 text-left">Clasifican</p>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-blue-600 italic">por grupo</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 md:gap-4">
                                                        <button
                                                            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-card border border-border flex items-center justify-center text-lg text-foreground hover:bg-muted transition-all active:scale-90 disabled:opacity-20 shadow-sm"
                                                            onClick={() => setQualPerGroup(q => Math.max(1, q - 1))}
                                                            disabled={qualPerGroup <= 1}
                                                        >
                                                            −
                                                        </button>
                                                        <span className="text-xl md:text-2xl font-black text-foreground w-6 md:w-8 text-center tabular-nums drop-shadow-sm">{qualPerGroup}</span>
                                                        <button
                                                            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-card border border-border flex items-center justify-center text-lg text-foreground hover:bg-muted transition-all active:scale-90 disabled:opacity-20 shadow-sm"
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
                                                    <div className="hidden lg:flex flex-col items-start leading-tight border-l border-border/30 pl-4 md:pl-6">
                                                        <span className="text-[9px] font-black text-foreground/60 uppercase opacity-60 tracking-widest mb-0.5">Máx. Cupo</span>
                                                        <span className="text-xs font-black text-foreground uppercase tracking-tight italic">
                                                            {Math.min(...groups.map(g => g.players.length))} / GRUPO
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setStep("qual")}
                                            disabled={!isGroupStageFinished}
                                            className={`w-full md:w-auto px-8 py-4 lg:px-12 lg:py-5 font-black uppercase tracking-widest italic rounded-2xl shadow-2xl transition-all hover:scale-[1.03] active:scale-95 text-base lg:text-lg whitespace-nowrap ${isGroupStageFinished
                                                ? "bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30"
                                                : "bg-muted text-foreground/20 cursor-not-allowed border border-border shadow-none"
                                                }`}
                                        >
                                            {isGroupStageFinished ? (
                                                <span className="flex items-center justify-center gap-3">
                                                    Ver Clasificados
                                                    <ChevronRight className="w-5 h-5" />
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
                            className="space-y-12 pb-20"
                        >
                            <div className="w-full">
                                <div className="text-center mb-16">
                                    <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter uppercase italic mb-3">Ranking de Clasificados</h2>
                                    <p className="text-blue-600 text-xs font-black uppercase tracking-[0.3em]">Cálculo de Mérito Técnico y Sembrado</p>
                                </div>

                                {/* Unified Action Bar (Config + Generate) */}
                                <div className="mb-12 p-6 md:p-8 bg-blue-600/5 border border-blue-600/20 rounded-[2.5rem] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 backdrop-blur-xl shadow-2xl shadow-blue-500/5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.3)]" />

                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                                                <Settings2 className="w-7 h-7" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 leading-none mb-1">Configuración de Avance</span>
                                                <h3 className="text-xl font-black italic uppercase tracking-tight text-foreground">Clasificados por Grupo</h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 bg-card border border-border/50 p-2 rounded-3xl shadow-inner">
                                            <button
                                                className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-2xl text-foreground hover:bg-muted transition-all active:scale-90 disabled:opacity-20 shadow-sm"
                                                onClick={() => setQualPerGroup(q => Math.max(1, q - 1))}
                                                disabled={qualPerGroup <= 1}
                                            >
                                                −
                                            </button>
                                            <span className="text-3xl font-black text-foreground min-w-[3rem] text-center tabular-nums italic drop-shadow-sm">{qualPerGroup}</span>
                                            <button
                                                className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-2xl text-foreground hover:bg-muted transition-all active:scale-90 disabled:opacity-20 shadow-sm"
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

                                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 lg:ml-auto">
                                        {!isGroupStageFinished && (
                                            <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                                <p className="text-[10px] font-black uppercase text-amber-600 leading-tight">Falta cargar resultados<br />en la fase de grupos</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={generateBracket}
                                            disabled={saving || !isGroupStageFinished}
                                            className={`flex-1 md:flex-none px-10 py-5 font-black uppercase tracking-widest italic rounded-2xl shadow-2xl transition-all hover:scale-[1.03] active:scale-95 text-lg whitespace-nowrap flex items-center justify-center gap-4 ${isGroupStageFinished
                                                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30"
                                                : "bg-muted text-foreground/20 cursor-not-allowed border border-border shadow-none"
                                                }`}
                                        >
                                            {saving ? (
                                                <>
                                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                                    CONFIGURANDO...
                                                </>
                                            ) : (
                                                <>
                                                    <Swords className="w-6 h-6" />
                                                    GENERAR ELIMINATORIAS
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {(() => {
                                    const totalQuals = sortedQualifiers.length;
                                    const bracketSize = totalQuals > 0 ? Math.pow(2, Math.ceil(Math.log2(totalQuals))) : 0;
                                    const numByes = bracketSize - totalQuals;

                                    return (
                                        <div className="space-y-16">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                                                {/* --- Rankings Tablas (Columna 1 y 2) --- */}
                                                <div className="space-y-8">
                                                    {Array.from({ length: Math.min(qualPerGroup, 2) }).map((_, rankIdx) => {
                                                        const rank = rankIdx + 1;
                                                        const playersInRank = finalQualifiers.filter(q => q.groupRank === rank);
                                                        if (playersInRank.length === 0) return null;

                                                        return (
                                                            <div key={rank} className="space-y-4">
                                                                <div className="flex items-center gap-4 px-2">
                                                                    <div className={`px-4 py-1.5 rounded-full flex items-center justify-center text-white text-[10px] font-black italic tracking-widest shadow-lg ${rank === 1 ? "bg-amber-500 shadow-amber-500/20" : "bg-slate-500 shadow-slate-500/20"}`}>
                                                                        {rank === 1 ? "PRIMEROS" : "SEGUNDOS"}
                                                                    </div>
                                                                    <div className="h-px flex-1 bg-border/50" />
                                                                </div>

                                                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden shadow-2xl">
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-left border-collapse">
                                                                            <thead>
                                                                                <tr className="bg-muted/30 border-b border-border/50">
                                                                                    <th className="py-4 px-6 text-[9px] uppercase font-black tracking-widest text-foreground/40">Seed</th>
                                                                                    <th className="py-4 px-6 text-[9px] uppercase font-black tracking-widest text-foreground/40">Pts</th>
                                                                                    <th className="py-4 px-6 text-[9px] uppercase font-black tracking-widest text-foreground/40">Jugador / Pareja</th>
                                                                                    <th className="py-4 px-6 text-[9px] uppercase font-black tracking-widest text-foreground/40 text-right">Origen</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-border/20">
                                                                                {playersInRank.map((q) => {
                                                                                    const seed = finalQualifiers.indexOf(q) + 1;
                                                                                    const hasBye = seed <= numByes;
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
                                                                                            className={`transition-all group cursor-pointer border-l-[6px] ${isHovered
                                                                                                ? `${colorSet.border} ${colorSet.bg}`
                                                                                                : "border-transparent hover:bg-blue-600/5"
                                                                                                }`}
                                                                                        >
                                                                                            <td className="py-4 px-6">
                                                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black tabular-nums transition-all ${isHovered ? "bg-white text-blue-600 shadow-lg" : "bg-blue-600/10 text-blue-600"}`}>
                                                                                                    #{seed}
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="py-4 px-6">
                                                                                                <span className={`text-sm font-black italic tracking-tighter ${q.points >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                                                                    {q.points > 0 ? "+" : ""}{q.points}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="py-4 px-6">
                                                                                                <div className="flex flex-col">
                                                                                                    <span className={`text-sm font-black italic uppercase tracking-tight ${q.isByeOverride ? "text-amber-600" : "text-foreground"}`}>
                                                                                                        {q.player.name}
                                                                                                    </span>
                                                                                                    <div className="flex gap-2 mt-1">
                                                                                                        {q.isOverride && (
                                                                                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">REACCIÓN</span>
                                                                                                        )}
                                                                                                        {hasBye && !q.isByeOverride && (
                                                                                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">Pass Directo</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="py-4 px-6 text-right">
                                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30 italic">{q.groupName}</span>
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
                                                    })}
                                                </div>

                                                {/* --- Seed Preview Bracket (Columna 2) --- */}
                                                <div className="sticky top-12 space-y-8">
                                                    <div className="flex items-center gap-4 px-2">
                                                        <div className="px-4 py-1.5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black italic tracking-widest shadow-lg shadow-blue-600/20">
                                                            PREVISIÓN DE CRUCES
                                                        </div>
                                                        <div className="h-px flex-1 bg-border/50" />
                                                    </div>

                                                    <div className="bg-card/60 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                            <Trophy className="w-32 h-32 text-foreground" />
                                                        </div>

                                                        <div className="relative overflow-x-auto">
                                                            <table className="w-full text-left">
                                                                <tbody className="divide-y divide-border/20">
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
                                                                                    className={`transition-all group/match cursor-pointer border-l-8 ${isHovered
                                                                                        ? `${colorSet.border} ${colorSet.bg} shadow-lg scale-[1.02] z-10 relative`
                                                                                        : "border-transparent hover:bg-blue-600/5"
                                                                                        }`}
                                                                                >
                                                                                    <td className="py-6 px-4">
                                                                                        <div className="flex items-center gap-1.5 opacity-40">
                                                                                            <span className="text-[10px] font-black uppercase italic tracking-tighter">M</span>
                                                                                            <span className="text-sm font-black italic tabular-nums">#{matchIdx + 1}</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-6 px-4">
                                                                                        <div className="flex items-center gap-4">
                                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${isHovered ? "bg-white text-blue-600 shadow-md" : "bg-blue-600/10 text-blue-600"}`}>
                                                                                                #{s1}
                                                                                            </div>
                                                                                            <span className={`text-xs font-black italic uppercase tracking-tighter truncate ${isHovered ? "text-foreground" : "text-foreground/60"}`}>
                                                                                                {p1 ? p1.player.name : "BYE"}
                                                                                            </span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-6 px-2 text-center">
                                                                                        <span className="text-[10px] font-black text-foreground/20 italic">VS</span>
                                                                                    </td>
                                                                                    <td className="py-6 px-4">
                                                                                        <div className="flex items-center justify-end gap-4">
                                                                                            <span className={`text-xs font-black italic uppercase tracking-tighter truncate text-right ${isHovered ? "text-foreground" : "text-foreground/60"}`}>
                                                                                                {p2 ? p2.player.name : "BYE"}
                                                                                            </span>
                                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${isHovered ? "bg-white text-blue-600 shadow-md" : "bg-blue-600/10 text-blue-600"}`}>
                                                                                                #{s2}
                                                                                            </div>
                                                                                        </div>
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
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    )}

                    {step === "elim" && (
                        <motion.div
                            key="elim-stage"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-12 pb-32"
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
                                    {!readOnly && (
                                        <button onClick={() => setStep("qual")} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                                            Volver al Ranking
                                        </button>
                                    )}
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
                                            {roundsArr.map((round, rIdx) => (
                                                <div key={round} className="flex flex-col gap-12">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <span className="px-6 py-2 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                                                            {round === 0 ? "🏆 Gran Final" : round === 1 ? "Semifinales" : `Ronda ${roundsArr.length - rIdx}`}
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
                                                                        {[m.team1, m.team2].map((team, idx) => {
                                                                            const isW = (m.confirmed && m.winnerId && team && team !== "BYE" && (team as Player).id === m.winnerId);
                                                                            return (
                                                                                <div key={idx} className="flex items-center justify-between gap-4">
                                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                                        <div className={`w-1.5 h-8 rounded-full ${isW ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-border/30"}`} />
                                                                                        <span className={`text-xs font-black uppercase truncate ${isW ? "text-emerald-500" :
                                                                                            team === "BYE" ? "text-foreground/20 italic" : "text-foreground/60"
                                                                                            }`}>
                                                                                            {slotName(team)}
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
                                                                            );
                                                                        })}
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
                                                                                    onClick={() => handleBracketEdit(m.id)}
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
                                                        if (finalMatch?.confirmed && finalMatch.winnerId) {
                                                            const winnerSlot = [finalMatch.team1, finalMatch.team2].find(t => t && t !== "BYE" && (t as Player).id === finalMatch.winnerId) as Player;
                                                            return (
                                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 relative z-10">
                                                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-amber-500">Victoria Final</p>
                                                                    <h3 className="text-4xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                                                                        {winnerSlot?.name || finalMatch.winnerName}
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
                                            const winnerSlot = [finalMatch.team1, finalMatch.team2].find(t => t && t !== "BYE" && (t as Player).id === finalMatch.winnerId) as Player;
                                            const champName = winnerSlot?.name || finalMatch.winnerName || "Campeón";
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
                                                                    groups,
                                                                    matches,
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
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors">
                                            <Users2 className="h-5 w-5" />
                                        </div>
                                        {playerSearchQuery && (
                                            <button
                                                onClick={() => setPlayerSearchQuery("")}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
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
                                                    .sort((a, b) => a.name.localeCompare(b.name)).map(player => {
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
                                                                className={`group transition-all cursor-pointer ${isBeingReplaced
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
                                                                        <span className="text-[7px] font-black italic text-foreground/30 uppercase tracking-widest">OK</span>
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
