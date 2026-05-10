"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAllPlayers } from "@/app/actions/players";
import { saveTournamentFixture } from "../../actions";
import { 
    Player, Group, Match, BracketSlot, BracketMatch, Standing 
} from "./types";

// ── Shared Helper Functions ──
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

interface UseTournamentLogicProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent: string[];
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
    readOnly,
    modality
}: UseTournamentLogicProps) {
    const isIndividual = modality?.participacion === "individual" || modality?.isIndividual || false;
    const router = useRouter();

    // ── State ──
    const [step, setStep] = useState<"setup" | "done" | "qual" | "elim">(
        initialStatus === "setup" ? "setup" :
            (initialStatus === "en_eliminatorias" || initialStatus === "finalizado") ? "elim" : "done"
    );
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
    const [present, setPresent] = useState<Set<string>>(new Set(initialPresent));
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [isPlayersModalOpen, setIsPlayersModalOpen] = useState(false);
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");
    const [replacingPlayer, setReplacingPlayer] = useState<Player | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<Player[]>([]);
    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestName2, setGuestName2] = useState("");
    const [replaceSlot, setReplaceSlot] = useState<1 | 2>(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [qualPerGroup, setQualPerGroup] = useState(2);
    const [qualifierOverrides, setQualifierOverrides] = useState<Record<number, Player | "BYE">>({});

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
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 500);
    };

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
        setPresent(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    const togglePaid = (id: string) => {
        setPaid(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
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

    const handleDeletePlayer = (playerId: string) => {
        setGroups(prevGroups => prevGroups.map(group => ({
            ...group,
            players: group.players.filter(p => p.id !== playerId)
        })));
        setMatches(prevMatches => prevMatches.filter(m =>
            m.team1.id !== playerId && m.team2.id !== playerId
        ));
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

    const computeStandings = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupMatches = matches.filter(m => m.groupId === groupId && m.confirmed);
        const parsedPlayers = Array.isArray(group.players)
            ? group.players
            : typeof group.players === 'string'
                ? (() => { try { return JSON.parse(group.players as string); } catch { return []; } })()
                : [];
        const playersArray = Array.isArray(parsedPlayers) ? parsedPlayers : [];
        
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
                if (s1 > s2) { p1.won++; p2.lost++; }
                else if (s2 > s1) { p2.won++; p1.lost++; }
            }
        });

        const rankFIPGroup = (players: any[], matchesToAnalyze: any[], metricIndex: number = 0): any[] => {
            if (players.length <= 1) return players;
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
                    if (aScore !== bScore) return aScore > bScore ? [a, b] : [b, a];
                }
            }

            const metrics = [(p: any) => p.won, (p: any) => p.points, (p: any) => p.gamesWon];
            if (metricIndex >= metrics.length) return players;
            const metricFn = metrics[metricIndex];
            const groupsByMetric = new Map<number, any[]>();
            for (const p of players) {
                const val = metricFn(p);
                if (!groupsByMetric.has(val)) groupsByMetric.set(val, []);
                groupsByMetric.get(val)!.push(p);
            }
            const sortedVals = Array.from(groupsByMetric.keys()).sort((a, b) => b - a);
            let result: any[] = [];
            for (const val of sortedVals) {
                const subGroup = groupsByMetric.get(val)!;
                result = result.concat(rankFIPGroup(subGroup, matchesToAnalyze, metricIndex + 1));
            }
            return result;
        };
        return rankFIPGroup(standings, groupMatches);
    }, [groups, matches]);

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

    const handleConfirmScore = async (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match || match.score1 == null || match.score2 == null) return;
        if (match.score1 === match.score2) {
            toast.error("No se permiten empates en los partidos del torneo");
            return;
        }
        const updatedMatches = matches.map(m => m.id === matchId ? { ...m, confirmed: true } : m);
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
                setMatches(prev => prev.map(m => m.id === id ? { ...m, status: 'pending', confirmed: false } : m));
                setConfirmModal(prev => ({ ...prev, open: false }));
                toast.success("Partido reabierto correctamente");
            }
        });
    };

    const handleSimulateResults = () => {
        const newMatches = matches.map(m => {
            if (m.confirmed) return m;
            let s1 = Math.floor(Math.random() * 8);
            let s2 = Math.floor(Math.random() * 8);
            if (s1 === s2) s2 = s1 === 7 ? 6 : s1 + 1;
            return { ...m, score1: s1, score2: s2, played: true, confirmed: true };
        });
        setMatches(newMatches);
        toast.success("Resultados simulados. ¡No olvides guardar!");
    };

    const sortedQualifiers = useMemo(() => {
        const quals: any[] = [];
        groups.forEach(g => {
            const groupStandings = computeStandings(g.id);
            for (let i = 0; i < qualPerGroup; i++) {
                if (groupStandings[i]) {
                    quals.push({ ...groupStandings[i], groupId: g.id, groupRank: i + 1 });
                }
            }
        });
        return quals.sort((a, b) =>
            (a.groupRank - b.groupRank) || (b.won - a.won) || (b.points - a.points) || (b.gamesWon - a.gamesWon)
        );
    }, [groups, matches, qualPerGroup, computeStandings]);

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
                            if ((nextMatch.team1 as any) === "BYE" || (nextMatch.team2 as any) === "BYE") {
                                nextMatch.confirmed = true;
                                const advancingTeam = (nextMatch.team1 as any) !== "BYE" ? nextMatch.team1 : nextMatch.team2;
                                nextMatch.winnerId = (advancingTeam as Player)?.id || undefined;
                                nextMatch.winnerName = (advancingTeam as Player)?.name || undefined;
                            }
                        }
                    } else {
                        if (isTeam2) nextMatch.team2 = null; else nextMatch.team1 = null;
                    }
                }
            });
        }
        return safeBracket;
    }

    const handleGenerateBracket = async () => {
        if (finalQualifiers.length < 2) {
            toast.error("Se necesitan al menos 2 clasificados para generar playoffs");
            return;
        }
        const totalQuals = finalQualifiers.length;
        const numRounds = Math.ceil(Math.log2(totalQuals));
        const bracketSize = Math.pow(2, numRounds);
        setSaving(true);
        try {
            let newBracket: BracketMatch[] = [];
            for (let r = 0; r < numRounds; r++) {
                for (let s = 0; s < Math.pow(2, r); s++) {
                    newBracket.push({ id: `b_${r}_${s}`, round: r, slot: s, team1: null, team2: null, confirmed: false });
                }
            }
            const seedPositions = getSeedingOrder(bracketSize);
            const firstRoundIdx = numRounds - 1;
            const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);
            firstRoundMatches.forEach((m, idx) => {
                const s1 = seedPositions[idx * 2];
                const s2 = seedPositions[idx * 2 + 1];
                const q1 = finalQualifiers[s1 - 1];
                const q2 = finalQualifiers[s2 - 1];
                m.team1 = (q1 && s1 <= totalQuals) ? q1.player : "BYE";
                m.team2 = (q2 && s2 <= totalQuals) ? q2.player : "BYE";
                if (m.team1 === "BYE" || m.team2 === "BYE") {
                    m.confirmed = true;
                    const winner = m.team1 === "BYE" ? m.team2 : m.team1;
                    if (winner && winner !== "BYE") {
                        m.winnerId = (winner as Player).id;
                        m.winnerName = (winner as Player).name;
                    }
                }
            });
            newBracket = computeAdvancedBracket(newBracket, numRounds);
            const res = await saveTournamentFixture({
                tournamentId, phase: "eliminatorias", groups, matches, bracket: newBracket, presentPlayerIds: Array.from(present)
            });
            if (res.ok) { setBracket(newBracket); setStep("elim"); toast.success("Cuadro generado"); }
            else toast.error("Error: " + res.error);
        } catch (e) { toast.error("Error al generar cuadro"); }
        finally { setSaving(false); }
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
            if (m.id !== matchId) return { ...m };
            const winner = m.score1! > m.score2! ? m.team1 : m.team2;
            const winnerId = (winner as Player)?.id;
            const winnerName = (winner as Player)?.name;
            return { ...m, confirmed: true, winnerId, winnerName };
        });
        const totalRounds = updated.length > 0 ? Math.max(...updated.map(m => m.round)) + 1 : 0;
        const finalBracket = computeAdvancedBracket(updated, totalRounds);
        setBracket(finalBracket);
        setSaving(true);
        const match = finalBracket.find(m => m.id === matchId);
        const isFinal = match?.round === 0;
        const championName = isFinal ? (match?.winnerName || "Campeón") : undefined;
        try {
            const res = await saveTournamentFixture({
                tournamentId,
                phase: isFinal ? "finalizado" : "eliminatorias",
                groups, matches, bracket: finalBracket, championName, presentPlayerIds: Array.from(present)
            });
            if (res.ok) {
                toast.success("Resultado guardado");
                if (isFinal) setShowSuccessModal(true);
            }
        } catch (err) { toast.error("Error al guardar"); }
        finally { setSaving(false); }
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
        setMatches(initialMatches);
        setBracket(initialBracket);
    }, [initialGroups, initialMatches, initialBracket]);

    useEffect(() => {
        if (readOnly || step === "setup") return;
        if (finalQualifiers.length < 2) return;
        const bracketHasStarted = bracket.some(m => m.confirmed && m.team1 !== "BYE" && m.team2 !== "BYE");
        if (bracketHasStarted) return;
        
        const totalQuals = finalQualifiers.length;
        const numRounds = Math.ceil(Math.log2(totalQuals));
        const bracketSize = Math.pow(2, numRounds);

        setBracket(prev => {
            let newBracket: BracketMatch[] = [];
            const existingRounds = new Set(prev.map(m => m.round));
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

            for (let i = 0; i < seedPositions.length; i += 2) {
                const mIdx = i / 2;
                const q1 = finalQualifiers[seedPositions[i] - 1];
                const q2 = finalQualifiers[seedPositions[i+1] - 1];
                const t1 = (q1 && seedPositions[i] <= totalQuals) ? q1.player : "BYE";
                const t2 = (q2 && seedPositions[i+1] <= totalQuals) ? q2.player : "BYE";
                const m = firstRoundMatches.find(x => x.slot === mIdx);
                if (m) {
                    m.team1 = t1 as BracketSlot;
                    m.team2 = t2 as BracketSlot;
                    if (m.team1 === "BYE" || m.team2 === "BYE") {
                        m.confirmed = true;
                        const winner = m.team1 === "BYE" ? m.team2 : m.team1;
                        if (winner && winner !== "BYE") {
                            m.winnerId = (winner as Player).id;
                            m.winnerName = (winner as Player).name;
                        }
                    } else {
                        m.confirmed = false;
                        m.winnerId = undefined;
                        m.winnerName = undefined;
                    }
                }
            }
            const finalProcessed = computeAdvancedBracket(newBracket, numRounds);
            if (JSON.stringify(finalProcessed) !== JSON.stringify(prev)) return finalProcessed;
            return prev;
        });
    }, [finalQualifiers, readOnly, step]);

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
        qualPerGroup, setQualPerGroup,
        
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
        handleBracketScore,
        handleBracketConfirm,
        roundLabel,
        isIndividual
    };
}
