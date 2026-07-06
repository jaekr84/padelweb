"use client";

import Link from "next/link";
import {
    Trophy, Users2, Swords,
    CheckCircle2, ChevronRight, ArrowRight,
    RefreshCw, Pencil, RotateCcw,
    UserCheck, Zap, Trash2, Search, CreditCard, Plus, Minus, Circle, Settings
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
import { isTeamChecked, toggleCheckKey, remapCheckKeys, removeCheckKeys } from "./components/americano/attendance-utils";
import { AmericanoAttendance } from "./components/americano/AmericanoAttendance";
import { AmericanoCourtGrid } from "./components/americano/AmericanoCourtGrid";
import { AmericanoStandingsTable } from "./components/americano/AmericanoStandingsTable";
import { AmericanoModals } from "./components/americano/AmericanoModals";
import { AmericanoMatchHistory } from "./components/americano/AmericanoMatchHistory";

export interface AmericanoManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent?: string[];
    initialPaid?: string[];
    initialUpdatedAt?: string;
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
    initialUpdatedAt,
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

    const matchesRef = useRef<Match[]>(matches);
    useEffect(() => {
        matchesRef.current = matches;
    }, [matches]);

    const updateMatchesState = useCallback((newMatches: Match[]) => {
        matchesRef.current = newMatches;
        setMatches(newMatches);
    }, []);

    const fixtureVersionRef = useRef<string | undefined>(initialUpdatedAt);
    // Serialize saves so concurrent calls don't race the optimistic-lock version
    // and trigger false "another admin modified" conflicts.
    const saveChainRef = useRef<Promise<any>>(Promise.resolve());
    const saveFixture = useCallback((input: Omit<Parameters<typeof saveTournamentFixture>[0], 'lastKnownUpdatedAt'>) => {
        const run = saveChainRef.current.then(async () => {
            const res = await saveTournamentFixture({ ...input, lastKnownUpdatedAt: fixtureVersionRef.current });
            if (res.ok && res.newUpdatedAt) {
                fixtureVersionRef.current = res.newUpdatedAt;
            }
            if (!res.ok && res.conflictError) {
                toast.error("Otro administrador guardó cambios en este torneo. Recargá la página para ver los últimos datos.", {
                    duration: 10000,
                    action: { label: "Recargar", onClick: () => window.location.reload() }
                });
            }
            return res;
        });
        saveChainRef.current = run.catch(() => { });
        return run;
    }, []);
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

    const maxLimit = useMemo(() => {
        const total = groups[0]?.players.length || 0;
        if (total < 2) return 0;
        return total % 2 === 0 ? total : total - 1;
    }, [groups]);

    const [bracketSize, setBracketSize] = useState(() => {
        return (modality as any)?.bracketSize || 8;
    });

    useEffect(() => {
        if (bracketSize < 2 || bracketSize % 2 !== 0) {
            setBracketSize(8);
        }
    }, []);

    const handleUpdateConfig = async (newCourts: number, newMatches: number, newBracketSize?: number) => {
        const nextCourts = newCourts;
        const nextMatches = newMatches;
        const nextBracketSize = newBracketSize ?? bracketSize;

        setNumCourts(nextCourts);
        setMatchesPerTeam(nextMatches);
        setBracketSize(nextBracketSize);

        setSaving(true);
        const res = await saveFixture({
            tournamentId,
            phase: bracket.length > 0 ? "eliminatorias" : "grupos",
            groups,
            matches: matchesRef.current,
            bracket,
            modalidad: { numCourts: nextCourts, matchesPerTeam: nextMatches, isIndividual, bracketSize: nextBracketSize },
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
    const [noPlayersData, setNoPlayersData] = useState<{ finished: number, playing: number, waiting: number, reserved?: number } | null>(null);
    const [step, setStep] = useState<"setup" | "active">(
        initialStatus === "setup" ? "setup" : "active"
    );
    const [playersTab, setPlayersTab] = useState<"all" | "pending" | "done">("all");
    const [activeView, setActiveView] = useState<"courts" | "history">(
        initialStatus === "finalizado" ? "history" : "courts"
    );
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

    // Teams fully present (for pairs: both members checked) and not withdrawn — only these can play
    const presentTeamIds = useMemo(() => new Set(
        allRegisteredPlayers.filter(p => !p.withdrawn && isTeamChecked(present, p)).map(p => p.id)
    ), [allRegisteredPlayers, present]);

    // Expected total: active players owe matchesPerTeam each; withdrawn players only
    // count what they already played (their pending quota is released).
    const totalExpectedMatches = useMemo(() => {
        const players = groups[0]?.players || [];
        if (players.length === 0) return 0;
        const counts = new Map<string, number>();
        matches.filter(m => m.confirmed).forEach(m => {
            counts.set(m.team1.id, (counts.get(m.team1.id) || 0) + 1);
            counts.set(m.team2.id, (counts.get(m.team2.id) || 0) + 1);
        });
        const units = players.reduce((acc, p) =>
            acc + (p.withdrawn ? Math.min(counts.get(p.id) || 0, matchesPerTeam) : matchesPerTeam), 0);
        return Math.ceil(units / 2);
    }, [groups, matches, matchesPerTeam]);
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const isGroupStageFinished = confirmedGroupMatches >= totalExpectedMatches && matches.every(m => m.confirmed);
    const progressPercent = totalExpectedMatches > 0 ? (confirmedGroupMatches / totalExpectedMatches) * 100 : 0;

    // Player replacement/deletion state
    const [replacingPlayer, setReplacingPlayer] = useState<Player | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [playerToWithdraw, setPlayerToWithdraw] = useState<Player | null>(null);
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

        const updatedMatches = matchesRef.current.map(m => ({
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
        updateMatchesState(updatedMatches);
        setBracket(updatedBracket);

        // Update attendance/paid sets — compute new sets synchronously so the save uses updated values
        const updatedPresent = remapCheckKeys(present, oldPlayerId, newPlayer.id);
        const updatedPaid = remapCheckKeys(paid, oldPlayerId, newPlayer.id);
        setPresent(updatedPresent);
        lastSavedState.current.present = updatedPresent;
        setPaid(updatedPaid);
        lastSavedState.current.paid = updatedPaid;

        setReplacingPlayer(null);
        setGuestName("");
        setGuestName2("");
        setReplaceSlot(1);

        // Auto-save if we are already in the tournament flow
        if (step !== "setup") {
            const loadingToast = toast.loading("Actualizando participantes...");
            try {
                const hasBracket = updatedBracket.length > 0;
                const currentPhase = hasBracket ? "eliminatorias" : "grupos";

                const res = await saveFixture({
                    tournamentId,
                    phase: currentPhase,
                    groups: updatedGroups,
                    matches: updatedMatches,
                    bracket: updatedBracket,
                    presentPlayerIds: Array.from(updatedPresent),
                    paidPlayerIds: Array.from(updatedPaid),
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
        const next = toggleCheckKey(present, id);

        setPresent(next);
        lastSavedState.current.present = next;
        
        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: Array.from(next),
        }).catch(e => console.error("Failed to save presence", e));
    };

    const togglePaid = async (id: string) => {
        if (readOnly) return;
        const next = toggleCheckKey(paid, id);

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

    const setPlayerWithdrawn = async (playerId: string, withdrawn: boolean) => {
        const updatedGroups = groups.map(group => ({
            ...group,
            players: group.players.map(p => p.id === playerId ? { ...p, withdrawn } : p)
        }));
        setGroups(updatedGroups);
        setPlayerToWithdraw(null);

        if (step !== "setup") {
            setSaving(true);
            try {
                const res = await saveFixture({
                    tournamentId,
                    phase: bracket.length > 0 ? "eliminatorias" : "grupos",
                    groups: updatedGroups,
                    matches: matchesRef.current,
                    bracket,
                    modalidad: { numCourts, matchesPerTeam, isIndividual },
                    presentPlayerIds: Array.from(present),
                    paidPlayerIds: Array.from(paid)
                });
                if (res.ok) {
                    toast.success(withdrawn ? "Participante retirado del torneo" : "Participante reincorporado");
                } else {
                    toast.error("Error al guardar: " + res.error);
                }
            } finally {
                setSaving(false);
            }
        } else {
            toast.success(withdrawn ? "Participante retirado" : "Participante reincorporado");
        }
    };

    // Withdrawing asks for confirmation; reinstating is immediate
    const requestWithdraw = (p: Player) => {
        if (readOnly) return;
        if (p.withdrawn) setPlayerWithdrawn(p.id, false);
        else setPlayerToWithdraw(p);
    };

    const handleDeletePlayer = async (playerId: string) => {
        const updatedGroups = groups.map(group => ({
            ...group,
            players: group.players.filter(p => p.id !== playerId)
        }));
        const updatedMatches = matchesRef.current.filter(m =>
            m.team1.id !== playerId && m.team2.id !== playerId
        );
        const updatedPresent = removeCheckKeys(present, playerId);
        const updatedPaid = removeCheckKeys(paid, playerId);

        setGroups(updatedGroups);
        updateMatchesState(updatedMatches);
        setPresent(updatedPresent);
        lastSavedState.current.present = updatedPresent;
        setPaid(updatedPaid);
        lastSavedState.current.paid = updatedPaid;
        setPlayerToDelete(null);
        toast.success("Participante eliminado");

        if (step !== "setup") {
            setSaving(true);
            try {
                const res = await saveFixture({
                    tournamentId,
                    phase: bracket.length > 0 ? "eliminatorias" : "grupos",
                    groups: updatedGroups,
                    matches: updatedMatches,
                    bracket,
                    modalidad: { numCourts, matchesPerTeam, isIndividual },
                    presentPlayerIds: Array.from(updatedPresent),
                    paidPlayerIds: Array.from(updatedPaid)
                });
                if (!res.ok) toast.error("Error al guardar cambios: " + res.error);
            } finally {
                setSaving(false);
            }
        }
    };

    const handleDeleteMatch = async (matchId: string) => {
        const currentMatches = matchesRef.current;
        const matchToDelete = currentMatches.find(m => m.id === matchId);
        if (!matchToDelete) return;

        const originalIndex = currentMatches.findIndex(m => m.id === matchId);
        const updatedMatches = currentMatches.filter(m => m.id !== matchId);

        updateMatchesState(updatedMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
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
                toast.success("Partido eliminado");
            } else {
                const restored = [...matchesRef.current];
                restored.splice(originalIndex, 0, matchToDelete);
                updateMatchesState(restored);
                toast.error("Error al eliminar: " + res.error);
            }
            return res;
        } catch (error) {
            const restored = [...matchesRef.current];
            restored.splice(originalIndex, 0, matchToDelete);
            updateMatchesState(restored);
            toast.error("Error al eliminar el partido");
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const handleReopenMatch = async (matchId: string) => {
        if (bracket.length > 0) {
            toast.error("Las eliminatorias ya están activas. Reiniciá el cuadro para modificar la fase de grupos.");
            return;
        }
        const currentMatches = matchesRef.current;
        const match = currentMatches.find(m => m.id === matchId);
        if (!match || !match.confirmed) return;

        // Reopen on its original court if free, otherwise the first free court
        const busyCourts = new Set(
            currentMatches.filter(m => !m.confirmed && m.courtNumber).map(m => m.courtNumber as number)
        );
        let targetCourt: number | undefined =
            match.courtNumber && !busyCourts.has(match.courtNumber) ? match.courtNumber : undefined;
        if (!targetCourt) {
            for (let c = 1; c <= numCourts; c++) {
                if (!busyCourts.has(c)) { targetCourt = c; break; }
            }
        }
        if (!targetCourt) {
            toast.error("No hay canchas libres para reabrir el partido. Finalizá o eliminá un partido en curso.");
            return;
        }

        const updatedMatches = currentMatches.map(m =>
            m.id === matchId ? { ...m, confirmed: false, played: true, courtNumber: targetCourt } : m
        );
        updateMatchesState(updatedMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
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
                toast.success(`Partido reabierto en Cancha ${targetCourt}`);
                setActiveView("courts");
            } else {
                updateMatchesState(currentMatches);
                toast.error("Error al reabrir: " + res.error);
            }
            return res;
        } catch (error) {
            updateMatchesState(currentMatches);
            toast.error("Error al reabrir el partido");
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateMatchPlayer = async (matchId: string, playerIndex: 1 | 2, newPlayer: Player) => {
        const currentMatches = matchesRef.current;
        const originalMatch = currentMatches.find(m => m.id === matchId);
        if (!originalMatch) return;

        const updatedMatches = currentMatches.map(m => {
            if (m.id !== matchId) return m;
            return {
                ...m,
                team1: playerIndex === 1 ? newPlayer : m.team1,
                team2: playerIndex === 2 ? newPlayer : m.team2,
            };
        });

        updateMatchesState(updatedMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
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
                toast.success("Jugador actualizado en el partido");
                setEditingMatchPlayer(null);
            } else {
                updateMatchesState(matchesRef.current.map(m => m.id === matchId ? originalMatch : m));
                toast.error("Error al actualizar jugador: " + res.error);
            }
            return res;
        } catch (error) {
            updateMatchesState(matchesRef.current.map(m => m.id === matchId ? originalMatch : m));
            toast.error("Error al actualizar jugador");
            throw error;
        } finally {
            setSaving(false);
        }
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
        const currentMatches = matchesRef.current;
        const players = groups[0]?.players || [];
        if (players.length < 2) return;

        // 1. Identify currently playing players
        const currentlyPlaying = new Set(
            currentMatches
                .filter(m => !m.confirmed)
                .flatMap(m => [m.team1.id, m.team2.id])
        );

        // 2. Count matches per player
        const playerMatchCounts = new Map<string, number>();
        players.forEach(p => playerMatchCounts.set(p.id, 0));
        currentMatches.filter(m => m.confirmed).forEach(m => {
            playerMatchCounts.set(m.team1.id, (playerMatchCounts.get(m.team1.id) || 0) + 1);
            playerMatchCounts.set(m.team2.id, (playerMatchCounts.get(m.team2.id) || 0) + 1);
        });

        // 3. Find available players (present, not playing and matches < target)
        const available = players.filter(p => presentTeamIds.has(p.id) && !currentlyPlaying.has(p.id) && (playerMatchCounts.get(p.id) || 0) < matchesPerTeam);

        // Effective counts include in-progress (unconfirmed) matches: they will consume quota
        const effectiveCounts = new Map<string, number>();
        players.forEach(p => effectiveCounts.set(p.id, 0));
        currentMatches.forEach(m => {
            effectiveCounts.set(m.team1.id, (effectiveCounts.get(m.team1.id) || 0) + 1);
            effectiveCounts.set(m.team2.id, (effectiveCounts.get(m.team2.id) || 0) + 1);
        });

        // Absent players keep their quota reserved: a match is only allowed if afterwards
        // every player (absent included) can still complete matchesPerTeam.
        // Feasible iff no player needs more matches than all the others can provide combined.
        const isFeasibleAfter = (id1: string, id2: string) => {
            let sum = 0, max = 0;
            players.forEach(p => {
                if (p.withdrawn) return; // released quota — nothing reserved
                let rem = matchesPerTeam - (effectiveCounts.get(p.id) || 0);
                if (p.id === id1 || p.id === id2) rem -= 1;
                if (rem <= 0) return;
                sum += rem;
                if (rem > max) max = rem;
            });
            return max <= sum - max;
        };

        const absentWithPending = players.filter(p =>
            !p.withdrawn && !presentTeamIds.has(p.id) && (effectiveCounts.get(p.id) || 0) < matchesPerTeam
        ).length;

        if (available.length < 2) {
            const finishedCount = players.filter(p => (playerMatchCounts.get(p.id) || 0) >= matchesPerTeam).length;
            const playingCount = currentlyPlaying.size;
            const waitingCount = available.length;

            setNoPlayersData({ finished: finishedCount, playing: playingCount, waiting: waitingCount, reserved: absentWithPending });
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
            currentMatches
                .filter(m => (m.team1.id === p1.id || m.team2.id === p1.id))
                .map(m => m.team1.id === p1.id ? m.team2.id : m.team1.id)
        );

        // Pick best p2 based on multiple criteria
        const rankedP2s = candidateP2s.sort((a, b) => {
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
        });

        const p2 = rankedP2s.find(c => isFeasibleAfter(p1.id, c.id));

        if (!p2) {
            // Every possible pairing would leave an absent player without enough
            // opponents to complete their quota — keep those matches reserved.
            const finishedCount = players.filter(p => (playerMatchCounts.get(p.id) || 0) >= matchesPerTeam).length;
            setNoPlayersData({ finished: finishedCount, playing: currentlyPlaying.size, waiting: available.length, reserved: absentWithPending });
            return;
        }

        const newMatch: Match = {
            id: crypto.randomUUID(),
            groupId: groups[0]?.id || "g0",
            team1: p1,
            team2: p2,
            score1: 0,
            score2: 0,
            played: true,
            confirmed: false,
            // Mark as in-progress the moment it hits a court, so the stats page can
            // measure its duration (started now → finished on confirm).
            status: "in_progress",
            courtNumber: courtNum,
            roundIndex: Math.floor(currentMatches.length / numCourts) // Rough round estimate
        } as Match;

        const nextMatches = [...currentMatches, newMatch];
        updateMatchesState(nextMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
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
                toast.success(`Partido generado en Cancha ${courtNum}`);
            } else {
                updateMatchesState(matchesRef.current.filter(m => m.id !== newMatch.id));
                toast.error("Error al generar partido: " + res.error);
            }
            return res;
        } catch (error) {
            updateMatchesState(matchesRef.current.filter(m => m.id !== newMatch.id));
            toast.error("Error al generar partido");
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const standings = useMemo(() => computeStandings(), [computeStandings]);

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
        const currentMatches = matchesRef.current;
        const match = currentMatches.find(m => m.id === matchId);
        if (!match) return;

        // Default to 0 if scores are missing
        const s1 = match.score1 ?? 0;
        const s2 = match.score2 ?? 0;

        const originalMatch = match;
        const updatedMatches = currentMatches.map(m => m.id === matchId ? { ...m, score1: s1, score2: s2, confirmed: true } : m);
        updateMatchesState(updatedMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
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
                toast.success("Marcador guardado");
            } else {
                updateMatchesState(matchesRef.current.map(m => m.id === matchId ? originalMatch : m));
                toast.error("Error al guardar: " + res.error);
            }
            return res;
        } catch (error) {
            updateMatchesState(matchesRef.current.map(m => m.id === matchId ? originalMatch : m));
            toast.error("Error al guardar marcador");
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const handleEditScore = (matchId: string) => {
        updateMatchesState(matchesRef.current.map(m => m.id === matchId ? { ...m, confirmed: false } : m));
    };

    const handleScoreChange = (matchId: string, s1: string, s2: string) => {
        updateMatchesState(matchesRef.current.map(m => {
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

        const currentMatches = matchesRef.current;
        const updatedMatches = currentMatches.map(m => {
            if (m.confirmed) return m;
            let s1 = Math.floor(Math.random() * 7) + 1;
            let s2 = Math.floor(Math.random() * 7) + 1;
            if (s1 === s2) s1 = s1 === 7 ? 6 : s1 + 1;
            return { ...m, score1: s1, score2: s2, played: true, confirmed: true };
        });

        updateMatchesState(updatedMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups,
                matches: updatedMatches,
                bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid)
            });

            if (res.ok) {
                toast.success("Resultados simulados correctamente");
            } else {
                updateMatchesState(currentMatches);
                toast.error("Error al simular: " + res.error);
            }
            return res;
        } catch (error) {
            updateMatchesState(currentMatches);
            toast.error("Error al simular resultados");
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const generateBracket = async (count?: number) => {
        // Withdrawn players don't qualify for playoffs
        const eligibleStandings = standings.filter(s => !s.player.withdrawn);
        const targetCount = count ?? eligibleStandings.length;
        const topPlayers = eligibleStandings.slice(0, targetCount);
        if (topPlayers.length < 2) {
            toast.error("Se necesitan al menos 2 participantes para generar el cuadro");
            return;
        }

        let newBracket: BracketMatch[] = [];

        // STANDARD LOGIC FOR ALL COUNTS
        const numRounds = Math.ceil(Math.log2(targetCount));
        const bSize = Math.pow(2, numRounds);
        const seedPositions = getSeedingOrder(bSize);

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
                        if (bm.slot % 2 === 0) next.team1 = winner ? { ...(winner as any) } : null;
                        else next.team2 = winner ? { ...(winner as any) } : null;
                    }
                }
            });
        }

        setSaving(true);
        const res = await saveFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches: matchesRef.current,
            bracket: newBracket,
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid),
            modalidad: { numCourts, matchesPerTeam, isIndividual, bracketSize: targetCount }
        });

        if (res.ok) {
            setBracket(newBracket);
            toast.success("Cuadro generado correctamente");
            router.push(`/tournaments/${tournamentId}/manage/playoffs`);
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
        const res = await saveFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches: matchesRef.current,
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
        const res = await saveFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches: matchesRef.current,
            bracket: finalBracket,
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid),
            championName: isFinal ? (winner as Player).name : undefined,
        });

        if (res.ok) {
            setBracket(finalBracket);
            toast.success("Resultado guardado");
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
                hasBracket={bracket.length > 0}
            />

            <div className="w-full px-3 md:px-4 py-2 pb-24">
                <div className="mb-2 text-center">
                    <h1 className="text-sm md:text-base font-black text-foreground tracking-tighter italic uppercase leading-none">
                        {tournamentName}
                    </h1>
                    <p className="mt-0.5 text-[6px] font-black uppercase tracking-[0.4em] text-foreground/20">
                        SISTEMA DE GESTIÓN TÁCTICA • AMERICANO
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
                                requestWithdraw={requestWithdraw}
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
                            className="space-y-6 pb-24"
                        >
                            {/* Tabs: Canchas / Historial */}
                            <div className="flex justify-center">
                                <div className="flex items-center p-0.5 bg-muted/40 border border-border/40 rounded-lg gap-0.5">
                                    <button
                                        onClick={() => setActiveView("courts")}
                                        className={`px-3 py-1.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${activeView === "courts" ? "bg-azul-primary text-white shadow-sm" : "hover:bg-muted text-foreground/60"}`}
                                    >
                                        Canchas en Vivo
                                    </button>
                                    <button
                                        onClick={() => setActiveView("history")}
                                        className={`px-3 py-1.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${activeView === "history" ? "bg-azul-primary text-white shadow-sm" : "hover:bg-muted text-foreground/60"}`}
                                    >
                                        Historial ({matches.filter(m => m.confirmed).length})
                                    </button>
                                </div>
                            </div>

                            {activeView === "courts" && initialStatus !== "finalizado" && (
                                <div className="text-center space-y-2">
                                    <h2 className="text-lg md:text-xl font-black text-foreground tracking-tighter uppercase italic leading-none">Canchas En Vivo</h2>
                                    <p className="text-azul-primary text-[6px] font-black uppercase tracking-[0.4em]">Gestión Técnica de Partidos</p>

                                    {/* Progress Tracker */}
                                    {(() => {
                                        const totalPossibleMatches = totalExpectedMatches;
                                        const completedMatches = matches.filter(m => m.confirmed).length;
                                        const progress = totalPossibleMatches > 0 ? (completedMatches / totalPossibleMatches) * 100 : 0;

                                        return (
                                            <div className="max-w-xl mx-auto mt-2 space-y-1.5">
                                                <div className="flex items-end justify-between px-1">
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/30 leading-none mb-0.5">Progreso Fase de Grupos</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-base font-black italic text-foreground/80">{completedMatches}</span>
                                                            <span className="text-[7px] font-black uppercase text-foreground/20 italic">/</span>
                                                            <span className="text-base font-black italic text-foreground/80">{totalPossibleMatches}</span>
                                                            <span className="text-[6px] font-black uppercase text-foreground/20 italic ml-1 tracking-widest">Partidos</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xl font-black italic text-azul-primary leading-none">{Math.round(progress)}<span className="text-xs ml-0.5">%</span></span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden border border-border/30 p-[1px]">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1.5, ease: "circOut" }}
                                                        className="h-full rounded-full bg-gradient-to-r from-azul-primary via-celeste to-azul-dark relative"
                                                    >
                                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                                                    </motion.div>
                                                </div>

                                                 {!readOnly && (
                                                    <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-[8px] font-black uppercase tracking-wider text-foreground/60 bg-muted/5 border border-border/20 py-1.5 px-3 rounded-lg w-fit mx-auto shadow-sm">
                                                        <span className="flex items-center gap-1">
                                                            <Settings className="w-3 h-3 text-azul-primary" />
                                                            Configuración:
                                                        </span>
                                                        <div className="flex items-center gap-1.5 border-l border-border/30 pl-3">
                                                            <span>{isIndividual ? "Partidos por Jugador:" : "Partidos por Pareja:"}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateConfig(numCourts, Math.max(1, matchesPerTeam - 1))}
                                                                disabled={saving}
                                                                className="w-4.5 h-4.5 rounded bg-muted/20 hover:bg-muted/40 border border-border/30 flex items-center justify-center active:scale-95 transition-all text-foreground cursor-pointer disabled:opacity-50"
                                                            >
                                                                <Minus className="w-2.5 h-2.5" />
                                                            </button>
                                                            <span className="font-black italic text-foreground text-[10px] w-4 text-center">{matchesPerTeam}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateConfig(numCourts, matchesPerTeam + 1)}
                                                                disabled={saving}
                                                                className="w-4.5 h-4.5 rounded bg-muted/20 hover:bg-muted/40 border border-border/30 flex items-center justify-center active:scale-95 transition-all text-foreground cursor-pointer disabled:opacity-50"
                                                            >
                                                                <Plus className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                        <div 
                                                            className={`flex items-center gap-1.5 border-l border-border/30 pl-3 ${bracket.length > 0 ? "opacity-50" : ""}`}
                                                            title={bracket.length > 0 ? "Las eliminatorias están activas. Reinicia el cuadro para modificar." : ""}
                                                        >
                                                            <span>Clasificados a Llaves:</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newVal = Math.max(2, bracketSize - 2);
                                                                    handleUpdateConfig(numCourts, matchesPerTeam, newVal);
                                                                }}
                                                                disabled={saving || bracketSize <= 2 || bracket.length > 0}
                                                                className="w-4.5 h-4.5 rounded bg-muted/20 hover:bg-muted/40 border border-border/30 flex items-center justify-center active:scale-95 transition-all text-foreground cursor-pointer disabled:opacity-50"
                                                            >
                                                                <Minus className="w-2.5 h-2.5" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={bracketSize || ""}
                                                                disabled={saving || bracket.length > 0}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value, 10);
                                                                    setBracketSize(isNaN(val) ? 0 : val);
                                                                }}
                                                                onBlur={() => {
                                                                    let cleanVal = bracketSize;
                                                                    if (cleanVal < 2) cleanVal = 2;
                                                                    if (cleanVal % 2 !== 0) {
                                                                        cleanVal = Math.floor(cleanVal / 2) * 2;
                                                                        if (cleanVal < 2) cleanVal = 2;
                                                                    }
                                                                    handleUpdateConfig(numCourts, matchesPerTeam, cleanVal);
                                                                }}
                                                                className="w-8 bg-transparent text-center font-black italic text-foreground text-[10px] focus:outline-none rounded no-spin-buttons border-b border-border/20 focus:border-azul-primary disabled:cursor-not-allowed"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newVal = bracketSize + 2;
                                                                    handleUpdateConfig(numCourts, matchesPerTeam, newVal);
                                                                }}
                                                                disabled={saving || bracket.length > 0}
                                                                className="w-4.5 h-4.5 rounded bg-muted/20 hover:bg-muted/40 border border-border/30 flex items-center justify-center active:scale-95 transition-all text-foreground cursor-pointer disabled:opacity-50"
                                                            >
                                                                <Plus className="w-2.5 h-2.5" />
                                                            </button>
                                                            {bracket.length > 0 && (
                                                                <span className="text-[6px] text-foreground/40 font-bold uppercase ml-1 italic">(Reinicia el cuadro para modificar)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                 )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {activeView === "courts" && initialStatus !== "finalizado" && (
                                <AmericanoCourtGrid
                                    numCourts={numCourts}
                                    matches={matches}
                                    readOnly={readOnly}
                                    handleDeleteMatch={handleDeleteMatch}
                                    handleScoreChange={handleScoreChange}
                                    handleConfirmScore={handleConfirmScore}
                                    generateNextMatch={generateNextMatch}
                                    saving={saving}
                                    onUpdateCourts={(newCount) => handleUpdateConfig(newCount, matchesPerTeam)}
                                    isIndividual={isIndividual}
                                    allGroupPlayers={groups[0]?.players ?? []}
                                    matchesPerTeam={matchesPerTeam}
                                    presentIds={presentTeamIds}
                                    onSwapTeam={handleUpdateMatchPlayer}
                                />
                            )}

                            {activeView === "history" && (
                                <AmericanoMatchHistory
                                    matches={matches}
                                    readOnly={readOnly}
                                    saving={saving}
                                    hasBracket={bracket.length > 0}
                                    onReopenMatch={handleReopenMatch}
                                    onDeleteMatch={handleDeleteMatch}
                                />
                            )}

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
                                requestWithdraw={requestWithdraw}
                            />

                            {/* Panel de Control de Eliminatorias */}
                            {!readOnly && (
                                <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-xl p-6 shadow-lg space-y-6 mt-6">
                                    <div className="flex items-center justify-between border-b border-border/20 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-azul-primary/10 border border-azul-primary/20 text-azul-primary">
                                                <Trophy className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground">Fase de Eliminatorias (Playoffs)</h3>
                                                <span className="text-foreground/40 text-[6px] font-black tracking-[0.2em] uppercase leading-none mt-0.5">Gestión y avance del torneo</span>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                            bracket.length > 0
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                : isGroupStageFinished
                                                    ? "bg-azul-primary/10 border-azul-primary/20 text-azul-primary animate-pulse"
                                                    : "bg-muted/30 border-border/40 text-foreground/40"
                                        }`}>
                                            {bracket.length > 0 ? "Activa" : isGroupStageFinished ? "Lista para Generar" : "En Espera"}
                                        </span>
                                    </div>

                                    {bracket.length > 0 ? (
                                        <div className="space-y-4">
                                            <p className="text-xs text-foreground/70 leading-relaxed">
                                                Las eliminatorias del torneo ya han sido configuradas y están activas. Toda la gestión de las llaves, carga de resultados y asignación de campeones se realiza en la sección dedicada.
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                <button
                                                    onClick={() => router.push(readOnly ? `/tournaments/${tournamentId}/playoffs` : `/tournaments/${tournamentId}/manage/playoffs`)}
                                                    className="px-5 py-3 bg-azul-primary hover:bg-azul-dark text-white rounded-xl font-black uppercase italic text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-azul-primary/20 cursor-pointer"
                                                >
                                                    <Trophy className="w-4 h-4" />
                                                    {readOnly ? "Ver Cuadro de Eliminatorias" : "Gestionar Eliminatorias"}
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {isGroupStageFinished ? (
                                                <p className="text-xs text-foreground/70 leading-relaxed">
                                                    ¡Fase de grupos completada! Todos los partidos programados se han jugado y confirmado. Define la cantidad de jugadores/parejas que clasificarán a las llaves y genera el cuadro para iniciar la fase eliminatoria.
                                                </p>
                                            ) : (
                                                <p className="text-xs text-foreground/50 leading-relaxed">
                                                    La fase de grupos está actualmente en juego ({confirmedGroupMatches} de {totalExpectedMatches} partidos completados). Una vez finalizados todos los partidos, podrás configurar y generar las llaves eliminatorias aquí. Mientras tanto, puedes elegir la cantidad de clasificados.
                                                </p>
                                            )}

                                            {!readOnly && (
                                                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-muted/10 border border-border/20">
                                                     <div className="flex flex-col">
                                                         <span className="text-[10px] font-black uppercase text-foreground">Cantidad de Clasificados</span>
                                                         <span className="text-[7px] text-foreground/40 font-black uppercase tracking-wider mt-0.5">Clasificarán los mejores {bracketSize} de la tabla general</span>
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                         <button
                                                             type="button"
                                                             onClick={() => {
                                                                 const newVal = Math.max(2, bracketSize - 2);
                                                                 handleUpdateConfig(numCourts, matchesPerTeam, newVal);
                                                             }}
                                                             disabled={saving || bracketSize <= 2}
                                                             className="w-8 h-8 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer disabled:opacity-30"
                                                         >
                                                             <Minus className="w-4 h-4" />
                                                         </button>
                                                         <input
                                                             type="number"
                                                             value={bracketSize || ""}
                                                             onChange={(e) => {
                                                                 const val = parseInt(e.target.value, 10);
                                                                 setBracketSize(isNaN(val) ? 0 : val);
                                                             }}
                                                             onBlur={() => {
                                                                 let cleanVal = bracketSize;
                                                                 if (cleanVal < 2) cleanVal = 2;
                                                                 if (cleanVal % 2 !== 0) {
                                                                     cleanVal = Math.floor(cleanVal / 2) * 2;
                                                                     if (cleanVal < 2) cleanVal = 2;
                                                                 }
                                                                 handleUpdateConfig(numCourts, matchesPerTeam, cleanVal);
                                                             }}
                                                             className="w-10 bg-transparent text-center text-sm font-black italic focus:outline-none rounded no-spin-buttons text-foreground border-b border-border/20 focus:border-azul-primary"
                                                         />
                                                         <button
                                                             type="button"
                                                             onClick={() => {
                                                                 const newVal = bracketSize + 2;
                                                                 handleUpdateConfig(numCourts, matchesPerTeam, newVal);
                                                             }}
                                                             disabled={saving}
                                                             className="w-8 h-8 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer disabled:opacity-30"
                                                         >
                                                             <Plus className="w-4 h-4" />
                                                         </button>
                                                     </div>
                                                 </div>
                                             )}

                                            {isGroupStageFinished ? (
                                                !readOnly ? (
                                                    <button
                                                        onClick={() => generateBracket(bracketSize)}
                                                        disabled={saving}
                                                        className="w-full py-3.5 bg-azul-primary hover:bg-azul-dark text-white rounded-xl font-black uppercase italic tracking-[0.2em] shadow-lg shadow-azul-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-[10px]"
                                                    >
                                                        {saving ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <>
                                                                Generar Cuadro de Eliminatorias • Top {bracketSize}
                                                                <Zap className="w-4 h-4 fill-white" />
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <p className="text-xs text-amber-400 italic">
                                                        Esperando que el administrador genere el cuadro de eliminatorias.
                                                    </p>
                                                )
                                            ) : (
                                                <div className="w-full bg-muted/10 border border-border/20 rounded-xl p-4 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase text-foreground/60">Progreso Fase de Grupos</span>
                                                        <span className="text-[6px] text-foreground/30 font-black uppercase tracking-wider mt-0.5">Partidos jugados: {confirmedGroupMatches} / {totalExpectedMatches}</span>
                                                    </div>
                                                    <span className="text-xs font-black italic text-azul-primary">{Math.round(progressPercent)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
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
                playerToWithdraw={playerToWithdraw}
                setPlayerToWithdraw={setPlayerToWithdraw}
                handleWithdrawPlayer={(id) => setPlayerWithdrawn(id, true)}
                editingMatchPlayer={editingMatchPlayer}
                setEditingMatchPlayer={setEditingMatchPlayer}
                groups={groups}
                matches={matches}
                handleUpdateMatchPlayer={handleUpdateMatchPlayer}
                presentIds={presentTeamIds}
            />
        </div>
    );
}


