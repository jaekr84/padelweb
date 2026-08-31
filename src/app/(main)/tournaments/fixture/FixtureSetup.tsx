"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
    Users, CheckCircle2, Trophy, ArrowRight, ArrowLeft,
    Dice5, Check, Trash2, Plus, Minus, Eraser,
    AlertCircle, ChevronRight,
    Users2, AlertTriangle, X, ChevronDown, Search, Zap, ArrowRightLeft,
    LayoutDashboard, Swords, BarChart3, Clock
} from "lucide-react";
import { TournamentStep } from "./components/tournament/TournamentTimeline";
import { TournamentNavBar } from "./components/tournament/TournamentNavBar";
import { getAllPlayers } from "@/app/actions/players";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/Dialog";

import { saveTournamentFixture, getAvailablePlayers, quickInscribePlayer, registerManualPlayer, updateTournamentMetadata } from "./actions";
import { distributeIntoGroups, shuffle as shuffleCore, generateGroupMatches } from "@/lib/matchmaking";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ManualRegistrationModal from "./ManualRegistrationModal";
import BulkRegistrationModal from "./BulkRegistrationModal";
import { SplitAttendanceList } from "./components/SplitAttendanceList";
import { FormatSelector } from "./components/FormatSelector";
import { Player, Group } from "./components/tournament/types";

export interface FixtureSetupProps {
    tournamentId: string;
    tournamentName: string;
    initialStatus: string;
    initialPlayers: Player[];
    initialGroups?: Group[];
    initialPresent?: string[];
    initialPaid?: string[];
    categories?: string[];
    isIndividual?: boolean;
}

// Local types for specific fixture logic
type Match = {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    played: boolean;
    confirmed: boolean;
};

function buildGroups(count: number): Group[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `g${i}`,
        name: `Grupo ${String.fromCharCode(65 + i)}`,
        players: [],
    }));
}


