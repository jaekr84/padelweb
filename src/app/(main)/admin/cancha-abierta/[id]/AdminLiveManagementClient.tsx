"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import {
    Users, Play, CheckCircle, Clock, Search,
    Plus, Minus, RefreshCw, Trophy, Activity,
    Calendar, DollarSign, UserCheck, ShieldCheck,
    ChevronRight, ArrowLeft, LayoutGrid, ListFilter,
    Trash2, Flag, ChevronUp, ChevronDown, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    OpenCourtEvent, OpenCourtRegistration, OpenCourtCourt,
    OpenCourtMatch, User
} from "@/db/schema";
import {
    addCourtToEventAction,
    toggleCourtAction,
    setPlayerPresenceAction,
    registerPlayerManualAction,
    registerGuestManualAction,
    togglePaymentStatusAction,
    bulkMarkAllAsPaidAction,
    bulkMarkAllAsPresentAction,
    removeCourtAction,
    finishOpenCourtMatchAction,
    createOpenCourtMatchAction,
    finishOpenCourtEventAction,
    updateCourtSettingsAction,
    updateMatchPlayerAction
} from "../actions";
import { toast } from "sonner";
import Link from "next/link";

interface RegistrationWithUser extends OpenCourtRegistration {
    user: User | null;
    hasPaid: boolean;
}

interface MiniPlayer {
    id: string;
    name: string;
    email: string;
    category: string;
}

interface EventWithDetails extends OpenCourtEvent {
    registrations: RegistrationWithUser[];
    courts: OpenCourtCourt[];
    matches: OpenCourtMatch[];
}

interface Props {
    initialEvent: EventWithDetails;
    initialRegistrations: RegistrationWithUser[];
    allPlayers: MiniPlayer[];
}



