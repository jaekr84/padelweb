"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords, Calendar, Clock,
    CheckCircle2, AlertCircle, ChevronRight,
    ArrowLeft, LayoutDashboard, Settings,
    BarChart3, Check, X, RefreshCw, Dice5, Info, Pencil, RotateCcw,
    UserCheck, Zap, Settings2, Trash2, ArrowRight, Share2, Download, Search, CreditCard, Plus, Printer, ListFilter, LayoutGrid, Minus, Circle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveTournamentFixture, resetTournamentStatus } from "./actions";
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


export interface AmericanoManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    readOnly?: boolean;
    isLoggedIn?: boolean;
    modality?: {
        numCourts: number;
        matchesPerTeam: number;
        isIndividual: boolean;
    };
}

type Player = { id: string; name: string; category?: string | null; clubId?: string | null };

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
    isLoggedIn = true,
    modality
}: AmericanoManagerProps) {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [matches, setMatches] = useState<Match[]>(() => 
        initialMatches.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0,
            played: m.played || m.confirmed // If it was confirmed, it was played.
        }))
    );
    const [bracket, setBracket] = useState<BracketMatch[]>(() => 
        initialBracket.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0
        }))
    );
    const [saving, setSaving] = useState(false);

    // Configuration from modality or defaults
    const [numCourts, setNumCourts] = useState(modality?.numCourts || 2);
    const [matchesPerTeam, setMatchesPerTeam] = useState(modality?.matchesPerTeam || 2);
    const isIndividual = modality?.isIndividual || false;

    const handleUpdateConfig = async (newCourts: number, newMatches: number) => {
        setNumCourts(newCourts);
        setMatchesPerTeam(newMatches);

        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches,
            bracket,
            modalidad: { numCourts: newCourts, matchesPerTeam: newMatches, isIndividual }
        });

        if (res.ok) {
            toast.success("Configuración de formato actualizada");
        } else {
            toast.error("Error al actualizar configuración: " + res.error);
        }
        setSaving(false);
    };

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [noPlayersData, setNoPlayersData] = useState<{ finished: number, playing: number, waiting: number } | null>(null);
    const [step, setStep] = useState<"setup" | "active">(
        initialStatus === "setup" ? "setup" : "active"
    );
    const [playersTab, setPlayersTab] = useState<"all" | "pending" | "done">("all");
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [present, setPresent] = useState<Set<string>>(new Set((initialGroups[0]?.players || []).map((p: Player) => p.id)));
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    const allRegisteredPlayers = useMemo(() => groups.flatMap(g => g.players), [groups]);
    const registeredPlayerNames = useMemo(() => {
        return allRegisteredPlayers.flatMap(p => p.name.split(/[\/\+]/).map(n => n.trim().toLowerCase()));
    }, [allRegisteredPlayers]);
    const registeredPlayerIds = useMemo(() => new Set(allRegisteredPlayers.map(p => p.id)), [allRegisteredPlayers]);

    const totalExpectedMatches = Math.ceil(((groups[0]?.players.length || 0) * matchesPerTeam) / 2);
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const isGroupStageFinished = confirmedGroupMatches >= totalExpectedMatches && matches.every(m => m.confirmed);
    const progressPercent = totalExpectedMatches > 0 ? (confirmedGroupMatches / totalExpectedMatches) * 100 : 0;

    // Player replacement/deletion state
    const [replacingPlayer, setReplacingPlayer] = useState<Player | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<Player[]>([]);
    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestName2, setGuestName2] = useState("");
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");
    const [replaceSlot, setReplaceSlot] = useState<1 | 2>(1);
    const [editingMatchPlayer, setEditingMatchPlayer] = useState<{ matchId: string, playerIndex: 1 | 2 } | null>(null);

    const fetchPlayers = useCallback(async () => {
        setIsFetchLoading(true);
        const players = await getAllPlayers();
        setAllPotentialPlayers(players);
        setIsFetchLoading(false);
    }, []);

    useEffect(() => {
        if (replacingPlayer) {
            fetchPlayers();
            // Sync guest names with current pair members if not individual
            if (!isIndividual) {
                const names = replacingPlayer.name.split(/[\/\+]/).map(n => n.trim());
                setGuestName(names[0] || "");
                setGuestName2(names[1] || "");
            } else {
                setGuestName(replacingPlayer.name);
                setGuestName2("");
            }
            setPlayerSearchQuery("");
        }
    }, [replacingPlayer, fetchPlayers, isIndividual]);

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
            team1: (bm.team1 && typeof bm.team1 !== "string" && (bm.team1 as Player).id === oldPlayerId) ? { ...newPlayer } as any : bm.team1,
            team2: (bm.team2 && typeof bm.team2 !== "string" && (bm.team2 as Player).id === oldPlayerId) ? { ...newPlayer } as any : bm.team2,
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
                // Determine current phase based on if we are in playoffs or grupos
                const hasBracket = updatedBracket.length > 0;
                const currentPhase = hasBracket ? "eliminatorias" : "grupos";

                const res = await saveTournamentFixture({
                    tournamentId,
                    phase: currentPhase,
                    groups: updatedGroups,
                    matches: updatedMatches,
                    bracket: updatedBracket,
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
        const names = oldPlayer.name.split(/[\/\+]/).map(n => n.trim());
        let p1 = names[0] || "Jugador 1";
        let p2 = names[1] || "Jugador 2";

        if (slot === 1) p1 = newPlayerName;
        else p2 = newPlayerName;

        const updatedPlayer: Player = {
            ...oldPlayer,
            name: `${p1} / ${p2}`
        };

        await handleReplacePlayer(oldPlayer.id, updatedPlayer);
    };

    const handleReplaceWithGuest = async (oldPlayerId: string) => {
        if (!isIndividual) {
            const oldPlayer = groups.flatMap(g => g.players).find(p => p.id === oldPlayerId);
            if (!oldPlayer) return;

            const names = oldPlayer.name.split(/[\/\+]/).map(n => n.trim());
            let g1 = guestName.trim() || names[0] || "Jugador 1";
            let g2 = guestName2.trim() || names[1] || "Jugador 2";

            const guestPlayer: Player = {
                id: oldPlayerId,
                name: `${g1} / ${g2}`,
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

        // Remove from matches if they were generated
        setMatches(prevMatches => prevMatches.filter(m =>
            m.team1.id !== playerId && m.team2.id !== playerId
        ));

        // Update counts
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

    const handleDeleteMatch = async (matchId: string) => {
        if (!confirm("¿Seguro que querés eliminar este partido? Los jugadores volverán a estar disponibles.")) return;

        const updatedMatches = matches.filter(m => m.id !== matchId);
        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches: updatedMatches,
            bracket,
            modalidad: { numCourts, matchesPerTeam, isIndividual }
        });

        if (res.ok) {
            setMatches(updatedMatches);
            toast.success("Partido eliminado");
        } else {
            toast.error("Error al eliminar: " + res.error);
        }
        setSaving(false);
    };

    const handleUpdateMatchPlayer = async (matchId: string, playerIndex: 1 | 2, newPlayer: Player) => {
        const updatedMatches = matches.map(m => {
            if (m.id !== matchId) return m;
            return {
                ...m,
                team1: playerIndex === 1 ? newPlayer : m.team1,
                team2: playerIndex === 2 ? newPlayer : m.team2,
            };
        });

        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches: updatedMatches,
            bracket,
            modalidad: { numCourts, matchesPerTeam, isIndividual }
        });

        if (res.ok) {
            setMatches(updatedMatches);
            toast.success("Jugador actualizado en el partido");
            setEditingMatchPlayer(null);
        } else {
            toast.error("Error al actualizar jugador: " + res.error);
        }
        setSaving(false);
    };




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

    const generateNextMatch = async (courtNum: number) => {
        const players = groups[0]?.players || [];
        if (players.length < 2) return;

        // 1. Identify currently playing players
        const currentlyPlaying = new Set(
            matches
                .filter(m => !m.confirmed)
                .flatMap(m => [m.team1.id, m.team2.id])
        );

        // 2. Count matches per player
        const playerMatchCounts = new Map<string, number>();
        players.forEach(p => playerMatchCounts.set(p.id, 0));
        matches.filter(m => m.confirmed).forEach(m => {
            playerMatchCounts.set(m.team1.id, (playerMatchCounts.get(m.team1.id) || 0) + 1);
            playerMatchCounts.set(m.team2.id, (playerMatchCounts.get(m.team2.id) || 0) + 1);
        });

        // 3. Find available players (not playing and matches < target)
        const available = players.filter(p => !currentlyPlaying.has(p.id) && (playerMatchCounts.get(p.id) || 0) < matchesPerTeam);

        if (available.length < 2) {
            const finishedCount = players.filter(p => (playerMatchCounts.get(p.id) || 0) >= matchesPerTeam).length;
            const playingCount = currentlyPlaying.size;
            const waitingCount = available.length;

            setNoPlayersData({ finished: finishedCount, playing: playingCount, waiting: waitingCount });
            return;
        }

        // 4. Algorithm: Pick the two players with the fewest matches played,
        // prioritizing those from different clubs and who haven't played against each other.
        const sortedAvailable = [...available].sort((a, b) =>
            (playerMatchCounts.get(a.id) || 0) - (playerMatchCounts.get(b.id) || 0)
        );

        const p1 = sortedAvailable[0]!;
        const candidateP2s = sortedAvailable.slice(1);

        // Track who p1 has already played against
        const playedAgainstP1 = new Set(
            matches
                .filter(m => (m.team1.id === p1.id || m.team2.id === p1.id))
                .map(m => m.team1.id === p1.id ? m.team2.id : m.team1.id)
        );

        // Pick best p2 based on multiple criteria
        const p2 = candidateP2s.sort((a, b) => {
            // Priority 1: Fewer matches played (stick to the main sorting)
            const countA = playerMatchCounts.get(a.id) || 0;
            const countB = playerMatchCounts.get(b.id) || 0;
            if (countA !== countB) return countA - countB;

            // Priority 2: Different Club (Avoid same-club matchups)
            const sameClubA = a.clubId && p1.clubId && a.clubId === p1.clubId;
            const sameClubB = b.clubId && p1.clubId && b.clubId === p1.clubId;
            if (sameClubA !== sameClubB) return sameClubA ? 1 : -1;

            // Priority 3: Haven't played against each other yet
            const playedA = playedAgainstP1.has(a.id);
            const playedB = playedAgainstP1.has(b.id);
            if (playedA !== playedB) return playedA ? 1 : -1;

            return 0;
        })[0]!;

        const newMatch: Match = {
            id: `dym_${Date.now()}_${courtNum}`,
            groupId: groups[0]?.id || "g0",
            team1: p1,
            team2: p2,
            score1: 0,
            score2: 0,
            played: true,
            confirmed: false,
            courtNumber: courtNum,
            roundIndex: Math.floor(matches.length / numCourts) // Rough round estimate
        };

        const nextMatches = [...matches, newMatch];
        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches: nextMatches,
            bracket,
            modalidad: { numCourts, matchesPerTeam, isIndividual }
        });

        if (res.ok) {
            setMatches(nextMatches);
            toast.success(`Partido generado en Cancha ${courtNum}`);
        } else {
            toast.error("Error al generar partido: " + res.error);
        }
        setSaving(false);
    };

    const standings = useMemo(() => computeStandings(), [computeStandings]);

    // AUTO-SYNC BRACKET EFFECT
    useEffect(() => {
        if (!standings.length || readOnly) return;

        // If bracket doesn't exist, create it
        if (bracket.length === 0) {
            const numRounds = Math.ceil(Math.log2(standings.length));
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

            // Initial map
            const firstRoundIdx = numRounds - 1;
            const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);
            const topPlayers = standings;

            for (let i = 0; i < seedPositions.length; i += 2) {
                const mIdx = i / 2;
                const s1 = seedPositions[i];
                const s2 = seedPositions[i + 1];
                const match = firstRoundMatches[mIdx];
                if (match) {
                    match.team1 = (topPlayers[s1 - 1]?.player || "BYE") as BracketSlot;
                    match.team2 = (topPlayers[s2 - 1]?.player || "BYE") as BracketSlot;
                    if (match.team1 === "BYE" || match.team2 === "BYE") {
                        match.confirmed = true;
                        const winner = match.team1 === "BYE" ? match.team2 : match.team1;
                        if (winner && winner !== "BYE") {
                            match.winnerId = (winner as Player).id;
                            match.winnerName = (winner as Player).name;
                        }
                    }
                }
            }
            setBracket(newBracket);
            return;
        }

        // If bracket exists, sync unconfirmed matches with standings
        const bracketHasStarted = bracket.some(m => m.confirmed && m.team1 !== "BYE" && m.team2 !== "BYE");
        if (bracketHasStarted) return; // Stop auto-sync once a real playoff match is confirmed

        const targetCount = standings.length;
        const topPlayers = standings;

        setBracket(prev => {
            const next = [...prev];
            let changed = false;

            if (targetCount === 10) {
                // SPECIAL SYNC FOR 10 PLAYERS
                const firstRoundMatches = next.filter(m => m.round === 3);
                const pairings = [
                    { s1: 0, s2: -1 }, // P1 vs BYE (Slot 0)
                    { s1: 8, s2: 9 },  // P9 vs P10 (Slot 1)
                    { s1: 5, s2: -1 }, // P6 vs BYE (Slot 2)
                    { s1: 2, s2: -1 }, // P3 vs BYE (Slot 3)
                    { s1: 1, s2: -1 }, // P2 vs BYE (Slot 4)
                    { s1: 7, s2: 6 },  // P8 vs P7  (Slot 5)
                    { s1: 4, s2: -1 }, // P5 vs BYE (Slot 6)
                    { s1: 3, s2: -1 }, // P4 vs BYE (Slot 7)
                ];

                pairings.forEach((p, i) => {
                    const match = firstRoundMatches.find(m => m.slot === i);
                    if (match) {
                        const t1 = topPlayers[p.s1].player;
                        const t2 = p.s2 === -1 ? "BYE" : topPlayers[p.s2].player;

                        if (JSON.stringify(match.team1) !== JSON.stringify(t1) || JSON.stringify(match.team2) !== JSON.stringify(t2)) {
                            match.team1 = t1;
                            match.team2 = t2 as BracketSlot;

                            // Essential fix: If it's not a BYE anymore, it shouldn't be confirmed
                            match.confirmed = t2 === "BYE";
                            if (t2 === "BYE") {
                                match.winnerId = t1.id;
                                match.winnerName = t1.name;
                            } else {
                                match.winnerId = undefined;
                                match.winnerName = undefined;
                            }
                            changed = true;
                        }
                    }
                });

                // Re-sync advances for BYEs in R2
                if (changed) {
                    next.filter(m => m.round === 3 && m.confirmed).forEach(m => {
                        const nextM = next.find(nm => nm.round === 2 && nm.slot === Math.floor(m.slot / 2));
                        if (nextM) {
                            if (m.slot % 2 === 0) nextM.team1 = { ...m.team1 as Player };
                            else nextM.team2 = { ...m.team1 as Player };
                        }
                    });
                }
            } else {
                // STANDARD SYNC LOGIC
                const numRounds = Math.ceil(Math.log2(targetCount));
                const bracketSize = Math.pow(2, numRounds);
                const seedPositions = getSeedingOrder(bracketSize);
                const firstRoundIdx = numRounds - 1;
                const firstRoundMatches = next.filter(m => m.round === firstRoundIdx);

                for (let i = 0; i < seedPositions.length; i += 2) {
                    const mIdx = i / 2;
                    const s1 = seedPositions[i];
                    const s2 = seedPositions[i + 1];
                    const match = firstRoundMatches[mIdx];

                    // Essential fix: Allow update if it's unconfirmed OR if it's a BYE (to handle transition to real match)
                    if (match && (!match.confirmed || match.team1 === "BYE" || match.team2 === "BYE")) {
                        const t1 = (topPlayers[s1 - 1]?.player || "BYE") as BracketSlot;
                        const t2 = (topPlayers[s2 - 1]?.player || "BYE") as BracketSlot;

                        if (JSON.stringify(match.team1) !== JSON.stringify(t1) || JSON.stringify(match.team2) !== JSON.stringify(t2)) {
                            match.team1 = t1;
                            match.team2 = t2;

                            // Reset confirmation if no longer a BYE
                            match.confirmed = (t1 === "BYE" || t2 === "BYE");
                            if (match.confirmed) {
                                const winner = t1 === "BYE" ? t2 : t1;
                                if (winner && winner !== "BYE") {
                                    match.winnerId = (winner as Player).id;
                                    match.winnerName = (winner as Player).name;
                                }
                            } else {
                                match.winnerId = undefined;
                                match.winnerName = undefined;
                            }
                            changed = true;
                        }
                    }
                }
            }
            return changed ? [...next] : prev;
        });

    }, [standings, readOnly, bracket.length]);

    const playingIds = useMemo(() => new Set(
        matches
            .filter(m => !m.confirmed)
            .flatMap(m => [m.team1.id, m.team2.id])
    ), [matches]);

    const filteredStandings = useMemo(() => {
        if (playersTab === "pending") return standings.filter(s => s.matchesPlayed < matchesPerTeam);
        if (playersTab === "done") return standings.filter(s => s.matchesPlayed >= matchesPerTeam);
        return standings;
    }, [standings, playersTab, matchesPerTeam]);

    const handleConfirmScore = async (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        // Default to 0 if scores are missing
        const s1 = match.score1 ?? 0;
        const s2 = match.score2 ?? 0;

        const updatedMatches = matches.map(m => m.id === matchId ? { ...m, score1: s1, score2: s2, confirmed: true } : m);
        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches: updatedMatches,
            bracket,
            modalidad: { numCourts, matchesPerTeam, isIndividual }
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
                score1: s1 === "" ? 0 : parseInt(s1, 10),
                score2: s2 === "" ? 0 : parseInt(s2, 10),
                played: true
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

    const generateBracket = async (count?: number) => {
        const targetCount = count ?? standings.length;
        const topPlayers = standings.slice(0, targetCount);
        if (topPlayers.length < 2) {
            toast.error("Se necesitan al menos 2 participantes para generar el cuadro");
            return;
        }

        let newBracket: BracketMatch[] = [];

        // SPECIAL CASE: 10 PLAYERS (Full Tree with Visual BYEs)
        if (targetCount === 10) {
            // Round 3: Octavos (8 slots to show everyone)
            const pairings = [
                { s1: 0, s2: -1 }, // P1 vs BYE (Slot 0)
                { s1: 8, s2: 9 },  // P9 vs P10 (Slot 1)
                { s1: 5, s2: -1 }, // P6 vs BYE (Slot 2)
                { s1: 2, s2: -1 }, // P3 vs BYE (Slot 3)
                { s1: 1, s2: -1 }, // P2 vs BYE (Slot 4)
                { s1: 7, s2: 6 },  // P8 vs P7  (Slot 5)
                { s1: 4, s2: -1 }, // P5 vs BYE (Slot 6)
                { s1: 3, s2: -1 }, // P4 vs BYE (Slot 7)
            ];

            pairings.forEach((p, i) => {
                const t1 = topPlayers[p.s1].player;
                const t2 = p.s2 === -1 ? "BYE" : topPlayers[p.s2].player;
                const isBye = t2 === "BYE";

                newBracket.push({
                    id: `b_3_${i}`,
                    round: 3,
                    slot: i,
                    team1: t1,
                    team2: t2 as BracketSlot,
                    confirmed: isBye,
                    winnerId: isBye ? t1.id : undefined,
                    winnerName: isBye ? t1.name : undefined
                });
            });

            // Round 2 (Cuartos), Round 1 (Semis), Round 0 (Final)
            [2, 1, 0].forEach(r => {
                const numMatches = Math.pow(2, r);
                for (let s = 0; s < numMatches; s++) {
                    newBracket.push({
                        id: `b_${r}_${s}`,
                        round: r,
                        slot: s,
                        team1: null,
                        team2: null,
                        confirmed: false
                    });
                }
            });

            // 1. Auto-advance the BYEs from Octavos to Cuartos
            newBracket.filter(m => m.round === 3 && m.confirmed).forEach(m => {
                const next = newBracket.find(nm => nm.round === 2 && nm.slot === Math.floor(m.slot / 2));
                if (next) {
                    const player = m.team1 as Player;
                    if (m.slot % 2 === 0) next.team1 = { ...player }; // Deep copy to trigger state
                    else next.team2 = { ...player };
                }
            });

            // 2. Further auto-advance if Cuartos now has matches where BOTH are BYEs (like Q2 and Q4)
            // This ensures Semis are also populated if possible
            [2, 1].forEach(r => {
                const currentRoundMatches = newBracket.filter(m => m.round === r);
                currentRoundMatches.forEach(m => {
                    if (m.team1 && m.team2 && (m.team1 as any) !== "BYE" && (m.team2 as any) !== "BYE") {
                        // All good, match is ready to be played
                    } else if (m.team1 && (m.team2 as any) === "BYE") {
                        // Handled by standard confirmed logic if we mark it
                    }
                });
            });
        } else {
            // STANDARD LOGIC FOR OTHER COUNTS
            const numRounds = Math.ceil(Math.log2(targetCount));
            const bracketSize = Math.pow(2, numRounds);
            const seedPositions = getSeedingOrder(bracketSize);

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

            // Auto-advance BYEs
            for (let r = firstRoundIdx; r > 0; r--) {
                const currentRound = newBracket.filter(bm => bm.round === r);
                currentRound.forEach(bm => {
                    if (bm.confirmed && bm.winnerId) {
                        const next = newBracket.find(nm => nm.round === r - 1 && nm.slot === Math.floor(bm.slot / 2));
                        if (next) {
                            const winner = [bm.team1, bm.team2].find(t => t !== null && (t as any) !== "BYE" && (t as Player)?.id === bm.winnerId);
                            if (bm.slot % 2 === 0) next.team1 = winner as Player;
                            else next.team2 = winner as Player;
                        }
                    }
                });
            }
        }

        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: newBracket
        });

        if (res.ok) {
            setBracket(newBracket);
            toast.success("Cuadro generado correctamente");
        } else {
            toast.error("Error al generar: " + res.error);
        }
        setSaving(false);
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        const match = bracket.find(m => m.id === matchId);
        if (match?.confirmed || readOnly) return;

        setBracket(bracket.map(m => m.id === matchId ? {
            ...m,
            score1: s1 === "" ? undefined : parseInt(s1, 10),
            score2: s2 === "" ? undefined : parseInt(s2, 10),
        } : m));
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
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: updated
        });

        if (res.ok) {
            setBracket(updated);
            toast.success("Partido reabierto para edición");
        } else {
            toast.error("Error al reabrir: " + res.error);
        }
        setSaving(false);
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
        const is10Player = standings.length === 10;
        let finalBracket = [...updated];

        for (let r = totalRounds - 1; r > 0; r--) {
            const current = finalBracket.filter(m => m.round === r);
            current.forEach(m => {
                if (m.confirmed && m.winnerId) {
                    let nextMatch;
                    let targetTeamSlot: 'team1' | 'team2' = m.slot % 2 === 0 ? 'team1' : 'team2';

                    // Standard progression
                    nextMatch = finalBracket.find(nm => nm.round === r - 1 && nm.slot === Math.floor(m.slot / 2));

                    if (nextMatch) {
                        const winnerP = [m.team1, m.team2].find(t => t !== null && (t as any) !== "BYE" && (t as Player)?.id === m.winnerId);
                        nextMatch[targetTeamSlot] = winnerP as Player;
                    }
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
        { id: "setup", label: "Check-in", icon: Users2, completed: step === "active" },
        { id: "active", label: "Manager", icon: Swords, completed: initialStatus === "finalizado" },
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
                <div className="w-full px-4 md:px-8 lg:px-12 h-24 flex items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => {
                                if (step === "active") setStep("setup");
                                else router.push("/admin/tournaments");
                            }}
                            className="group flex items-center gap-3 text-foreground/70 hover:text-foreground transition-all px-4 py-2 hover:bg-muted rounded-2xl"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Volver</span>
                        </button>

                        <div className="h-10 w-px bg-border/30 hidden md:block" />

                        <div className="hidden md:flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary leading-none mb-1">Torneo</span>
                            <span className="text-xs font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[150px] lg:max-w-[250px]">
                                {tournamentName}
                            </span>
                        </div>

                        <div className="h-10 w-px bg-border/30 hidden md:block" />

                        {/* DESKTOP STEPPER */}
                        <div className="hidden lg:flex items-center gap-2">
                            {(() => {
                                const steps = [
                                    { id: "setup", label: "Asistencia", icon: Users2, active: step === "setup", completed: step !== "setup" },
                                    { id: "active", label: "Gestión En Vivo", icon: SwitchedIcon, active: step === "active", completed: initialStatus === "finalizado" },
                                ];

                                function SwitchedIcon(props: any) {
                                    return isGroupStageFinished ? <Trophy {...props} /> : <Swords {...props} />;
                                }

                                return steps.map((s, idx) => {
                                    const Icon = s.icon;
                                    const isAccessible = true;

                                    return (
                                        <div key={s.id} className="flex items-center">
                                            <button
                                                onClick={() => isAccessible && setStep(s.id as any)}
                                                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl transition-all ${s.active
                                                    ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                    : s.completed
                                                        ? "text-azul-primary bg-azul-primary/5 hover:bg-azul-primary/10"
                                                        : "text-foreground/60 hover:bg-muted/80"
                                                    }`}
                                            >
                                                <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${s.active ? "animate-pulse" : ""}`} />
                                                <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest hidden sm:block">
                                                    {s.label}
                                                </span>
                                                {s.completed && <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 ml-1" />}
                                            </button>
                                            {idx < 1 && <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 mx-0.5 lg:mx-1 text-border/40" />}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-azul-primary/5 border border-azul-primary/20 text-azul-primary text-[10px] font-black uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-azul-primary animate-pulse" />
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
            <div className="w-full px-4 md:px-8 lg:px-12 py-8 pb-32">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-[-0.05em] italic uppercase leading-[0.9]">
                        {tournamentName}
                    </h1>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70">
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
                            <div className="w-full space-y-8 pb-32">
                                <div className="text-center space-y-4">
                                    <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter uppercase italic mb-3">Lista de Asistencia</h2>
                                    <p className="text-azul-primary text-xs font-black uppercase tracking-[0.3em]">Verificación de Jugadores y Presentismo</p>
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
                                            className="w-full bg-muted/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-azul-primary transition-all placeholder:text-foreground/20"
                                        />
                                    </div>
                                    {!readOnly && (
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <button
                                                onClick={() => {
                                                    const allIds = (initialGroups[0]?.players || []).map((p: Player) => p.id);
                                                    setPaid(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                                }}
                                                className="flex-1 md:flex-none px-6 py-4 bg-azul-primary/10 text-azul-primary rounded-2xl font-black uppercase text-[9px] tracking-widest border border-azul-primary/20 hover:bg-azul-primary hover:text-white transition-all shadow-lg shadow-azul-primary/5"
                                            >
                                                Todo Pago
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const allIds = (initialGroups[0]?.players || []).map((p: Player) => p.id);
                                                    setPresent(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                                                }}
                                                className="flex-1 md:flex-none px-6 py-4 bg-azul-primary/10 text-azul-primary rounded-2xl font-black uppercase text-[9px] tracking-widest border border-azul-primary/20 hover:bg-azul-primary hover:text-white transition-all shadow-lg shadow-azul-primary/5"
                                            >
                                                Todo Ok
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Players Table */}
                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
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
                                            {(initialGroups[0]?.players || []).filter((p: Player) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p: Player) => {
                                                const isPresent = present.has(p.id);
                                                const isPaid = paid.has(p.id);
                                                return (
                                                    <tr
                                                        key={p.id}
                                                        className={`group transition-all hover:bg-muted/30 ${isPresent ? "bg-azul-primary/[0.02]" : ""}`}
                                                    >
                                                        <td className="px-4 py-1.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${isPresent ? "bg-azul-primary text-white" : "bg-muted text-foreground/20"}`}>
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
                                                                        ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                                        : "bg-muted/30 border-border/40 text-foreground/20 hover:border-azul-primary/30 hover:text-azul-primary"
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
                                            onClick={() => setStep("active")}
                                            disabled={present.size < 2}
                                            className="w-full py-6 bg-azul-primary text-white rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-[0_20px_50px_rgba(0,119,255,0.4)] hover:bg-azul-dark hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                        >
                                            Iniciar Torneo ({present.size})
                                            <ChevronRight className="w-6 h-6" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                    {step === "active" && (
                        <motion.div
                            key="active-stage"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-24"
                        >
                            {/* Court Dashboard Title */}
                            <div className="text-center space-y-4">
                                <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter uppercase italic">Control de Canchas En Vivo</h2>
                                <p className="text-azul-primary text-[10px] font-black uppercase tracking-[0.3em]">Gestión de Partidos en Tiempo Real</p>

                                {/* Progress Tracker */}
                                {(() => {
                                    const totalPossibleMatches = Math.ceil(((groups[0]?.players?.length || 0) * matchesPerTeam) / 2);
                                    const completedMatches = matches.filter(m => m.confirmed).length;
                                    const progress = totalPossibleMatches > 0 ? (completedMatches / totalPossibleMatches) * 100 : 0;

                                    return (
                                        <div className="max-w-4xl mx-auto mt-10 space-y-4">
                                            <div className="flex items-end justify-between px-2">
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/20 leading-none mb-2">Progreso General Fase de Grupos</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl font-black italic text-foreground/80">{completedMatches}</span>
                                                        <span className="text-xs font-black uppercase text-foreground/20 italic">de</span>
                                                        <span className="text-2xl font-black italic text-foreground/80">{totalPossibleMatches}</span>
                                                        <span className="text-xs font-black uppercase text-foreground/20 italic ml-2 tracking-widest">Partidos Finalizados</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-4xl font-black italic text-azul-primary leading-none">{Math.round(progress)}<span className="text-lg ml-0.5">%</span></span>
                                                </div>
                                            </div>
                                            <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden border border-border/40 p-[3px] shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 1.5, ease: "circOut" }}
                                                    className="h-full rounded-full bg-gradient-to-r from-azul-primary via-celeste to-azul-dark shadow-[0_0_25px_rgba(0,119,255,0.5)] relative"
                                                >
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {!readOnly && (
                                    <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
                                        <div className="flex items-center gap-3 px-6 py-4 bg-muted/30 border border-border/50 rounded-2xl shadow-xl">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-foreground/70 leading-none">Canchas</span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <button
                                                        onClick={() => handleUpdateConfig(Math.max(1, numCourts - 1), matchesPerTeam)}
                                                        className="w-6 h-6 rounded-lg bg-background border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3 text-foreground/70" />
                                                    </button>
                                                    <span className="text-sm font-black italic w-6 text-center">{numCourts}</span>
                                                    <button
                                                        onClick={() => handleUpdateConfig(numCourts + 1, matchesPerTeam)}
                                                        className="w-6 h-6 rounded-lg bg-background border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3 text-foreground/70" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 px-6 py-4 bg-muted/30 border border-border/50 rounded-2xl shadow-xl">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-foreground/70 leading-none">Ptos / Jugador</span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <button
                                                        onClick={() => handleUpdateConfig(numCourts, Math.max(1, matchesPerTeam - 1))}
                                                        className="w-6 h-6 rounded-lg bg-background border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3 text-foreground/70" />
                                                    </button>
                                                    <span className="text-sm font-black italic w-6 text-center">{matchesPerTeam}</span>
                                                    <button
                                                        onClick={() => handleUpdateConfig(numCourts, matchesPerTeam + 1)}
                                                        className="w-6 h-6 rounded-lg bg-background border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3 text-foreground/70" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/tournaments/${tournamentId}/fixture`}
                                            className="px-6 py-5 bg-foreground text-background rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] italic hover:scale-105 transition-all shadow-xl"
                                        >
                                            Pantalla Setup
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Court Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Array.from({ length: numCourts }).map((_, courtIdx) => {
                                    const courtNumber = courtIdx + 1;
                                    const activeMatch = matches.find(m => m.courtNumber === courtNumber && !m.confirmed);

                                    return (
                                        <div key={courtNumber} className="relative group">
                                            <div className="absolute -top-3 right-4 flex items-center gap-2 z-10">
                                                <div className="px-3 py-1 bg-azul-primary/10 text-azul-primary border border-azul-primary/20 backdrop-blur-md rounded-full text-[7px] font-black uppercase tracking-widest shadow-lg">
                                                    Cancha {courtNumber}
                                                </div>
                                                {activeMatch && !readOnly && (
                                                    <button
                                                        onClick={() => handleDeleteMatch(activeMatch.id)}
                                                        className="p-1.5 bg-background/80 backdrop-blur-md text-rojo hover:bg-rojo hover:text-white rounded-lg transition-all border border-border/50 shadow-sm"
                                                        title="Eliminar Partido"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className={`rounded-2xl border-2 transition-all duration-500 flex flex-col shadow-xl relative overflow-hidden group-hover:border-celeste/40 min-h-[110px] ${activeMatch && !readOnly ? "border-celeste/40 bg-celeste/[0.03] shadow-[inset_0_0_40px_rgba(var(--celeste-rgb),0.05)]" : "border-border/50 bg-card/40 backdrop-blur-xl"}`}>
                                                {activeMatch && !readOnly && (
                                                    <div className="absolute top-0 left-0 bg-rojo text-white px-2 py-0.5 text-[6px] font-black italic rounded-tl-xl rounded-br-lg shadow-lg z-10 animate-pulse tracking-widest uppercase">
                                                        VIVO
                                                    </div>
                                                )}
                                                {activeMatch ? (
                                                    <div className="p-2.5 flex-1 flex flex-col justify-center">
                                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                                            {/* Equipo 1 */}
                                                            <div className="flex flex-col gap-2 min-w-0">
                                                                <div className="flex flex-col min-w-0">
                                                                    {activeMatch.team1.name.split('/').map((name: string, i: number) => (
                                                                        <span key={i} className={`font-black uppercase italic leading-tight truncate ${i === 0 ? "text-[10px] text-foreground/80" : "text-[8px] text-foreground/50 mt-0.5"}`}>
                                                                            {name.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                {!readOnly ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={activeMatch.score1 ?? ""}
                                                                            onChange={(e) => handleScoreChange(activeMatch.id, e.target.value, activeMatch.score2?.toString() ?? "")}
                                                                            className="w-10 h-8 bg-background border border-border/40 rounded-lg text-center font-black text-xs outline-none focus:border-celeste/50 no-spin-buttons placeholder:text-foreground/10"
                                                                            placeholder="0"
                                                                        />
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <button onClick={() => handleScoreChange(activeMatch.id, ((activeMatch.score1 || 0) + 1).toString(), activeMatch.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-celeste"><Plus className="w-2.5 h-2.5" /></button>
                                                                            <button onClick={() => handleScoreChange(activeMatch.id, Math.max(0, (activeMatch.score1 || 0) - 1).toString(), activeMatch.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-celeste"><Minus className="w-2.5 h-2.5" /></button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-sm font-black italic text-celeste">{activeMatch.score1}</span>
                                                                )}
                                                            </div>

                                                            {/* Acciones Centrales */}
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="text-[8px] font-black text-foreground/40 italic">VS</div>
                                                                {!readOnly && (
                                                                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => handleConfirmScore(activeMatch.id)}
                                                                            disabled={saving}
                                                                            className="w-[52px] py-1 rounded-md bg-celeste text-azul-primary text-[8px] font-black italic uppercase border border-celeste/20 hover:bg-celeste/80 transition-all disabled:opacity-30 flex items-center justify-center"
                                                                        >
                                                                            FIN
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteMatch(activeMatch.id)}
                                                                            className="w-[52px] py-1 rounded-md bg-rojo/10 text-rojo text-[8px] font-black italic uppercase border border-rojo/20 hover:bg-rojo hover:text-white transition-all flex items-center justify-center"
                                                                        >
                                                                            BORRAR
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Equipo 2 */}
                                                            <div className="flex flex-col items-end gap-2 min-w-0">
                                                                <div className="flex flex-col items-end min-w-0">
                                                                    {activeMatch.team2.name.split('/').map((name: string, i: number) => (
                                                                        <span key={i} className={`font-black uppercase italic leading-tight truncate text-right ${i === 0 ? "text-[10px] text-foreground/80" : "text-[8px] text-foreground/50 mt-0.5"}`}>
                                                                            {name.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                {!readOnly ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <button onClick={() => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", ((activeMatch.score2 || 0) + 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-celeste"><Plus className="w-2.5 h-2.5" /></button>
                                                                            <button onClick={() => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", Math.max(0, (activeMatch.score2 || 0) - 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-celeste"><Minus className="w-2.5 h-2.5" /></button>
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            value={activeMatch.score2 ?? ""}
                                                                            onChange={(e) => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", e.target.value)}
                                                                            className="w-10 h-8 bg-background border border-border/40 rounded-lg text-center font-black text-xs outline-none focus:border-celeste/50 no-spin-buttons placeholder:text-foreground/10"
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-sm font-black italic text-celeste">{activeMatch.score2}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-2.5 flex flex-col items-center justify-center gap-3 min-h-[110px] text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-lg bg-muted/50 flex items-center justify-center text-foreground/20">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                </div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic">Cancha Libre</p>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-foreground/20 italic whitespace-nowrap">Disponible para jugar</p>
                                                        </div>
                                                        {!readOnly && (
                                                            <button
                                                                onClick={() => generateNextMatch(courtNumber)}
                                                                disabled={saving}
                                                                className="w-full max-w-[120px] py-1.5 bg-celeste text-azul-primary border border-celeste/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-celeste/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-celeste/10"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Generar
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Ranking Table */}
                                <div className="lg:col-span-12 space-y-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-azul-primary/10 flex items-center justify-center">
                                                <Users2 className="w-4 h-4 text-azul-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black uppercase italic tracking-tight">Estado de Jugadores</h3>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-foreground/70 mt-0.5">Control de partidos y ranking</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center p-1 bg-muted/50 border border-border/50 rounded-xl gap-1">
                                            <button onClick={() => setPlayersTab("all")} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${playersTab === "all" ? "bg-foreground text-background shadow-md" : "hover:bg-muted text-foreground/70"}`}>
                                                Todos ({standings.length})
                                            </button>
                                            <button onClick={() => setPlayersTab("pending")} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${playersTab === "pending" ? "bg-celeste text-azul-primary shadow-md" : "hover:bg-muted text-foreground/70"}`}>
                                                Pendientes ({standings.filter(s => s.matchesPlayed < matchesPerTeam).length})
                                            </button>
                                            <button onClick={() => setPlayersTab("done")} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${playersTab === "done" ? "bg-azul-primary text-white shadow-md" : "hover:bg-muted text-foreground/70"}`}>
                                                Completos ({standings.filter(s => s.matchesPlayed >= matchesPerTeam).length})
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-xl transition-all">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-muted/50 text-[8px] font-black uppercase tracking-widest text-foreground/70 border-b border-border/50">
                                                    <tr>
                                                        <th className="px-4 py-3">#</th>
                                                        <th className="px-4 py-3">Jugador</th>
                                                        <th className="px-4 py-3 text-center">Estado</th>
                                                        <th className="px-4 py-3 text-center">PJ</th>
                                                        <th className="px-4 py-3 text-center">G-P</th>
                                                        <th className="px-4 py-3 text-center text-azul-primary">Dif</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {filteredStandings.map((s, idx) => {
                                                        const isPlaying = playingIds.has(s.playerId);
                                                        const isDone = s.matchesPlayed >= matchesPerTeam;
                                                        const rank = standings.findIndex(st => st.playerId === s.playerId) + 1;
                                                        return (
                                                            <tr key={s.playerId} className={`group hover:bg-muted/30 transition-all ${isPlaying ? "bg-azul-primary/[0.05]" : isDone ? "bg-azul-primary/[0.01]" : ""}`}>
                                                                <td className="px-4 py-1.5">
                                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black italic shadow-sm ${rank === 1 ? "bg-celeste text-azul-primary" : "bg-muted text-foreground/70"}`}>
                                                                        {rank}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-1.5">
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-azul-primary/20 to-celeste/20 flex items-center justify-center text-[9px] font-black text-azul-primary border border-white/10 shrink-0">
                                                                                {s.player.name.charAt(0)}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[10px] font-black uppercase italic leading-tight text-foreground/80 tracking-tight">{s.player.name}</span>
                                                                                {isPlaying && (
                                                                                    <span className="text-[7px] font-black uppercase tracking-widest text-rojo flex items-center gap-1 mt-0.5">
                                                                                        <div className="w-1 h-1 bg-rojo rounded-full animate-pulse" />
                                                                                        Jugando
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {!readOnly && (
                                                                            <button
                                                                                onClick={() => setReplacingPlayer(s.player)}
                                                                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-celeste/20 text-azul-primary hover:bg-celeste/40 transition-all opacity-0 group-hover:opacity-100"
                                                                            >
                                                                                <RotateCcw className="w-2.5 h-2.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-1.5 text-center">
                                                                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-azul-primary" /> : isPlaying ? <div className="text-[7px] font-black uppercase text-azul-primary animate-pulse">En Cancha</div> : <Clock className="w-3.5 h-3.5 mx-auto text-foreground/20" />}
                                                                </td>
                                                                <td className="px-4 py-1.5 text-center text-[9px] font-black italic text-foreground/50">{s.matchesPlayed} / {matchesPerTeam}</td>
                                                                <td className="px-4 py-1.5 text-center font-bold text-[9px]">
                                                                    <span className="text-celeste">{s.won}</span>-<span className="text-rojo/60">{s.lost}</span>
                                                                </td>
                                                                <td className="px-4 py-1.5 text-center font-black text-[10px]">
                                                                    <span className={s.points >= 0 ? "text-azul-primary" : "text-rojo"}>
                                                                        {s.points > 0 ? `+${s.points}` : s.points}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Playoff Configuration & Generation Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-border/50 pt-24 mt-24">
                                <div className="lg:col-span-12 flex flex-col gap-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-azul-primary/10 flex items-center justify-center">
                                                <Trophy className="w-6 h-6 text-azul-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight">Cuadro de Eliminatorias</h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/70 mt-0.5">Definición del campeonato • Actualización en tiempo real</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-azul-primary bg-azul-primary/10 px-4 py-2 rounded-full border border-azul-primary/20">
                                                <Zap className="w-4 h-4 animate-pulse" />
                                                Bracket Dinámico
                                            </div>
                                            {bracket.length > 0 && !readOnly && (
                                                <button
                                                    onClick={() => { if (confirm("¿Borrar y reiniciar cuadro?")) setBracket([]); }}
                                                    className="p-2 rounded-lg bg-rojo/10 text-rojo hover:bg-rojo hover:text-white transition-all shadow-lg shadow-rojo/5"
                                                    title="Reiniciar Cuadro"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {bracket.length > 0 ? (
                                        <div className="relative">
                                            <div className="w-full relative overflow-x-auto pb-20 no-scrollbar cursor-grab active:cursor-grabbing px-4">
                                                <div className="min-w-max flex gap-12 items-stretch justify-center h-[2200px]">
                                                    {[3, 2, 1, 0].map((round) => {
                                                        const matchesInRound = bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot);
                                                        // For a 4-round bracket (up to 16 players), base grid is 16 units
                                                        const rowSpan = Math.pow(2, 4 - round - 1) * 2; // R3: 2, R2: 4, R1: 8, R0: 16

                                                        return (
                                                            <div key={round} className="w-[300px] flex flex-col pt-12">
                                                                <div className="flex-none flex flex-col items-center gap-4 mb-8">
                                                                    <span className="px-5 py-2 bg-foreground text-background rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic shadow-xl">
                                                                        {round === 0 ? "🏆 Final" : round === 1 ? "Semis" : round === 2 ? "Cuartos" : "Octavos / Play-in"}
                                                                    </span>
                                                                </div>

                                                                <div className="flex-1 grid grid-rows-[repeat(16,1fr)] h-full gap-y-8">
                                                                    {Array.from({ length: 16 / rowSpan }).map((_, slotIdx) => {
                                                                        const match = matchesInRound.find(m => m.slot === slotIdx);

                                                                        return (
                                                                            <div
                                                                                key={slotIdx}
                                                                                style={{
                                                                                    gridRowStart: slotIdx * rowSpan + 1,
                                                                                    gridRowEnd: `span ${rowSpan}`
                                                                                }}
                                                                                className="flex flex-col justify-center px-2"
                                                                            >
                                                                                {match ? (
                                                                                    <div className={`backdrop-blur-xl border-2 rounded-[2.5rem] p-5 transition-all duration-300 relative group shadow-lg ${match.confirmed ? (match.round === 0 ? "border-celeste shadow-[0_0_50px_rgba(34,211,238,0.3)] bg-celeste/5 ring-4 ring-celeste/10" : "border-azul-primary/30 bg-card/40") : "border-border/50 bg-card/40 hover:border-azul-primary/30"}`}>
                                                                                        <div className="space-y-6">
                                                                                            {match.round === 0 && match.confirmed && (
                                                                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-celeste text-azul-primary p-2 rounded-full shadow-lg z-30">
                                                                                                    <Trophy className="w-4 h-4" />
                                                                                                </div>
                                                                                            )}
                                                                                            {[match.team1, match.team2].map((team, tIdx) => (
                                                                                                <div key={tIdx} className="flex items-center justify-between gap-4 group/team">
                                                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                                                        <span className={`font-black uppercase truncate max-w-[150px] transition-all ${match.winnerId === (team as Player)?.id ? (match.round === 0 ? "text-celeste text-sm scale-105" : "text-azul-primary text-xs") : team === "BYE" ? "text-foreground/20 italic text-xs" : "text-foreground/60 text-xs"}`}>
                                                                                                            {team === "BYE" ? "PASO DIRECTO" : (team as Player)?.name || "Esperando..."}
                                                                                                        </span>
                                                                                                        {team && team !== "BYE" && !match.confirmed && !readOnly && (
                                                                                                            <button
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    setReplacingPlayer(team as Player);
                                                                                                                }}
                                                                                                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-azul-primary/10 text-azul-primary opacity-0 group-hover/team:opacity-100 transition-all hover:bg-azul-primary hover:text-white shrink-0 shadow-lg shadow-azul-primary/5"
                                                                                                                title="Reemplazar"
                                                                                                            >
                                                                                                                <RotateCcw className="w-3 h-3" />
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className={`flex items-center bg-muted/40 rounded-2xl border border-border/50 overflow-hidden h-10 ${match.confirmed ? "pointer-events-none opacity-50" : ""}`}>
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                const s1 = tIdx === 0 ? Math.max(0, (match.score1 || 0) - 1).toString() : (match.score1 || 0).toString();
                                                                                                                const s2 = tIdx === 1 ? Math.max(0, (match.score2 || 0) - 1).toString() : (match.score2 || 0).toString();
                                                                                                                handleBracketScore(match.id, s1, s2);
                                                                                                            }}
                                                                                                            disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                                            className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/60 disabled:opacity-0"
                                                                                                        >
                                                                                                            <Minus className="w-3.5 h-3.5" />
                                                                                                        </button>
                                                                                                        <input
                                                                                                            type="number"
                                                                                                            value={tIdx === 0 ? (match.score1 ?? "") : (match.score2 ?? "")}
                                                                                                            onChange={(e) => handleBracketScore(match.id, tIdx === 0 ? e.target.value : (match.score1?.toString() || ""), tIdx === 1 ? e.target.value : (match.score2?.toString() || ""))}
                                                                                                            disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                                            className="w-10 h-full bg-transparent text-center font-black text-sm focus:outline-none no-spin-buttons placeholder:text-foreground/10"
                                                                                                            placeholder="0"
                                                                                                        />
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                const s1 = tIdx === 0 ? ((match.score1 || 0) + 1).toString() : (match.score1 || 0).toString();
                                                                                                                const s2 = tIdx === 1 ? ((match.score2 || 0) + 1).toString() : (match.score2 || 0).toString();
                                                                                                                handleBracketScore(match.id, s1, s2);
                                                                                                            }}
                                                                                                            disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                                            className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/60 disabled:opacity-0"
                                                                                                        >
                                                                                                            <Plus className="w-3.5 h-3.5" />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                        <div className="mt-6">
                                                                                            {(() => {
                                                                                                const isBye = match.team1 === "BYE" || match.team2 === "BYE";
                                                                                                const isPending = !match.confirmed && !isBye && match.team1 && match.team2 && !readOnly;
                                                                                                const canEdit = match.confirmed && !isBye && !readOnly;
                                                                                                const btnText = match.confirmed ? "FINALIZADO" : isBye ? "PASO DIRECTO" : "CONFIRMAR";

                                                                                                return (
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            if (isPending) handleBracketConfirm(match.id);
                                                                                                            if (canEdit) handleBracketEdit(match.id);
                                                                                                        }}
                                                                                                        disabled={!isPending && !canEdit}
                                                                                                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl group/btn flex items-center justify-center ${isPending
                                                                                                            ? "bg-azul-primary text-white hover:bg-azul-dark shadow-azul-primary/20"
                                                                                                            : canEdit
                                                                                                                ? "bg-celeste/10 text-azul-primary hover:bg-celeste hover:text-azul-primary border border-celeste/50"
                                                                                                                : "bg-muted/50 text-foreground/20 cursor-not-allowed shadow-none"
                                                                                                            }`}
                                                                                                    >
                                                                                                        <span className={canEdit ? "group-hover/btn:hidden" : ""}>{btnText}</span>
                                                                                                        {canEdit && <span className="hidden group-hover/btn:flex items-center justify-center gap-3"><Pencil className="w-3.5 h-3.5" /> CORREGIR RESULTADO</span>}
                                                                                                    </button>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                        {match.confirmed && <div className="absolute -right-3 -top-3 bg-azul-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-4 border-background z-20"><Check className="w-4 h-4" /></div>}
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-24 rounded-[3rem] border-4 border-dashed border-border/30 bg-muted/20 flex flex-col items-center gap-6">
                                            <Circle className="w-12 h-12 text-rojo/20 animate-pulse fill-current" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-black uppercase italic text-foreground/70">Sincronizando Cuadro...</p>
                                                <p className="text-[10px] font-medium text-foreground/20 uppercase tracking-widest">Preparando eliminatorias basadas en el ranking actual</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* No Players Modal */}
            <AnimatePresence>
                {noPlayersData && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNoPlayersData(null)} className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-card border-2 border-border/50 rounded-[3rem] p-10 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />

                            <div className="flex flex-col items-center text-center space-y-8">
                                <div className="w-24 h-24 rounded-full bg-azul-primary/10 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full bg-azul-primary/5 animate-ping" />
                                    <Users2 className="w-10 h-10 text-azul-primary" />
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">Sin Jugadores Disponibles</h3>
                                    <p className="text-foreground/70 text-xs font-bold uppercase tracking-widest leading-relaxed"> No hay suficientes jugadores libres en este momento para iniciar un nuevo encuentro.</p>
                                </div>

                                <div className="w-full grid grid-cols-3 gap-4 p-6 bg-muted/30 rounded-[2rem] border border-border/50">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xl font-black italic text-azul-primary">{noPlayersData.playing}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Jugando</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 border-x border-border/50">
                                        <span className="text-xl font-black italic text-azul-primary">{noPlayersData.finished}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Completos</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xl font-black italic text-celeste">{noPlayersData.waiting}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Esperando</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setNoPlayersData(null)}
                                    className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                >
                                    Entendido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                            <div className="mb-8 w-24 h-24 bg-azul-primary text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-azul-primary/40">
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
                                        placeholder={isIndividual ? "Escribí el nombre..." : (replacingPlayer?.name.split(/[\/\+]/)[replaceSlot - 1]?.trim() || `Nombre ${replaceSlot}...`)}
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
                                    className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500"
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
            {/* MODAL CAMBIAR JUGADOR EN PARTIDO ESPECIFICO */}
            <Dialog open={!!editingMatchPlayer} onOpenChange={(open) => !open && setEditingMatchPlayer(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Seleccionar Jugador</DialogTitle>
                        <DialogDescription>
                            Elegí un jugador para reemplazar en este partido.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative my-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                        <input
                            type="text"
                            placeholder="Buscar jugador del torneo..."
                            value={playerSearchQuery}
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                            className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-azul-primary transition-all"
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {groups[0]?.players
                            .filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
                            .map((p) => {
                                const isAlreadyInMatch = matches.find(m => m.id === editingMatchPlayer?.matchId && (m.team1.id === p.id || m.team2.id === p.id));
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => editingMatchPlayer && handleUpdateMatchPlayer(editingMatchPlayer.matchId, editingMatchPlayer.playerIndex, p)}
                                        disabled={!!isAlreadyInMatch}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isAlreadyInMatch
                                            ? "bg-muted/50 border-transparent opacity-50 cursor-not-allowed"
                                            : "bg-card border-border/50 hover:border-azul-primary hover:bg-azul-primary/[0.02]"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                                <Users2 className="w-4 h-4 text-foreground/40" />
                                            </div>
                                            <span className="text-sm font-black uppercase italic">{p.name}</span>
                                        </div>
                                        {isAlreadyInMatch ? (
                                            <span className="text-[8px] font-black uppercase text-foreground/30">Ya en el partido</span>
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-azul-primary" />
                                        )}
                                    </button>
                                );
                            })
                        }
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}


