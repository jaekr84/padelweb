"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import {
    Users, Play, CheckCircle, Clock, Pause,
    Plus, Minus, RefreshCw, Trophy, Activity,
    Calendar, DollarSign, UserCheck, ShieldCheck,
    ChevronRight, ArrowLeft, LayoutGrid, ListFilter,
    Trash2
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
    togglePaymentStatusAction,
    bulkMarkAllAsPaidAction,
    bulkMarkAllAsPresentAction,
    removeCourtAction,
    createOpenCourtMatchAction,
    finishOpenCourtMatchAction,
    startOpenCourtMatchAction
} from "../actions";
import { toast } from "sonner";
import Link from "next/link";

interface RegistrationWithUser extends OpenCourtRegistration {
    user: User;
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

interface MatchTimerProps {
    startedAt: Date | null;
    matchId: string;
    duration: number;
    pauseState: { isPaused: boolean; totalPausedMs: number; lastPausedAt: number | null };
    onUpdateDuration: (matchId: string, delta: number) => void;
    onTogglePause: (matchId: string) => void;
}

const MatchTimer = ({ startedAt, matchId, duration, pauseState, onUpdateDuration, onTogglePause }: MatchTimerProps) => {
    const [now, setNow] = useState(Date.now());
    const [isOvertime, setIsOvertime] = useState(false);

    // Un único intervalo estable que solo marca el paso del tiempo
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeLeft = useMemo(() => {
        if (!startedAt) {
            const totalSeconds = duration * 60;
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        const start = new Date(startedAt).getTime();
        const currentNow = pauseState.isPaused ? (pauseState.lastPausedAt || now) : now;
        const totalPaused = pauseState.totalPausedMs;
        
        const elapsedSeconds = Math.floor((currentNow - start - totalPaused) / 1000);
        const totalSeconds = duration * 60;
        const diff = totalSeconds - elapsedSeconds;

        setIsOvertime(diff < 0);
        const absoluteDiff = Math.abs(diff);
        const mins = Math.floor(absoluteDiff / 60);
        const secs = absoluteDiff % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, [startedAt, now, duration, pauseState]);

    if (!startedAt) {
        return (
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/20 bg-foreground/5 text-muted-foreground/40">
                <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Prep.</span>
                <span className="text-sm font-black italic leading-none">{timeLeft}</span>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
            pauseState.isPaused ? 'bg-muted/10 border-border/40 opacity-50' :
            isOvertime ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
            'bg-foreground/5 border-border/20 text-muted-foreground'
        }`}>
            <div className="flex items-center gap-4 mb-1">
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateDuration(matchId, -1); }}
                        className="w-5 h-5 rounded-md bg-foreground/5 items-center justify-center flex hover:bg-foreground/10"
                    >
                        <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateDuration(matchId, 1); }}
                        className="w-5 h-5 rounded-md bg-foreground/5 items-center justify-center flex hover:bg-foreground/10"
                    >
                        <Plus className="w-2.5 h-2.5" />
                    </button>
                </div>

                <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Tiempo</span>
                    <span className="text-sm font-black italic leading-none">{timeLeft}</span>
                </div>

                <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePause(matchId); }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        pauseState.isPaused ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-foreground/10 hover:bg-foreground/20'
                    }`}
                >
                    {pauseState.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                </button>
            </div>
            {isOvertime && !pauseState.isPaused && <span className="text-[6px] font-bold uppercase tracking-[0.2em] animate-pulse">Extra Time</span>}
            {pauseState.isPaused && <span className="text-[6px] font-bold uppercase tracking-[0.2em]">Pausado</span>}
        </div>
    );
};

export default function AdminLiveManagementClient({ initialEvent, initialRegistrations, allPlayers }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [event, setEvent] = useState(initialEvent);
    const [registrations, setRegistrations] = useState(initialRegistrations);
    const [activeTab, setActiveTab] = useState<"attendance" | "live" | "history">("attendance");
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
    // Custom durations per match (default 20 min)
    const [matchDurations, setMatchDurations] = useState<Record<string, number>>({});
    // Track pauses: { isPaused: boolean, totalPausedMs: number, lastPausedAt: number | null }
    const [timerPauseStates, setTimerPauseStates] = useState<Record<string, { isPaused: boolean, totalPausedMs: number, lastPausedAt: number | null }>>({});

    // Draft Matches (Local only, before creation)
    const [draftMatches, setDraftMatches] = useState<Record<string, {
        t1p1Id: string;
        t1p2Id: string;
        t2p1Id: string;
        t2p2Id: string;
    } | null>>({});

    const [selectingFor, setSelectingFor] = useState<{ courtId: string, slot: 't1p1Id' | 't1p2Id' | 't2p1Id' | 't2p2Id' } | null>(null);
    const [swapSearchQuery, setSwapSearchQuery] = useState("");

    const updateDraftPlayer = (courtId: string, slot: 't1p1Id' | 't1p2Id' | 't2p1Id' | 't2p2Id', newPlayerId: string) => {
        setDraftMatches(prev => {
            const current = prev[courtId];
            if (!current) return prev;
            return {
                ...prev,
                [courtId]: { ...current, [slot]: newPlayerId }
            };
        });
        setSelectingFor(null);
        setSwapSearchQuery("");
    };

    const getPlayerName = (id: string) => {
        const reg = registrations.find(r => r.userId === id);
        return reg ? `${reg.user.firstName} ${reg.user.lastName}` : "Jugador";
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

    const updateMatchDuration = (matchId: string, delta: number) => {
        setMatchDurations(prev => ({
            ...prev,
            [matchId]: (prev[matchId] || 20) + delta
        }));
    };

    const toggleTimerPause = (matchId: string) => {
        setTimerPauseStates(prev => {
            const current = prev[matchId] || { isPaused: false, totalPausedMs: 0, lastPausedAt: null };
            if (!current.isPaused) {
                // Seteamos pausa
                return { ...prev, [matchId]: { ...current, isPaused: true, lastPausedAt: Date.now() } };
            } else {
                // Quitamos pausa, acumulamos tiempo
                const diff = current.lastPausedAt ? (Date.now() - current.lastPausedAt) : 0;
                return { ...prev, [matchId]: { ...current, isPaused: false, totalPausedMs: current.totalPausedMs + diff, lastPausedAt: null } };
            }
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

    const handleStartMatch = async (matchId: string) => {
        // Optimistic update
        setEvent(prev => ({
            ...prev,
            matches: prev.matches.map(m => m.id === matchId ? { ...m, startedAt: new Date() } : m)
        }));

        const res = await startOpenCourtMatchAction(matchId);
        if (res.success) {
            toast.success("Partido iniciado");
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al iniciar partido");
            window.location.reload();
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

    const availablePlayers = useMemo(() => {
        const draftIds = new Set<string>();
        Object.values(draftMatches).forEach(d => {
            if (d) {
                draftIds.add(d.t1p1Id);
                draftIds.add(d.t1p2Id);
                draftIds.add(d.t2p1Id);
                draftIds.add(d.t2p2Id);
            }
        });
        return waitingPlayers.filter(p => !playingPlayersIds.has(p.userId) && !draftIds.has(p.userId));
    }, [waitingPlayers, playingPlayersIds, draftMatches]);

    const activeCourts = useMemo(() =>
        event.courts.filter(c => c.isActive),
        [event.courts]);

    const filteredPlayers = useMemo(() => {
        if (!searchQuery) return [];
        const registeredIds = new Set(registrations.map(r => r.userId));
        return allPlayers
            .filter(p => !registeredIds.has(p.id))
            .filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 5);
    }, [searchQuery, allPlayers, registrations]);

    // Calcular partidos jugados por cada usuario
    const matchesPlayedCount = useMemo(() => {
        const counts = new Map<string, number>();
        registrations.forEach(r => counts.set(r.userId, 0));
        event.matches.filter(m => m.status === "completed").forEach(m => {
            [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id].forEach(id => {
                counts.set(id, (counts.get(id) || 0) + 1);
            });
        });
        return counts;
    }, [event.matches, registrations]);

    // Matching Algorithm (Social & Fair Rotation)
    const generateNextMatch = useCallback(async (courtId: string) => {
        if (availablePlayers.length < 4) {
            toast.error("No hay suficientes jugadores disponibles (mínimo 4)");
            return;
        }

        setIsGenerating(true);

        // 1. Obtener historial y tiempos
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

        // 2. Seleccionar los 4 candidatos con prioridad: Rueda > Tiempo de espera
        const candidates = [...availablePlayers].sort((a, b) => {
            const matchesA = matchesPlayedCount.get(a.userId) || 0;
            const matchesB = matchesPlayedCount.get(b.userId) || 0;
            if (matchesA !== matchesB) return matchesA - matchesB;
            return (lastMatchTime.get(a.userId) || 0) - (lastMatchTime.get(b.userId) || 0);
        }).slice(0, 4);

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
            const p1Key = [t1p1.userId, t1p2.userId].sort().join("-");
            const p2Key = [t2p1.userId, t2p2.userId].sort().join("-");
            penalty += (pairHistory.get(p1Key) || 0) * 50;
            penalty += (pairHistory.get(p2Key) || 0) * 50;

            // Penalidad por repetición de oponentes (+100)
            const opponents = [
                [t1p1.userId, t2p1.userId], [t1p1.userId, t2p2.userId],
                [t1p2.userId, t2p1.userId], [t1p2.userId, t2p2.userId]
            ];
            opponents.forEach(opp => {
                const key = opp.sort().join("-");
                penalty += (opponentHistory.get(key) || 0) * 100;
            });

            // --- Lógica Posicional Estricta ---
            const calculatePositionalPenalty = (a: RegistrationWithUser, b: RegistrationWithUser) => {
                const sideA = a.user.side;
                const sideB = b.user.side;

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

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestCombo = combo;
            }
        });

        // 4. Crear el partido con la mejor combinación directamente
        // 4. Crear el borrador localmente
        const finalT1 = [candidates[bestCombo.t1[0]], candidates[bestCombo.t1[1]]];
        const finalT2 = [candidates[bestCombo.t2[0]], candidates[bestCombo.t2[1]]];

        setDraftMatches(prev => ({
            ...prev,
            [courtId]: {
                t1p1Id: finalT1[0].userId,
                t1p2Id: finalT1[1].userId,
                t2p1Id: finalT2[0].userId,
                t2p2Id: finalT2[1].userId,
            }
        }));
        
        setIsGenerating(false);
    }, [availablePlayers, registrations, event.matches, matchesPlayedCount, event.id, draftMatches]);

    const confirmDraftAndStart = async (courtId: string) => {
        const draft = draftMatches[courtId];
        if (!draft) return;

        setIsGenerating(true);

        // --- Optimistic Update ---
        const tempId = Math.random().toString();
        const newMatch: OpenCourtMatch = {
            id: tempId,
            eventId: event.id,
            courtId,
            team1Player1Id: draft.t1p1Id,
            team1Player2Id: draft.t1p2Id,
            team2Player1Id: draft.t2p1Id,
            team2Player2Id: draft.t2p2Id,
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
        
        // Limpiamos el draft localmente de inmediato
        setDraftMatches(prev => ({ ...prev, [courtId]: null }));

        const res = await createOpenCourtMatchAction({
            eventId: event.id,
            courtId,
            t1p1Id: draft.t1p1Id,
            t1p2Id: draft.t1p2Id,
            t2p1Id: draft.t2p1Id,
            t2p2Id: draft.t2p2Id,
        });

        if (res.success) {
            toast.success("Partido iniciado");
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al iniciar partido");
            // Aquí se podría revertir el estado si falla, pero el refresh lo hará
            window.location.reload();
        }
        setIsGenerating(false);
    };

    const cancelDraft = (courtId: string) => {
        setDraftMatches(prev => ({ ...prev, [courtId]: null }));
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


    const handleRegisterPlayer = async (userId: string) => {
        const res = await registerPlayerManualAction(event.id, userId);
        if (res.success) {
            toast.success("Jugador agregado correctamente");
            setSearchQuery("");
            setIsAddingPlayer(false);
            startTransition(() => {
                router.refresh();
            });
        } else {
            toast.error("Error al agregar jugador");
        }
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
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-8">
                <div className="flex items-center gap-6">
                    <Link href="/admin/cancha-abierta">
                        <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground transition-all active:scale-90">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Live Dashboard</span>
                            <div className={`w-2 h-2 rounded-full bg-red-500 animate-pulse`} />
                        </div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none">
                            {event.name}
                        </h1>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{event.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{event.time}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-card/40 border border-border/50 px-6 py-3 rounded-2xl flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">Disponibles</span>
                            <span className="text-xl font-black italic leading-none text-emerald-500">{availablePlayers.length}</span>
                        </div>
                        <div className="w-px h-8 bg-border/40" />
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">En Juego</span>
                            <span className="text-xl font-black italic leading-none text-blue-500">{playingPlayersIds.size}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-muted/30 p-1.5 rounded-2xl w-fit border border-border/20">
                <button
                    onClick={() => setActiveTab("attendance")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "attendance" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-muted-foreground hover:text-white"
                        }`}
                >
                    <UserCheck className="w-3.5 h-3.5" />
                    Asistencia
                </button>
                <button
                    onClick={() => setActiveTab("live")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "live" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-muted-foreground hover:text-white"
                        }`}
                >
                    <Activity className="w-3.5 h-3.5" />
                    Gestión en Vivo
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-muted-foreground hover:text-white"
                        }`}
                >
                    <Trophy className="w-3.5 h-3.5" />
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
                        className="grid grid-cols-1 lg:grid-cols-4 gap-8"
                    >
                        {/* Persistent Search Sidebar */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-card/40 border border-emerald-500/20 p-6 rounded-[2rem] sticky top-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">Inscribir Jugador</h3>
                                </div>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar por nombre..."
                                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-emerald-500/50 transition-all outline-none"
                                    />
                                </div>

                                {filteredPlayers.length > 0 && (
                                    <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredPlayers.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleRegisterPlayer(p.id)}
                                                className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-emerald-500/10 border border-border/40 hover:border-emerald-500/30 rounded-xl group transition-all"
                                            >
                                                <div className="flex flex-col items-start overflow-hidden text-left">
                                                    <span className="text-[10px] font-black uppercase italic truncate w-full">{p.name}</span>
                                                    <span className="text-[8px] font-medium text-muted-foreground truncate w-full">{p.email}</span>
                                                </div>
                                                <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-border/40">
                                    <p className="text-[9px] font-bold text-muted-foreground/40 leading-relaxed uppercase">
                                        Escribe el nombre del jugador para buscarlo en la base de datos e inscribirlo directamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <ListFilter className="w-4 h-4 text-emerald-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Lista de Inscritos</h3>
                                    <span className="text-[10px] font-bold bg-muted/50 px-2 py-0.5 rounded-full text-muted-foreground">{registrations.length}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setActiveTab("live")}
                                        className="flex items-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 group"
                                    >
                                        <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black uppercase tracking-widest">Comenzar Gestión Live</span>
                                    </button>
                                    <div className="w-px h-6 bg-border/40 mx-2" />
                                    <button
                                        onClick={handleBulkPaid}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all group"
                                    >
                                        <DollarSign className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Todo Pago</span>
                                    </button>
                                    <button
                                        onClick={handleBulkPresence}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-all group"
                                    >
                                        <CheckCircle className="w-3 h-3 text-blue-500" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Todo Presente</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-card/40 border border-border/40 rounded-[2rem] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-border/20">
                                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Jugador</th>
                                                <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Categoría</th>
                                                <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lado</th>
                                                <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Pago</th>
                                                <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Asistencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {registrations.map(reg => (
                                                <tr key={reg.id} className="group hover:bg-emerald-500/[0.02] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground overflow-hidden">
                                                                {reg.user.imageUrl ? (
                                                                    <img src={reg.user.imageUrl} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Users className="w-4 h-4" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black uppercase italic tracking-tight">{reg.user.firstName} {reg.user.lastName}</span>
                                                                <span className="text-[9px] font-medium text-muted-foreground/60">{reg.user.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-[10px] font-bold text-muted-foreground">{reg.user.category}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${reg.user.side === 'drive' ? 'bg-blue-500/10 text-blue-500' :
                                                            reg.user.side === 'reves' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                                                            }`}>
                                                            {reg.user.side || 'Ambos'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center">
                                                            <button
                                                                onClick={() => handleTogglePayment(reg.id, reg.hasPaid)}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${reg.hasPaid
                                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                                    : 'bg-muted/30 border-border/50 text-muted-foreground/40 hover:border-emerald-500/40'
                                                                    }`}
                                                            >
                                                                <DollarSign className={`w-3 h-3 ${reg.hasPaid ? 'animate-pulse' : ''}`} />
                                                                <span className="text-[8px] font-black uppercase tracking-widest">{reg.hasPaid ? 'Pagado' : 'Pendiente'}</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={() => handleTogglePresence(reg.id, reg.status)}
                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${reg.status === 'waiting' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted/50 text-muted-foreground opacity-30 hover:opacity-100'
                                                                    }`}
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
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
                        {/* Courts Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Gestión de Canchas en Vivo</h3>
                                <button
                                    onClick={handleAddCourt}
                                    className="flex items-center gap-2 px-6 py-3 bg-muted border border-border/40 rounded-2xl hover:bg-muted-foreground/10 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Agregar Cancha</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeCourts.map(court => (
                                    <div key={court.id} className="bg-card/60 backdrop-blur-md border border-border/50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden group shadow-xl">
                                        <div className="absolute top-4 left-6 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full shadow-lg ${court.status === "available" ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                                                }`} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cancha {court.courtNumber}</span>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveCourt(court.id)}
                                            className="absolute top-4 right-6 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all overflow-hidden"
                                            title="Eliminar Cancha"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        {court.status === "available" ? (() => {
                                            const draft = draftMatches[court.id];
                                            if (draft) {
                                                return (
                                                    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in w-full">
                                                        <div className="text-center w-full relative">
                                                            <div className="flex flex-col items-center gap-1 mb-6">
                                                                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-orange-500">Parejas Armadas</span>
                                                                <div className="w-8 h-1 bg-orange-500/20 rounded-full" />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 w-full px-4 mb-8">
                                                                {[
                                                                    { side: 'Equipo 1', slots: ['t1p1Id', 't1p2Id'] as const, color: 'text-blue-500' },
                                                                    { side: 'Equipo 2', slots: ['t2p1Id', 't2p2Id'] as const, color: 'text-red-500' }
                                                                ].map((team, idx) => (
                                                                    <div key={team.side} className={`space-y-1 ${idx === 1 ? 'border-l border-border/20 pl-4' : ''}`}>
                                                                        <p className={`text-[8px] font-black ${team.color}/50 uppercase tracking-widest mb-2`}>{team.side}</p>
                                                                        {team.slots.map(slot => {
                                                                            const isCurrentEdit = selectingFor?.courtId === court.id && selectingFor?.slot === slot;
                                                                            return (
                                                                                <div key={slot} className="relative group/player">
                                                                                    <button 
                                                                                        onClick={() => {
                                                                                            setSelectingFor(isCurrentEdit ? null : { courtId: court.id, slot });
                                                                                            setSwapSearchQuery("");
                                                                                        }}
                                                                                        className={`w-full flex items-center justify-center gap-2 py-1 px-2 rounded-lg transition-all ${isCurrentEdit ? 'bg-foreground/10 ring-1 ring-foreground/20' : 'hover:bg-foreground/5'}`}
                                                                                    >
                                                                                        <p className="text-[11px] font-black uppercase italic truncate text-foreground/80">{getPlayerName(draft[slot])}</p>
                                                                                        <RefreshCw className={`w-2.5 h-2.5 opacity-0 group-hover/player:opacity-40 transition-opacity ${isCurrentEdit ? 'animate-spin opacity-100' : ''}`} />
                                                                                    </button>

                                                                                    {isCurrentEdit && (
                                                                                        <div className="absolute left-0 top-full mt-2 w-56 bg-card border border-border/50 rounded-2xl shadow-2xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                                                            <div className="p-2 bg-foreground/5 border-b border-border/10">
                                                                                                <input 
                                                                                                    autoFocus
                                                                                                    type="text"
                                                                                                    placeholder="BUSCAR SUPLENTE..."
                                                                                                    value={swapSearchQuery}
                                                                                                    onChange={(e) => setSwapSearchQuery(e.target.value)}
                                                                                                    className="w-full bg-background border border-border/20 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-muted-foreground/30"
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                />
                                                                                            </div>
                                                                                            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                                                                <div className="p-2 border-b border-border/5">
                                                                                                    <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40">Sustituir por:</p>
                                                                                                </div>
                                                                                                {(() => {
                                                                                                    const filtered = availablePlayers.filter(p => 
                                                                                                        `${p.user.firstName} ${p.user.lastName}`.toLowerCase().includes(swapSearchQuery.toLowerCase())
                                                                                                    );
                                                                                                    if (filtered.length === 0) {
                                                                                                        return <p className="p-4 text-[9px] font-bold text-muted-foreground/30 uppercase italic text-center">No hay resultados</p>;
                                                                                                    }
                                                                                                    return filtered.map(p => (
                                                                                                        <button
                                                                                                            key={p.id}
                                                                                                            onClick={() => updateDraftPlayer(court.id, slot, p.userId)}
                                                                                                            className="w-full text-left px-3 py-2.5 hover:bg-foreground/5 rounded-xl transition-colors"
                                                                                                        >
                                                                                                            <p className="text-[10px] font-black uppercase italic truncate">{p.user.firstName} {p.user.lastName}</p>
                                                                                                            <p className="text-[7px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Partidos: {matchesPlayedCount.get(p.userId) || 0}</p>
                                                                                                        </button>
                                                                                                    ));
                                                                                                })()}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-3 w-full px-8">
                                                            <button
                                                                onClick={() => confirmDraftAndStart(court.id)}
                                                                className="bg-foreground text-background font-black uppercase tracking-widest text-[10px] py-4 rounded-3xl shadow-xl shadow-foreground/20 active:scale-95 transition-all w-full flex items-center justify-center gap-2"
                                                            >
                                                                <Play className="w-3 h-3 fill-current" />
                                                                Llamar y Comenzar
                                                            </button>
                                                            <button
                                                                onClick={() => cancelDraft(court.id)}
                                                                className="text-muted-foreground font-black uppercase tracking-widest text-[8px] hover:text-foreground transition-all py-2"
                                                            >
                                                                Cambiar Jugadores
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in">
                                                    <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <LayoutGrid className="w-8 h-8" />
                                                    </div>
                                                    <div className="text-center">
                                                        <h5 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-1">Cancha Libre</h5>
                                                        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase max-w-[150px]">Pulsa para llamar el siguiente partido de la rueda</p>
                                                    </div>
                                                    <button
                                                        onClick={() => generateNextMatch(court.id)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] py-5 px-12 rounded-full shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                                                    >
                                                        Armar Parejas
                                                    </button>
                                                </div>
                                            );
                                        })() : (() => {
                                            const currentMatch = event.matches.find(m => m.courtId === court.id && m.status === "in_progress");
                                            const getPlayerName = (id: string) => {
                                                const reg = registrations.find(r => r.userId === id);
                                                return reg ? `${reg.user.firstName} ${reg.user.lastName}` : "Jugador";
                                            };

                                            const scores = currentMatch ? (liveScores[currentMatch.id] || { s1: 0, s2: 0 }) : { s1: 0, s2: 0 };

                                            return (
                                                <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    {currentMatch && (
                                                        <div className="flex justify-center">
                                                            <MatchTimer 
                                                                startedAt={currentMatch.startedAt} 
                                                                matchId={currentMatch.id} 
                                                                duration={matchDurations[currentMatch.id] || 20}
                                                                pauseState={timerPauseStates[currentMatch.id] || { isPaused: false, totalPausedMs: 0, lastPausedAt: null }}
                                                                onUpdateDuration={updateMatchDuration}
                                                                onTogglePause={toggleTimerPause}
                                                            />
                                                        </div>
                                                    )}

                                                    {currentMatch && !currentMatch.startedAt ? (
                                                        <div className="flex flex-col items-center gap-6 py-4">
                                                            <div className="space-y-4 w-full">
                                                                <div className="flex justify-around items-center gap-4">
                                                                    <div className="text-center">
                                                                        <p className="text-[10px] font-black uppercase text-blue-500 mb-2">PAREJA 1</p>
                                                                        <p className="text-[11px] font-black uppercase italic leading-none">{getPlayerName(currentMatch.team1Player1Id)}</p>
                                                                        <p className="text-[11px] font-black uppercase italic leading-none mt-1">{getPlayerName(currentMatch.team1Player2Id)}</p>
                                                                    </div>
                                                                    <span className="text-xl font-black italic text-muted-foreground/20">VS</span>
                                                                    <div className="text-center">
                                                                        <p className="text-[10px] font-black uppercase text-red-500 mb-2">PAREJA 2</p>
                                                                        <p className="text-[11px] font-black uppercase italic leading-none">{getPlayerName(currentMatch.team2Player1Id)}</p>
                                                                        <p className="text-[11px] font-black uppercase italic leading-none mt-1">{getPlayerName(currentMatch.team2Player2Id)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleStartMatch(currentMatch.id)}
                                                                className="w-full py-5 bg-foreground text-background rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 group"
                                                            >
                                                                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                                                                COMENZAR PARTIDO
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {/* Team 1 Score */}
                                                                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex flex-col items-center">
                                                                    <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest mb-3">PAREJA 1</span>
                                                                    {currentMatch && (
                                                                        <div className="text-center mb-4 min-h-[40px]">
                                                                            <p className="text-[10px] font-black uppercase italic truncate max-w-[110px]">{getPlayerName(currentMatch.team1Player1Id)}</p>
                                                                            <p className="text-[10px] font-black uppercase italic truncate max-w-[110px]">{getPlayerName(currentMatch.team1Player2Id)}</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-4">
                                                                        <button
                                                                            onClick={() => currentMatch && updateInlineScore(currentMatch.id, 1, -1)}
                                                                            className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <Minus className="w-4 h-4" />
                                                                        </button>
                                                                        <span className="text-3xl font-black italic min-w-[35px] text-center">{scores.s1}</span>
                                                                        <button
                                                                            onClick={() => currentMatch && updateInlineScore(currentMatch.id, 1, 1)}
                                                                            className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <Plus className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Team 2 Score */}
                                                                <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 flex flex-col items-center">
                                                                    <span className="text-[7px] font-black text-red-500 uppercase tracking-widest mb-3">PAREJA 2</span>
                                                                    {currentMatch && (
                                                                        <div className="text-center mb-4 min-h-[40px]">
                                                                            <p className="text-[10px] font-black uppercase italic truncate max-w-[110px]">{getPlayerName(currentMatch.team2Player1Id)}</p>
                                                                            <p className="text-[10px] font-black uppercase italic truncate max-w-[110px]">{getPlayerName(currentMatch.team2Player2Id)}</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-4">
                                                                        <button
                                                                            onClick={() => currentMatch && updateInlineScore(currentMatch.id, 2, -1)}
                                                                            className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <Minus className="w-4 h-4" />
                                                                        </button>
                                                                        <span className="text-3xl font-black italic min-w-[35px] text-center">{scores.s2}</span>
                                                                        <button
                                                                            onClick={() => currentMatch && updateInlineScore(currentMatch.id, 2, 1)}
                                                                            className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <Plus className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => currentMatch && handleFinishMatch(currentMatch.id)}
                                                                className="w-full py-5 bg-foreground text-background rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95"
                                                            >
                                                                Finalizar e Informar Score
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Control de Rotación Superior Bottom */}
                        <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-[3rem] p-10 mt-12 overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center shadow-inner">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] italic mb-1">Panel de Rotación</h3>
                                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase">Lista priorizada por rueda y posiciones tácticas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/20">
                                            <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Estado</th>
                                            <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Jugador</th>
                                            <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lado</th>
                                            <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Partidos</th>
                                            <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Prioridad</th>
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
                                                    const isPlayingA = playingPlayersIds.has(a.userId);
                                                    const isPlayingB = playingPlayersIds.has(b.userId);
                                                    if (isPlayingA && !isPlayingB) return -1;
                                                    if (!isPlayingA && isPlayingB) return 1;
                                                    const matchesA = matchesPlayedCount.get(a.userId) || 0;
                                                    const matchesB = matchesPlayedCount.get(b.userId) || 0;
                                                    if (matchesA !== matchesB) return matchesA - matchesB;
                                                    const timeA = lastMatchTime.get(a.userId) || 0;
                                                    const timeB = lastMatchTime.get(b.userId) || 0;
                                                    return timeA - timeB;
                                                })
                                                .map(reg => {
                                                    const isPlaying = playingPlayersIds.has(reg.userId);
                                                    const played = matchesPlayedCount.get(reg.userId) || 0;
                                                    const side = reg.user.side;

                                                    return (
                                                        <tr
                                                            key={reg.id}
                                                            className={`border-b border-border/10 transition-colors hover:bg-foreground/5 ${isPlaying ? 'bg-blue-500/5' : ''
                                                                }`}
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${isPlaying ? 'bg-blue-500/10 text-blue-500' : 'bg-muted/50 text-muted-foreground/40'
                                                                    }`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                                                                    <span className="text-[8px] font-black uppercase tracking-widest">{isPlaying ? 'En Juego' : 'Esperando'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-xs font-black uppercase italic tracking-tight">{reg.user.firstName} {reg.user.lastName}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex justify-center">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider ${side === 'drive' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20' :
                                                                            side === 'reves' ? 'bg-red-500/20 text-red-500 border border-red-500/20' :
                                                                                'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                                                                        }`}>
                                                                        {side === 'drive' ? 'Drive' : side === 'reves' ? 'Revés' : 'Ambos'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="text-xs font-black italic">{played}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`text-[8px] font-bold uppercase tracking-widest ${played === 0 ? 'text-emerald-500' : 'text-muted-foreground/40'
                                                                    }`}>
                                                                    {played === 0 ? 'Prioridad T1' : (isPlaying ? '-' : 'En Cola')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === "history" && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-[3rem] p-10 overflow-hidden shadow-2xl">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-inner">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] italic mb-1">Historial de Partidos</h3>
                                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase">Resultados oficiales y estadísticas del evento</p>
                                    </div>
                                </div>

                                <div className="relative w-full md:w-80">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground/30">
                                        <ListFilter className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="BUSCAR JUGADOR..."
                                        value={historySearchQuery}
                                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                                        className="w-full bg-foreground/5 border border-border/20 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-muted-foreground/20"
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
                                                const getPlayer = (id: string) => registrations.find(r => r.userId === id)?.user;
                                                const p1 = getPlayer(m.team1Player1Id);
                                                const p2 = getPlayer(m.team1Player2Id);
                                                const p3 = getPlayer(m.team2Player1Id);
                                                const p4 = getPlayer(m.team2Player2Id);

                                                const matchString = `${p1?.firstName} ${p1?.lastName} ${p2?.firstName} ${p2?.lastName} ${p3?.firstName} ${p3?.lastName} ${p4?.firstName} ${p4?.lastName}`.toLowerCase();
                                                return matchString.includes(q);
                                            })
                                            .sort((a, b) => new Date(b.finishedAt || "").getTime() - new Date(a.finishedAt || "").getTime())
                                            .map(match => {
                                                const getPlayer = (id: string) => registrations.find(r => r.userId === id)?.user;
                                                const winner = match.score1! > match.score2! ? 1 :
                                                    match.score2! > match.score1! ? 2 : 0;

                                                const isHighlighted = (id: string) => {
                                                    if (!historySearchQuery) return false;
                                                    const u = getPlayer(id);
                                                    if (!u) return false;
                                                    const q = historySearchQuery.toLowerCase();
                                                    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
                                                };

                                                const PlayerName = ({ id }: { id: string }) => {
                                                    const name = getPlayer(id)?.firstName || '???';
                                                    const highlighted = isHighlighted(id);
                                                    return (
                                                        <p className={`text-[9px] font-black uppercase italic tracking-tight leading-none transition-all ${highlighted ? 'text-orange-500 scale-110 origin-right' : ''
                                                            }`}>
                                                            {name}
                                                        </p>
                                                    );
                                                };

                                                return (
                                                    <tr key={match.id} className="border-b border-border/10 transition-colors hover:bg-foreground/5">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-3 h-3 text-orange-500/50" />
                                                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                                                    {match.finishedAt ? new Date(match.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={`space-y-1 ${winner === 1 ? 'border-r-2 border-orange-500/30 pr-2' : 'pr-2'}`}>
                                                                <PlayerName id={match.team1Player1Id} />
                                                                <PlayerName id={match.team1Player2Id} />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="inline-flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-xl border border-border/20">
                                                                <span className={`text-base font-black italic ${winner === 1 ? 'text-orange-500' : 'text-muted-foreground/40'}`}>
                                                                    {match.score1}
                                                                </span>
                                                                <span className="text-[10px] font-black text-muted-foreground/20">-</span>
                                                                <span className={`text-base font-black italic ${winner === 2 ? 'text-orange-500' : 'text-muted-foreground/40'}`}>
                                                                    {match.score2}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-left">
                                                            <div className={`space-y-1 ${winner === 2 ? 'border-l-2 border-orange-500/30 pl-2' : 'pl-2'}`}>
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
                )}
            </AnimatePresence>
        </div>
    );
}