export default function FixtureSetup({
    tournamentId,
    tournamentName,
    initialStatus,
    initialPlayers,
    initialGroups = [],
    initialPresent = [],
    initialPaid = [],
    categories = ["A+", "A", "B", "C", "D"], // Default fallback
    isIndividual = false
}: FixtureSetupProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlStep = searchParams.get("step") as "format" | "config" | "assign" | null;

    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [step, setStep] = useState<"checkin" | "format" | "config" | "assign">(urlStep || "checkin");

    const timelineStep: TournamentStep =
        step === "checkin" ? "attendance" :
            step === "format" ? "format" :
                step === "config" ? "structure" :
                    "draw";

    // The format can only change while no fixture exists — see setTournamentFormat.
    const formatLocked = initialGroups.length > 0 || !["draft", "published"].includes(initialStatus);

    useEffect(() => {
        const s = searchParams.get("step");
        if (s === "format" || s === "config" || s === "assign") {
            setStep(s);
        } else if (s === "checkin" || !s) {
            setStep("checkin");
        }
    }, [searchParams]);

    // Initialize paid/present assuming all initial players are present since we skip check-in
    const [paid, setPaid] = useState<Set<string>>(new Set(initialPaid));
    const [present, setPresent] = useState<Set<string>>(new Set(initialPresent));

    // ── Attendance Logic ──
    const togglePresent = (id: string) => {
        const next = new Set(present);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setPresent(next);
        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: Array.from(next),
        });
    };

    const togglePaid = (id: string) => {
        const next = new Set(paid);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setPaid(next);
        updateTournamentMetadata({
            tournamentId,
            paidPlayerIds: Array.from(next),
        });
    };

    const bulkUpdateStatus = (type: 'present' | 'paid', ids: string[]) => {
        const setter = type === 'present' ? setPresent : setPaid;
        setter(new Set(ids));
        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: type === 'present' ? ids : Array.from(present),
            paidPlayerIds: type === 'paid' ? ids : Array.from(paid),
        });
        toast.success(type === 'present' ? "Jugadores habilitados" : "Estado de pago actualizado");
    };

    // New: Track if randomized at least once
    const [hasRandomized, setHasRandomized] = useState(initialGroups.length > 0);

    const [numGroups, setNumGroups] = useState(initialGroups.length || 4);
    const [playersPerGroup, setPlayersPerGroup] = useState(initialGroups[0]?.players.length || 3);
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [ytUrl, setYtUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [swappedIds, setSwappedIds] = useState<Set<string>>(new Set());
    const [firstSelectedPlayerId, setFirstSelectedPlayerId] = useState<string | null>(null);

    // Replacement/Deletion state
    const [replacingParticipant, setReplacingParticipant] = useState<{ checkinId: string, displayName: string, pairId: string } | null>(null);
    const [participantToDelete, setParticipantToDelete] = useState<{ id: string, name: string } | null>(null);
    const [confirmClearGroups, setConfirmClearGroups] = useState(false);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<any[]>([]);

    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Un id por integrante para las parejas ("pairId_0" / "pairId_1"), el id pelado
    // en individuales. Es la lista completa de "todos habilitados".
    const allCheckinIds = useMemo(() => {
        const ids: string[] = [];
        players.forEach(p => {
            if (isIndividual) {
                ids.push(p.id);
            } else {
                ids.push(`${p.id}_0`);
                if (p.player2 || p.name.includes(" / ")) ids.push(`${p.id}_1`);
            }
        });
        return ids;
    }, [players, isIndividual]);

    // Los jugadores arrancan habilitados: el admin deshabilita al que no juega.
    // Solo se siembra en un torneo sin fixture y sin ninguna marca previa, así no
    // pisa la selección de un torneo que ya venía armado.
    const seededRef = useRef(false);
    useEffect(() => {
        if (seededRef.current) return;
        if (initialPresent.length > 0 || initialGroups.length > 0) return;
        if (allCheckinIds.length === 0) return;
        seededRef.current = true;
        setPresent(new Set(allCheckinIds));
        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: allCheckinIds,
        });
    }, [allCheckinIds, initialPresent.length, initialGroups.length, tournamentId]);

    // "Habilitar todos" solo suma: dejar el set vacío haría que el sembrado de
    // arriba vuelva a habilitar a todos en la próxima carga.
    const handleCheckAll = (type: 'paid' | 'present') => {
        if (type === 'present') {
            bulkUpdateStatus('present', allCheckinIds);
            return;
        }
        const areAll = allCheckinIds.length > 0 && allCheckinIds.every(id => paid.has(id));
        bulkUpdateStatus('paid', areAll ? [] : allCheckinIds);
    };

    const fetchPotentialPlayers = useCallback(async () => {
        setIsFetchLoading(true);
        const p = await getAllPlayers();
        setAllPotentialPlayers(p);
        setIsFetchLoading(false);
    }, []);

    useEffect(() => {
        if (replacingParticipant) {
            fetchPotentialPlayers();
        }
    }, [replacingParticipant, fetchPotentialPlayers]);

    const handleReplaceParticipant = (newPlayer: any) => {
        if (!replacingParticipant) return;
        const { pairId, checkinId } = replacingParticipant;
        const isSecond = checkinId.endsWith("_1");

        const updatedPlayers = players.map(p => {
            if (p.id !== pairId) return p;

            const registrationName = p.name;
            const names = registrationName.split(" / ");
            let newRegistrationName = "";

            if (isIndividual) {
                newRegistrationName = newPlayer.name;
            } else {
                if (isSecond) {
                    newRegistrationName = `${p.player1 || names[0]} / ${newPlayer.name}`;
                } else {
                    newRegistrationName = `${newPlayer.name} / ${p.player2 || names[1]}`;
                }
            }

            return {
                ...p,
                name: newRegistrationName,
                [isSecond ? "player2" : "player1"]: newPlayer.name,
                [isSecond ? "partnerUserId" : "userId"]: newPlayer.id,
                image: newPlayer.image || p.image,
                category: newPlayer.category || p.category
            };
        });

        setPlayers(updatedPlayers);

        // El reemplazo ocupa el mismo lugar en la lista: hereda el estado de
        // habilitación del que salió, no vuelve a arrancar deshabilitado.
        const nextPresent = new Set(present);
        setPresent(nextPresent);

        const nextPaid = new Set(paid);
        if (nextPaid.has(pairId)) {
            nextPaid.delete(pairId);
        }
        setPaid(nextPaid);

        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: Array.from(nextPresent),
            paidPlayerIds: Array.from(nextPaid),
        });

        setReplacingParticipant(null);
        setGuestName("");
        setPlayerSearchQuery("");
        toast.success("Participante reemplazado");
    };

    const handleReplaceWithGuest = () => {
        if (!guestName.trim()) {
            toast.error("Ingresá un nombre");
            return;
        }
        handleReplaceParticipant({
            id: `guest_${Date.now()}`,
            name: guestName.trim() + " (Inv)",
            category: "D"
        });
    };

    const handleDeleteRegistration = (registrationId: string) => {
        setPlayers(prev => prev.filter(p => p.id !== registrationId));

        const nextPresent = new Set(present);
        nextPresent.delete(registrationId);
        nextPresent.delete(`${registrationId}_0`);
        nextPresent.delete(`${registrationId}_1`);
        setPresent(nextPresent);

        const nextPaid = new Set(paid);
        nextPaid.delete(registrationId);
        nextPaid.delete(`${registrationId}_0`);
        nextPaid.delete(`${registrationId}_1`);
        setPaid(nextPaid);

        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: Array.from(nextPresent),
            paidPlayerIds: Array.from(nextPaid),
        });

        setParticipantToDelete(null);
        toast.success("Participante eliminado");
    };




    const onPlayerAdded = (player: any) => {
        setPlayers(prev => [...prev, player as Player]);
        if (isIndividual) {
            setPresent(prev => new Set([...prev, player.id]));
        } else {
            setPresent(prev => new Set([...prev, `${player.id}_0`, `${player.id}_1`]));
            setPaid(prev => new Set([...prev, `${player.id}_0`, `${player.id}_1`]));
        }
    };

    const PRESENT_PLAYERS = useMemo(() =>
        players.filter(p => {
            if (isIndividual) return present.has(p.id);
            // Si es dobles, aceptamos si el ID base está presente (legacy/quick) 
            // O si AMBOS IDs individuales están presentes
            return present.has(p.id) || (present.has(`${p.id}_0`) && present.has(`${p.id}_1`));
        }),
        [players, present, isIndividual]);

    // Si deshabilitás a alguien después del sorteo, hay que sacarlo del grupo donde
    // había caído. Se compara contra la pasada anterior en vez de filtrar el grupo
    // entero por PRESENT_PLAYERS: así no se tocan los invitados cargados a mano en
    // un grupo (no están en `players`) ni los torneos viejos que quedaron con los
    // grupos armados y el check-in vacío.
    const prevEnabledIdsRef = useRef<Set<string> | null>(null);
    useEffect(() => {
        const enabled = new Set(PRESENT_PLAYERS.map(p => p.id));
        const prev = prevEnabledIdsRef.current;
        prevEnabledIdsRef.current = enabled;
        if (!prev) return; // primera pasada: no tocamos lo que ya estaba sorteado

        const justDisabled = new Set([...prev].filter(id => !enabled.has(id)));
        if (justDisabled.size === 0) return;

        setGroups(prevGroups => {
            let changed = false;
            const next = prevGroups.map(g => {
                const kept = g.players.filter(p => !justDisabled.has(p.id));
                if (kept.length === g.players.length) return g;
                changed = true;
                return { ...g, players: kept };
            });
            return changed ? next : prevGroups;
        });
    }, [PRESENT_PLAYERS]);

    // Próximo grupo que recibiría un doble click, sólo para el tooltip.
    const nextAutoGroupName = useMemo(() => {
        const conCupo = groups.filter(g => g.players.length < playersPerGroup);
        if (conCupo.length === 0) return null;
        const minimo = Math.min(...conCupo.map(g => g.players.length));
        return conCupo.find(g => g.players.length === minimo)!.name;
    }, [groups, playersPerGroup]);

    const totalSlots = numGroups * playersPerGroup;
    const assignedIds = new Set(groups.flatMap(g => g.players.map(p => p.id)));
    const unassigned = PRESENT_PLAYERS.filter(p => !assignedIds.has(p.id));
    const allFull = groups.every(g => g.players.length >= 2); // At least 2 per group to play
    const totalAssigned = assignedIds.size;




    const handleStart = () => {
        if (PRESENT_PLAYERS.length === 0) return;
        setGroups(buildGroups(numGroups));
        setStep("assign");
    };

    const handleConfirmGroups = async () => {
        setSaving(true);
        // Todos contra todos dentro de cada grupo. Criterio extraído a
        // @/lib/matchmaking (probado en /dev/test-matchmaking).
        const currentMatches = generateGroupMatches(groups) as Match[];

        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            youtubeUrl: ytUrl || undefined,
            groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
            matches: currentMatches,
            bracket: [],
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid),
            restartGroups: true,
        });

        if (res.ok) {
            // step=done explícito: arrancar el torneo siempre abre la fase de grupos,
            // no las llaves, aunque el torneo hubiera llegado a eliminatorias antes.
            router.push(`/tournaments/${tournamentId}/manage?step=done`);
        } else {
            alert("Error al iniciar el torneo: " + res.error);
        }
        setSaving(false);
    };

    const handleAddPlayer = useCallback((playerId: string, groupId: string) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                if (g.players.length >= playersPerGroup) return g;
                const player = PRESENT_PLAYERS.find((p) => p.id === playerId);
                if (!player) return g;
                return { ...g, players: [...g.players, player] };
            })
        );
    }, [playersPerGroup, PRESENT_PLAYERS]);

    const handleRemovePlayer = useCallback((playerId: string) => {
        setGroups((prev) =>
            prev.map((g) => ({
                ...g,
                players: g.players.filter((p) => p.id !== playerId),
            }))
        );
    }, []);

    // Los invitados se cargan directo adentro de un grupo: no están en `players`,
    // así que vaciar los grupos los pierde (no vuelven al pool). Se avisa antes.
    const guestsInGroups = useMemo(() => {
        const registeredIds = new Set(players.map(p => p.id));
        return groups.flatMap(g => g.players).filter(p => !registeredIds.has(p.id));
    }, [groups, players]);

    // Vaciar todos los grupos de una para rearmarlos a mano: sacarlos de a uno
    // con la papelera es inviable con 30 jugadores.
    const handleClearGroups = useCallback(() => {
        setGroups(prev => prev.map(g => ({ ...g, players: [] })));
        setFirstSelectedPlayerId(null);
        setSwappedIds(new Set());
        setConfirmClearGroups(false);
        toast.success("Grupos vaciados: asignalos a mano o volvé a sortear");
    }, []);

    const handleAddGuest = useCallback((name: string, groupId: string) => {
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                if (g.players.length >= playersPerGroup) return g;
                // For individual tournaments, we don't need the (inv.) suffix
                const guestName = isIndividual ? name : `${name} (inv.)`;
                return { ...g, players: [...g.players, { id: guestId, name: guestName }] };
            })
        );
    }, [playersPerGroup]);

    // Sorteo instantáneo: antes revelaba jugador por jugador con ~1.2s de animación.
    const handleRandomize = useCallback(() => {
        if (PRESENT_PLAYERS.length === 0) return;

        const shuffled = shuffleCore(PRESENT_PLAYERS);

        // Placement decided by the shared, tested core (club-balanced distribution).
        const target = distributeIntoGroups(shuffled, numGroups, playersPerGroup, { preshuffled: true });
        const groupIndexByPlayer = new Map<string, number>();
        target.forEach((g, gi) => g.players.forEach(p => groupIndexByPlayer.set(p.id, gi)));

        const nextGroups = buildGroups(numGroups);
        for (const player of shuffled) {
            const gi = groupIndexByPlayer.get(player.id);
            if (gi === undefined) continue; // overflow (more players than slots)
            nextGroups[gi].players.push(player);
        }

        setGroups(nextGroups);
        setHasRandomized(true);
    }, [numGroups, playersPerGroup, PRESENT_PLAYERS]);

    const handleAddGroup = useCallback(() => {
        setGroups(prev => {
            const nextLetter = String.fromCharCode(65 + (prev.length % 26));
            const suffix = prev.length >= 26 ? Math.floor(prev.length / 26) + 1 : "";
            return [...prev, {
                id: `g${prev.length}_${Date.now()}`,
                name: `Grupo ${nextLetter}${suffix}`,
                players: []
            }];
        });
        setNumGroups(prev => prev + 1);
        toast.success("Nuevo grupo añadido");
    }, []);

    // ─── Drag and Drop Handlers ───
    const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

    const onDragStart = (e: React.DragEvent, playerId: string) => {
        setDraggedPlayerId(playerId);
        e.dataTransfer.setData("playerId", playerId);
        e.dataTransfer.effectAllowed = "move";
        // Visual feedback for the ghost image
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.5";
        }
    };

    const onDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "1";
        }
        setDraggedPlayerId(null);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    /**
     * Manda un jugador del pool al próximo lugar libre siguiendo el orden de
     * llenado: primero el slot 1 de todos los grupos, después el 2, y así. Se
     * elige el grupo con menos jugadores; a igualdad, el primero (A, B, C...).
     */
    const handlePlayerAutoAssign = useCallback((playerId: string) => {
        const player = PRESENT_PLAYERS.find(p => p.id === playerId);
        if (!player) return;
        // Sólo asigna desde el pool: a los que ya están en un grupo no los mueve.
        if (groups.some(g => g.players.some(p => p.id === playerId))) return;

        const conCupo = groups.filter(g => g.players.length < playersPerGroup);
        if (conCupo.length === 0) {
            toast.error("No hay cupo libre en ningún grupo");
            return;
        }

        const minimo = Math.min(...conCupo.map(g => g.players.length));
        const destino = conCupo.find(g => g.players.length === minimo)!;

        setGroups(prev => prev.map(g =>
            g.id === destino.id ? { ...g, players: [...g.players, player] } : g
        ));
        // El doble click cancela cualquier selección de intercambio a medias.
        setFirstSelectedPlayerId(null);
        setSwappedIds(new Set());
    }, [groups, PRESENT_PLAYERS, playersPerGroup]);

    // El click simple (modo intercambio) se retrasa un toque: sin esto, los dos
    // clicks del doble también lo dispararían. El usuario pidió doble click
    // justamente para no asignar por un click en falso.
    const poolClickTimer = useRef<NodeJS.Timeout | null>(null);
    // handlePlayerClick se define más abajo (depende del estado de intercambio);
    // el ref evita tener que reordenar todo el bloque.
    const handlePlayerClickRef = useRef<(playerId: string) => void>(() => { });
    useEffect(() => () => { if (poolClickTimer.current) clearTimeout(poolClickTimer.current); }, []);

    const handlePoolClick = useCallback((playerId: string) => {
        if (poolClickTimer.current) clearTimeout(poolClickTimer.current);
        poolClickTimer.current = setTimeout(() => {
            poolClickTimer.current = null;
            handlePlayerClickRef.current(playerId);
        }, 220);
    }, []);

    const handlePoolDoubleClick = useCallback((playerId: string) => {
        if (poolClickTimer.current) {
            clearTimeout(poolClickTimer.current);
            poolClickTimer.current = null;
        }
        handlePlayerAutoAssign(playerId);
    }, [handlePlayerAutoAssign]);

    const handlePlayerClick = useCallback((playerId: string) => {
        if (!firstSelectedPlayerId) {
            // First click: select the player
            setFirstSelectedPlayerId(playerId);
            setSwappedIds(new Set([playerId]));
            return;
        }

        // Second click: swap
        if (firstSelectedPlayerId === playerId) {
            // Clicking the same player deselects
            setFirstSelectedPlayerId(null);
            setSwappedIds(new Set());
            return;
        }

        const id1 = firstSelectedPlayerId;
        const id2 = playerId;

        setGroups((prev) => {
            const group1 = prev.find(g => g.players.some(p => p.id === id1));
            const group2 = prev.find(g => g.players.some(p => p.id === id2));

            // If either player is in the pool (unassigned), handle move instead of swap?
            // Actually the user specifically said "intercambiar el lugar".

            if (group1 && group2) {
                // Swap between two groups
                const p1 = group1.players.find(p => p.id === id1)!;
                const p2 = group2.players.find(p => p.id === id2)!;

                toast.info(`Intercambio: ${p1.name} ⇄ ${p2.name}`, {
                    icon: "🔄",
                    description: `${group1.name} ⇄ ${group2.name}`,
                });

                // Visual feedback
                setSwappedIds(new Set([id1, id2]));
                setTimeout(() => {
                    setSwappedIds(new Set());
                }, 1000);
                setFirstSelectedPlayerId(null);

                return prev.map(g => {
                    if (g.id === group1.id && g.id === group2.id) {
                        // Same group swap
                        const newPlayers = [...g.players];
                        const idx1 = newPlayers.findIndex(p => p.id === id1);
                        const idx2 = newPlayers.findIndex(p => p.id === id2);
                        [newPlayers[idx1], newPlayers[idx2]] = [newPlayers[idx2], newPlayers[idx1]];
                        return { ...g, players: newPlayers };
                    }
                    if (g.id === group1.id) {
                        return { ...g, players: g.players.map(p => p.id === id1 ? p2 : p) };
                    }
                    if (g.id === group2.id) {
                        return { ...g, players: g.players.map(p => p.id === id2 ? p1 : p) };
                    }
                    return g;
                });
            } else if (group1 || group2) {
                // One is in pool, one is in group
                const group = group1 || group2;
                const inGroupId = group1 ? id1 : id2;
                const inPoolId = group1 ? id2 : id1;

                const pInGroup = group!.players.find(p => p.id === inGroupId)!;
                const pInPool = PRESENT_PLAYERS.find(p => p.id === inPoolId)!;

                toast.info(`Intercambio: ${pInGroup.name} ⇄ ${pInPool.name}`, {
                    icon: "🔄",
                });

                setSwappedIds(new Set([id1, id2]));
                setTimeout(() => setSwappedIds(new Set()), 1000);
                setFirstSelectedPlayerId(null);

                return prev.map(g => {
                    if (g.id === group!.id) {
                        return { ...g, players: g.players.map(p => p.id === inGroupId ? pInPool : p) };
                    }
                    return g;
                });
            }

            setFirstSelectedPlayerId(null);
            setSwappedIds(new Set());
            return prev;
        });
    }, [firstSelectedPlayerId, PRESENT_PLAYERS]);

    handlePlayerClickRef.current = handlePlayerClick;

    const handleEmptySpotClick = useCallback((targetGroupId: string) => {
        if (!firstSelectedPlayerId) return;

        const playerId = firstSelectedPlayerId;
        setGroups((prev) => {
            const sourceGroup = prev.find(g => g.players.some(p => p.id === playerId));
            const player = sourceGroup ? sourceGroup.players.find(p => p.id === playerId) : PRESENT_PLAYERS.find(p => p.id === playerId);

            if (!player) return prev;

            const targetGroup = prev.find(g => g.id === targetGroupId);
            if (!targetGroup || targetGroup.players.length >= playersPerGroup) return prev;

            // Move player to target group
            const updatedGroups = prev.map(g => ({
                ...g,
                players: g.players.filter(p => p.id !== playerId)
            }));

            setSwappedIds(new Set([playerId]));
            setTimeout(() => setSwappedIds(new Set()), 1000);
            setFirstSelectedPlayerId(null);

            return updatedGroups.map(g => {
                if (g.id !== targetGroupId) return g;
                return { ...g, players: [...g.players, player] };
            });
        });
    }, [firstSelectedPlayerId, PRESENT_PLAYERS, playersPerGroup]);

    const onDropOnGroup = useCallback((e: React.DragEvent, targetGroupId: string) => {
        e.preventDefault();
        const playerId = e.dataTransfer.getData("playerId") || draggedPlayerId;
        if (!playerId) return;

        setGroups((prev) => {
            // 1. Identify player and source group
            const sourceGroup = prev.find(g => g.players.some(p => p.id === playerId));
            let player = sourceGroup ? sourceGroup.players.find(p => p.id === playerId) : PRESENT_PLAYERS.find(p => p.id === playerId);

            if (!player) return prev;

            const targetGroup = prev.find(g => g.id === targetGroupId);
            if (!targetGroup) return prev;

            // 2. Logic: Move or Swap?
            const isFull = targetGroup.players.length >= playersPerGroup;

            if (isFull) {
                if (sourceGroup) {
                    // SWAP: Source -> Target, Target[Last] -> Source
                    const playerToSwapOut = targetGroup.players[targetGroup.players.length - 1];

                    toast.info(`Intercambio: ${player.name} ⇄ ${playerToSwapOut.name}`, {
                        icon: "🔄",
                        description: `A ${targetGroup.name} y B ${sourceGroup.name}`,
                    });

                    // Visual highlight
                    setSwappedIds(new Set([player.id, playerToSwapOut.id]));
                    setTimeout(() => setSwappedIds(new Set()), 2000);

                    return prev.map(g => {
                        if (g.id === sourceGroup.id) {
                            return {
                                ...g,
                                players: g.players.map(p => p.id === playerId ? playerToSwapOut : p)
                            };
                        }
                        if (g.id === targetGroupId) {
                            return {
                                ...g,
                                players: g.players.map(p => p.id === playerToSwapOut.id ? player! : p)
                            };
                        }
                        return g;
                    });
                } else {
                    // Target full and coming from pool
                    toast.error("Grupo completo (No hay espacio en este grupo)");
                    return prev;
                }
            } else {
                // NORMAL MOVE: Remove from anywhere, add to target
                const updatedGroups = prev.map(g => ({
                    ...g,
                    players: g.players.filter(p => p.id !== playerId)
                }));

                // Highlight moved player
                setSwappedIds(new Set([player.id]));
                setTimeout(() => setSwappedIds(new Set()), 1500);

                return updatedGroups.map(g => {
                    if (g.id !== targetGroupId) return g;
                    return { ...g, players: [...g.players, player!] };
                });
            }
        });
    }, [draggedPlayerId, playersPerGroup, PRESENT_PLAYERS]);

    const onDropOnPool = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const playerId = e.dataTransfer.getData("playerId") || draggedPlayerId;
        if (!playerId) return;
        handleRemovePlayer(playerId);
    }, [draggedPlayerId, handleRemovePlayer]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Barra unificada de gestión (misma en setup, gestión y llaves) */}
            <TournamentNavBar
                tournamentId={tournamentId}
                tournamentName={tournamentName}
                status={initialStatus}
                format="round_robin"
                currentStep={timelineStep}
                onBack={() => {
                    if (step === "assign") setStep("config");
                    else if (step === "config") setStep("format");
                    else if (step === "format") setStep("checkin");
                    else router.push(`/tournaments/${tournamentId}/manage`);
                }}
                onOpenPlayers={() => setIsPlayerModalOpen(true)}
            />

            <main className="max-w-6xl mx-auto px-4 py-8 pb-32">

                <AnimatePresence mode="wait">
                    {step === "checkin" && (
                        <motion.div
                            key="checkin"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <SplitAttendanceList
                                players={players}
                                isIndividual={isIndividual}
                                searchQuery={playerSearchQuery}
                                setSearchQuery={setPlayerSearchQuery}
                                categoryFilter={categoryFilter}
                                setCategoryFilter={setCategoryFilter}
                                categories={categories}
                                paid={paid}
                                togglePaid={togglePaid}
                                present={present}
                                togglePresent={togglePresent}
                                onCheckAll={handleCheckAll}
                                onInscribir={() => setIsPlayerModalOpen(true)}
                                onCargaMasiva={() => setIsBulkModalOpen(true)}
                                variant="habilitacion"
                            />

                            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-6">
                                <button
                                    onClick={() => setStep("format")}
                                    disabled={PRESENT_PLAYERS.length < 2}
                                    className="w-full py-3.5 bg-volt text-carbon-950 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-volt/25 hover:bg-volt-dark hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-sm disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:scale-100"
                                >
                                    Continuar ({PRESENT_PLAYERS.length})
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === "format" && (
                        <motion.div
                            key="format"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                        >
                            <FormatSelector
                                tournamentId={tournamentId}
                                currentFormat="round_robin"
                                presentCount={PRESENT_PLAYERS.length}
                                isIndividual={isIndividual}
                                locked={formatLocked}
                                onBack={() => setStep("checkin")}
                                onContinueSameFormat={() => setStep("config")}
                            />
                        </motion.div>
                    )}

                    {step === "config" && (
                        <motion.div
                            key="config"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6"
                        >
                            <div className="px-2 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground">Estructura</h2>
                                    <p className="text-foreground/60 text-[9px] font-black tracking-widest uppercase">Ajustá la configuración de los grupos</p>
                                </div>
                                <button
                                    onClick={() => setIsPlayerModalOpen(true)}
                                    className="px-3 py-1.5 bg-azul-primary/10 text-azul-primary border border-azul-primary/30 rounded-lg font-black uppercase italic text-[8px] tracking-widest hover:bg-azul-primary hover:text-white transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-3 h-3" />
                                    Inscribir Participante
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {/* Grupos Selector */}
                                <div className="bg-muted/30 border border-border/50 rounded-xl p-2.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-azul-primary/70">
                                        <Users2 className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Cantidad de Grupos</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-card border border-border/50 rounded-lg p-1 shadow-sm">
                                        <button
                                            onClick={() => setNumGroups(Math.max(1, numGroups - 1))}
                                            className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/60 transition-colors text-foreground/70"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-black italic text-foreground leading-none">{numGroups}</span>
                                            <span className="text-[7px] font-bold text-foreground/40 uppercase mt-0.5">Grupos</span>
                                        </div>
                                        <button
                                            onClick={() => setNumGroups(Math.min(16, numGroups + 1))}
                                            className="w-7 h-7 rounded-md bg-azul-primary flex items-center justify-center text-white shadow-sm shadow-azul-primary/20 hover:scale-105 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Jugadores Selector */}
                                <div className="bg-muted/30 border border-border/50 rounded-xl p-2.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-celeste/70">
                                        <Users className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Integrantes / Grupo</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-card border border-border/50 rounded-lg p-1 shadow-sm">
                                        <button
                                            onClick={() => setPlayersPerGroup(Math.max(2, playersPerGroup - 1))}
                                            className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/60 transition-colors text-foreground/70"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-black italic text-foreground leading-none">{playersPerGroup}</span>
                                            <span className="text-[7px] font-bold text-foreground/40 uppercase mt-0.5">{isIndividual ? "Jugadores" : "Parejas"}</span>
                                        </div>
                                        <button
                                            onClick={() => setPlayersPerGroup(Math.min(16, playersPerGroup + 1))}
                                            className="w-7 h-7 rounded-md bg-celeste flex items-center justify-center text-carbon-950 shadow-sm shadow-celeste/20 hover:scale-105 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[
                                    { label: "Habilitados", value: isIndividual ? present.size : `${Math.floor(present.size / 2)} eq.`, detail: `${present.size} jug.`, color: "text-azul-primary" },
                                    { label: "Cupos", value: numGroups * playersPerGroup, detail: "Disponibilidad", color: "text-foreground/80" },
                                    {
                                        label: PRESENT_PLAYERS.length > numGroups * playersPerGroup ? "Excedente" : "Pendientes",
                                        value: Math.abs(PRESENT_PLAYERS.length - numGroups * playersPerGroup),
                                        detail: PRESENT_PLAYERS.length === numGroups * playersPerGroup ? "Match Ideal" : "Diferencia",
                                        color: PRESENT_PLAYERS.length === numGroups * playersPerGroup ? "text-emerald-500" : "text-celeste"
                                    },
                                    { label: "Partidos", value: (playersPerGroup * (playersPerGroup - 1) / 2) * numGroups, detail: "Etapa Grupos", color: "text-foreground/60" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-card border border-border/50 rounded-xl p-2 shadow-sm text-center">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/40 block mb-0.5">{stat.label}</span>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-xs md:text-sm font-black italic ${stat.color} leading-none`}>{stat.value}</span>
                                            <span className="text-[6px] font-bold text-foreground/30 uppercase mt-0.5">{stat.detail}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => router.push(`/tournaments/${tournamentId}/manage`)}
                                    className="flex-1 py-2.5 bg-muted hover:bg-muted/60 border border-border/50 rounded-xl font-black uppercase italic tracking-widest text-[9px] transition-all text-foreground/70"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleStart}
                                    className="flex-[2] py-2.5 bg-azul-primary hover:bg-azul-primary/90 text-white rounded-xl font-black uppercase italic tracking-widest text-[10px] transition-all shadow-lg shadow-azul-primary/10 flex items-center justify-center gap-2"
                                >
                                    <Swords className="w-3.5 h-3.5" />
                                    Configurar Grupos
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === "assign" && (
                        <motion.div
                            key="assign"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8"
                        >
                            <div className="px-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground leading-none">Asignación</h2>
                                        <p className="text-foreground/40 text-[9px] font-black tracking-widest uppercase mt-0.5">Armado de grupos y sorteo</p>
                                    </div>

                                    {/* MODO INTERCAMBIO INDICATOR */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${firstSelectedPlayerId
                                            ? "bg-azul-primary/10 border-azul-primary/30"
                                            : "bg-muted/30 border-border/50"
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 ${firstSelectedPlayerId ? "bg-azul-primary text-white" : "bg-muted text-foreground/40"
                                            }`}>
                                            <Zap className={`w-3 h-3 ${firstSelectedPlayerId ? "animate-pulse" : ""}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${firstSelectedPlayerId ? "text-azul-primary" : "text-foreground/40"}`}>
                                                {firstSelectedPlayerId ? "Modo Intercambio" : "Click para mover"}
                                            </span>
                                            <span className="text-[8px] font-bold text-foreground/60 mt-0.5">
                                                {firstSelectedPlayerId ? "Elegí el destino o pareja" : "Seleccioná un jugador"}
                                            </span>
                                        </div>
                                        {firstSelectedPlayerId && (
                                            <button
                                                onClick={() => { setFirstSelectedPlayerId(null); setSwappedIds(new Set()); }}
                                                className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-rojo/10 text-rojo hover:bg-rojo hover:text-white transition-all"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </motion.div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRandomize}
                                        disabled={unassigned.length === 0}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all bg-azul-primary/10 text-azul-primary border border-azul-primary/20 hover:bg-azul-primary hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                        <Dice5 className="w-4 h-4" />
                                        Sorteo
                                    </button>
                                    <button
                                        onClick={() => setConfirmClearGroups(true)}
                                        disabled={totalAssigned === 0}
                                        title="Sacar a todos de los grupos para asignarlos a mano"
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest bg-rojo/10 text-rojo border border-rojo/20 hover:bg-rojo hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                        <Eraser className="w-4 h-4" />
                                        Vaciar Grupos
                                    </button>
                                    <button
                                        onClick={handleAddGroup}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest bg-celeste/10 text-celeste border border-celeste/20 hover:bg-celeste hover:text-white transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nuevo Grupo
                                    </button>
                                </div>
                            </div>

                            {/* Player Pool */}
                            <div
                                className="bg-muted/20 border border-border/50 rounded-2xl p-3"
                                onDragOver={onDragOver}
                                onDrop={onDropOnPool}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Sin Asignar ({unassigned.length})</span>
                                    {unassigned.length > 0 && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/40">
                                            Doble click → próximo lugar libre
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {unassigned.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => handlePoolClick(p.id)}
                                                onDoubleClick={() => handlePoolDoubleClick(p.id)}
                                                title={`Doble click: mandar a ${nextAutoGroupName ?? "el próximo lugar libre"}`}
                                                className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all flex items-center gap-2 ${swappedIds.has(p.id)
                                                    ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                    : "bg-muted hover:bg-azul-primary/10 border-border text-foreground/80"
                                                    }`}
                                            >
                                                <ArrowRightLeft className={`w-3 h-3 ${swappedIds.has(p.id) ? "animate-pulse" : ""}`} />
                                                {p.name}
                                            </button>
                                    ))}
                                    {unassigned.length === 0 && (
                                        <div className="w-full py-4 text-center border border-dashed border-border rounded-2xl">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60 italic">Todo listo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-40 md:pb-12">
                                {groups.map(g => (
                                    <div
                                        key={g.id}
                                        className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col shadow-sm"
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDropOnGroup(e as any, g.id)}
                                    >
                                        <div className="px-4 py-1.5 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase italic tracking-[0.15em] text-azul-primary">{g.name}</span>
                                            <span className="text-[9px] font-black text-foreground/40">{g.players.length} / {playersPerGroup}</span>
                                        </div>
                                        <div className="p-1.5 space-y-1 flex-1 min-h-[120px]">
                                            {g.players.map(p => (
                                                    <div
                                                        key={p.id}
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e as any, p.id)}
                                                        onDragEnd={onDragEnd as any}
                                                        onClick={() => handlePlayerClick(p.id)}
                                                        className={`flex items-center justify-between rounded-xl px-3 py-1.5 group cursor-pointer transition-all duration-500 ${swappedIds.has(p.id)
                                                            ? "bg-azul-primary shadow-[0_0_20px_rgba(var(--azul-primary-rgb),0.3)] text-white"
                                                            : "bg-muted hover:bg-foreground/5 text-foreground"
                                                            }`}
                                                    >
                                                        <span className={`text-[11px] font-black uppercase italic transition-colors ${swappedIds.has(p.id) ? "text-foreground" : ""
                                                            }`}>{p.name}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePlayerClick(p.id); }}
                                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${swappedIds.has(p.id)
                                                                    ? "bg-white text-azul-primary"
                                                                    : "bg-azul-primary/10 text-azul-primary hover:bg-azul-primary hover:text-white"
                                                                    }`}
                                                                title="Intercambiar"
                                                            >
                                                                <ArrowRightLeft className={`w-3.5 h-3.5 ${swappedIds.has(p.id) ? "animate-pulse" : ""}`} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRemovePlayer(p.id); }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-rojo/5 text-rojo/40 hover:bg-rojo hover:text-white transition-all"
                                                                title="Quitar"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                            ))}
                                            {/* Espacios faltantes */}
                                            {Array.from({ length: Math.max(0, playersPerGroup - g.players.length) }).map((_, i) => (
                                                <div
                                                    key={`empty-${g.id}-${i}`}
                                                    onClick={() => handleEmptySpotClick(g.id)}
                                                    className={`flex items-center justify-between rounded-xl px-3 py-1.5 border border-dashed mt-1 first:mt-0 cursor-pointer transition-all ${firstSelectedPlayerId ? "bg-celeste/10 border-celeste/40 scale-[1.02]" : "bg-rojo/5 border-rojo/20"
                                                        }`}
                                                >
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${firstSelectedPlayerId ? "text-celeste" : "text-rojo/50"
                                                        }`}>
                                                        {firstSelectedPlayerId ? "Asignar aquí" : "Cupo disponible"}
                                                    </span>
                                                    {firstSelectedPlayerId ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-celeste" />
                                                    ) : (
                                                        <AlertCircle className="w-3.5 h-3.5 text-rojo/30" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const name = prompt("Nombre del invitado:");
                                                if (name) handleAddGuest(name, g.id);
                                            }}
                                            className="py-1.5 px-3 bg-muted/50 text-[9px] font-black uppercase tracking-[0.3em] text-azul-primary hover:bg-azul-primary hover:text-white transition-all border-t border-border/50"
                                        >
                                            + Invitado
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Sticky Footer */}
                            <div className="fixed bottom-20 md:bottom-0 left-0 right-0 px-6 pb-4 pt-8 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
                                <div className="max-w-6xl mx-auto flex gap-4">
                                    <button
                                        onClick={() => setStep("config")}
                                        className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-surface-raised transition-all backdrop-blur-xl"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        disabled={!allFull || saving}
                                        onClick={handleConfirmGroups}
                                        className={`flex-1 h-12 rounded-xl font-black uppercase italic tracking-widest text-[10px] md:text-xs transition-all shadow-2xl flex items-center justify-center gap-3 backdrop-blur-xl ${!allFull
                                            ? "bg-card text-muted-foreground/60 border border-border/50"
                                            : "bg-celeste text-carbon-950 shadow-celeste/40"
                                            }`}
                                    >
                                        {saving ? "Guardando..." : allFull ? "Iniciar Torneo" : "Completá los grupos"}
                                        {!saving && allFull && <Trophy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Drawing Overlay */}

                {/* Player Selection Modal */}
                <ManualRegistrationModal
                    isOpen={isPlayerModalOpen}
                    onClose={() => setIsPlayerModalOpen(false)}
                    tournamentId={tournamentId}
                    categories={categories}
                    isIndividual={isIndividual}
                    onSuccess={onPlayerAdded}
                    existingPlayerIds={new Set(players.flatMap(p => [p.userId, p.partnerUserId]).filter(Boolean) as string[])}
                />

                <BulkRegistrationModal
                    open={isBulkModalOpen}
                    onClose={() => setIsBulkModalOpen(false)}
                    tournamentId={tournamentId}
                    isIndividual={isIndividual}
                    categories={categories}
                    onRegistered={(nuevos) => nuevos.forEach(onPlayerAdded)}
                />

                {/* MODAL REEMPLAZO DE PARTICIPANTE */}
                <Dialog open={!!replacingParticipant} onOpenChange={(open) => !open && setReplacingParticipant(null)}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Cambiar Participante</DialogTitle>
                            <DialogDescription>
                                Reemplazar a <span className="text-foreground">{replacingParticipant?.displayName}</span> por otro jugador o invitado.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Invitado */}
                            <div className="p-6 bg-muted/30 rounded-3xl border border-border/50 space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Opción 1: Invitado Manual</span>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre del invitado..."
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-celeste"
                                    />
                                    <button
                                        onClick={handleReplaceWithGuest}
                                        className="px-6 py-3 bg-azul-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-azul-primary/20"
                                    >
                                        Usar
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
                                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-celeste"
                                    />
                                </div>

                                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {isFetchLoading ? (
                                        <div className="py-8 text-center animate-pulse text-xs font-black uppercase tracking-widest text-foreground/70">
                                            Cargando jugadores...
                                        </div>
                                    ) : allPotentialPlayers
                                        .filter(p => !playerSearchQuery || p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
                                        .slice(0, 10).map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleReplaceParticipant(p)}
                                                className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-azul-primary hover:text-white rounded-2xl border border-border/50 transition-all group/p"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center group-hover/p:bg-surface-raised">
                                                        <Users2 className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black uppercase italic">{p.name}</p>
                                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest text-celeste">Cat: {p.category || "D"}</p>
                                                    </div>
                                                </div>
                                                <Plus className="w-4 h-4 opacity-0 group-hover/p:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* MODAL CONFIRMACION ELIMINAR */}
                <Dialog open={!!participantToDelete} onOpenChange={(open) => !open && setParticipantToDelete(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-rojo">¿Eliminar Participante?</DialogTitle>
                            <DialogDescription>
                                Estás por quitar a <span className="text-foreground font-black">{participantToDelete?.name}</span> de la lista del torneo. Esta acción no se puede deshacer.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => setParticipantToDelete(null)}
                                className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => participantToDelete && handleDeleteRegistration(participantToDelete.id)}
                                className="flex-1 px-4 py-3 bg-rojo hover:bg-rojo/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rojo/20"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* MODAL CONFIRMACION VACIAR GRUPOS */}
                <Dialog open={confirmClearGroups} onOpenChange={setConfirmClearGroups}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-rojo">¿Vaciar los grupos?</DialogTitle>
                            <DialogDescription>
                                Vas a sacar {totalAssigned} {totalAssigned === 1 ? "participante" : "participantes"} de los grupos para asignarlos a mano. Los grupos quedan vacíos y podés volver a sortear cuando quieras.
                                {guestsInGroups.length > 0 && (
                                    <span className="block mt-2 text-rojo font-black">
                                        Ojo: {guestsInGroups.length} {guestsInGroups.length === 1 ? "invitado cargado a mano se pierde" : "invitados cargados a mano se pierden"} y hay que volver a agregarlos.
                                    </span>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => setConfirmClearGroups(false)}
                                className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleClearGroups}
                                className="flex-1 px-4 py-3 bg-rojo hover:bg-rojo/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rojo/20"
                            >
                                Sí, Vaciar
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}


