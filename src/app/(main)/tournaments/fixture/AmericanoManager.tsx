"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords,
    CheckCircle2, ChevronRight,
    RefreshCw, Pencil, RotateCcw,
    UserCheck, Zap, Trash2, Search, CreditCard, Plus, Minus, Circle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveTournamentFixture, resetTournamentStatus, updateTournamentMetadata } from "./actions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getAllPlayers } from "@/app/actions/players";
import { 
    Player, Group, Match, BracketSlot, BracketMatch, Standing 
} from "./components/americano/types";
import { AmericanoHeader } from "./components/americano/AmericanoHeader";
import { AmericanoAttendance } from "./components/americano/AmericanoAttendance";
import { AmericanoCourtGrid } from "./components/americano/AmericanoCourtGrid";
import { AmericanoStandingsTable } from "./components/americano/AmericanoStandingsTable";
import { AmericanoBracket } from "./components/americano/AmericanoBracket";
import { AmericanoModals } from "./components/americano/AmericanoModals";

export interface AmericanoManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent?: string[];
    initialPaid?: string[];
    readOnly?: boolean;
    isLoggedIn?: boolean;
    modality?: {
        numCourts: number;
        matchesPerTeam: number;
        isIndividual: boolean;
    };
}



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
    initialPresent = [],
    initialPaid = [],
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
            modalidad: { numCourts: newCourts, matchesPerTeam: newMatches, isIndividual },
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
    const ensureArray = (val: any) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return []; }
        }
        return Array.isArray(val) ? val : [];
    };

    const [present, setPresent] = useState<Set<string>>(new Set(ensureArray(initialPresent)));
    const [paid, setPaid] = useState<Set<string>>(new Set(ensureArray(initialPaid)));
    const lastSavedState = useRef({ present: new Set(initialPresent), paid: new Set(initialPaid) });
    
    // Sync with initial props
    useEffect(() => {
        // Only update present/paid if they differ from our last intended state
        const safePresent = ensureArray(initialPresent);
        const pArray = Array.from(lastSavedState.current.present);
        const hasPresentChanged = JSON.stringify(pArray.sort()) !== JSON.stringify([...safePresent].sort());
        if (hasPresentChanged) {
            setPresent(new Set(safePresent));
            lastSavedState.current.present = new Set(safePresent);
        }

        const safePaid = ensureArray(initialPaid);
        const paidArray = Array.from(lastSavedState.current.paid);
        const hasPaidChanged = JSON.stringify(paidArray.sort()) !== JSON.stringify([...safePaid].sort());
        if (hasPaidChanged) {
            setPaid(new Set(safePaid));
            lastSavedState.current.paid = new Set(safePaid);
        }
    }, [initialPresent, initialPaid]);
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
                    presentPlayerIds: Array.from(present),
                    paidPlayerIds: Array.from(paid),
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

    const togglePresent = async (id: string) => {
        if (readOnly) return;
        const next = new Set(present);
        if (next.has(id)) next.delete(id); else next.add(id);
        
        setPresent(next);
        lastSavedState.current.present = next;
        
        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: Array.from(next),
        }).catch(e => console.error("Failed to save presence", e));
    };

    const togglePaid = async (id: string) => {
        if (readOnly) return;
        const next = new Set(paid);
        if (next.has(id)) next.delete(id); else next.add(id);
        
        setPaid(next);
        lastSavedState.current.paid = next;
        
        updateTournamentMetadata({
            tournamentId,
            paidPlayerIds: Array.from(next),
        }).catch(e => console.error("Failed to save payment", e));
    };

    const bulkUpdateStatus = async (type: 'present' | 'paid', ids: string[]) => {
        if (readOnly) return;
        const next = new Set(ids);
        if (type === 'present') {
            setPresent(next);
            lastSavedState.current.present = next;
        } else {
            setPaid(next);
            lastSavedState.current.paid = next;
        }

        try {
            await updateTournamentMetadata({
                tournamentId,
                presentPlayerIds: type === 'present' ? ids : Array.from(present),
                paidPlayerIds: type === 'paid' ? ids : Array.from(paid),
            });
            toast.success(type === 'present' ? "Asistencia actualizada" : "Pagos actualizados");
        } catch (e) {
            toast.error("Error al guardar cambios");
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
            modalidad: { numCourts, matchesPerTeam, isIndividual },
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
            modalidad: { numCourts, matchesPerTeam, isIndividual },
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
            modalidad: { numCourts, matchesPerTeam, isIndividual },
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
            modalidad: { numCourts, matchesPerTeam, isIndividual },
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
            bracket: newBracket,
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
            bracket: updated,
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
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
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid),
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

    const handleRefresh = async () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="min-h-screen bg-background">
            <AmericanoHeader
                tournamentId={tournamentId}
                tournamentName={tournamentName}
                step={step}
                setStep={setStep}
                initialStatus={initialStatus}
                isGroupStageFinished={isGroupStageFinished}
                readOnly={readOnly}
                handleRefresh={handleRefresh}
                isRefreshing={isRefreshing}
            />

            <div className="w-full px-3 md:px-6 py-3 pb-24">
                <div className="mb-3 text-center">
                    <h1 className="text-lg md:text-xl font-black text-foreground tracking-tight italic uppercase leading-none">
                        {tournamentName}
                    </h1>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.25em] text-foreground/30">
                        Gestión • Torneo Americano
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === "setup" && (
                        <motion.div
                            key="setup-stage"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <AmericanoAttendance
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                readOnly={readOnly}
                                groups={groups}
                                present={present}
                                togglePresent={togglePresent}
                                paid={paid}
                                togglePaid={togglePaid}
                                setPlayerToDelete={setPlayerToDelete}
                                setReplacingPlayer={setReplacingPlayer}
                                setStep={setStep}
                                bulkUpdateStatus={bulkUpdateStatus}
                            />
                        </motion.div>
                    )}
                    {step === "active" && (
                        <motion.div
                            key="active-stage"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-12 pb-24"
                        >
                            <div className="text-center space-y-4">
                                <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tighter uppercase italic">Canchas En Vivo</h2>
                                <p className="text-azul-primary text-[8px] font-black uppercase tracking-[0.3em]">Gestión de Partidos en Tiempo Real</p>

                                {/* Progress Tracker */}
                                {(() => {
                                    const totalPossibleMatches = Math.ceil(((groups[0]?.players?.length || 0) * matchesPerTeam) / 2);
                                    const completedMatches = matches.filter(m => m.confirmed).length;
                                    const progress = totalPossibleMatches > 0 ? (completedMatches / totalPossibleMatches) * 100 : 0;

                                    return (
                                        <div className="max-w-2xl mx-auto mt-4 space-y-2">
                                            <div className="flex items-end justify-between px-1">
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[7px] font-black uppercase tracking-[0.4em] text-foreground/30 leading-none mb-1">Progreso Fase de Grupos</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-black italic text-foreground/80">{completedMatches}</span>
                                                        <span className="text-[8px] font-black uppercase text-foreground/20 italic">/</span>
                                                        <span className="text-lg font-black italic text-foreground/80">{totalPossibleMatches}</span>
                                                        <span className="text-[8px] font-black uppercase text-foreground/20 italic ml-1 tracking-widest">Finalizados</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-2xl font-black italic text-azul-primary leading-none">{Math.round(progress)}<span className="text-sm ml-0.5">%</span></span>
                                                </div>
                                            </div>
                                            <div className="h-2.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/40 p-[2px]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 1.5, ease: "circOut" }}
                                                    className="h-full rounded-full bg-gradient-to-r from-azul-primary via-celeste to-azul-dark relative"
                                                >
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <AmericanoCourtGrid
                                numCourts={numCourts}
                                matches={matches}
                                readOnly={readOnly}
                                handleDeleteMatch={handleDeleteMatch}
                                handleScoreChange={handleScoreChange}
                                handleConfirmScore={handleConfirmScore}
                                generateNextMatch={generateNextMatch}
                                saving={saving}
                            />

                            <AmericanoStandingsTable
                                standings={standings}
                                playersTab={playersTab}
                                setPlayersTab={setPlayersTab}
                                matchesPerTeam={matchesPerTeam}
                                playingIds={playingIds}
                                readOnly={readOnly}
                                present={present}
                                togglePresent={togglePresent}
                                paid={paid}
                                togglePaid={togglePaid}
                                setReplacingPlayer={setReplacingPlayer}
                            />

                            <AmericanoBracket
                                bracket={bracket}
                                setBracket={setBracket}
                                readOnly={readOnly}
                                setReplacingPlayer={setReplacingPlayer}
                                handleBracketScore={handleBracketScore}
                                handleBracketConfirm={handleBracketConfirm}
                                handleBracketEdit={handleBracketEdit}
                                standings={standings}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AmericanoModals
                noPlayersData={noPlayersData}
                setNoPlayersData={setNoPlayersData}
                showSuccessModal={showSuccessModal}
                setShowSuccessModal={setShowSuccessModal}
                replacingPlayer={replacingPlayer}
                setReplacingPlayer={setReplacingPlayer}
                isIndividual={isIndividual}
                replaceSlot={replaceSlot}
                setReplaceSlot={setReplaceSlot}
                guestName={guestName}
                setGuestName={setGuestName}
                guestName2={guestName2}
                setGuestName2={setGuestName2}
                handleReplaceWithGuest={handleReplaceWithGuest}
                playerSearchQuery={playerSearchQuery}
                setPlayerSearchQuery={setPlayerSearchQuery}
                isFetchLoading={isFetchLoading}
                allPotentialPlayers={allPotentialPlayers}
                registeredPlayerIds={registeredPlayerIds}
                registeredPlayerNames={registeredPlayerNames}
                handleReplacePlayer={handleReplacePlayer}
                handleReplaceOneInPair={handleReplaceOneInPair}
                playerToDelete={playerToDelete}
                setPlayerToDelete={setPlayerToDelete}
                handleDeletePlayer={handleDeletePlayer}
                editingMatchPlayer={editingMatchPlayer}
                setEditingMatchPlayer={setEditingMatchPlayer}
                groups={groups}
                matches={matches}
                handleUpdateMatchPlayer={handleUpdateMatchPlayer}
            />
        </div>
    );
}


