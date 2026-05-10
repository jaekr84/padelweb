"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight, AlertTriangle,
    ArrowLeft, LayoutDashboard, Settings, Trash2,
    BarChart3, Check, X, RefreshCw, Dice5, Info, Pencil, RotateCcw,
    UserCheck, CreditCard, Search, Plus, Share2, Minus, Zap, MapPin, Circle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveTournamentFixture } from "./actions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getAllPlayers } from "@/app/actions/players";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/Dialog";


export interface TournamentManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent?: string[];
    readOnly?: boolean;
    isLoggedIn?: boolean;
    modality?: any;
}

type Player = { id: string; name: string; category?: string | null; club?: string | null; ranking?: number | null; player1?: string; player2?: string };
type Group = { id: string; name: string; players: Player[]; courtNumber?: string | null };

type Match = {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    score1?: number;
    score2?: number;
    played: boolean;
    confirmed: boolean;
    status?: string;
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
    status?: string;
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
    { bg: "bg-azul-primary/15", border: "border-azul-primary", text: "text-azul-primary" },
    { bg: "bg-celeste/15", border: "border-celeste", text: "text-celeste-dark" },
    { bg: "bg-amber-600/20", border: "border-amber-600", text: "text-amber-700" },
    { bg: "bg-rojo/15", border: "border-rojo", text: "text-rojo" },
    { bg: "bg-violet-600/15", border: "border-violet-600", text: "text-violet-700" },
    { bg: "bg-orange-600/20", border: "border-orange-600", text: "text-orange-700" },
    { bg: "bg-cyan-600/15", border: "border-cyan-600", text: "text-cyan-700" },
    { bg: "bg-fuchsia-600/15", border: "border-fuchsia-600", text: "text-fuchsia-700" },
    { bg: "bg-lime-600/20", border: "border-lime-600", text: "text-lime-700" },
    { bg: "bg-azul-dark/15", border: "border-azul-dark", text: "text-azul-dark" },
];