export default function AdminLiveManagementClient({ initialEvent, initialRegistrations, allPlayers }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [event, setEvent] = useState(initialEvent);
    const [registrations, setRegistrations] = useState(initialRegistrations);

    // Synchronize local states with props when they change (e.g. after router.refresh())
    useEffect(() => {
        setRegistrations(initialRegistrations);
    }, [initialRegistrations]);

    useEffect(() => {
        setEvent(initialEvent);
    }, [initialEvent]);

    // Determine initial tab based on URL param or event status
    const initialTab = useMemo(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'attendance' || tabParam === 'live' || tabParam === 'history') {
            return tabParam as "attendance" | "live" | "history";
        }
        return event.status === 'completed' ? "history" : "attendance";
    }, [searchParams, event.status]);

    const [activeTab, setActiveTab] = useState<"attendance" | "live" | "history">(initialTab);
    const [isGenerating, setIsGenerating] = useState(false);

    // Sincronizar estado local cuando las props cambian (vía router.refresh)
    useEffect(() => {
        setEvent(initialEvent);
        setRegistrations(initialRegistrations);
    }, [initialEvent, initialRegistrations]);

    // Search/Add Manual Player state
    const [searchQuery, setSearchQuery] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [isAddingPlayer, setIsAddingPlayer] = useState(false);

    // Score Entry State (Inline per Match)
    const [liveScores, setLiveScores] = useState<Record<string, { s1: number, s2: number }>>({});


    const [selectingFor, setSelectingFor] = useState<{ courtId: string, slot: 'team1Player1Id' | 'team1Player2Id' | 'team2Player1Id' | 'team2Player2Id' } | null>(null);
    const [swapSearchQuery, setSwapSearchQuery] = useState("");

    // Side Selection State
    const [sideSelector, setSideSelector] = useState<{ userId: string; name: string; isGuest?: boolean } | null>(null);
    const [selectedSide, setSelectedSide] = useState<"drive" | "reves" | "ambos">("ambos");
    const [selectedGender, setSelectedGender] = useState<"masculino" | "femenino">("masculino");
    const [isGuestMode, setIsGuestMode] = useState(false);
    const [guestName, setGuestName] = useState("");

    const handleUpdatePlayer = async (courtId: string, slot: string, newPlayerId: string) => {
        const isOccupied = event.courts.find(c => c.id === courtId)?.status !== "available";
        const currentMatch = event.matches.find(m => m.courtId === courtId && m.status === "in_progress");

        if (isOccupied && currentMatch) {
            // Live Update (Server + Optimistic)
            setEvent(prev => ({
                ...prev,
                matches: prev.matches.map(m => m.id === currentMatch.id ? { ...m, [slot]: newPlayerId } : m)
            }));
            const res = await updateMatchPlayerAction(currentMatch.id, slot, newPlayerId);
            if (!res.success) {
                toast.error("Error al actualizar jugador");
                // Refresh to sync
                startTransition(() => { router.refresh(); });
            }
        }

        setSelectingFor(null);
        setSwapSearchQuery("");
    };

    const getPlayerName = (id: string) => {
        const reg = registrations.find(r => r.userId === id || r.id === id);
        if (!reg) return "Jugador";
        return reg.guestName || (reg.user ? `${reg.user.firstName} ${reg.user.lastName}` : "Jugador");
    };
    const getPlayerSide = (id: string) => {
        const reg = registrations.find(r => r.userId === id || r.id === id);
        if (!reg) return null;
        return reg.sidePreference || (reg.user?.side) || "ambos";
    };
    const getPlayerImage = (id: string) => {
        const reg = registrations.find(r => r.userId === id || r.id === id);
        return reg?.user?.imageUrl || null;
    };

    const updateInlineScore = (matchId: string, team: 1 | 2, delta: number) => {
        setLiveScores(prev => {
            const current = prev[matchId] || { s1: 0, s2: 0 };
            const next = { ...current };
            if (team === 1) next.s1 = Math.max(0, next.s1 + delta);
            else next.s2 = Math.max(0, next.s2 + delta);
            return { ...prev, [matchId]: next };
        });
    };




    const handleFinishMatch = async (matchId: string) => {
        const scores = liveScores[matchId] || { s1: 0, s2: 0 };

        // Optimistic update
        const match = event.matches.find(m => m.id === matchId);
        if (match?.courtId) {
            setEvent(prev => ({
                ...prev,
                courts: prev.courts.map(c => c.id === match.courtId ? { ...c, status: 'available' } : c),
                matches: prev.matches.map(m => m.id === matchId ? {
                    ...m,
                    status: 'completed',
                    score1: scores.s1,
                    score2: scores.s2,
                    finishedAt: new Date() // Cambiado de string a objeto Date para cumplir con el esquema
                } : m)
            }));
        }

        const res = await finishOpenCourtMatchAction(matchId, scores.s1, scores.s2);
        if (res.success) {
            toast.success("Partido finalizado");
            setLiveScores(prev => {
                const next = { ...prev };
                delete next[matchId];
                return next;
            });
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al finalizar partido");
            window.location.reload();
        }
    };


    const confirmRegistrationWithSide = async () => {
        if (!sideSelector) return;

        let res;
        if (sideSelector.isGuest) {
            if (!guestName.trim()) {
                toast.error("El nombre del invitado es obligatorio");
                return;
            }
            res = await registerGuestManualAction(event.id, guestName.trim(), selectedSide, selectedGender);
        } else {
            res = await registerPlayerManualAction(event.id, sideSelector.userId, selectedSide, selectedGender);
        }

        if (res.success) {
            toast.success(sideSelector.isGuest ? "Invitado agregado" : "Jugador agregado");
            setSideSelector(null);
            setSearchQuery("");
            setGuestName("");
            setIsAddingPlayer(false);
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error: " + res.error);
        }
    };


    // Derived State
    const waitingPlayers = useMemo(() =>
        registrations.filter(r => r.status === "waiting"),
        [registrations]);

    const playingPlayersIds = useMemo(() => {
        const ids = new Set<string>();
        const activeCourtIds = new Set(event.courts.map(c => c.id));

        event.matches.filter(m =>
            m.status === "in_progress" &&
            activeCourtIds.has(m.courtId || "") // Solo contar si la cancha todavía existe
        ).forEach(m => {
            ids.add(m.team1Player1Id);
            ids.add(m.team1Player2Id);
            ids.add(m.team2Player1Id);
            ids.add(m.team2Player2Id);
        });
        return ids;
    }, [event.matches, event.courts]);

    // Calcular partidos jugados por cada usuario/invitado
    const matchesPlayedCount = useMemo(() => {
        const counts = new Map<string, number>();
        registrations.forEach(r => counts.set(r.userId || r.id, 0));
        event.matches.filter(m => m.status === "completed").forEach(m => {
            [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id].forEach(id => {
                counts.set(id, (counts.get(id) || 0) + 1);
            });
        });
        return counts;
    }, [event.matches, registrations]);

    const availablePlayers = useMemo(() => {

        // Obtener última vez que jugó (para desempate si matchesPlayed es igual)
        const lastMatchTime = new Map<string, number>();
        event.matches.filter(m => m.status === "completed").forEach(m => {
            const time = m.finishedAt ? new Date(m.finishedAt).getTime() : 0;
            [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id].forEach(id => {
                const prev = lastMatchTime.get(id) || 0;
                if (time > prev) lastMatchTime.set(id, time);
            });
        });

        return waitingPlayers
            .filter(p => {
                const pid = p.userId || p.id;
                return !playingPlayersIds.has(pid);
            })
            .sort((a, b) => {
                const idA = a.userId || a.id;
                const idB = b.userId || b.id;

                // 1. Prioridad: Menos partidos jugados (RUEDA)
                const matchesA = matchesPlayedCount.get(idA) || 0;
                const matchesB = matchesPlayedCount.get(idB) || 0;
                if (matchesA !== matchesB) return matchesA - matchesB;

                // 2. Desempate 1: El que más tiempo lleva fuera (último partido finalizado)
                const timeA = lastMatchTime.get(idA) || 0;
                const timeB = lastMatchTime.get(idB) || 0;
                if (timeA !== timeB) return timeA - timeB; // El que terminó antes va primero

                // 3. Desempate 2: Fecha de inscripción original
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });
    }, [waitingPlayers, playingPlayersIds, matchesPlayedCount, event.matches]);

    const activeCourts = useMemo(() =>
        [...event.courts].filter(c => c.isActive).sort((a, b) => a.courtNumber - b.courtNumber),
        [event.courts]);

    const filteredPlayers = useMemo(() => {
        if (!searchQuery) return [];
        const registeredIds = new Set<string>();
        registrations.forEach(r => {
            if (r.userId) registeredIds.add(r.userId);
        });
        return allPlayers
            .filter(p => !registeredIds.has(p.id))
            .filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 5);
    }, [searchQuery, allPlayers, registrations]);

    // Matching Algorithm (Social & Fair Rotation)
    const generateNextMatch = useCallback(async (courtId: string) => {
        if (availablePlayers.length < 4) {
            toast.error("No hay suficientes jugadores disponibles (mínimo 4)");
            return;
        }

        setIsGenerating(true);

        const court = event.courts.find(c => c.id === courtId);
        if (!court) {
            setIsGenerating(false);
            return;
        }

        const mode = court.matchType || 'libre';

        // 1. Seleccionar los 4 jugadores respetando prioridad y restricciones de modo
        let candidates: RegistrationWithUser[] = [];

        if (mode === 'mixto') {
            // Caso Mixto: Necesitamos 2 hombres y 2 mujeres de los que más tiempo llevan esperando
            const topMales = availablePlayers.filter(p => (p.gender || p.user?.gender) === 'masculino').slice(0, 2);
            const topFemales = availablePlayers.filter(p => (p.gender || p.user?.gender) === 'femenino').slice(0, 2);

            if (topMales.length < 2 || topFemales.length < 2) {
                toast.error("No hay suficientes hombres y mujeres (2+2) para un mixto.");
                setIsGenerating(false);
                return;
            }
            candidates = [...topMales, ...topFemales];
        } else if (mode === 'mismo_genero') {
            // Caso Mismo Género: Seleccionar los primeros 4 que permitan hacer parejas de igual género (H+H y/o M+M)
            // Esto significa que el número de hombres seleccionados debe ser par (0, 2 o 4)
            const picked: RegistrationWithUser[] = [];
            let hombresPicked = 0;

            for (const p of availablePlayers) {
                if (picked.length === 4) break;
                const isH = (p.gender || p.user?.gender) === 'masculino';

                // Si ya tenemos 3 y vamos a pickear el 4to, debemos asegurar paridad
                if (picked.length === 3) {
                    const willBeHombres = hombresPicked + (isH ? 1 : 0);
                    if (willBeHombres % 2 !== 0) continue; // Skip if it breaks parity
                }

                picked.push(p);
                if (isH) hombresPicked++;
            }

            if (picked.length < 4) {
                toast.error("No hay jugadores suficientes para formar dos parejas de mismo género.");
                setIsGenerating(false);
                return;
            }
            candidates = picked;
        } else {
            // Modo Libre: Los primeros 4 de la lista
            candidates = availablePlayers.slice(0, 4);
        }

        // 2. Obtener historial y tiempos para el desempate de parejas
        const lastMatchTime = new Map<string, number>();
        const pairHistory = new Map<string, number>(); // "id1-id2" -> count
        const opponentHistory = new Map<string, number>(); // "id1-id2" -> count

        event.matches.filter(m => m.status === "completed").forEach(m => {
            const time = m.finishedAt ? new Date(m.finishedAt).getTime() : 0;
            const players = [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id];

            players.forEach(id => {
                if (time > (lastMatchTime.get(id) || 0)) lastMatchTime.set(id, time);
            });

            // Registrar parejas
            const registerPair = (a: string, b: string) => {
                const key = [a, b].sort().join("-");
                pairHistory.set(key, (pairHistory.get(key) || 0) + 1);
            };
            registerPair(m.team1Player1Id, m.team1Player2Id);
            registerPair(m.team2Player1Id, m.team2Player2Id);

            // Registrar oponentes
            const registerOpp = (a: string, b: string) => {
                const key = [a, b].sort().join("-");
                opponentHistory.set(key, (opponentHistory.get(key) || 0) + 1);
            };
            [m.team1Player1Id, m.team1Player2Id].forEach(p1 => {
                [m.team2Player1Id, m.team2Player2Id].forEach(p2 => registerOpp(p1, p2));
            });
        });

        // 3. Evaluar las 3 combinaciones posibles de estos 4 jugadores
        // Opciones: (0,1)vs(2,3), (0,2)vs(1,3), (0,3)vs(1,2)
        const possibleCombos = [
            { t1: [0, 1], t2: [2, 3] },
            { t1: [0, 2], t2: [1, 3] },
            { t1: [0, 3], t2: [1, 2] }
        ];

        let bestCombo = possibleCombos[0];
        let minPenalty = Infinity;

        possibleCombos.forEach(combo => {
            let penalty = 0;
            const t1p1 = candidates[combo.t1[0]];
            const t1p2 = candidates[combo.t1[1]];
            const t2p1 = candidates[combo.t2[0]];
            const t2p2 = candidates[combo.t2[1]];

            // Penalidad por repetición de pareja (+50)
            const id1 = t1p1.userId || t1p1.id;
            const id2 = t1p2.userId || t1p2.id;
            const id3 = t2p1.userId || t2p1.id;
            const id4 = t2p2.userId || t2p2.id;

            const p1Key = [id1, id2].sort().join("-");
            const p2Key = [id3, id4].sort().join("-");
            penalty += (pairHistory.get(p1Key) || 0) * 50;
            penalty += (pairHistory.get(p2Key) || 0) * 50;

            // Penalidad por repetición de oponentes (+100)
            const opponents = [
                [id1, id3], [id1, id4],
                [id2, id3], [id2, id4]
            ];
            opponents.forEach(opp => {
                const key = opp.sort().join("-");
                penalty += (opponentHistory.get(key) || 0) * 100;
            });

            // --- Lógica Posicional Estricta ---
            const calculatePositionalPenalty = (a: RegistrationWithUser, b: RegistrationWithUser) => {
                const sideA = a.sidePreference || (a.user?.side) || "ambos";
                const sideB = b.sidePreference || (b.user?.side) || "ambos";

                // Caso ideal: Drive + Reves
                if ((sideA === "drive" && sideB === "reves") || (sideA === "reves" && sideB === "drive")) {
                    return -100; // Bonus por pareja perfecta
                }

                // Caso crítico: Dos Drives juntos
                if (sideA === "drive" && sideB === "drive") {
                    return 150; // Penalidad alta
                }

                // Caso subóptimo: Dos Revés juntos
                if (sideA === "reves" && sideB === "reves") {
                    return 80; // Penalidad media
                }

                // Si uno es "ambos", es neutral
                return 0;
            };

            penalty += calculatePositionalPenalty(t1p1, t1p2);
            penalty += calculatePositionalPenalty(t2p1, t2p2);

            // --- Restricciones de Género Estrictas ---
            if (mode === 'mixto') {
                const isT1Mixed = (t1p1.gender || t1p1.user?.gender) !== (t1p2.gender || t1p2.user?.gender);
                const isT2Mixed = (t2p1.gender || t2p1.user?.gender) !== (t2p2.gender || t2p2.user?.gender);
                if (!isT1Mixed || !isT2Mixed) penalty += 10000;
            } else if (mode === 'mismo_genero') {
                const isT1Same = (t1p1.gender || t1p1.user?.gender) === (t1p2.gender || t1p2.user?.gender);
                const isT2Same = (t2p1.gender || t2p1.user?.gender) === (t2p2.gender || t2p2.user?.gender);
                if (!isT1Same || !isT2Same) penalty += 10000;
            }

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestCombo = combo;
            }
        });

        // 4. Crear el partido directamente e iniciarlo
        const finalT1 = [candidates[bestCombo.t1[0]], candidates[bestCombo.t1[1]]];
        const finalT2 = [candidates[bestCombo.t2[0]], candidates[bestCombo.t2[1]]];

        const t1p1Id = finalT1[0].userId || finalT1[0].id;
        const t1p2Id = finalT1[1].userId || finalT1[1].id;
        const t2p1Id = finalT2[0].userId || finalT2[0].id;
        const t2p2Id = finalT2[1].userId || finalT2[1].id;

        // --- Optimistic Update ---
        const tempId = Math.random().toString();
        const newMatch: OpenCourtMatch = {
            id: tempId,
            eventId: event.id,
            courtId,
            team1Player1Id: t1p1Id,
            team1Player2Id: t1p2Id,
            team2Player1Id: t2p1Id,
            team2Player2Id: t2p2Id,
            score1: 0,
            score2: 0,
            status: "in_progress",
            startedAt: new Date(),
            finishedAt: null,
        };

        setEvent(prev => ({
            ...prev,
            courts: prev.courts.map(c => c.id === courtId ? { ...c, status: "occupied" } : c),
            matches: [newMatch, ...prev.matches]
        }));

        const res = await createOpenCourtMatchAction({
            eventId: event.id,
            courtId,
            t1p1Id,
            t1p2Id,
            t2p1Id,
            t2p2Id,
        });

        if (res.success) {
            toast.success("Partido iniciado");
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al iniciar partido");
            window.location.reload();
        }

        setIsGenerating(false);
    }, [availablePlayers, registrations, event.matches, matchesPlayedCount, event.id, event.courts]);

    const handleFinishEvent = async () => {
        if (!confirm("¿Estás seguro de que deseas finalizar este evento? Se cerrarán todos los partidos en curso y el evento pasará a estar completado.")) return;

        setIsGenerating(true);
        const res = await finishOpenCourtEventAction(event.id);
        if (res.success) {
            toast.success("Evento finalizado correctamente");
            router.push("/admin/cancha-abierta");
        } else {
            toast.error("Error al finalizar evento: " + res.error);
        }
        setIsGenerating(false);
    };


    const handleAddCourt = async () => {
        const nextNum = event.courts.length + 1;
        // Optimistic update
        const tempId = Math.random().toString();
        const newCourt: OpenCourtCourt = {
            id: tempId,
            eventId: event.id,
            courtNumber: nextNum,
            isActive: true,
            matchType: "libre",
            status: "available"
        };
        setEvent(prev => ({ ...prev, courts: [...prev.courts, newCourt] }));

        const res = await addCourtToEventAction(event.id, nextNum);
        if (res.success) {
            toast.success(`Cancha ${nextNum} agregada`);
            startTransition(() => {
                router.refresh();
            });
        }
    };

    const handleRemoveCourt = async (courtId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta cancha?")) return;

        // Optimistic update
        setEvent(prev => ({
            ...prev,
            courts: prev.courts.filter(c => c.id !== courtId)
        }));

        const res = await removeCourtAction(courtId);
        if (res.success) {
            toast.success("Cancha eliminada");
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al eliminar cancha");
            window.location.reload();
        }
    };

    const handleUpdateCourtSettings = async (courtId: string, settings: { matchType: string }) => {
        // Optimistic update
        setEvent(prev => ({
            ...prev,
            courts: prev.courts.map(c => c.id === courtId ? { ...c, ...settings } : c)
        }));

        const res = await updateCourtSettingsAction(courtId, settings);
        if (!res.success) {
            toast.error("Error al actualizar configuración de cancha");
        } else {
            startTransition(() => {
                router.refresh();
            });
        }
    };


    const handleRegisterPlayer = async (userId: string, name: string, side: string = "ambos") => {
        setSideSelector({ userId, name });
        setSelectedSide(side as any);
    };

    const handleTogglePayment = async (regId: string, currentStatus: boolean) => {
        // Optimistic update
        setRegistrations(prev => prev.map(r =>
            r.id === regId ? { ...r, hasPaid: !currentStatus } : r
        ));

        const res = await togglePaymentStatusAction(regId, !currentStatus);
        if (!res.success) {
            toast.error("Error al actualizar pago");
            // Revert
            setRegistrations(prev => prev.map(r =>
                r.id === regId ? { ...r, hasPaid: currentStatus } : r
            ));
        } else {
            startTransition(() => {
                router.refresh();
            });
        }
    };

    const handleTogglePresence = async (regId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'waiting' ? 'absent' : 'waiting';
        // Optimistic update
        setRegistrations(prev => prev.map(r =>
            r.id === regId ? { ...r, status: newStatus as any } : r
        ));

        const res = await setPlayerPresenceAction(regId, newStatus as any);
        if (!res.success) {
            toast.error("Error al actualizar asistencia");
            // Revert
            setRegistrations(prev => prev.map(r =>
                r.id === regId ? { ...r, status: currentStatus as any } : r
            ));
        } else {
            startTransition(() => {
                router.refresh();
            });
        }
    };

    const handleBulkPaid = async () => {
        // Optimistic update
        setRegistrations(prev => prev.map(r => ({ ...r, hasPaid: true })));

        const res = await bulkMarkAllAsPaidAction(event.id);
        if (res.success) {
            toast.success("Todos marcados como pagados");
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al actualizar pagos");
            window.location.reload();
        }
    };

    const handleBulkPresence = async () => {
        // Optimistic update
        setRegistrations(prev => prev.map(r => ({ ...r, status: 'waiting' as any })));

        const res = await bulkMarkAllAsPresentAction(event.id);
        if (res.success) {
            toast.success("Todos marcados como presentes");
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al actualizar asistencia");
            window.location.reload();
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-4 animate-fade-in pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/cancha-abierta">
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-all active:scale-90">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary">Live Dashboard</span>
                            <div className={`w-1.5 h-1.5 rounded-full bg-rojo animate-pulse`} />
                        </div>
                        <h1 className="text-xl font-black uppercase italic tracking-tight text-foreground leading-none">
                            {event.name}
                        </h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{event.date}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{event.time}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit border border-border/20">
                <button
                    onClick={() => setActiveTab("attendance")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "attendance" ? "bg-celeste text-white shadow-lg shadow-celeste/20" : "text-muted-foreground hover:text-white"
                        }`}
                >
                    <UserCheck className="w-3 h-3" />
                    Asistencia
                </button>
                <button
                    onClick={() => setActiveTab("live")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "live" ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20" : "text-muted-foreground hover:text-white"
                        }`}
                >
                    <Activity className="w-3 h-3" />
                    Gestión en Vivo
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-muted text-muted-foreground border border-border" : "text-muted-foreground hover:text-white"
                        }`}
                >
                    <Trophy className="w-3 h-3" />
                    Historial
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "attendance" && (
                    <motion.div
                        key="attendance"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                    >
                        {/* Inscription bar — single row above table */}
                        <div className="bg-card/40 border border-celeste/20 rounded-xl p-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Mode toggle */}
                                <div className="flex gap-1 bg-muted/20 p-1 rounded-lg shrink-0">
                                    <button
                                        onClick={() => { setIsGuestMode(false); setSideSelector(null); }}
                                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${!isGuestMode ? 'bg-celeste text-white shadow-md' : 'text-muted-foreground'}`}
                                    >
                                        Registrado
                                    </button>
                                    <button
                                        onClick={() => { setIsGuestMode(true); setSideSelector({ userId: "guest", name: "Invitado", isGuest: true }); }}
                                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${isGuestMode ? 'bg-celeste text-white shadow-md' : 'text-muted-foreground'}`}
                                    >
                                        Invitado
                                    </button>
                                </div>

                                {/* Gender toggle */}
                                <div className="flex gap-1 bg-muted/20 p-1 rounded-lg shrink-0">
                                    <button
                                        onClick={() => setSelectedGender("masculino")}
                                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${selectedGender === "masculino" ? 'bg-azul-primary text-white shadow-md' : 'text-muted-foreground'}`}
                                    >
                                        Hombre
                                    </button>
                                    <button
                                        onClick={() => setSelectedGender("femenino")}
                                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${selectedGender === "femenino" ? 'bg-rojo text-white shadow-md' : 'text-muted-foreground'}`}
                                    >
                                        Mujer
                                    </button>
                                </div>

                                {/* Search / Guest name input */}
                                <div className="relative flex-1 min-w-[180px]">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-celeste/50" />
                                    <input
                                        type="text"
                                        value={isGuestMode ? guestName : searchQuery}
                                        onChange={(e) => isGuestMode ? setGuestName(e.target.value) : setSearchQuery(e.target.value)}
                                        placeholder={isGuestMode ? "Nombre del invitado..." : "Buscar jugador..."}
                                        className="w-full bg-muted/30 border border-border/50 rounded-lg py-2 pl-8 pr-3 text-[10px] font-bold focus:border-celeste/50 transition-all outline-none"
                                    />
                                    {!isGuestMode && filteredPlayers.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden">
                                            {filteredPlayers.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleRegisterPlayer(p.id, p.name, p.category)}
                                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-celeste/10 transition-all text-left border-b border-border/10 last:border-0"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase italic">{p.name}</span>
                                                        <span className="text-[7px] font-medium text-muted-foreground">{p.email}</span>
                                                    </div>
                                                    <ChevronRight className="w-2.5 h-2.5 text-celeste shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Side selector — visible when player selected or in guest mode */}
                                {sideSelector && (
                                    <div className="flex gap-1 bg-muted/20 p-1 rounded-lg shrink-0">
                                        {[
                                            { id: 'drive', label: 'Drive' },
                                            { id: 'reves', label: 'Revés' },
                                            { id: 'ambos', label: 'Ambos' }
                                        ].map(side => (
                                            <button
                                                key={side.id}
                                                onClick={() => setSelectedSide(side.id as any)}
                                                className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${selectedSide === side.id ? 'bg-azul-primary text-white shadow-md' : 'text-muted-foreground'}`}
                                            >
                                                {side.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Register button */}
                                {sideSelector && (
                                    <button
                                        onClick={confirmRegistrationWithSide}
                                        className="px-4 py-2 bg-celeste text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-celeste/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
                                    >
                                        {isGuestMode ? "Registrar Invitado" : `Registrar ${sideSelector.name.split(' ')[0]}`}
                                    </button>
                                )}

                                {sideSelector && (
                                    <button
                                        onClick={() => { setSideSelector(null); setIsGuestMode(false); setSearchQuery(""); setGuestName(""); }}
                                        className="text-[7px] font-black uppercase text-muted-foreground/40 hover:text-rojo transition-colors shrink-0"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Header + table */}
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <ListFilter className="w-3.5 h-3.5 text-celeste" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">Lista de Inscritos</h3>
                                    <span className="text-[9px] font-bold bg-muted/50 px-1.5 py-0.5 rounded-full text-muted-foreground">{registrations.length}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setActiveTab("live")}
                                        className="flex items-center gap-2 px-4 py-2 bg-celeste hover:bg-celeste text-white rounded-lg transition-all shadow-md shadow-celeste/20 active:scale-95 group"
                                    >
                                        <Play className="w-3 h-3 fill-current group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Gestionar Live</span>
                                    </button>
                                    <div className="w-px h-4 bg-border/40 mx-1" />
                                    <button
                                        onClick={handleBulkPaid}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-celeste/10 hover:bg-celeste/20 border border-celeste/20 rounded-lg transition-all"
                                    >
                                        <DollarSign className="w-2.5 h-2.5 text-celeste" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-celeste">Todo Pago</span>
                                    </button>
                                    <button
                                        onClick={handleBulkPresence}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-celeste/10 hover:bg-celeste/20 border border-celeste/20 rounded-lg transition-all"
                                    >
                                        <CheckCircle className="w-2.5 h-2.5 text-celeste" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-celeste">Todo Presente</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-card/40 border border-border/40 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-border/20 bg-muted/5">
                                                <th className="text-left px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Jugador</th>
                                                <th className="text-center px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Categoría</th>
                                                <th className="text-center px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Lado</th>
                                                <th className="text-center px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Pago</th>
                                                <th className="text-right px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Asistencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {registrations.map(reg => (
                                                <tr key={reg.id} className="group hover:bg-celeste/[0.02] transition-colors">
                                                    <td className="px-4 py-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground overflow-hidden">
                                                                {reg.user?.imageUrl ? (
                                                                    <img src={reg.user.imageUrl} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Users className="w-3 h-3" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black uppercase italic tracking-tight">
                                                                    {reg.guestName || `${reg.user?.firstName} ${reg.user?.lastName}`}
                                                                </span>
                                                                <span className="text-[7px] font-medium text-muted-foreground/60">
                                                                    {reg.guestName ? "Invitado" : reg.user?.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-center">
                                                        <span className="text-[9px] font-bold text-muted-foreground">
                                                            {reg.guestName ? "S/N" : reg.user?.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-center">
                                                        <span className={`text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${reg.sidePreference === 'drive' ? 'bg-celeste/10 text-celeste' :
                                                            reg.sidePreference === 'reves' ? 'bg-rojo/10 text-rojo' : 'bg-azul-primary/10 text-azul-primary'
                                                            }`}>
                                                            {reg.sidePreference === 'drive' ? 'Drive' : reg.sidePreference === 'reves' ? 'Revés' : 'Ambos'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-1.5">
                                                        <div className="flex justify-center">
                                                            <button
                                                                onClick={() => handleTogglePayment(reg.id, reg.hasPaid)}
                                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${reg.hasPaid
                                                                    ? 'bg-celeste/10 border-celeste/30 text-celeste'
                                                                    : 'bg-muted/30 border-border/50 text-muted-foreground/40 hover:border-celeste/40'
                                                                    }`}
                                                            >
                                                                <DollarSign className={`w-2.5 h-2.5 ${reg.hasPaid ? 'animate-pulse' : ''}`} />
                                                                <span className="text-[7px] font-black uppercase tracking-widest">{reg.hasPaid ? 'Pago' : 'Pendiente'}</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-1.5">
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={() => handleTogglePresence(reg.id, reg.status)}
                                                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${reg.status === 'waiting' ? 'bg-celeste text-white shadow-lg shadow-celeste/20' : 'bg-muted/50 text-muted-foreground opacity-30 hover:opacity-100'
                                                                    }`}
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === "live" && (
                    <motion.div
                        key="live"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-12"
                    >
                        {/* Courts Section - Horizontal Table Layout */}
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 mt-2">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black uppercase italic tracking-tighter text-foreground leading-none">Gestión de Canchas</h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* KPIs Movidos */}
                                    <div className="hidden lg:flex items-center gap-3 bg-card/40 border border-border/50 px-4 py-1.5 rounded-xl">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/60">Disponibles</span>
                                            <span className="text-sm font-black italic leading-none text-celeste">{availablePlayers.length}</span>
                                        </div>
                                        <div className="w-px h-4 bg-border/40" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/60">En Juego</span>
                                            <span className="text-sm font-black italic leading-none text-azul-primary">{event.matches.filter(m => m.status === 'in_progress').length}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddCourt}
                                        className="h-9 flex items-center gap-2 px-4 bg-muted/50 border border-border/40 rounded-lg hover:bg-foreground hover:text-background transition-all group"
                                    >
                                        <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Agregar Cancha</span>
                                    </button>

                                    <button
                                        onClick={handleFinishEvent}
                                        disabled={isGenerating}
                                        className="h-9 px-4 bg-rojo hover:bg-rojo-dark active:scale-95 disabled:opacity-50 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rojo/10 flex items-center gap-2"
                                    >
                                        <Flag className="w-3 h-3 fill-current" />
                                        Finalizar
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                {activeCourts.map(court => {
                                    const currentMatch = event.matches.find(m => m.courtId === court.id && m.status === "in_progress");
                                    const scores = currentMatch ? (liveScores[currentMatch.id] || { s1: 0, s2: 0 }) : { s1: 0, s2: 0 };
                                    const isOccupied = court.status !== "available";

                                    return (
                                        <div key={court.id} className="group relative bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-xl hover:border-celeste/40 transition-all flex flex-col">

                                            {/* --- TIER 1: HEADER (COMMAND BAR) --- */}
                                            <div className="flex items-center justify-between px-4 py-1.5 bg-foreground/5 border-b border-white/5 backdrop-blur-3xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.2)] ${isOccupied ? "bg-rojo animate-pulse" : "bg-celeste"}`} />
                                                        <h4 className="text-[11px] font-black uppercase italic tracking-tighter text-foreground/80">Cancha {court.courtNumber}</h4>
                                                    </div>

                                                    {/* Selector de Modo Compacto */}
                                                    <div className="flex items-center bg-background/20 rounded-md p-0.5 border border-white/5">
                                                        {[
                                                            { id: 'libre', label: 'LIBRE', title: 'Cualquier combinación.' },
                                                            { id: 'mixto', label: 'MIXTO', title: 'Mixto Estricto (H+M).' }
                                                        ].map(m => (
                                                            <button
                                                                key={m.id}
                                                                title={m.title}
                                                                onClick={() => handleUpdateCourtSettings(court.id, { matchType: m.id })}
                                                                className={`px-2 py-0.5 rounded-sm text-[6px] font-black tracking-widest transition-all ${(court.matchType || 'libre') === m.id
                                                                    ? 'bg-celeste text-white shadow-md'
                                                                    : 'text-muted-foreground/30 hover:text-muted-foreground/60'
                                                                    }`}
                                                            >
                                                                {m.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {!isOccupied ? (
                                                        <button
                                                            onClick={() => generateNextMatch(court.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-celeste text-white font-black uppercase tracking-widest text-[8px] rounded-md shadow-md shadow-celeste/20 hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            <Trophy className="w-2.5 h-2.5" />
                                                            Armar Parejas
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => currentMatch && handleFinishMatch(currentMatch.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-foreground text-background font-black uppercase tracking-widest text-[8px] rounded-md hover:bg-celeste hover:text-white transition-all shadow-lg active:scale-95"
                                                        >
                                                            <CheckCircle className="w-2.5 h-2.5" />
                                                            Finalizar Match
                                                        </button>
                                                    )}

                                                    <div className="h-4 w-[1px] bg-white/10 mx-1" />

                                                    <button
                                                        onClick={() => handleRemoveCourt(court.id)}
                                                        className="w-6 h-6 flex items-center justify-center rounded-md text-rojo/30 hover:text-rojo hover:bg-rojo/10 transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Court Body — Card-based Match Layout */}
                                            <div className="flex items-center justify-center gap-3 px-4 py-4">
                                                {/* Team 2 Score */}
                                                <CourtScoreControl
                                                    score={scores.s2}
                                                    isActive={isOccupied && !!currentMatch}
                                                    onIncrement={() => currentMatch && updateInlineScore(currentMatch.id, 2, 1)}
                                                    onDecrement={() => currentMatch && updateInlineScore(currentMatch.id, 2, -1)}
                                                />

                                                {/* Team 2 Players */}
                                                <div className="flex gap-2">
                                                    {isOccupied && currentMatch ? (
                                                        <>
                                                            {(['team2Player1Id', 'team2Player2Id'] as const).map(slot => (
                                                                <CourtPlayerCard
                                                                    key={slot}
                                                                    name={getPlayerName(currentMatch[slot])}
                                                                    image={getPlayerImage(currentMatch[slot])}
                                                                    side={getPlayerSide(currentMatch[slot])}
                                                                    onSwap={() => setSelectingFor({ courtId: court.id, slot })}
                                                                />
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EmptyPlayerCard />
                                                            <EmptyPlayerCard />
                                                        </>
                                                    )}
                                                </div>

                                                {/* Center: VS + Lock */}
                                                <div className="flex flex-col items-center justify-center gap-1 w-14 flex-none">
                                                    {!isOccupied && (
                                                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/40 text-slate-500 border border-white/5">
                                                            <Lock className="w-4 h-4 stroke-[1.5]" />
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] font-black italic text-rojo tracking-[0.2em] select-none">VS</span>
                                                </div>

                                                {/* Team 1 Players */}
                                                <div className="flex gap-2">
                                                    {isOccupied && currentMatch ? (
                                                        <>
                                                            {(['team1Player1Id', 'team1Player2Id'] as const).map(slot => (
                                                                <CourtPlayerCard
                                                                    key={slot}
                                                                    name={getPlayerName(currentMatch[slot])}
                                                                    image={getPlayerImage(currentMatch[slot])}
                                                                    side={getPlayerSide(currentMatch[slot])}
                                                                    onSwap={() => setSelectingFor({ courtId: court.id, slot })}
                                                                />
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EmptyPlayerCard />
                                                            <EmptyPlayerCard />
                                                        </>
                                                    )}
                                                </div>

                                                {/* Team 1 Score */}
                                                <CourtScoreControl
                                                    score={scores.s1}
                                                    isActive={isOccupied && !!currentMatch}
                                                    onIncrement={() => currentMatch && updateInlineScore(currentMatch.id, 1, 1)}
                                                    onDecrement={() => currentMatch && updateInlineScore(currentMatch.id, 1, -1)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-xl p-4 mt-6 overflow-hidden shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shadow-inner">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em] italic">Panel de Rotación</h3>
                                        <p className="text-[7px] font-bold text-muted-foreground/40 uppercase">Lista priorizada por rueda y posiciones tácticas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/20 bg-muted/5">
                                            <th className="text-left px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Estado</th>
                                            <th className="text-left px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Jugador</th>
                                            <th className="text-center px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Lado</th>
                                            <th className="text-center px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Partidos</th>
                                            <th className="text-center px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Pago</th>
                                            <th className="text-center px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Presente</th>
                                            <th className="text-right px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Prioridad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(function () {
                                            const lastMatchTime = new Map<string, number>();
                                            event.matches.filter(m => m.status === "completed").forEach(m => {
                                                const time = m.finishedAt ? new Date(m.finishedAt).getTime() : 0;
                                                [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id].forEach(id => {
                                                    const prev = lastMatchTime.get(id) || 0;
                                                    if (time > prev) lastMatchTime.set(id, time);
                                                });
                                            });

                                            return [...registrations]
                                                .filter(r => r.status !== 'absent')
                                                .sort((a, b) => {
                                                    const idA = a.userId || a.id;
                                                    const idB = b.userId || b.id;
                                                    const isPlayingA = playingPlayersIds.has(idA);
                                                    const isPlayingB = playingPlayersIds.has(idB);
                                                    if (isPlayingA && !isPlayingB) return -1;
                                                    if (!isPlayingA && isPlayingB) return 1;
                                                    const matchesA = matchesPlayedCount.get(idA) || 0;
                                                    const matchesB = matchesPlayedCount.get(idB) || 0;
                                                    if (matchesA !== matchesB) return matchesA - matchesB;
                                                    const timeA = lastMatchTime.get(idA) || 0;
                                                    const timeB = lastMatchTime.get(idB) || 0;
                                                    return timeA - timeB;
                                                })
                                                .map(reg => {
                                                    const pid = reg.userId || reg.id;
                                                    const isPlaying = playingPlayersIds.has(pid);
                                                    const played = matchesPlayedCount.get(pid) || 0;
                                                    const side = reg.sidePreference || (reg.user?.side) || "ambos";

                                                    return (
                                                        <tr
                                                            key={reg.id}
                                                            className={`border-b border-border/10 transition-colors hover:bg-foreground/5 ${isPlaying ? 'bg-celeste/5' : ''
                                                                }`}
                                                        >
                                                            <td className="px-4 py-1.5">
                                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full w-fit ${isPlaying ? 'bg-celeste/10 text-celeste' : 'bg-muted/50 text-muted-foreground/40'
                                                                    }`}>
                                                                    <div className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-celeste animate-pulse' : 'bg-muted-foreground/40'}`} />
                                                                    <span className="text-[7px] font-black uppercase tracking-widest">{isPlaying ? 'En Juego' : 'Espera'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-1.5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black uppercase italic tracking-tight">
                                                                        {reg.guestName || `${reg.user?.firstName} ${reg.user?.lastName}`}
                                                                    </span>
                                                                    <div className="flex gap-1 mt-0.5">
                                                                        <span className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded-sm ${(reg.gender || reg.user?.gender) === 'masculino'
                                                                            ? 'bg-azul-primary/10 text-azul-primary'
                                                                            : 'bg-rojo/10 text-rojo'
                                                                            }`}>
                                                                            {(reg.gender || reg.user?.gender) === 'femenino' ? 'MUJER' : 'HOMBRE'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-1.5">
                                                                <div className="flex justify-center">
                                                                    <span className={`px-2 py-0.5 rounded-md text-[6px] font-black uppercase tracking-wider ${side === 'drive' ? 'bg-celeste/20 text-celeste border border-celeste/20' :
                                                                        side === 'reves' ? 'bg-rojo/20 text-rojo border border-rojo/20' :
                                                                            'bg-azul-primary/20 text-azul-primary border border-azul-primary/20'
                                                                        }`}>
                                                                        {side === 'drive' ? 'Drive' : side === 'reves' ? 'Revés' : 'Ambos'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-1.5 text-center">
                                                                <span className="text-[10px] font-black italic">{played}</span>
                                                            </td>
                                                            <td className="px-4 py-1.5">
                                                                <div className="flex justify-center">
                                                                    <button
                                                                        onClick={() => handleTogglePayment(reg.id, reg.hasPaid)}
                                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${reg.hasPaid
                                                                            ? 'bg-celeste/10 border-celeste/30 text-celeste'
                                                                            : 'bg-muted/30 border-border/50 text-muted-foreground/40 hover:border-celeste/40'
                                                                            }`}
                                                                    >
                                                                        <DollarSign className={`w-2.5 h-2.5 ${reg.hasPaid ? 'animate-pulse' : ''}`} />
                                                                        <span className="text-[7px] font-black uppercase tracking-widest">{reg.hasPaid ? 'Pago' : 'Pend.'}</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-1.5">
                                                                <div className="flex justify-center">
                                                                    <button
                                                                        onClick={() => handleTogglePresence(reg.id, reg.status)}
                                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${reg.status === 'waiting' ? 'bg-celeste text-white shadow-lg shadow-celeste/20' : 'bg-muted/50 text-muted-foreground opacity-30 hover:opacity-100'
                                                                            }`}
                                                                    >
                                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-1.5 text-right">
                                                                <span className={`text-[7px] font-bold uppercase tracking-widest ${played === 0 ? 'text-celeste' : 'text-muted-foreground/40'
                                                                    }`}>
                                                                    {played === 0 ? 'T1' : (isPlaying ? '-' : 'Cola')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div >
                    </motion.div >
                )
                }

                {
                    activeTab === "history" && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-6"
                        >
                            <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-xl p-4 overflow-hidden shadow-xl">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-azul-primary/10 text-azul-primary flex items-center justify-center shadow-inner">
                                            <Trophy className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] italic">Historial de Partidos</h3>
                                            <p className="text-[7px] font-bold text-muted-foreground/40 uppercase">Resultados oficiales y estadísticas</p>
                                        </div>
                                    </div>

                                    <div className="relative w-full md:w-64">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/30">
                                            <ListFilter className="w-3 h-3" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="BUSCAR..."
                                            value={historySearchQuery}
                                            onChange={(e) => setHistorySearchQuery(e.target.value)}
                                            className="w-full bg-foreground/5 border border-border/20 rounded-lg py-1.5 pl-9 pr-3 text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-azul-primary transition-all placeholder:text-muted-foreground/20"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-border/20">
                                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Finalizado</th>
                                                <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Equipo 1</th>
                                                <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Resultado</th>
                                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Equipo 2</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...event.matches]
                                                .filter(m => m.status === "completed")
                                                .filter(m => {
                                                    if (!historySearchQuery) return true;
                                                    const q = historySearchQuery.toLowerCase();
                                                    const getPlayer = (id: string) => registrations.find(r => r.userId === id || r.id === id);
                                                    const p1 = getPlayer(m.team1Player1Id);
                                                    const p2 = getPlayer(m.team1Player2Id);
                                                    const p3 = getPlayer(m.team2Player1Id);
                                                    const p4 = getPlayer(m.team2Player2Id);

                                                    const getName = (reg: any) => reg ? (reg.guestName || `${reg.user?.firstName} ${reg.user?.lastName}`) : "";
                                                    const matchString = `${getName(p1)} ${getName(p2)} ${getName(p3)} ${getName(p4)}`.toLowerCase();
                                                    return matchString.includes(q);
                                                })
                                                .sort((a, b) => new Date(b.finishedAt || "").getTime() - new Date(a.finishedAt || "").getTime())
                                                .map(match => {
                                                    const getPlayerReg = (id: string) => registrations.find(r => r.userId === id || r.id === id);
                                                    const winner = match.score1! > match.score2! ? 1 :
                                                        match.score2! > match.score1! ? 2 : 0;

                                                    const isHighlighted = (id: string) => {
                                                        if (!historySearchQuery) return false;
                                                        const r = getPlayerReg(id);
                                                        if (!r) return false;
                                                        const q = historySearchQuery.toLowerCase();
                                                        const name = r.guestName || `${r.user?.firstName} ${r.user?.lastName}`;
                                                        return name.toLowerCase().includes(q);
                                                    };

                                                    const PlayerName = ({ id }: { id: string }) => {
                                                        const r = getPlayerReg(id);
                                                        const name = r ? (r.guestName || r.user?.firstName || '???') : '???';
                                                        const highlighted = isHighlighted(id);
                                                        return (
                                                            <p className={`text-[9px] font-black uppercase italic tracking-tight leading-none transition-all ${highlighted ? 'text-azul-primary scale-110 origin-right' : ''
                                                                }`}>
                                                                {name}
                                                            </p>
                                                        );
                                                    };

                                                    return (
                                                        <tr key={match.id} className="border-b border-border/10 transition-colors hover:bg-foreground/5">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="w-3 h-3 text-azul-primary/50" />
                                                                    <span className="text-[10px] font-black uppercase tracking-tighter">
                                                                        {match.finishedAt ? new Date(match.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className={`space-y-1 ${winner === 1 ? 'border-r-2 border-azul-primary/30 pr-2' : 'pr-2'}`}>
                                                                    <PlayerName id={match.team1Player1Id} />
                                                                    <PlayerName id={match.team1Player2Id} />
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="inline-flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-xl border border-border/20">
                                                                    <span className={`text-base font-black italic ${winner === 1 ? 'text-azul-primary' : 'text-muted-foreground/40'}`}>
                                                                        {match.score1}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-muted-foreground/20">-</span>
                                                                    <span className={`text-base font-black italic ${winner === 2 ? 'text-azul-primary' : 'text-muted-foreground/40'}`}>
                                                                        {match.score2}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-left">
                                                                <div className={`space-y-1 ${winner === 2 ? 'border-l-2 border-azul-primary/30 pl-2' : 'pl-2'}`}>
                                                                    <div className="flex flex-col items-start space-y-1">
                                                                        <PlayerName id={match.team2Player1Id} />
                                                                        <PlayerName id={match.team2Player2Id} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>

                                    {[...event.matches].filter(m => m.status === "completed").length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <Trophy className="w-12 h-12 text-muted-foreground/20 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">No hay partidos terminados todavía</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
            <AnimatePresence>
                {selectingFor && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectingFor(null)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-card border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-border/20 bg-foreground/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black uppercase italic tracking-tighter">Sustituir Jugador</h3>
                                        <p className="text-[10px] font-bold text-celeste uppercase tracking-widest">Cancha {activeCourts.find(c => c.id === selectingFor.courtId)?.courtNumber}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectingFor(null)}
                                        className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-rojo/10 hover:text-rojo transition-all"
                                    >
                                        <Plus className="w-5 h-5 rotate-45" />
                                    </button>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="BUSCAR JUGADOR POR NOMBRE..."
                                        value={swapSearchQuery}
                                        onChange={(e) => setSwapSearchQuery(e.target.value)}
                                        className="w-full bg-foreground/5 border border-border/20 rounded-2xl py-4 pl-12 pr-6 text-sm font-black uppercase italic outline-none focus:border-celeste/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-2">
                                    {availablePlayers
                                        .filter(p => (p.guestName || `${p.user?.firstName} ${p.user?.lastName}`).toLowerCase().includes(swapSearchQuery.toLowerCase()))
                                        .map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleUpdatePlayer(selectingFor!.courtId, selectingFor!.slot, p.userId || p.id)}
                                                className="flex items-center justify-between p-4 hover:bg-celeste/5 transition-all group rounded-2xl border border-transparent hover:border-celeste/20 text-left"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black uppercase italic text-foreground group-hover:text-celeste">
                                                        {p.guestName || `${p.user?.firstName} ${p.user?.lastName}`}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">
                                                        {p.userId ? 'Usuario' : 'Invitado'}
                                                    </span>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${(p.sidePreference || p.user?.side || 'ambos') === 'drive' ? 'bg-celeste/10 text-celeste' : (p.sidePreference || p.user?.side || 'ambos') === 'reves' ? 'bg-rojo/10 text-rojo' : 'bg-foreground/10 text-muted-foreground'}`}>
                                                    {(p.sidePreference || p.user?.side || 'ambos') === 'ambos' ? 'AMBOS' : (p.sidePreference || p.user?.side || 'ambos')}
                                                </span>
                                            </button>
                                        ))}

                                    {availablePlayers.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-20">
                                            <Users className="w-8 h-8 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No hay jugadores disponibles</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

// ─── Court subcomponents ───────────────────────────────────────────────────

function CourtScoreControl({
    score,
    isActive,
    onIncrement,
    onDecrement,
}: {
    score: number;
    isActive: boolean;
    onIncrement: () => void;
    onDecrement: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-1 min-w-[44px]">
            {isActive ? (
                <button
                    onClick={onIncrement}
                    className="w-9 h-7 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all border border-emerald-500/20 group/plus"
                >
                    <ChevronUp className="w-4 h-4 stroke-[3] group-hover/plus:scale-125 transition-transform" />
                </button>
            ) : <div className="h-7" />}

            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border-2 border-white/5 shadow-inner">
                <span className="text-xl font-black italic tabular-nums tracking-tighter">{score ?? 0}</span>
            </div>

            {isActive ? (
                <button
                    onClick={onDecrement}
                    className="w-9 h-7 flex items-center justify-center rounded-lg bg-rojo/10 hover:bg-rojo text-rojo hover:text-white transition-all border border-rojo/20 group/minus"
                >
                    <ChevronDown className="w-4 h-4 stroke-[3] group-hover/minus:scale-125 transition-transform" />
                </button>
            ) : <div className="h-7" />}
        </div>
    );
}

function CourtPlayerCard({
    name,
    image,
    side,
    onSwap,
}: {
    name: string;
    image: string | null;
    side: string | null;
    onSwap: () => void;
}) {
    const cardStyle = { clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' };
    const isGuest = name.toUpperCase().includes("INVITADO");

    return (
        <div className="relative group/card cursor-pointer transition-all duration-500 w-[80px] hover:scale-[1.1] hover:z-10">
            {/* Swap button */}
            <button
                onClick={(e) => { e.stopPropagation(); onSwap(); }}
                className="absolute -top-1.5 -left-1.5 z-30 w-7 h-7 flex items-center justify-center rounded-full border transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.6)] bg-slate-900 text-slate-300 border-white/10 hover:bg-azul-primary hover:text-white hover:border-white/20 hover:scale-105 active:scale-95"
                title="Cambiar Jugador"
            >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l-4-4M17 20l4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Card border */}
            <div className="p-[1px] bg-white/20 transition-all duration-700" style={cardStyle}>
                <div className="relative h-[120px] overflow-hidden bg-[#020617] flex flex-col" style={cardStyle}>
                    {/* Background image */}
                    <div className="absolute inset-0 z-0">
                        {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover transition-all duration-700 group-hover/card:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-5 bg-[#0f172a]">
                                <img src="/img/acap%20logo%20svg%20blanco%20sombra.svg" alt="logo" className="w-full h-full object-contain opacity-20" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-[#020617]/20 group-hover/card:bg-transparent transition-colors duration-500" />
                    </div>

                    {/* Side badge */}
                    {side && side !== 'ambos' && (
                        <div className="absolute top-2 right-2 z-10 opacity-40 group-hover/card:opacity-100 transition-opacity">
                            <span className={`text-[6px] font-black uppercase tracking-[0.2em] ${side === 'drive' ? 'text-celeste' : 'text-rojo'}`}>
                                {side === 'drive' ? 'DRV' : 'RVS'}
                            </span>
                        </div>
                    )}

                    {/* Guest badge */}
                    {isGuest && (
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-azul-primary border border-white/20 rounded-sm">
                            <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                            <span className="text-[5px] font-black italic text-white uppercase tracking-[0.1em]">GUEST</span>
                        </div>
                    )}

                    {/* Name plate */}
                    <div className="mt-auto p-1 z-10 bg-[#020617]">
                        <div className="py-1 px-2 transform -skew-x-12 relative border-r-2 bg-white border-azul-primary shadow-lg">
                            <div className="transform skew-x-12 text-center">
                                <span className="block text-[8px] font-black uppercase italic leading-none truncate text-slate-950">
                                    {name.replace(/INVITADO/gi, "").trim() || "PLAYER"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyPlayerCard() {
    const cardStyle = { clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' };
    return (
        <div className="relative w-[80px]">
            <div className="p-[1px] bg-white/5" style={cardStyle}>
                <div className="relative h-[120px] overflow-hidden bg-[#0f172a] flex flex-col" style={cardStyle}>
                    <div className="flex-1 flex items-center justify-center p-5">
                        <img src="/img/acap%20logo%20svg%20blanco%20sombra.svg" alt="logo" className="w-full h-full object-contain opacity-10" />
                    </div>
                    <div className="p-1 bg-[#020617]">
                        <div className="py-1 px-2 transform -skew-x-12 bg-white/10 border-r-2 border-white/10">
                            <div className="transform skew-x-12 text-center">
                                <span className="block text-[8px] font-black uppercase italic leading-none truncate text-white/30">
                                    A DEFINIR
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
