"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getAllPlayers } from "@/app/actions/players";
import { saveTournamentFixture, resetTournamentStatus, updateTournamentMetadata } from "../../actions";
import {
    Player, Group, Match, BracketSlot, BracketMatch, Standing
} from "./types";
import {
    getSeedingOrder, buildSeedMap, computeGroupStandings,
    type StMatch
} from "@/lib/matchmaking";

interface UseTournamentLogicProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent: string[];
    initialPaid: string[];
    initialUpdatedAt?: string;
    readOnly: boolean;
    modality: any;
}

export function useTournamentLogic({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus,
    initialPresent,
    initialPaid,
    initialUpdatedAt,
    readOnly,
    modality
}: UseTournamentLogicProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    // Safely parse modality inside the hook if it is passed as a string
    const parsedModality = useMemo(() => {
        if (typeof modality === "string") {
            try {
                return JSON.parse(modality);
            } catch (e) {
                console.error("Error parsing modality inside useTournamentLogic:", e);
                return null;
            }
        }
        return modality;
    }, [modality]);

    const isIndividual = parsedModality?.participacion === "individual" || parsedModality?.isIndividual || false;

    const step: "setup" | "done" | "qual" | "elim" = useMemo(() => {
        const s = searchParams.get("step");
        if (s === "done" || s === "elim" || s === "setup" || s === "qual") return s as any;
        
        return (initialStatus === "setup" || (initialGroups.length === 0 && !readOnly))
            ? "setup" :
            (initialStatus === "en_eliminatorias" || initialStatus === "finalizado") ? "elim" : "done";
    }, [searchParams, initialStatus, initialGroups.length, readOnly]);

    const setStep = useCallback((newStep: "setup" | "done" | "qual" | "elim") => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        if (current.get("step") !== newStep) {
            current.set("step", newStep);
            router.replace(`${window.location.pathname}?${current.toString()}`, { scroll: false });
        }
    }, [searchParams, router]);
    const [groups, setGroups] = useState<Group[]>(initialGroups);
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
    const ensureArray = (val: any) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return []; }
        }
        return Array.isArray(val) ? val : [];
    };

    const [present, setPresent] = useState<Set<string>>(new Set(ensureArray(initialPresent)));
    const [paid, setPaid] = useState<Set<string>>(new Set(ensureArray(initialPaid)));
    const [isPlayersModalOpen, setIsPlayersModalOpen] = useState(false);
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");
    const [replacingPlayer, setReplacingPlayer] = useState<Player | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<Player[]>([]);
    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestName2, setGuestName2] = useState("");
    const [replaceSlot, setReplaceSlot] = useState<1 | 2>(1);
    const [isRefreshing, startRefreshTransition] = useTransition();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [qualLimit, setQualLimit] = useState<number>(() => {
        const activeGroups = initialGroups.filter(g => (g.players || []).length > 0);
        return activeGroups.length * 2; // Default to 2 per group
    });
    const [qualifierOverrides, setQualifierOverrides] = useState<Record<number, Player | "BYE">>({});
    const [swappingPlayer, setSwappingPlayer] = useState<{ matchId: string, teamSlot: 1 | 2 } | null>(null);
    const lastSavedState = useRef({ present: new Set(initialPresent), paid: new Set(initialPaid) });
    const fixtureVersionRef = useRef<string | undefined>(initialUpdatedAt);

    const saveFixture = useCallback(async (input: Omit<Parameters<typeof saveTournamentFixture>[0], 'lastKnownUpdatedAt'>) => {
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
    }, []);

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

    // ── Memos ──
    const allPlayers = useMemo(() => {
        const playersMap = new Map<string, Player>();
        groups.forEach(g => {
            g.players.forEach(p => {
                playersMap.set(p.id, p);
            });
        });
        return Array.from(playersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [groups]);

    const filteredPlayers = useMemo(() => {
        if (!playerSearchQuery) return allPlayers;
        return allPlayers.filter(p =>
            p.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
        );
    }, [allPlayers, playerSearchQuery]);

    const isGroupStageFinished = useMemo(() => {
        return matches.length > 0 && matches.every(m => m.confirmed);
    }, [matches]);

    const totalGroupMatches = matches.length;
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const progressPercent = totalGroupMatches > 0
        ? Math.round((confirmedGroupMatches / totalGroupMatches) * 100)
        : 0;

    // ── Handlers ──
    const handleRefresh = () => {
        startRefreshTransition(() => {
            router.refresh();
        });
    };

    const togglePresent = (id: string) => {
        if (readOnly) return;
        const isRemoving = present.has(id);
        
        const save = async (updatedPresent: Set<string>) => {
            lastSavedState.current.present = updatedPresent;
            try {
                await updateTournamentMetadata({
                    tournamentId,
                    presentPlayerIds: Array.from(updatedPresent),
                });
            } catch (e) {
                console.error("Failed to save presence", e);
            }
        };

        if (isRemoving) {
            const player = groups.flatMap(g => g.players).find(p => p.id === id);
            const name = player?.name || "este jugador";
            setConfirmModal({
                open: true,
                title: "Quitar Presencia",
                description: `¿Estás seguro de que deseas quitar la presencia a ${name}? Esto podría afectar la disponibilidad de sus partidos.`,
                variant: 'danger',
                onConfirm: async () => {
                    const next = new Set(present);
                    next.delete(id);
                    setPresent(next);
                    await save(next);
                    setConfirmModal(prev => ({ ...prev, open: false }));
                }
            });
            return;
        }
        
        const next = new Set(present);
        next.add(id);
        setPresent(next);
        save(next);
    };

    const togglePaid = (id: string) => {
        if (readOnly) return;
        
        const next = new Set(paid);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        
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

        const updatedPresent = new Set(present);
        if (updatedPresent.has(oldPlayerId)) {
            updatedPresent.delete(oldPlayerId);
            updatedPresent.add(newPlayer.id);
        }
        const updatedPaid = new Set(paid);
        if (updatedPaid.has(oldPlayerId)) {
            updatedPaid.delete(oldPlayerId);
            updatedPaid.add(newPlayer.id);
        }
        setPresent(updatedPresent);
        lastSavedState.current.present = updatedPresent;
        setPaid(updatedPaid);
        lastSavedState.current.paid = updatedPaid;

        setReplacingPlayer(null);
        setGuestName("");
        setGuestName2("");
        setReplaceSlot(1);

        if (step !== "setup") {
            const loadingToast = toast.loading("Actualizando participantes...");
            try {
                const res = await saveFixture({
                    tournamentId,
                    phase: step === "elim" ? "eliminatorias" : "grupos",
                    groups: updatedGroups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                    matches: updatedMatches,
                    bracket: updatedBracket,
                    presentPlayerIds: Array.from(updatedPresent),
                    paidPlayerIds: Array.from(updatedPaid)
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
                id: oldPlayerId,
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

    const handleDeletePlayer = async (playerId: string) => {
        const updatedGroups = groups.map(group => ({
            ...group,
            players: group.players.filter(p => p.id !== playerId)
        }));
        const updatedMatches = matches.filter(m =>
            m.team1.id !== playerId && m.team2.id !== playerId
        );
        const updatedPresent = new Set(present);
        updatedPresent.delete(playerId);
        const updatedPaid = new Set(paid);
        updatedPaid.delete(playerId);

        setGroups(updatedGroups);
        setMatches(updatedMatches);
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
                    phase: step === "elim" ? "eliminatorias" : "grupos",
                    groups: updatedGroups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                    matches: updatedMatches,
                    bracket,
                    presentPlayerIds: Array.from(updatedPresent),
                    paidPlayerIds: Array.from(updatedPaid),
                });
                if (!res.ok) toast.error("Error al guardar cambios: " + res.error);
            } finally {
                setSaving(false);
            }
        }
    };

    const computeStandings = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupMatches = matches.filter(m => m.groupId === groupId && m.confirmed);
        const parsedPlayers = Array.isArray(group.players)
            ? group.players
            : typeof group.players === 'string'
                ? (() => { try { return JSON.parse(group.players as string); } catch { return []; } })()
                : [];
        const playersArray: Player[] = Array.isArray(parsedPlayers) ? parsedPlayers : [];

        // Núcleo extraído a @/lib/matchmaking (probado en /dev/test-matchmaking).
        return computeGroupStandings(playersArray, groupMatches as unknown as StMatch<Player>[]);
    }, [groups, matches]);

    const isGroupFinished = useCallback((groupId: string) => {
        const groupMatches = matches.filter(m => m.groupId === groupId);
        return groupMatches.length > 0 && groupMatches.every(m => m.confirmed);
    }, [matches]);

    const handleScoreChange = (matchId: string, s1: string, s2: string) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            return {
                ...m,
                score1: s1 === "" ? undefined : parseInt(s1, 10),
                score2: s2 === "" ? undefined : parseInt(s2, 10),
                played: s1 !== "" && s2 !== "",
            };
        }));
    };

    const handleConfirmScore = async (matchIdOrIds: string | string[]) => {
        const matchIds = Array.isArray(matchIdOrIds) ? matchIdOrIds : [matchIdOrIds];
        const matchesToConfirm = matches.filter(m => matchIds.includes(m.id));
        if (matchesToConfirm.length === 0) return;

        let hasTies = false;
        for (const match of matchesToConfirm) {
            const s1 = (match.score1 === undefined || match.score1 === null) ? 0 : match.score1;
            const s2 = (match.score2 === undefined || match.score2 === null) ? 0 : match.score2;
            if (s1 === s2) {
                toast.error(`Empate no permitido: ${match.team1?.name.split("/")[0]} vs ${match.team2?.name.split("/")[0]}`);
                hasTies = true;
            }
        }

        if (hasTies) return; // Abort if any ties are found
        
        const updatedMatches = matches.map(m => {
            if (matchIds.includes(m.id)) {
                const s1 = (m.score1 === undefined || m.score1 === null) ? 0 : m.score1;
                const s2 = (m.score2 === undefined || m.score2 === null) ? 0 : m.score2;
                return { ...m, score1: s1, score2: s2, confirmed: true, status: 'completed' };
            }
            return m;
        });

        const loadingToast = toast.loading(matchIds.length > 1 ? "Guardando resultados..." : "Guardando resultado...");
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                matches: updatedMatches,
                bracket: bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true
            });
            toast.dismiss(loadingToast);
            if (res.ok) {
                setMatches(updatedMatches);
                toast.success(matchIds.length > 1 ? "Marcadores guardados" : "Marcador guardado");
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Error inesperado al guardar marcador");
        } finally {
            setSaving(false);
        }
    };

    const handleReopenMatch = async (id: string) => {
        setConfirmModal({
            open: true,
            title: "Reabrir Partido",
            description: "¿Estás seguro de que deseas reabrir este partido? Se quitará el estado de finalizado y podrás volver a iniciarlo o editar los puntos.",
            variant: 'primary',
            onConfirm: async () => {
                const isBracketMatch = bracket.some(m => m.id === id);
                let newMatches = [...matches];
                let newBracket = [...bracket];

                if (isBracketMatch) {
                    // We set status to 'in_progress' to avoid immediate auto-confirmation if it's a BYE match
                    newBracket = bracket.map(m => m.id === id ? { ...m, status: 'in_progress', confirmed: false, winnerId: undefined, winnerName: undefined, score1: 0, score2: 0 } : m);
                    const totalRounds = newBracket.length > 0 ? Math.max(...newBracket.map(m => m.round)) + 1 : 0;
                    newBracket = computeAdvancedBracket(newBracket, totalRounds);
                    setBracket(newBracket);
                } else {
                    newMatches = matches.map(m => m.id === id ? { ...m, status: 'in_progress', confirmed: false, score1: 0, score2: 0 } : m);
                    setMatches(newMatches);
                }
                
                setConfirmModal(prev => ({ ...prev, open: false }));

                try {
                    const res = await saveFixture({
                        tournamentId,
                        phase: step === "elim" ? "eliminatorias" : "grupos",
                        groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                        matches: newMatches,
                        bracket: newBracket,
                        presentPlayerIds: Array.from(present),
                        paidPlayerIds: Array.from(paid),
                        skipRevalidation: true
                    });
                    if (res.ok) {
                        toast.success("Partido reabierto correctamente");
                    } else {
                        toast.error("Error al reabrir partido: " + res.error);
                    }
                } catch (err) {
                    console.error(err);
                    toast.error("Error al guardar en el servidor");
                }
            }
        });
    };

    const handleSimulateResults = async () => {
        const newMatches = matches.map(m => {
            if (m.confirmed) return m;
            let s1 = Math.floor(Math.random() * 8);
            let s2 = Math.floor(Math.random() * 8);
            if (s1 === s2) s2 = s1 === 7 ? 6 : s1 + 1;
            return { ...m, score1: s1, score2: s2, played: true, confirmed: true, status: 'completed' };
        });
        setMatches(newMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                matches: newMatches,
                bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true
            });
            if (res.ok) {
                toast.success("Resultados simulados y guardados");
            } else {
                toast.error("Error al guardar resultados simulados: " + res.error);
            }
        } finally {
            setSaving(false);
        }
    };

    const sortedQualifiers = useMemo(() => {
        const quals: any[] = [];
        // Only consider groups that have players
        const activeGroups = groups.filter(g => {
            const players = Array.isArray(g.players) ? g.players : [];
            return players.length > 0;
        });

        activeGroups.forEach((g, groupIdx) => {
            const finished = isGroupFinished(g.id) || isGroupStageFinished;
            const groupStandings = computeStandings(g.id);
            // Sanitize group name for placeholders (avoid UUIDs)
            const displayGroupName = (g.name && g.name.length < 10) ? g.name.toUpperCase() : String.fromCharCode(65 + groupIdx);
            const groupLabel = displayGroupName.includes('GRUPO') ? displayGroupName : `GRUPO ${displayGroupName}`;

            const maxPlayersInAnyGroup = Math.max(...activeGroups.map(g => g.players.length), 0);
            for (let i = 0; i < maxPlayersInAnyGroup; i++) {
                if (finished) {
                    if (groupStandings[i]) {
                        const s = groupStandings[i];
                        quals.push({ 
                            playerId: s.playerId,
                            player: s.player,
                            name: s.player.name,
                            groupName: groupLabel,
                            groupId: g.id, 
                            groupRank: i + 1, 
                            isPlaceholder: false,
                            matchesPlayed: s.matchesPlayed || 0,
                            won: s.won || 0,
                            lost: s.lost || 0,
                            points: s.points || 0,
                            gamesWon: s.gamesWon || 0,
                            gamesLost: s.gamesLost || 0
                        });
                    } else {
                        quals.push({ 
                            playerId: `BYE_${g.id}_${i}`, 
                            name: 'BYE', 
                            groupName: groupLabel,
                            isPlaceholder: false, 
                            isBye: true, 
                            groupRank: i + 1, 
                            groupId: g.id,
                            matchesPlayed: 0, won: 0, lost: 0, points: 0
                        });
                    }
                } else {
                    quals.push({
                        playerId: `TBD_${g.id}_${i}`,
                        player: { id: `TBD_${g.id}_${i}`, name: `${i + 1}º ${groupLabel}`, category: '' },
                        name: `${i + 1}º ${groupLabel}`,
                        groupName: groupLabel,
                        displayGroupName: displayGroupName,
                        groupId: g.id,
                        groupRank: i + 1,
                        isPlaceholder: true,
                        matchesPlayed: 0, won: 0, lost: 0, points: 0
                    });
                }
            }
        });
        return quals.sort((a, b) => {
            if (a.isPlaceholder && !b.isPlaceholder) return 1;
            if (!a.isPlaceholder && b.isPlaceholder) return -1;
            return (a.groupRank - b.groupRank) || (b.won - a.won) || (b.points - a.points) || (b.gamesWon - a.gamesWon);
        });
    }, [groups, matches, computeStandings, isGroupFinished, isGroupStageFinished]);

    const finalQualifiers = useMemo(() => {
        return sortedQualifiers.map((q, idx) => {
            const seed = idx + 1;
            const override = qualifierOverrides[seed];
            if (override === "BYE") return { ...q, isOverride: true, isByeOverride: true };
            if (override) return { ...q, player: override, playerId: override.id, isOverride: true };
            return q;
        });
    }, [sortedQualifiers, qualifierOverrides]);

    function computeAdvancedBracket(currentBracket: BracketMatch[], totalRounds: number): BracketMatch[] {
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
                        if (!winner && m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) {
                            winner = m.score1 > m.score2 ? m.team1 : m.team2;
                        }
                        if (isTeam2) nextMatch.team2 = winner as Player || null;
                        else nextMatch.team1 = winner as Player || null;

                        if (nextMatch.team1 && nextMatch.team2) {
                            // Only auto-confirm if one is a BYE AND the other is a real player (not a TBD or placeholder)
                            const t1 = nextMatch.team1 as any;
                            const t2 = nextMatch.team2 as any;
                            const isT1Bye = t1 === "BYE";
                            const isT2Bye = t2 === "BYE";

                            if (nextMatch.status !== 'in_progress' && (isT1Bye || isT2Bye)) {
                                const realTeam = isT1Bye ? t2 : t1;
                                const isRealPlayer = realTeam && !realTeam.isPlaceholder && !realTeam.id?.startsWith('TBD');
                                
                                if (isRealPlayer) {
                                    nextMatch.confirmed = true;
                                    nextMatch.winnerId = realTeam.id;
                                    nextMatch.winnerName = realTeam.name;
                                    nextMatch.status = 'completed';
                                }
                            }
                        }
                    } else {
                        if (isTeam2) nextMatch.team2 = null;
                        else nextMatch.team1 = null;
                        nextMatch.confirmed = false;
                        nextMatch.winnerId = undefined;
                        nextMatch.winnerName = undefined;
                    }
                }
            });
        }
        return safeBracket;
    }

    const handleGenerateBracket = async () => {
        setConfirmModal({
            open: true,
            title: "Regenerar Cuadro",
            description: "¿Estás seguro de que deseas regenerar las llaves? Se perderán todos los resultados actuales del cuadro y se armará uno nuevo con los clasificados actuales.",
            variant: 'danger',
            onConfirm: async () => {
                const actualQualifiers = finalQualifiers.slice(0, qualLimit);
                const totalQuals = actualQualifiers.length;
                if (totalQuals < 2) {
                    toast.error("Se necesitan al menos 2 clasificados para generar las llaves");
                    return;
                }

                const numRounds = Math.ceil(Math.log2(totalQuals));
                const bracketSize = Math.pow(2, numRounds);
                setSaving(true);
                setConfirmModal(prev => ({ ...prev, open: false }));

                try {
                    let newBracket: BracketMatch[] = [];
                    for (let r = 0; r < numRounds; r++) {
                        for (let s = 0; s < Math.pow(2, r); s++) {
                            newBracket.push({ id: `b_${r}_${s}`, round: r, slot: s, team1: null, team2: null, confirmed: false });
                        }
                    }

                    // ── Group Protection Seeding ──
                    // Orden de seeds + protección de grupo extraídos a @/lib/matchmaking.
                    const seedPositions = getSeedingOrder(bracketSize);
                    const seedMap = buildSeedMap(actualQualifiers);

                    const firstRoundIdx = numRounds - 1;
                    const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);
                    
                    firstRoundMatches.forEach((m, idx) => {
                        const s1 = seedPositions[idx * 2];
                        const s2 = seedPositions[idx * 2 + 1];
                        const q1 = seedMap.get(s1);
                        const q2 = seedMap.get(s2);
                        const t1 = q1 ? q1.player : "BYE";
                        const t2 = q2 ? q2.player : "BYE";

                        m.team1 = t1 as BracketSlot;
                        m.team2 = t2 as BracketSlot;

                        if (m.team1 === "BYE" || m.team2 === "BYE") {
                            m.confirmed = true;
                            const winner = m.team1 === "BYE" ? m.team2 : m.team1;
                            if (winner && winner !== "BYE") {
                                m.winnerId = (winner as Player).id;
                                m.winnerName = (winner as Player).name;
                            }
                        }
                    });

                    const finalBracket = computeAdvancedBracket(newBracket, numRounds);
                    const res = await saveFixture({
                        tournamentId, phase: "eliminatorias", groups, matches, bracket: finalBracket, 
                        presentPlayerIds: Array.from(present),
                        paidPlayerIds: Array.from(paid)
                    });

                    if (res.ok) {
                        setBracket(finalBracket);
                        setStep("elim");
                        toast.success("Cuadro generado correctamente");
                    } else {
                        toast.error("Error al guardar: " + res.error);
                    }
                } catch (e) {
                    console.error(e);
                    toast.error("Error al generar cuadro");
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    const handleSwapPlayers = async (matchId: string, teamSlot: 1 | 2) => {
        if (readOnly) return;
        
        if (!swappingPlayer) {
            setSwappingPlayer({ matchId, teamSlot });
            toast.info("Seleccionado para intercambiar. Haz clic en otro jugador para completar el cambio.");
            return;
        }

        if (swappingPlayer.matchId === matchId && swappingPlayer.teamSlot === teamSlot) {
            setSwappingPlayer(null);
            toast.info("Intercambio cancelado");
            return;
        }

        const matchA = bracket.find(m => m.id === swappingPlayer.matchId);
        const matchB = bracket.find(m => m.id === matchId);

        if (!matchA || !matchB) {
            setSwappingPlayer(null);
            return;
        }

        const playerA = swappingPlayer.teamSlot === 1 ? matchA.team1 : matchA.team2;
        const playerB = teamSlot === 1 ? matchB.team1 : matchB.team2;

        const newBracket = bracket.map(m => {
            let nm = { ...m };
            if (m.id === swappingPlayer.matchId) {
                if (swappingPlayer.teamSlot === 1) nm.team1 = playerB;
                else nm.team2 = playerB;
            }
            if (m.id === matchId) {
                if (teamSlot === 1) nm.team1 = playerA;
                else nm.team2 = playerA;
            }
            return nm;
        });

        // Recompute all rounds to handle propagation
        const totalRounds = newBracket.length > 0 ? Math.max(...newBracket.map(m => m.round)) + 1 : 0;
        const finalBracket = computeAdvancedBracket(newBracket, totalRounds);

        setBracket(finalBracket);
        setSwappingPlayer(null);

        const loadingToast = toast.loading("Guardando cambios de posición...");
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "eliminatorias",
                groups,
                matches,
                bracket: finalBracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
            });
            toast.dismiss(loadingToast);
            if (res.ok) {
                toast.success("Posiciones intercambiadas");
            } else {
                toast.error("Error al guardar cambios: " + res.error);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Error al guardar cambios en el servidor");
        } finally {
            setSaving(false);
        }
    };

    const handleBracketStart = async (matchId: string) => {
        const updated = bracket.map(m => m.id === matchId ? { ...m, status: 'in_progress' } : m);
        setBracket(updated);
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "eliminatorias",
                groups, matches, bracket: updated,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true
            });
            if (!res.ok) {
                setBracket(bracket);
                toast.error("Error al iniciar partido: " + res.error);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        if (readOnly) return;
        setBracket(prev => prev.map(m => {
            if (m.id !== matchId || m.confirmed) return m;
            return {
                ...m,
                score1: s1 === "" ? 0 : parseInt(s1, 10),
                score2: s2 === "" ? 0 : parseInt(s2, 10),
            };
        }));
    };

    const handleBracketConfirm = async (matchId: string) => {
        const targetMatch = bracket.find(m => m.id === matchId);
        if (!targetMatch) return;

        if (targetMatch.score1 == null || targetMatch.score2 == null) {
            toast.error("Debes ingresar ambos puntajes para finalizar el partido");
            return;
        }

        if (targetMatch.score1 === targetMatch.score2) {
            toast.error("No se permiten empates en llaves de eliminación");
            return;
        }
        const updated = bracket.map(m => {
            if (m.id !== matchId) return m; // Return exactly the same object to preserve status
            const winner = m.score1! > m.score2! ? m.team1 : m.team2;
            const winnerId = (winner as Player)?.id;
            const winnerName = (winner as Player)?.name;
            return { ...m, confirmed: true, winnerId, winnerName, status: 'completed' };
        });

        const totalRounds = updated.length > 0 ? Math.max(...updated.map(m => m.round)) + 1 : 0;
        const finalBracket = computeAdvancedBracket(updated, totalRounds);
        
        // Ensure we preserve the 'in_progress' status of any match that was already started
        const preservedBracket = finalBracket.map(m => {
            const original = bracket.find(ob => ob.id === m.id);
            if (original?.status === 'in_progress' && !m.confirmed) {
                return { ...m, status: 'in_progress' };
            }
            return m;
        });

        setBracket(preservedBracket);
        setSaving(true);
        const match = finalBracket.find(m => m.id === matchId);
        const isFinal = match?.round === 0;
        const championName = isFinal ? (match?.winnerName || "Campeón") : undefined;
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "eliminatorias",
                groups, matches, bracket: preservedBracket, championName, 
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true // Keep it on the dashboard without automatic redirects
            });
            if (res.ok) {
                toast.success("Resultado guardado");
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (err) { 
            console.error(err);
            toast.error("Error al guardar"); 
        } finally { 
            setSaving(false); 
        }
    };

    const roundsArr = useMemo(() => {
        const rounds = bracket.map(m => m.round);
        return Array.from(new Set(rounds)).sort((a, b) => b - a);
    }, [bracket]);

    const roundLabel = (r: number) => {
        if (r === 0) return "Final 🏆";
        if (r === 1) return "Semifinal";
        if (r === 2) return "Cuartos";
        if (r === 3) return "Octavos";
        return `Ronda ${roundsArr.length - r}`;
    };

    const fetchPlayers = useCallback(async () => {
        setIsFetchLoading(true);
        const players = await getAllPlayers();
        setAllPotentialPlayers(players);
        setIsFetchLoading(false);
    }, []);

    useEffect(() => {
        if (replacingPlayer) {
            fetchPlayers();
            const names = replacingPlayer.name.split("/").map(n => n.trim());
            setGuestName(names[0] || "");
            setGuestName2(names[1] || "");
            setPlayerSearchQuery("");
        }
    }, [replacingPlayer, fetchPlayers]);

    useEffect(() => {
        setGroups(initialGroups);
        
        // Intelligent sync for Group matches
        setMatches(prev => {
            return initialMatches.map(newM => {
                const localM = prev.find(pm => pm.id === newM.id);
                if (localM?.status === 'in_progress' && !newM.confirmed) {
                    return { ...newM, status: 'in_progress' };
                }
                return newM;
            });
        });
        
        // Intelligent sync: preserve 'in_progress' status for matches currently active in UI
        setBracket(prev => {
            return initialBracket.map(newM => {
                const localM = prev.find(pm => pm.id === newM.id);
                // If local match is in_progress but server says it's pending/other (not confirmed), keep in_progress
                if (localM?.status === 'in_progress' && !newM.confirmed) {
                    return { ...newM, status: 'in_progress' };
                }
                return newM;
            });
        });
        
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
    }, [initialGroups, initialMatches, initialBracket, initialPresent, initialPaid]);

    const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastAutoSaveHash = useRef("");

    useEffect(() => {
        if (readOnly || step === "setup") return;
        const currentHash = JSON.stringify({
            m: matches.map(m=>[m.id, m.score1, m.score2, m.status, m.confirmed]),
            b: bracket.map(b=>[b.id, b.score1, b.score2, b.status, b.confirmed]),
            g: groups.map(g => (g as any).courtNumber || null)
        });
        if (lastAutoSaveHash.current === currentHash) return;
        
        // Skip auto-save on the very first render if we just mapped initial data
        if (!lastAutoSaveHash.current) {
            lastAutoSaveHash.current = currentHash;
            return;
        }

        if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
        autoSaveTimeout.current = setTimeout(async () => {
            try {
                lastAutoSaveHash.current = currentHash;
                await saveFixture({
                    tournamentId,
                    phase: step !== "elim" ? "grupos" : "eliminatorias",
                    groups, matches, bracket,
                    presentPlayerIds: Array.from(present),
                    paidPlayerIds: Array.from(paid),
                    skipRevalidation: true
                });
            } catch (e) { console.error("Auto-save failed", e); }
        }, 1500);
    }, [matches, bracket, tournamentId, step, groups, present, paid, readOnly]);

    useEffect(() => {
        if (readOnly || step === "setup" || step === "elim") return;
        if (finalQualifiers.length < 2) return;
        // Improved check to stop syncing if the bracket has started or if it was manually modified
        const bracketHasStarted = bracket.some(m => 
            (m.confirmed && m.team1 !== "BYE" && m.team2 !== "BYE") || 
            m.status === 'in_progress' ||
            ((m.score1 !== undefined && m.score1 !== 0) || (m.score2 !== undefined && m.score2 !== 0))
        );
        if (bracketHasStarted) return;
        
        const actualQuals = finalQualifiers.slice(0, qualLimit);
        const totalQuals = actualQuals.length;
        if (totalQuals < 2) return;

        const numRounds = Math.ceil(Math.log2(totalQuals));
        const bracketSize = Math.pow(2, numRounds);

        setBracket(prev => {
            let newBracket: BracketMatch[] = [];
            const existingRounds = new Set(prev.map(m => m.round));
            // Force recreation if size changes or if it was empty
            const needsRecreation = prev.length === 0 || (existingRounds.size > 0 && existingRounds.size !== numRounds);

            if (needsRecreation) {
                for (let r = 0; r < numRounds; r++) {
                    for (let s = 0; s < Math.pow(2, r); s++) {
                        newBracket.push({ id: `b_${r}_${s}`, round: r, slot: s, team1: null, team2: null, confirmed: false });
                    }
                }
            } else {
                newBracket = prev.map(m => ({ ...m }));
            }

            const seedPositions = getSeedingOrder(bracketSize);
            const firstRoundIdx = numRounds - 1;
            const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);

            // Protección de grupo extraída a @/lib/matchmaking.
            const seedMap = buildSeedMap(actualQuals);

            for (let i = 0; i < seedPositions.length; i += 2) {
                const mIdx = i / 2;
                const s1 = seedPositions[i];
                const s2 = seedPositions[i + 1];

                const q1 = seedMap.get(s1);
                const q2 = seedMap.get(s2);

                const t1 = (q1 && !q1.isByeOverride) ? q1.player : "BYE";
                const t2 = (q2 && !q2.isByeOverride) ? q2.player : "BYE";

                const m = firstRoundMatches.find(x => x.slot === mIdx);
                if (m) {
                    m.team1 = t1 as BracketSlot;
                    m.team2 = t2 as BracketSlot;
                    
                    // Reset or Set confirmation based on BYEs
                    if (m.team1 === "BYE" || m.team2 === "BYE") {
                        const realTeam = m.team1 === "BYE" ? m.team2 : m.team1;
                        const isRealPlayer = realTeam && !(realTeam as any).isPlaceholder && !(realTeam as any).id?.startsWith('TBD');
                        
                        if (isRealPlayer) {
                            m.confirmed = true;
                            m.winnerId = (realTeam as Player).id;
                            m.winnerName = (realTeam as Player).name;
                        } else {
                            m.confirmed = false;
                            m.winnerId = undefined;
                            m.winnerName = undefined;
                        }
                    } else {
                        m.confirmed = false;
                        m.winnerId = undefined;
                        m.winnerName = undefined;
                    }
                }
            }
            return computeAdvancedBracket(newBracket, numRounds);
        });
    }, [finalQualifiers, qualLimit, readOnly, step]);

    return {
        // State
        step, setStep,
        groups, setGroups,
        matches, setMatches,
        bracket, setBracket,
        present, setPresent,
        paid, setPaid,
        isPlayersModalOpen, setIsPlayersModalOpen,
        playerSearchQuery, setPlayerSearchQuery,
        replacingPlayer, setReplacingPlayer,
        playerToDelete, setPlayerToDelete,
        allPotentialPlayers,
        isFetchLoading,
        guestName, setGuestName,
        guestName2, setGuestName2,
        replaceSlot, setReplaceSlot,
        isRefreshing,
        showSuccessModal, setShowSuccessModal,
        saving,
        searchQuery, setSearchQuery,
        confirmModal, setConfirmModal,
        qualLimit, setQualLimit,
        finalQualifiers,
        
        // Memos
        allPlayers,
        filteredPlayers,
        isGroupStageFinished,
        progressPercent,
        confirmedGroupMatches,
        totalGroupMatches,
        roundsArr,
        
        // Handlers
        handleRefresh,
        togglePresent,
        togglePaid,
        handleReplacePlayer,
        handleReplaceOneInPair,
        handleReplaceWithGuest,
        handleDeletePlayer,
        computeStandings,
        handleScoreChange,
        handleConfirmScore,
        handleReopenMatch,
        handleSimulateResults,
        handleGenerateBracket,
        handleBracketStart,
        handleBracketScore,
        handleBracketConfirm,
        handleSwapPlayers,
        swappingPlayer,
        roundLabel,
        isIndividual,
        bulkUpdateStatus
    };
}