export default function TournamentManager({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus,
    initialPresent = [],
    readOnly = false,
    isLoggedIn = true,
    modality
}: TournamentManagerProps) {
    const isIndividual = modality?.participacion === "individual" || modality?.isIndividual || false;
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"dashboard" | "groups" | "bracket">("dashboard");
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [isPlayersModalOpen, setIsPlayersModalOpen] = useState(false);
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'danger' | 'primary';
    }>({
        open: false,
        title: "",
        description: "",
        onConfirm: () => { },
    });
    const [matches, setMatches] = useState<Match[]>(() =>
        initialMatches.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0
        }))
    );
    const [bracket, setBracket] = useState<BracketMatch[]>(() =>
        initialBracket.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0
        }))
    );
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

    // Player replacement/deletion state
    const [replacingPlayer, setReplacingPlayer] = useState<Player | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<Player[]>([]);

    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestName2, setGuestName2] = useState("");
    const [replaceSlot, setReplaceSlot] = useState<1 | 2>(1);


    const allPlayers = useMemo(() => {
        const playersMap = new Map<string, Player>();
        groups.forEach(g => {
            g.players.forEach(p => {
                playersMap.set(p.id, p);
            });
        });
        return Array.from(playersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [groups]);
    const registeredPlayerNames = useMemo(() => {
        return allPlayers.flatMap(p => p.name.split(/[\/\+]/).map(n => n.trim().toLowerCase()));
    }, [allPlayers]);
    const registeredPlayerIds = useMemo(() => new Set(allPlayers.map(p => p.id)), [allPlayers]);

    const [present, setPresent] = useState<Set<string>>(new Set(initialPresent));
    const [searchQuery, setSearchQuery] = useState("");

    const togglePresent = (id: string) => {
        const isRemoving = present.has(id);

        if (isRemoving) {
            const player = groups.flatMap(g => g.players).find(p => p.id === id);
            const name = player?.name || "este jugador";

            setConfirmModal({
                open: true,
                title: "Quitar Presencia",
                description: `¿Estás seguro de que deseas quitar la presencia a ${name}? Esto podría afectar la disponibilidad de sus partidos.`,
                variant: 'danger',
                onConfirm: () => {
                    setPresent(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    setConfirmModal(prev => ({ ...prev, open: false }));
                }
            });
            return;
        }

        // Marcar como presente es instantáneo
        setPresent(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    const handleReopenMatch = async (id: string) => {
        setConfirmModal({
            open: true,
            title: "Reabrir Partido",
            description: "¿Estás seguro de que deseas reabrir este partido? Se quitará el estado de finalizado y podrás volver a iniciarlo o editar los puntos.",
            variant: 'primary',
            onConfirm: async () => {
                try {
                    // Actualización local inmediata
                    setMatches(prev => prev.map(m =>
                        m.id === id ? { ...m, status: 'pending', confirmed: false } : m
                    ));

                    // Persistencia en servidor (reutilizando lógica de guardado si existe o notificando)
                    // Nota: Aquí llamaríamos a una acción específica si existiera, 
                    // por ahora aseguramos el estado local y el toast.

                    setConfirmModal(prev => ({ ...prev, open: false }));
                    toast.success("Partido reabierto correctamente");
                } catch (error) {
                    toast.error("Error al reabrir el partido");
                }
            }
        });
    };

    const togglePaid = (id: string) => {
        setPaid(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };


    const filteredPlayers = useMemo(() => {
        if (!playerSearchQuery) return allPlayers;
        return allPlayers.filter(p =>
            p.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
        );
    }, [allPlayers, playerSearchQuery]);

    const selectedPlayer = useMemo(() => {
        if (!selectedPlayerId) return null;
        return groups.flatMap(g => g.players).find(p => p.id === selectedPlayerId);
    }, [selectedPlayerId, groups]);

    const playerGroupMatches = useMemo(() => {
        if (!selectedPlayerId) return [];
        return matches.filter(m => m.team1.id === selectedPlayerId || m.team2.id === selectedPlayerId);
    }, [selectedPlayerId, matches]);

    const fetchPlayers = useCallback(async () => {
        setIsFetchLoading(true);
        const players = await getAllPlayers();
        setAllPotentialPlayers(players);
        setIsFetchLoading(false);
    }, []);

    useEffect(() => {
        if (replacingPlayer) {
            fetchPlayers();
            // Sync guest names with current pair members
            const names = replacingPlayer.name.split("/").map(n => n.trim());
            setGuestName(names[0] || "");
            setGuestName2(names[1] || "");
            setPlayerSearchQuery("");
        }
    }, [replacingPlayer, fetchPlayers]);

    const handleReplacePlayer = async (oldPlayerId: string, newPlayer: Player) => {
        const updatedGroups = groups.map(group => ({
            ...group,
            players: group.players.map(p => p.id === oldPlayerId ? { ...newPlayer } : p)
        }));

        const updatedMatches = matches.map(m => ({
            ...m,
            team1: m.team1.id === oldPlayerId ? { ...newPlayer } : m.team1,
            team2: m.team2.id === oldPlayerId ? { ...newPlayer } : m.team2,
        }));

        const updatedBracket = bracket.map(bm => ({
            ...bm,
            team1: (bm.team1 && typeof bm.team1 !== "string" && (bm.team1 as Player).id === oldPlayerId) ? { ...newPlayer } as BracketSlot : bm.team1,
            team2: (bm.team2 && typeof bm.team2 !== "string" && (bm.team2 as Player).id === oldPlayerId) ? { ...newPlayer } as BracketSlot : bm.team2,
        }));

        setGroups(updatedGroups);
        setMatches(updatedMatches);
        setBracket(updatedBracket);

        // Update attendance/paid sets
        setPresent(prev => {
            const next = new Set(prev);
            if (next.has(oldPlayerId)) {
                next.delete(oldPlayerId);
                next.add(newPlayer.id);
            }
            return next;
        });
        setPaid(prev => {
            const next = new Set(prev);
            if (next.has(oldPlayerId)) {
                next.delete(oldPlayerId);
                next.add(newPlayer.id);
            }
            return next;
        });

        setReplacingPlayer(null);
        setGuestName("");
        setGuestName2("");
        setReplaceSlot(1);

        // Auto-save if we are already in the tournament flow
        if (step !== "setup") {
            const loadingToast = toast.loading("Actualizando participantes...");
            try {
                const res = await saveTournamentFixture({
                    tournamentId,
                    phase: step === "elim" ? "eliminatorias" : "grupos",
                    groups: updatedGroups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                    matches: updatedMatches,
                    bracket: updatedBracket,
                    presentPlayerIds: Array.from(present)
                });
                toast.dismiss(loadingToast);
                if (res.ok) {
                    toast.success("Participante reemplazado y cambios guardados");
                } else {
                    toast.error("Error al guardar cambios: " + res.error);
                }
            } catch (err) {
                toast.dismiss(loadingToast);
                console.error(err);
                toast.error("Error al guardar cambios en el servidor");
            }
        } else {
            toast.success("Participante reemplazado");
        }
    };

    const handleReplaceOneInPair = async (oldPlayer: Player, newPlayerName: string, slot: 1 | 2) => {
        const names = oldPlayer.name.split("/").map(n => n.trim());
        let p1 = names[0] || oldPlayer.player1 || "Jugador 1";
        let p2 = names[1] || oldPlayer.player2 || "Jugador 2";

        if (slot === 1) p1 = newPlayerName;
        else p2 = newPlayerName;

        const updatedPlayer: Player = {
            ...oldPlayer,
            name: `${p1} / ${p2}`,
            player1: p1,
            player2: p2,
        };

        await handleReplacePlayer(oldPlayer.id, updatedPlayer);
    };

    const handleReplaceWithGuest = async (oldPlayerId: string) => {
        if (!isIndividual) {
            const oldPlayer = groups.flatMap(g => g.players).find(p => p.id === oldPlayerId);
            if (!oldPlayer) return;

            const names = oldPlayer.name.split("/").map(n => n.trim());
            let g1 = guestName.trim() || names[0] || "Jugador 1";
            let g2 = guestName2.trim() || names[1] || "Jugador 2";

            const guestPlayer: Player = {
                id: oldPlayerId, // Keep same ID for the registration entry
                name: `${g1} / ${g2}`,
                player1: g1,
                player2: g2,
                category: oldPlayer.category
            };
            await handleReplacePlayer(oldPlayerId, guestPlayer);
            return;
        }

        if (!guestName.trim()) {
            toast.error("Ingresá un nombre para el invitado");
            return;
        }
        const guestPlayer: Player = {
            id: `guest_${crypto.randomUUID()}`,
            name: guestName.trim() + " (Inv)",
            category: "D"
        };
        await handleReplacePlayer(oldPlayerId, guestPlayer);
    };

    const handleDeletePlayer = (playerId: string) => {
        setGroups(prevGroups => prevGroups.map(group => ({
            ...group,
            players: group.players.filter(p => p.id !== playerId)
        })));

        // Remove from matches too
        setMatches(prevMatches => prevMatches.filter(m =>
            m.team1.id !== playerId && m.team2.id !== playerId
        ));

        // Cleanup attendance/paid sets
        setPresent(prev => {
            const next = new Set(prev);
            next.delete(playerId);
            return next;
        });
        setPaid(prev => {
            const next = new Set(prev);
            next.delete(playerId);
            return next;
        });

        setPlayerToDelete(null);
        toast.success("Participante eliminado");
    };




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

    useEffect(() => {
        setGroups(initialGroups);
        setMatches(initialMatches);
        setBracket(initialBracket);
    }, [initialGroups, initialMatches, initialBracket]);

    // ─── AUTO-SYNC BRACKET EFFECT ───
    useEffect(() => {
        if (readOnly || step === "setup") return;
        if (finalQualifiers.length < 2) return;

        // Logic: If any "real" match is confirmed in the bracket, we stop auto-sync
        const bracketHasStarted = bracket.some(m => m.confirmed && m.team1 !== "BYE" && m.team2 !== "BYE");
        if (bracketHasStarted) return;

        // We want to update the bracket names based on current finalQualifiers
        const totalQuals = finalQualifiers.length;
        const numRounds = Math.ceil(Math.log2(totalQuals));
        const bracketSize = Math.pow(2, numRounds);

        setBracket(prev => {
            // If the bracket size changed, or if it's empty, we create a new one
            let newBracket: BracketMatch[] = [];
            const existingRounds = new Set(prev.map(m => m.round));
            const needsRecreation = prev.length === 0 || (existingRounds.size > 0 && existingRounds.size !== numRounds);

            if (needsRecreation) {
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
            } else {
                newBracket = prev.map(m => ({ ...m }));
            }

            const seedPositions = getSeedingOrder(bracketSize);
            const firstRoundIdx = numRounds - 1;
            const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);

            let changed = false;
            for (let i = 0; i < seedPositions.length; i += 2) {
                const mIdx = i / 2;
                const s1 = seedPositions[i];
                const s2 = seedPositions[i + 1];

                const q1 = finalQualifiers[s1 - 1];
                const q2 = finalQualifiers[s2 - 1];

                const t1 = (q1 && s1 <= totalQuals) ? q1.player : "BYE";
                const t2 = (q2 && s2 <= totalQuals) ? q2.player : "BYE";

                const match = firstRoundMatches.find(m => m.slot === mIdx);
                if (match) {
                    if (JSON.stringify(match.team1) !== JSON.stringify(t1) || JSON.stringify(match.team2) !== JSON.stringify(t2)) {
                        match.team1 = t1 as BracketSlot;
                        match.team2 = t2 as BracketSlot;

                        // Auto-confirm BYEs
                        if (match.team1 === "BYE" || match.team2 === "BYE") {
                            match.confirmed = true;
                            const winner = match.team1 === "BYE" ? match.team2 : match.team1;
                            if (winner && winner !== "BYE") {
                                match.winnerId = (winner as Player).id;
                                match.winnerName = (winner as Player).name;
                            }
                        } else {
                            match.confirmed = false; // Reset if it was a BYE before
                            match.winnerId = undefined;
                            match.winnerName = undefined;
                        }
                        changed = true;
                    }
                }
            }

            // Always re-run computation for auto-advances of BYEs
            const finalProcessed = computeAdvancedBracket(newBracket, numRounds);

            // Compare finalProcessed with prev to avoid loops if nothing changed
            if (JSON.stringify(finalProcessed) !== JSON.stringify(prev)) {
                return finalProcessed;
            }
            return prev;
        });
    }, [finalQualifiers, readOnly, step]);

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
        if (!match || match.score1 == null || match.score2 == null) return;

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
                presentPlayerIds: Array.from(present),
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
                presentPlayerIds: Array.from(present)
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
        const match = bracket.find(m => m.id === matchId);
        if (match?.confirmed || readOnly) return;

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
                presentPlayerIds: Array.from(present)
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
        const target = bracket.find(m => m.id === matchId);
        if (!target || !target.confirmed || readOnly) return;

        // Check if next round is already confirmed
        const nextMatch = bracket.find(nm => nm.round === target.round - 1 && nm.slot === Math.floor(target.slot / 2));
        if (nextMatch?.confirmed) {
            toast.error("No se puede editar: el ganador ya jugó la siguiente ronda.");
            return;
        }

        const updated = bracket.map(m => {
            if (m.id === matchId) {
                return { ...m, confirmed: false, winnerId: undefined, winnerName: undefined };
            }
            // Clear advanced winner in next round
            if (m.round === target.round - 1 && m.slot === Math.floor(target.slot / 2)) {
                if (target.slot % 2 === 0) return { ...m, team1: null };
                else return { ...m, team2: null };
            }
            return m;
        });

        setSaving(true);
        try {
            await saveTournamentFixture({
                tournamentId,
                phase: "eliminatorias",
                groups,
                matches,
                bracket: updated,
                presentPlayerIds: Array.from(present)
            });
            setBracket(updated);
            toast.success("Partido reabierto para edición");
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
            {/* Modal de Confirmación Estético */}
            <AnimatePresence>
                {confirmModal.open && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden p-6"
                        >
                            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${confirmModal.variant === 'danger' ? "bg-rojo/10 text-rojo" : "bg-azul-primary/10 text-azul-primary"}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic tracking-tight mb-2">
                                {confirmModal.title}
                            </h3>
                            <p className="text-sm text-foreground/60 leading-relaxed mb-8">
                                {confirmModal.description}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                                    className="py-3 rounded-xl bg-muted/50 hover:bg-muted text-foreground/60 text-xs font-black uppercase tracking-widest transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={`py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg ${confirmModal.variant === 'danger'
                                        ? "bg-rojo hover:bg-rojo/90 shadow-rojo/20"
                                        : "bg-azul-primary hover:bg-azul-primary/90 shadow-azul-primary/20"}`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Lista de Jugadores */}
            <AnimatePresence>
                {isPlayersModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPlayersModalOpen(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl h-[80vh] bg-card border border-border/50 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Header del Modal */}
                            <div className="p-8 pb-4 flex items-center justify-between border-b border-border/10">
                                <div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Gestión de Jugadores</h2>
                                    <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest">Asistencia y Pagos en tiempo real</p>
                                </div>
                                <button
                                    onClick={() => setIsPlayersModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-rojo/10 hover:text-rojo transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Buscador */}
                            <div className="px-8 py-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                                    <input
                                        type="text"
                                        placeholder="BUSCAR JUGADOR POR NOMBRE..."
                                        value={playerSearchQuery}
                                        onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-azul-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Lista de Jugadores */}
                            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                                <div className="grid gap-2">
                                    {filteredPlayers.map((p) => (
                                        <div
                                            key={p.id}
                                            className="group flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/30 hover:border-azul-primary/30 hover:bg-muted/30 transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${present.has(p.id) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/5 text-foreground/20'}`}>
                                                    {p.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black uppercase italic leading-none mb-1">{p.name}</div>
                                                    <div className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">{p.category || 'Sin Cat.'}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Botón de Pago */}
                                                <button
                                                    onClick={() => togglePaid(p.id)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${paid.has(p.id)
                                                        ? 'bg-azul-primary/10 border-azul-primary/30 text-azul-primary'
                                                        : 'bg-transparent border-border/50 text-foreground/30 hover:border-azul-primary/30 hover:text-azul-primary'}`}
                                                >
                                                    <CreditCard className={`w-3.5 h-3.5 ${paid.has(p.id) ? 'animate-pulse' : ''}`} />
                                                    <span className="text-[9px] font-black uppercase tracking-tighter">{paid.has(p.id) ? 'PAGADO' : 'PAGAR'}</span>
                                                </button>

                                                {/* Botón de Asistencia */}
                                                <button
                                                    onClick={() => togglePresent(p.id)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${present.has(p.id)
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                        : 'bg-transparent border-border/50 text-foreground/30 hover:border-emerald-500/30 hover:text-emerald-500'}`}
                                                >
                                                    <UserCheck className={`w-3.5 h-3.5 ${present.has(p.id) ? 'animate-bounce' : ''}`} />
                                                    <span className="text-[9px] font-black uppercase tracking-tighter">{present.has(p.id) ? 'PRESENTE' : 'AUSENTE'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredPlayers.length === 0 && (
                                        <div className="py-12 text-center text-foreground/40 text-xs font-bold uppercase tracking-[0.2em]">
                                            No se encontraron jugadores
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* UNIFIED HEADER */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 transition-all shadow-sm">
                <div className="w-full px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => {
                                if (step === "done" && !readOnly) {
                                    setStep("setup");
                                } else {
                                    router.back();
                                }
                            }}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 hover:text-foreground transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Volver
                        </button>

                        <div className="h-6 w-[1px] bg-border/50 hidden md:block" />

                        <div className="hidden md:flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-celeste leading-none mb-0.5">Torneo</span>
                            <span className="text-[10px] font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[150px] lg:max-w-[200px]">
                                {tournamentName}
                            </span>
                        </div>

                        <div className="h-6 w-[1px] bg-border/50 hidden md:block" />

                        {/* Navigation Stepper (Simplified) */}
                        <div className="hidden md:flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                            {(() => {
                                const steps = [
                                    { id: "setup", label: "Participantes", icon: Users2, active: step === "setup", completed: step !== "setup" },
                                    { id: "done", label: "Torneo en Curso", icon: Swords, active: step === "done" || step === "qual" || step === "elim", completed: initialStatus === "finalizado" },
                                ];

                                return steps.map((s, idx) => {
                                    const Icon = s.icon;
                                    const isAccessible = s.id === "setup" || s.id === "done";

                                    return (
                                        <div key={s.id} className="flex items-center">
                                            <button
                                                onClick={() => isAccessible && setStep(s.id as any)}
                                                disabled={!isAccessible}
                                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all ${s.active
                                                    ? "bg-azul-primary text-white shadow-md shadow-azul-primary/20"
                                                    : s.completed
                                                        ? "text-celeste bg-celeste/5 hover:bg-celeste/10"
                                                        : isAccessible
                                                            ? "text-foreground/60 hover:bg-muted/80"
                                                            : "opacity-30 cursor-not-allowed"
                                                    }`}
                                            >
                                                <Icon className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${s.active ? "animate-pulse" : ""}`} />
                                                <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest hidden sm:block">
                                                    {s.label}
                                                </span>
                                                {s.completed && <Check className="w-2.5 h-2.5 ml-1 text-celeste" />}
                                            </button>
                                            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 mx-1 text-border/40" />}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        <div className="h-8 w-[1px] bg-border/50 hidden md:block" />
                        <button
                            onClick={() => setIsPlayersModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-azul-primary/10 text-azul-primary hover:bg-azul-primary hover:text-white transition-all group shadow-sm border border-azul-primary/20"
                        >
                            <Users2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Jugadores</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-celeste/5 border border-celeste/20 text-celeste text-[10px] font-black uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-celeste animate-pulse" />
                            {initialStatus === "finalizado" ? "Torneo Finalizado" : "En Vivo"}
                        </div>

                        {initialStatus === "finalizado" && (
                            <TournamentPublishButton
                                tournamentId={tournamentId}
                                tournamentName={tournamentName}
                                variant="management"
                            />
                        )}

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
            <div className="w-full px-4 md:px-6 lg:px-8 py-4 pb-24">
                <div className="mb-4 text-center">
                    <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight italic uppercase">
                        {tournamentName}
                    </h1>
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        {readOnly ? 'Fixture' : 'Gestión'} de Torneo Round Robin
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
                            <div className="w-full space-y-4">
                                <div className="text-center space-y-1">
                                    <h2 className="text-lg md:text-xl font-black text-foreground tracking-tighter uppercase italic">Lista de Asistencia</h2>
                                    <p className="text-celeste text-[8px] font-black uppercase tracking-[0.3em]">Verificación de Jugadores y Presentismo</p>
                                </div>

                                {/* Control Bar */}
                                <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg">
                                    <div className="relative flex-1 w-full">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                                        <input
                                            type="text"
                                            placeholder="Buscar participante..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-muted/50 border border-border/50 rounded-xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:border-azul-primary transition-all placeholder:text-foreground/20"
                                        />
                                    </div>
                                    {!readOnly && (
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <button
                                                onClick={() => {
                                                    const allIds = allPlayers.map(p => p.id);
                                                    setPaid(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                                }}
                                                className="flex-1 md:flex-none px-6 py-4 bg-azul-primary/10 text-azul-primary rounded-2xl font-black uppercase text-[9px] tracking-widest border border-azul-primary/20 hover:bg-azul-primary hover:text-white transition-all shadow-lg shadow-azul-primary/5"
                                            >
                                                Todo Pago
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const allIds = allPlayers.map(p => p.id);
                                                    setPresent(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                                }}
                                                className="flex-1 md:flex-none px-6 py-4 bg-celeste/10 text-celeste rounded-2xl font-black uppercase text-[9px] tracking-widest border border-celeste/20 hover:bg-celeste hover:text-white transition-all shadow-lg shadow-celeste/5"
                                            >
                                                Todo Ok
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Players Table */}
                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40 border-b border-border/50">
                                            <tr>
                                                <th className="px-4 py-2">Jugador</th>
                                                <th className="px-4 py-2">Categoría</th>
                                                <th className="px-4 py-2 text-center">Pago</th>
                                                <th className="px-4 py-2 text-center">Asistencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {allPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => {
                                                const isPresent = present.has(p.id);
                                                const isPaid = paid.has(p.id);
                                                return (
                                                    <tr
                                                        key={p.id}
                                                        className={`group transition-all hover:bg-muted/30 ${isPresent ? "bg-celeste/[0.02]" : ""}`}
                                                    >
                                                        <td className="px-4 py-1.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${isPresent ? "bg-celeste text-white" : "bg-muted text-foreground/20"}`}>
                                                                    <Users2 className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className={`font-black uppercase text-xs tracking-tight transition-colors ${isPresent ? "text-foreground" : "text-foreground/70"}`}>{p.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-1.5">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">{p.category || "D"}</span>
                                                        </td>
                                                        <td className="px-4 py-1.5 text-center">
                                                            <button
                                                                onClick={() => !readOnly && setPaid(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                                                    return next;
                                                                })}
                                                                disabled={readOnly}
                                                                className={`w-8 h-8 rounded-lg inline-flex items-center justify-center border transition-all transform active:scale-90 ${isPaid
                                                                    ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                                    : "bg-muted/30 border-border/40 text-foreground/20 hover:border-azul-primary/30 hover:text-azul-primary"
                                                                    } ${readOnly ? "cursor-default opacity-80" : ""}`}
                                                            >
                                                                <CreditCard className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-1.5 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                {!readOnly && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setPlayerToDelete(p)}
                                                                            className="w-8 h-8 rounded-lg inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/20 hover:border-rojo/30 hover:text-rojo transition-all transform active:scale-90"
                                                                            title="Eliminar"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>

                                                                        <button
                                                                            onClick={() => setReplacingPlayer(p)}
                                                                            className="w-8 h-8 rounded-lg inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/20 hover:border-azul-primary/30 hover:text-azul-primary transition-all transform active:scale-90"
                                                                            title="Reemplazar"
                                                                        >
                                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </>
                                                                )}

                                                                <button
                                                                    onClick={() => !readOnly && setPresent(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                                                                        return next;
                                                                    })}
                                                                    disabled={readOnly}
                                                                    className={`w-8 h-8 rounded-lg inline-flex items-center justify-center border transition-all transform active:scale-90 ${isPresent
                                                                        ? "bg-celeste border-celeste text-white shadow-lg shadow-celeste/20"
                                                                        : "bg-muted/30 border-border/40 text-foreground/20 hover:border-celeste/30 hover:text-celeste"
                                                                        } ${readOnly ? "cursor-default opacity-80" : ""}`}
                                                                >
                                                                    <UserCheck className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {!readOnly && (
                                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-6">
                                        <button
                                            onClick={() => setStep("done")}
                                            disabled={present.size < 2}
                                            className="w-full py-3.5 bg-celeste text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-celeste/30 hover:bg-celeste/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale text-sm"
                                        >
                                            Iniciar Torneo ({present.size})
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {(step === "done" || step === "qual" || step === "elim") && (
                        <motion.div
                            key="tournament-flow"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-10 pb-40"
                        >
                            {/* --- FASE DE GRUPOS --- */}
                            <section className="space-y-6">
                                <div className="text-center space-y-0.5">
                                    <h2 className="text-lg md:text-xl font-black text-foreground tracking-tighter uppercase italic">Fase de Grupos</h2>
                                    <p className="text-azul-primary text-[8px] font-black uppercase tracking-[0.3em]">Resultados y Clasificación en Tiempo Real</p>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2 max-w-4xl mx-auto">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-foreground/50">
                                        <span>Estado de la Fase</span>
                                        <div className="flex items-center gap-3">
                                            {!readOnly && progressPercent < 100 && (
                                                <button
                                                    onClick={handleSimulateResults}
                                                    className="flex items-center gap-1.5 px-2 py-0.5 bg-azul-primary/5 hover:bg-azul-primary/10 text-azul-primary border border-azul-primary/20 rounded-md text-[8px] font-black tracking-widest transition-all group"
                                                >
                                                    <Dice5 className="w-2.5 h-2.5 group-hover:rotate-12 transition-transform" />
                                                    Simular Restante
                                                </button>
                                            )}
                                            <span>{confirmedGroupMatches} / {totalGroupMatches} Partidos</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
                                        <motion.div
                                            className="h-full bg-celeste shadow-[0_0_15px_rgba(var(--celeste-rgb),0.3)]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {groups.map((g: Group) => {
                                        const standings = computeStandings(g.id);
                                        const groupMatches = matches
                                            .filter(m => m.groupId === g.id)
                                            .sort((a, b) => a.id.localeCompare(b.id)); // ORDEN FIJO: El secreto de la alineación premium
                                        return (
                                            <div key={g.id} className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full group/g">
                                                <div className="bg-muted/50 px-3 py-2 border-b border-border/40 flex items-center justify-between">
                                                    <div className="flex flex-col gap-1">
                                                        {!readOnly && (
                                                            <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-xl border border-border/50 focus-within:border-azul-primary/50 transition-all w-fit">
                                                                <MapPin className="w-2.5 h-2.5 text-azul-primary/50" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="CANCHA..."
                                                                    value={g.courtNumber || ""}
                                                                    onChange={(e) => {
                                                                        const newGroups = groups.map(group =>
                                                                            group.id === g.id ? { ...group, courtNumber: e.target.value } : group
                                                                        );
                                                                        setGroups(newGroups);
                                                                    }}
                                                                    className="w-16 bg-transparent border-none p-0 text-[10px] font-black italic uppercase text-azul-primary/70 placeholder:text-azul-primary/20 focus:ring-0 outline-none"
                                                                />
                                                            </div>
                                                        )}
                                                        {readOnly && g.courtNumber && (
                                                            <div className="flex items-center gap-2 bg-azul-primary/5 px-3 py-1 rounded-xl border border-azul-primary/10 w-fit">
                                                                <MapPin className="w-3 h-3 text-azul-primary" />
                                                                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-azul-primary">{g.courtNumber}</span>
                                                            </div>
                                                        )}
                                                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-azul-primary leading-none mt-1">{g.name}</h3>
                                                    </div>
                                                    <Users2 className="w-6 h-6 text-foreground/10 group-hover:text-azul-primary/20" />
                                                </div>
                                                <div className="px-3 py-2 border-b border-border/30 bg-card/20">
                                                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                                                        <table className="w-full text-[10px]">
                                                            <thead>
                                                                <tr className="border-b border-border/30">
                                                                    <th className="px-1 py-2 text-center font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">OK</th>
                                                                    <th className="px-3 py-2 text-left font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">Pos</th>
                                                                    <th className="px-2 py-2 text-left font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">Jugador</th>
                                                                    <th className="px-3 py-2 text-center font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">PG</th>
                                                                    <th className="px-3 py-2 text-center font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">+/-</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {standings.map((s: any, idx: number) => (
                                                                    <tr key={s.playerId} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                                                                        <td className="px-1 py-1 text-center">
                                                                            <button
                                                                                onClick={() => togglePresent(s.playerId)}
                                                                                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${present.has(s.playerId) ? "bg-celeste text-azul-primary shadow-sm shadow-celeste/20" : "bg-muted/50 text-foreground/10 hover:text-foreground/30"}`}
                                                                            >
                                                                                <UserCheck className="w-3 h-3" />
                                                                            </button>
                                                                        </td>
                                                                        <td className="px-3 py-1 text-left">
                                                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-lg font-black italic text-[9px] ${idx === 0 ? "bg-rojo text-white" : "bg-muted text-foreground/40"}`}>
                                                                                #{idx + 1}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-2 py-1">
                                                                            <div className="flex flex-col">
                                                                                {s.player.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                                    <span key={i} className={`font-black uppercase italic tracking-tight leading-tight ${i === 0 ? "text-[10px] text-foreground/80" : "text-[8px] text-foreground/50"}`}>
                                                                                        {name.trim()}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-1 text-center font-black italic text-azul-primary">{s.won}</td>
                                                                        <td className="px-3 py-1 text-center font-black italic text-foreground/60">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                                <div className="p-2.5 space-y-1.5">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h4 className="text-[7px] font-black uppercase tracking-[0.2em] text-foreground/50">Fixture del Grupo</h4>
                                                        <div className="h-px flex-1 bg-border/10 mx-2" />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        {groupMatches.map(m => {
                                                            const isReady = present.has(m.team1.id) && present.has(m.team2.id);
                                                            return (
                                                                <div
                                                                    key={m.id}
                                                                    className={`group/match relative transition-all ${!isReady && !(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "opacity-60 grayscale pointer-events-none" : ""} ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "border-emerald-500/20 bg-emerald-500/[0.02]" : ""}`}
                                                                >
                                                                    {(m.confirmed || m.status === 'finished' || m.status === 'completed') && (
                                                                        <div className="absolute -top-1.5 -right-1.5 z-20">
                                                                            <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg shadow-emerald-500/30">
                                                                                <Check className="w-3 h-3 stroke-[4]" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {!isReady && !m.confirmed && (
                                                                        <div className="absolute inset-0 flex items-center justify-center z-[20] pointer-events-none">
                                                                            <div className="px-3 py-1 bg-background/90 backdrop-blur-md border border-border/50 rounded-full shadow-2xl">
                                                                                <span className="text-[7px] font-black uppercase tracking-widest text-foreground/40 animate-pulse">Esperando Jugadores</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div
                                                                        className={`rounded-2xl border transition-all overflow-hidden min-h-[64px] flex flex-col justify-center ${(m.confirmed || m.status === 'finished' || m.status === 'completed')
                                                                            ? "bg-emerald-500/[0.03] border-emerald-500/40"
                                                                            : m.status === 'in_progress'
                                                                                ? "bg-rojo/[0.03] border-rojo/40 shadow-lg shadow-rojo/5"
                                                                                : "bg-background/40 border-border/40 hover:border-border/60"
                                                                            }`}
                                                                    >
                                                                        {m.status === 'in_progress' && (
                                                                            <div className="absolute top-0 left-0 bg-rojo text-white px-2 py-0.5 text-[6px] font-black italic rounded-tl-xl rounded-br-lg shadow-lg z-10 animate-pulse tracking-widest uppercase">
                                                                                VIVO
                                                                            </div>
                                                                        )}
                                                                        <div className="px-2 py-2">
                                                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

                                                                                {/* Equipo 1 */}
                                                                                <div className="flex flex-col gap-1.5 min-w-0">
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        {m.team1.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                                            <span key={i} className={`font-black uppercase italic tracking-tight leading-tight truncate ${i === 0 ? "text-[9px]" : "text-[7px] opacity-60 mt-0.5"} ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "text-emerald-500/70" : (m.confirmed || m.status === 'finished' || m.status === 'completed') && m.score1! > m.score2! ? "text-rojo" : "text-foreground/70"}`}>
                                                                                                {name.trim()}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                    {m.status === 'in_progress' && !readOnly ? (
                                                                                        <div className="flex items-center gap-1">
                                                                                            <input
                                                                                                type="number"
                                                                                                value={m.score1 ?? ""}
                                                                                                onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                                                className="w-8 h-6 bg-muted/40 border border-border/40 rounded-md text-center font-black text-[10px] outline-none focus:border-rojo/50 no-spin-buttons placeholder:text-foreground/10"
                                                                                                placeholder="0"
                                                                                            />
                                                                                            <div className="flex flex-col gap-0.5">
                                                                                                <button onClick={() => handleScoreChange(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                                                                                                <button onClick={() => handleScoreChange(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className={`text-[11px] font-black ${m.score1! > m.score2! ? "text-rojo" : "text-foreground/40"}`}>{m.score1 ?? 0}</span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Centro: Acciones */}
                                                                                <div className="flex flex-col items-center justify-center gap-1.5">
                                                                                    <div className="text-[7px] font-black text-foreground/40 mb-1">VS</div>
                                                                                    {!m.confirmed && !readOnly && m.status !== 'finished' && m.status !== 'completed' && (
                                                                                        <div className="flex flex-col items-center gap-1 opacity-0 group-hover/match:opacity-100 transition-opacity">
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    const nextStatus = m.status === 'in_progress' ? 'pending' : 'in_progress';
                                                                                                    setMatches(prev => prev.map(match => match.id === m.id ? { ...match, status: nextStatus } : match));
                                                                                                }}
                                                                                                className={`w-[52px] py-1 rounded-md transition-all flex items-center justify-center gap-1 text-[8px] font-black italic border ${m.status === 'in_progress' ? "bg-rojo text-white border-rojo" : "hover:bg-rojo/10 text-rojo border-rojo/20"}`}
                                                                                                title={m.status === 'in_progress' ? "Pausar Partido" : "Iniciar Grabación"}
                                                                                            >
                                                                                                {m.status === 'in_progress' ? (
                                                                                                    <><X className="w-2 h-2" /> PAU</>
                                                                                                ) : (
                                                                                                    <><Circle className="w-2 h-2 fill-current" /> Go!</>
                                                                                                )}
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    handleConfirmScore(m.id);
                                                                                                    setMatches(prev => prev.map(match => match.id === m.id ? { ...match, status: 'completed', confirmed: true } : match));
                                                                                                }}
                                                                                                className="w-[52px] py-1 rounded-md hover:bg-azul-primary/10 text-azul-primary text-[8px] font-black italic border border-azul-primary/20 flex items-center justify-center"
                                                                                                title="Finalizar Partido"
                                                                                            >
                                                                                                FIN
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                    {(m.confirmed || m.status === 'finished' || m.status === 'completed') && !readOnly && (
                                                                                        <button
                                                                                            onClick={() => handleReopenMatch(m.id)}
                                                                                            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-azul-primary/5 text-azul-primary/30 hover:text-azul-primary transition-all group/reopen"
                                                                                            title="Reabrir Partido"
                                                                                        >
                                                                                            <RotateCcw className="w-2.5 h-2.5 group-hover/reopen:-rotate-45 transition-transform" />
                                                                                            <span className="text-[7px] font-black uppercase italic tracking-wider">Reabrir</span>
                                                                                        </button>
                                                                                    )}
                                                                                </div>

                                                                                {/* Equipo 2 */}
                                                                                <div className="flex flex-col items-end gap-1.5 min-w-0 text-right">
                                                                                    <div className="flex flex-col items-end min-w-0">
                                                                                        {m.team2.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                                            <span key={i} className={`font-black uppercase italic tracking-tight leading-tight truncate ${i === 0 ? "text-[9px]" : "text-[7px] opacity-60 mt-0.5"} ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "text-emerald-500/70" : (m.confirmed || m.status === 'finished' || m.status === 'completed') && m.score2! > m.score1! ? "text-rojo" : "text-foreground/70"}`}>
                                                                                                {name.trim()}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                    {m.status === 'in_progress' && !readOnly ? (
                                                                                        <div className="flex items-center gap-1">
                                                                                            <div className="flex flex-col gap-0.5">
                                                                                                <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", ((m.score2 || 0) + 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                                                                                                <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", Math.max(0, (m.score2 || 0) - 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                                                                                            </div>
                                                                                            <input
                                                                                                type="number"
                                                                                                value={m.score2 ?? ""}
                                                                                                onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                                                className="w-8 h-6 bg-muted/40 border border-border/40 rounded-md text-center font-black text-[10px] outline-none focus:border-rojo/50 no-spin-buttons placeholder:text-foreground/10"
                                                                                                placeholder="0"
                                                                                            />
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className={`text-[11px] font-black ${m.score2! > m.score1! ? "text-rojo" : "text-foreground/40"}`}>{m.score2 ?? 0}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* --- SEPARADOR DINÁMICO --- */}
                            {(bracket.length > 0 || isGroupStageFinished) && (
                                <div className="relative py-12">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-border/50"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-background px-8 text-sm font-black italic uppercase tracking-[0.4em] text-foreground/20">Llaves de Eliminación</span>
                                    </div>
                                </div>
                            )}

                            {/* --- ELIMINATORIAS (BRACKET) --- */}
                            {bracket.length > 0 ? (
                                <section className="space-y-8">
                                    <div className="text-center space-y-0.5">
                                        <h2 className="text-lg md:text-xl font-black text-foreground tracking-tighter uppercase italic">Cuadro del Torneo</h2>
                                        <p className="text-celeste text-[7px] font-black uppercase tracking-[0.3em]">Playoffs Dinámicos</p>
                                    </div>

                                    <div className="overflow-x-auto pb-8 custom-scrollbar -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12">
                                        <div className="min-w-max flex items-stretch justify-center h-[750px] gap-4">
                                            {roundsArr.map((round, rIdx) => {
                                                const matchesInRound = bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot);
                                                const maxRounds = roundsArr.length;
                                                const totalRows = Math.pow(2, maxRounds);
                                                const rowSpan = Math.pow(2, maxRounds - round - 1) * 2;

                                                return (
                                                    <div key={round} className="w-[200px] flex flex-col pt-3">
                                                        <div className="flex-none flex flex-col items-center mb-2">
                                                            <span className="px-3 py-1 bg-muted/80 border border-border/50 rounded-lg text-[8px] font-black uppercase tracking-widest text-foreground/70 shadow-sm">
                                                                {roundLabel(round)}
                                                            </span>
                                                        </div>

                                                        <div className={`flex-1 grid h-full gap-y-1`} style={{ gridTemplateRows: `repeat(${totalRows}, 1fr)` }}>
                                                            {Array.from({ length: totalRows / rowSpan }).map((_, slotIdx) => {
                                                                const m = matchesInRound.find(m => m.slot === slotIdx);
                                                                if (!m) return <div key={slotIdx} style={{ gridRow: `span ${rowSpan}` }} />;

                                                                return (
                                                                    <div
                                                                        key={m.id}
                                                                        className="flex flex-col justify-center px-2"
                                                                        style={{
                                                                            gridRowStart: slotIdx * rowSpan + 1,
                                                                            gridRowEnd: `span ${rowSpan}`
                                                                        }}
                                                                    >
                                                                        <div className="relative group/match">
                                                                            <div className={`w-full p-3 bg-card/40 backdrop-blur-xl border transition-all relative z-10 rounded-xl min-h-[85px] flex flex-col justify-center ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "border-emerald-500/30 bg-emerald-500/[0.02]" : m.status === 'in_progress' ? "border-rojo/40 bg-rojo/[0.02] shadow-lg shadow-rojo/5" : "border-border/20 hover:border-border/40 shadow-sm"}`}>
                                                                                
                                                                                {/* Micro Badge VIVO */}
                                                                                {m.status === 'in_progress' && (
                                                                                    <div className="absolute top-0 left-0 bg-rojo text-white px-1.5 py-0.5 text-[6px] font-black italic rounded-tl-xl rounded-br-md shadow-lg z-10 animate-pulse tracking-widest uppercase">
                                                                                        VIVO
                                                                                    </div>
                                                                                )}

                                                                                {(m.confirmed || m.status === 'finished' || m.status === 'completed') && (
                                                                                    <div className="absolute -top-1 -right-1 z-20">
                                                                                        <div className="bg-emerald-500 text-white p-0.5 rounded-full shadow-lg">
                                                                                            <Check className="w-2.5 h-2.5 stroke-[4]" />
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                                                                    {/* Equipo 1 */}
                                                                                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                                                                                        <div className="flex flex-col items-center min-w-0 text-center">
                                                                                            {m.team1 === "BYE" ? (
                                                                                                <span className="text-foreground/20 text-[9px] font-black uppercase italic">BYE</span>
                                                                                            ) : (
                                                                                                (m.team1 as Player)?.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                                                    <span key={i} className={`font-black uppercase italic tracking-tight leading-tight truncate text-[10px] ${m.winnerId === (m.team1 as Player)?.id ? "text-azul-primary" : "text-foreground/60"}`}>
                                                                                                        {name.trim()}
                                                                                                    </span>
                                                                                                )) || <span className="text-foreground/30 text-[8px] font-black uppercase italic">A definir</span>
                                                                                            )}
                                                                                        </div>
                                                                                        {m.status === 'in_progress' && !readOnly ? (
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <input
                                                                                                    type="number"
                                                                                                    value={m.score1 ?? ""}
                                                                                                    onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                                                    className="w-10 h-7 bg-muted/40 border border-border/40 rounded-lg text-center font-black text-xs outline-none no-spin-buttons"
                                                                                                    placeholder="0"
                                                                                                />
                                                                                                <div className="flex flex-col gap-0">
                                                                                                    <button onClick={() => handleBracketScore(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Plus className="w-3 h-3" /></button>
                                                                                                    <button onClick={() => handleBracketScore(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Minus className="w-3 h-3" /></button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className={`text-xs font-black ${m.winnerId === (m.team1 as Player)?.id ? "text-azul-primary" : "text-foreground/20"}`}>{m.score1 ?? 0}</span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Centro: VS / Acciones */}
                                                                                    <div className="flex flex-col items-center justify-center gap-1 relative">
                                                                                        <div className="text-[7px] font-black text-foreground/20 italic">VS</div>
                                                                                        {!m.confirmed && !readOnly && m.team1 !== "BYE" && m.team2 !== "BYE" && m.team1 && m.team2 && (
                                                                                            <div className="flex flex-col items-center gap-1.5 opacity-0 group-hover/match:opacity-100 transition-all duration-200 absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-30 scale-95 group-hover/match:scale-100 min-w-[110px]">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const nextStatus = m.status === 'in_progress' ? 'pending' : 'in_progress';
                                                                                                        setBracket(prev => prev.map(bm => bm.id === m.id ? { ...bm, status: nextStatus } : bm));
                                                                                                    }}
                                                                                                    className={`w-20 py-1.5 rounded-md text-[8px] font-black italic tracking-widest shadow-xl transition-all ${m.status === 'in_progress' ? "bg-rojo text-white shadow-rojo/20" : "bg-azul-primary text-white shadow-azul-primary/20"}`}
                                                                                                >
                                                                                                    {m.status === 'in_progress' ? 'PAUSAR' : 'INICIAR'}
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleBracketConfirm(m.id)}
                                                                                                    className="w-20 py-1.5 rounded-md bg-emerald-500 text-white text-[8px] font-black italic tracking-widest shadow-xl shadow-emerald-500/20"
                                                                                                >
                                                                                                    FINALIZAR
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                        {(m.confirmed || m.status === 'finished' || m.status === 'completed') && !readOnly && (
                                                                                            <button
                                                                                                onClick={() => handleReopenMatch(m.id)}
                                                                                                className="opacity-0 group-hover/match:opacity-100 transition-all duration-200 absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-30"
                                                                                            >
                                                                                                <div className="flex flex-col items-center gap-1 text-azul-primary">
                                                                                                    <RotateCcw className="w-4 h-4" />
                                                                                                    <span className="text-[7px] font-black uppercase tracking-tight">Reabrir</span>
                                                                                                </div>
                                                                                            </button>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Equipo 2 */}
                                                                                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                                                                                        <div className="flex flex-col items-center min-w-0 text-center">
                                                                                            {m.team2 === "BYE" ? (
                                                                                                <span className="text-foreground/20 text-[9px] font-black uppercase italic">BYE</span>
                                                                                            ) : (
                                                                                                (m.team2 as Player)?.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                                                    <span key={i} className={`font-black uppercase italic tracking-tight leading-tight truncate text-[10px] ${m.winnerId === (m.team2 as Player)?.id ? "text-azul-primary" : "text-foreground/60"}`}>
                                                                                                        {name.trim()}
                                                                                                    </span>
                                                                                                )) || <span className="text-foreground/30 text-[8px] font-black uppercase italic">A definir</span>
                                                                                            )}
                                                                                        </div>
                                                                                        {m.status === 'in_progress' && !readOnly ? (
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <input
                                                                                                    type="number"
                                                                                                    value={m.score2 ?? ""}
                                                                                                    onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                                                    className="w-10 h-7 bg-muted/40 border border-border/40 rounded-lg text-center font-black text-xs outline-none no-spin-buttons"
                                                                                                    placeholder="0"
                                                                                                />
                                                                                                <div className="flex flex-col gap-0">
                                                                                                    <button onClick={() => handleBracketScore(m.id, m.score1?.toString() ?? "", ((m.score2 || 0) + 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Plus className="w-3 h-3" /></button>
                                                                                                    <button onClick={() => handleBracketScore(m.id, m.score1?.toString() ?? "", Math.max(0, (m.score2 || 0) - 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Minus className="w-3 h-3" /></button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className={`text-xs font-black ${m.winnerId === (m.team2 as Player)?.id ? "text-azul-primary" : "text-foreground/20"}`}>{m.score2 ?? 0}</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </section>
                            ) : isGroupStageFinished && (
                                <div className="max-w-xl mx-auto p-12 bg-azul-primary/5 border-2 border-dashed border-azul-primary/30 rounded-[3rem] text-center space-y-8">
                                    <div className="w-20 h-20 bg-azul-primary/10 rounded-full flex items-center justify-center mx-auto shadow-xl">
                                        <Trophy className="w-8 h-8 text-azul-primary" />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">Ranking de Fase Grupos Listo</h3>
                                        <p className="text-xs font-bold text-foreground/60 max-w-[250px] mx-auto">La fase de grupos ha terminado. Genera las eliminatorias para ver los enfrentamientos.</p>
                                    </div>
                                    <button
                                        onClick={generateBracket}
                                        disabled={saving}
                                        className="w-full py-5 bg-azul-primary text-white rounded-2xl font-black uppercase tracking-widest italic shadow-2xl shadow-azul-primary/30 hover:bg-azul-dark transition-all flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        <Swords className="w-5 h-5" />
                                        Comenzar Eliminatorias
                                    </button>
                                </div>
                            )}

                            {/* Champions Notification Bar */}
                            {(() => {
                                const finalMatch = bracket.find(m => m.round === 0);
                                if (finalMatch?.confirmed && initialStatus !== "finalizado" && !readOnly) {
                                    return (
                                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6">
                                            <div className="p-6 bg-azul-primary text-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,119,255,0.4)] flex items-center justify-between border-4 border-azul-primary/40">
                                                <div className="flex items-center gap-4">
                                                    <Trophy className="w-8 h-8" />
                                                    <div className="text-left">
                                                        <h4 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">¡Rey de la Pista Coronadod!</h4>
                                                        <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Campeón: {finalMatch.winnerName}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        setSaving(true);
                                                        const res = await saveTournamentFixture({
                                                            tournamentId, phase: "finalizado", groups, matches, bracket, championName: finalMatch.winnerName, presentPlayerIds: Array.from(present)
                                                        });
                                                        setSaving(false);
                                                        if (res.ok) setShowSuccessModal(true);
                                                    }}
                                                    className="px-6 py-3 bg-white text-azul-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-azul-primary/10 hover:text-azul-primary transition-all font-bold"
                                                >
                                                    Cerrar Torneo
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
                                        <div className="w-14 h-14 rounded-2xl bg-azul-primary/10 flex items-center justify-center border border-azul-primary/20">
                                            <Users2 className="w-7 h-7 text-azul-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-azul-primary tracking-widest leading-none mb-1">Campaña Fase de Grupos</p>
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
                                                            ? "bg-azul-primary/5 border-azul-primary/20"
                                                            : "bg-rojo/5 border-rojo/20"
                                                        : "bg-muted/10 border-border"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[8px] font-black uppercase text-foreground/60">Oponente</span>
                                                                {m.confirmed && (
                                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isWinner ? 'bg-azul-primary text-white' : 'bg-rojo text-white'}`}>
                                                                        {isWinner ? "Victoria" : "Derrota"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="font-bold text-foreground text-sm truncate uppercase italic tracking-tight">{opponent.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border ${isWinner ? 'bg-azul-primary/10 border-azul-primary/30 text-azul-primary' : 'bg-rojo/10 border-rojo/30 text-rojo'}`}>
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
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-azul-primary via-celeste to-rojo" />

                            <div className="w-20 h-20 bg-azul-primary/10 border border-azul-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, delay: 0.2 }}
                                >
                                    <Trophy className="w-10 h-10 text-azul-primary" />
                                </motion.div>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full bg-azul-primary/5"
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
                                className="w-full py-4 bg-azul-primary hover:bg-azul-dark text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-azul-primary/20 active:scale-95"
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
                                        className="rounded-full h-12 w-12 flex items-center justify-center hover:bg-muted text-foreground/70 hover:text-foreground transition-all"
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
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/70 group-focus-within:text-primary transition-colors">
                                            <Users2 className="h-5 w-5" />
                                        </div>
                                        {playerSearchQuery && (
                                            <button
                                                onClick={() => setPlayerSearchQuery("")}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/70 hover:text-foreground transition-colors"
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
                                        className="h-14 px-8 bg-celeste hover:bg-celeste/90 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-celeste/20 active:scale-95 transition-all flex items-center gap-2 border-2 border-celeste-light/20 whitespace-nowrap"
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
                                                                        <span className="text-[7px] font-black italic text-foreground/60 uppercase tracking-widest">OK</span>
                                                                    ) : (
                                                                        <span className="text-[7px] font-black italic text-azul-primary uppercase tracking-widest opacity-0 group-hover:opacity-100">SEL.</span>
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
            {/* MODAL REEMPLAZO DE JUGADOR */}
            <Dialog open={!!replacingPlayer} onOpenChange={(open) => !open && setReplacingPlayer(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Cambiar Participante</DialogTitle>
                        <DialogDescription>
                            {isIndividual
                                ? <>Reemplazar a <span className="text-foreground">{replacingPlayer?.name}</span> por otro jugador.</>
                                : <>Modificar la pareja <span className="text-foreground">{replacingPlayer?.name}</span>.</>
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {!isIndividual && (
                        <div className="flex p-1 bg-muted rounded-2xl border border-border/50">
                            <button
                                onClick={() => setReplaceSlot(1)}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${replaceSlot === 1 ? "bg-background text-foreground shadow-lg" : "text-foreground/70 hover:text-foreground/60"}`}
                            >
                                Reemplazar Jugador 1
                            </button>
                            <button
                                onClick={() => setReplaceSlot(2)}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${replaceSlot === 2 ? "bg-background text-foreground shadow-lg" : "text-foreground/70 hover:text-foreground/60"}`}
                            >
                                Reemplazar Jugador 2
                            </button>
                        </div>
                    )}

                    <div className="space-y-6 py-4">
                        {/* Invitado */}
                        <div className="p-6 bg-muted/30 rounded-3xl border border-border/50 space-y-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70 block">
                                    {isIndividual ? "Opción 1: Persona Externa / Invitado" : `Opción 1: Reemplazar por Persona Externa`}
                                </span>
                                <p className="text-[9px] font-medium text-foreground/60 uppercase tracking-tighter">
                                    Usá esta opción si el jugador no está registrado en el club o sistema.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex-1 relative mt-2">
                                    <span className="absolute -top-2.5 left-4 px-2 bg-background text-[8px] font-black text-azul-primary uppercase tracking-widest z-10 rounded-full border border-border/10">
                                        {isIndividual ? "Nombre Completo" : `Nombre del Jugador ${replaceSlot}`}
                                    </span>
                                    <input
                                        type="text"
                                        placeholder={isIndividual ? "Escribí el nombre..." : (replacingPlayer?.name.split("/")[replaceSlot - 1]?.trim() || `Nombre ${replaceSlot}...`)}
                                        value={replaceSlot === 1 ? guestName : guestName2}
                                        onChange={(e) => replaceSlot === 1 ? setGuestName(e.target.value) : setGuestName2(e.target.value)}
                                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-4 text-sm font-bold outline-none focus:border-azul-primary shadow-sm"
                                    />
                                </div>

                                <button
                                    onClick={() => replacingPlayer && handleReplaceWithGuest(replacingPlayer.id)}
                                    className="w-full py-4 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                                >
                                    <UserCheck className="w-4 h-4" />
                                    {isIndividual ? "Confirmar como Invitado" : `Confirmar Persona Externa (Slot ${replaceSlot})`}
                                </button>
                            </div>
                        </div>

                        {/* Registrados */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Opción 2: Jugador Registrado</span>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={playerSearchQuery}
                                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                    className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-azul-primary"
                                />
                            </div>

                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {isFetchLoading ? (
                                    <div className="py-8 text-center animate-pulse text-xs font-black uppercase tracking-widest text-foreground/70">
                                        Cargando jugadores...
                                    </div>
                                ) : allPotentialPlayers
                                    .filter(p => {
                                        const query = isIndividual
                                            ? (guestName || playerSearchQuery)
                                            : (replaceSlot === 1 ? guestName : guestName2) || playerSearchQuery;

                                        if (!query || query.length < 2) return false;
                                        return p.name.toLowerCase().includes(query.toLowerCase());
                                    })
                                    .filter(p => !registeredPlayerIds.has(p.id) && !registeredPlayerNames.includes(p.name.toLowerCase()))
                                    .slice(0, 10).map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                if (replacingPlayer) {
                                                    if (isIndividual) {
                                                        handleReplacePlayer(replacingPlayer.id, p);
                                                    } else {
                                                        handleReplaceOneInPair(replacingPlayer, p.name, replaceSlot);
                                                    }
                                                }
                                            }}
                                            className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-azul-primary hover:text-white rounded-2xl border border-border/50 transition-all group/p shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center group-hover/p:bg-white/20">
                                                    <Users2 className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-black uppercase italic">{p.name}</p>
                                                    <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Cat: {p.category || "D"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover/p:opacity-100 bg-white/10 px-2 py-1 rounded-md">
                                                    Elegir para Jugador {replaceSlot}
                                                </span>
                                                <Plus className="w-4 h-4 opacity-0 group-hover/p:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    ))}
                                {(!isFetchLoading && allPotentialPlayers.length > 0 &&
                                    (!((isIndividual ? (guestName || playerSearchQuery) : (replaceSlot === 1 ? guestName : guestName2) || playerSearchQuery)) ||
                                        ((isIndividual ? (guestName || playerSearchQuery) : (replaceSlot === 1 ? guestName : guestName2) || playerSearchQuery)).length < 2)) && (
                                        <div className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-foreground/20 italic">
                                            Escribí para buscar jugadores del club...
                                        </div>
                                    )}
                                {(!isFetchLoading && playerSearchQuery.length >= 2 && allPotentialPlayers.filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase())).length === 0) && (
                                    <div className="py-8 px-6 text-center space-y-2 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">No se encontraron registros</p>
                                        <p className="text-[9px] font-bold text-foreground/70 uppercase tracking-tight">
                                            Si el jugador no está en la base de datos, usá la <span className="text-foreground">Opción 1</span> de arriba para agregarlo como externo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL CONFIRMACION ELIMINAR */}
            <Dialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-rojo">¿Eliminar Participante?</DialogTitle>
                        <DialogDescription>
                            Estás por quitar a <span className="text-foreground font-black">{playerToDelete?.name}</span> de la lista del torneo. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={() => setPlayerToDelete(null)}
                            className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => playerToDelete && handleDeletePlayer(playerToDelete.id)}
                            className="flex-1 px-4 py-3 bg-rojo hover:bg-rojo/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rojo/20"
                        >
                            Sí, Eliminar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}


