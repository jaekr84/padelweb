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
import { getAllPlayers } from "@/app/actions/players";
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
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [bracket, setBracket] = useState<BracketMatch[]>(initialBracket);
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
            played: false,
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
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/60 leading-none mb-1">Torneo</span>
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
                                                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                                                    : s.completed
                                                        ? "text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
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
                                </div>

                                {/* Players Table */}
                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-foreground/70 border-b border-border/50">
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
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">{p.category || "D"}</span>
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
                                                                    onClick={() => setPlayerToDelete(p)}
                                                                    className="w-10 h-10 rounded-xl inline-flex items-center justify-center border border-border/50 bg-muted/50 text-foreground/20 hover:border-red-500/30 hover:text-red-500 transition-all mr-2"
                                                                    title="Eliminar Participante"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>

                                                                <button
                                                                    onClick={() => setReplacingPlayer(p)}
                                                                    className="w-10 h-10 rounded-xl inline-flex items-center justify-center border border-border/50 bg-muted/50 text-foreground/20 hover:border-amber-500/30 hover:text-amber-500 transition-all"
                                                                    title="Reemplazar Jugador"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />
                                                                </button>

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
                                        onClick={() => setStep("active")}
                                        disabled={present.size < 2}
                                        className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                    >
                                        Iniciar Torneo ({present.size})
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
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
                                <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.3em]">Gestión de Partidos en Tiempo Real</p>

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
                                                    <span className="text-4xl font-black italic text-blue-600 leading-none">{Math.round(progress)}<span className="text-lg ml-0.5">%</span></span>
                                                </div>
                                            </div>
                                            <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden border border-border/40 p-[3px] shadow-inner">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 1.5, ease: "circOut" }}
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 shadow-[0_0_25px_rgba(37,99,235,0.5)] relative"
                                                >
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    );
                                })()}

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
                            </div>

                            {/* Court Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {Array.from({ length: numCourts }).map((_, courtIdx) => {
                                    const courtNumber = courtIdx + 1;
                                    const activeMatch = matches.find(m => m.courtNumber === courtNumber && !m.confirmed);

                                    return (
                                        <div key={courtNumber} className="relative group">
                                            <div className="absolute -top-3 left-8 px-4 py-1 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest z-10 shadow-lg shadow-blue-600/20">
                                                Cancha {courtNumber}
                                            </div>

                                            <div className="p-8 bg-card/40 backdrop-blur-xl border-2 border-border/50 rounded-[2.5rem] transition-all duration-500 min-h-[300px] flex flex-col justify-center shadow-2xl relative overflow-hidden group-hover:border-blue-500/30">
                                                {activeMatch ? (
                                                    <div className="space-y-6">
                                                        <div className="space-y-4">
                                                            {[activeMatch.team1, activeMatch.team2].map((team, tIdx) => (
                                                                <div key={tIdx} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50 transition-all">
                                                                    <span className="text-sm font-black uppercase italic truncate pr-4 text-foreground/70">
                                                                        {team.name}
                                                                    </span>
                                                                    <div className="flex items-center bg-background rounded-xl border border-border/50 overflow-hidden h-10">
                                                                        <button
                                                                            onClick={() => {
                                                                                const s1 = tIdx === 0 ? Math.max(0, (activeMatch.score1 || 0) - 1).toString() : (activeMatch.score1 || 0).toString();
                                                                                const s2 = tIdx === 1 ? Math.max(0, (activeMatch.score2 || 0) - 1).toString() : (activeMatch.score2 || 0).toString();
                                                                                handleScoreChange(activeMatch.id, s1, s2);
                                                                            }}
                                                                            className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/70"
                                                                        >
                                                                            <Minus className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <input
                                                                            type="number"
                                                                            value={tIdx === 0 ? (activeMatch.score1 ?? "") : (activeMatch.score2 ?? "")}
                                                                            onChange={(e) => {
                                                                                const s1 = tIdx === 0 ? e.target.value : (activeMatch.score1 || 0).toString();
                                                                                const s2 = tIdx === 1 ? e.target.value : (activeMatch.score2 || 0).toString();
                                                                                handleScoreChange(activeMatch.id, s1, s2);
                                                                            }}
                                                                            className="w-10 h-full bg-transparent text-center text-sm font-black outline-none no-spin-buttons"
                                                                            placeholder="0"
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const s1 = tIdx === 0 ? ((activeMatch.score1 || 0) + 1).toString() : (activeMatch.score1 || 0).toString();
                                                                                const s2 = tIdx === 1 ? ((activeMatch.score2 || 0) + 1).toString() : (activeMatch.score2 || 0).toString();
                                                                                handleScoreChange(activeMatch.id, s1, s2);
                                                                            }}
                                                                            className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/70"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button
                                                            onClick={() => handleConfirmScore(activeMatch.id)}
                                                            disabled={activeMatch.score1 === undefined || activeMatch.score2 === undefined || saving}
                                                            className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            Finalizar Partido
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-6 text-center">
                                                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center text-foreground/20">
                                                            <Clock className="w-8 h-8" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Cancha Disponible</p>
                                                            <p className="text-xs font-bold text-foreground/20 italic">Esperando próximo partido...</p>
                                                        </div>
                                                        <button
                                                            onClick={() => generateNextMatch(courtNumber)}
                                                            disabled={saving}
                                                            className="px-6 py-3 bg-blue-600/10 text-blue-600 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Generar Partido
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Ranking & Player Status Section */}
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                            <Users2 className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tight">Estado de Jugadores</h3>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/70 mt-0.5">Control de partidos y ranking</p>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex items-center p-1.5 bg-muted/50 border border-border/50 rounded-2xl gap-1">
                                        <button onClick={() => setPlayersTab("all")} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${playersTab === "all" ? "bg-foreground text-background shadow-lg" : "hover:bg-muted text-foreground/70"}`}>
                                            Todos ({standings.length})
                                        </button>
                                        <button onClick={() => setPlayersTab("pending")} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${playersTab === "pending" ? "bg-orange-500 text-white shadow-lg" : "hover:bg-muted text-foreground/70"}`}>
                                            Pendientes ({standings.filter(s => s.matchesPlayed < matchesPerTeam).length})
                                        </button>
                                        <button onClick={() => setPlayersTab("done")} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${playersTab === "done" ? "bg-emerald-500 text-white shadow-lg" : "hover:bg-muted text-foreground/70"}`}>
                                            Completos ({standings.filter(s => s.matchesPlayed >= matchesPerTeam).length})
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-foreground/70 border-b border-border/50">
                                            <tr>
                                                <th className="px-8 py-6">Pos</th>
                                                <th className="px-8 py-6">Jugador</th>
                                                <th className="px-8 py-6 text-center">Estado</th>
                                                <th className="px-8 py-6 text-center">Partidos</th>
                                                <th className="px-8 py-6 text-center">PG-PP</th>
                                                <th className="px-8 py-6 text-center">Dif</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {filteredStandings.map((s, idx) => {
                                                const isPlaying = playingIds.has(s.playerId);
                                                const isDone = s.matchesPlayed >= matchesPerTeam;
                                                const rank = standings.findIndex(st => st.playerId === s.playerId) + 1;
                                                return (
                                                    <tr key={s.playerId} className={`group hover:bg-muted/30 transition-all ${isPlaying ? "bg-blue-500/[0.05]" : isDone ? "bg-emerald-500/[0.02]" : ""}`}>
                                                        <td className="px-8 py-5">
                                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black italic ${rank === 1 ? "bg-amber-500 text-white" : "bg-muted text-foreground/70"}`}>
                                                                {rank}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black uppercase italic text-foreground/80">{s.player.name}</span>
                                                                    {isPlaying && <span className="text-[8px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1 mt-1"><Zap className="w-2.5 h-2.5 animate-pulse" />Jugando</span>}
                                                                </div>
                                                                <button
                                                                    onClick={() => setReplacingPlayer(s.player)}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all group/repl"
                                                                    title="Reemplazar"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5 group-hover/repl:rotate-180 transition-transform duration-500" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5 text-center">
                                                            {isDone ? <span className="text-emerald-500"><CheckCircle2 className="w-4 h-4 mx-auto" /></span> : isPlaying ? <span className="text-blue-500 animate-pulse font-black text-[8px] uppercase tracking-widest">En Cancha</span> : <span className="text-orange-500"><Clock className="w-4 h-4 mx-auto" /></span>}
                                                        </td>
                                                        <td className="px-8 py-5 text-center">
                                                            <span className="text-xs font-black italic">{s.matchesPlayed} / {matchesPerTeam}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-center font-bold text-foreground/70 text-[10px]">
                                                            <span className="text-emerald-500">{s.won}</span>-<span className="text-red-500">{s.lost}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-center font-black text-blue-600 text-sm">
                                                            {s.points > 0 ? `+${s.points}` : s.points}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Playoff Configuration & Generation Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-border/50 pt-24 mt-24">
                                <div className="lg:col-span-12 flex flex-col gap-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                                <Trophy className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight">Cuadro de Eliminatorias</h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/70 mt-0.5">Definición del campeonato • Actualización en tiempo real</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                                                <Zap className="w-4 h-4 animate-pulse" />
                                                Bracket Dinámico
                                            </div>
                                            {bracket.length > 0 && (
                                                <button
                                                    onClick={() => { if (confirm("¿Borrar y reiniciar cuadro?")) setBracket([]); }}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
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
                                                                                    <div className={`backdrop-blur-xl border-2 rounded-[2.5rem] p-5 transition-all duration-300 relative group shadow-lg ${match.confirmed ? (match.round === 0 ? "border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] bg-amber-500/5 ring-4 ring-amber-500/10" : "border-emerald-500/30 bg-card/40") : "border-border/50 bg-card/40 hover:border-blue-500/30"}`}>
                                                                                        <div className="space-y-6">
                                                                                            {match.round === 0 && match.confirmed && (
                                                                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white p-2 rounded-full shadow-lg z-30">
                                                                                                    <Trophy className="w-4 h-4" />
                                                                                                </div>
                                                                                            )}
                                                                                            {[match.team1, match.team2].map((team, tIdx) => (
                                                                                                <div key={tIdx} className="flex items-center justify-between gap-4 group/team">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                                                    <span className={`font-black uppercase truncate max-w-[150px] transition-all ${match.winnerId === (team as Player)?.id ? (match.round === 0 ? "text-amber-500 text-sm scale-105" : "text-emerald-500 text-xs") : team === "BYE" ? "text-foreground/20 italic text-xs" : "text-foreground/60 text-xs"}`}>
                                                                                                        {team === "BYE" ? "PASO DIRECTO" : (team as Player)?.name || "Esperando..."}
                                                                                                    </span>
                                                                            {team && team !== "BYE" && !match.confirmed && !readOnly && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setReplacingPlayer(team as Player);
                                                                                    }}
                                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500 opacity-0 group-hover/team:opacity-100 transition-all hover:bg-amber-500 hover:text-white shrink-0 shadow-lg shadow-amber-500/5"
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
                                                                                                                ? "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20"
                                                                                                                : canEdit
                                                                                                                    ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/50"
                                                                                                                    : "bg-muted/50 text-foreground/20 cursor-not-allowed shadow-none"
                                                                                                            }`}
                                                                                                    >
                                                                                                        <span className={canEdit ? "group-hover/btn:hidden" : ""}>{btnText}</span>
                                                                                                        {canEdit && <span className="hidden group-hover/btn:flex items-center justify-center gap-3"><Pencil className="w-3.5 h-3.5" /> CORREGIR RESULTADO</span>}
                                                                                                    </button>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                        {match.confirmed && <div className="absolute -right-3 -top-3 bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-4 border-background z-20"><Check className="w-4 h-4" /></div>}
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
                                            <Zap className="w-12 h-12 text-blue-500/20 animate-pulse" />
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
                                <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full bg-orange-500/5 animate-ping" />
                                    <Users2 className="w-10 h-10 text-orange-500" />
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">Sin Jugadores Disponibles</h3>
                                    <p className="text-foreground/70 text-xs font-bold uppercase tracking-widest leading-relaxed"> No hay suficientes jugadores libres en este momento para iniciar un nuevo encuentro.</p>
                                </div>

                                <div className="w-full grid grid-cols-3 gap-4 p-6 bg-muted/30 rounded-[2rem] border border-border/50">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xl font-black italic text-blue-500">{noPlayersData.playing}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Jugando</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 border-x border-border/50">
                                        <span className="text-xl font-black italic text-emerald-500">{noPlayersData.finished}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Completos</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xl font-black italic text-orange-500">{noPlayersData.waiting}</span>
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
                                    <span className="absolute -top-2.5 left-4 px-2 bg-background text-[8px] font-black text-blue-500 uppercase tracking-widest z-10 rounded-full border border-border/10">
                                        {isIndividual ? "Nombre Completo" : `Nombre del Jugador ${replaceSlot}`}
                                    </span>
                                    <input
                                        type="text"
                                        placeholder={isIndividual ? "Escribí el nombre..." : (replacingPlayer?.name.split(/[\/\+]/)[replaceSlot - 1]?.trim() || `Nombre ${replaceSlot}...`)}
                                        value={replaceSlot === 1 ? guestName : guestName2}
                                        onChange={(e) => replaceSlot === 1 ? setGuestName(e.target.value) : setGuestName2(e.target.value)}
                                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-4 text-sm font-bold outline-none focus:border-blue-500 shadow-sm"
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
                                            className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-blue-600 hover:text-white rounded-2xl border border-border/50 transition-all group/p shadow-sm"
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
                        <DialogTitle className="text-red-500">¿Eliminar Participante?</DialogTitle>
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
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
                        >
                            Sí, Eliminar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}


