"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
    Users, CheckCircle2, Trophy, ArrowRight, ArrowLeft,
    Dice5, Check, Trash2, Settings, Plus, Minus,
    CreditCard, UserCheck, AlertCircle, ChevronRight,
    Users2, MonitorPlay, AlertTriangle, X, ChevronDown, Search, Zap,
    LayoutDashboard, Swords, BarChart3, Clock, RotateCcw
} from "lucide-react";
import { getAllPlayers } from "@/app/actions/players";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/Dialog";

import { saveTournamentFixture, getAvailablePlayers, quickInscribePlayer, registerManualPlayer } from "./actions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ManualRegistrationModal from "./ManualRegistrationModal";

export interface FixtureSetupProps {
    tournamentId: string;
    tournamentName: string;
    initialStatus: string;
    initialPlayers: Player[];
    categories?: string[];
    isIndividual?: boolean;
}

type Player = { 
    id: string; 
    name: string; 
    category?: string | null; 
    email?: string; 
    gender?: string; 
    clubId?: string | null; 
    player1?: string | null; 
    player2?: string | null;
    userId?: string;
    partnerUserId?: string | null;
};
type Group = { id: string; name: string; players: Player[] };

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

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function FixtureSetup({
    tournamentId,
    tournamentName,
    initialStatus,
    initialPlayers,
    categories = ["A+", "A", "B", "C", "D"], // Default fallback
    isIndividual = false
}: FixtureSetupProps) {
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [step, setStep] = useState<"checkin" | "config" | "assign">("checkin");
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [present, setPresent] = useState<Set<string>>(new Set());

    // New: Track if randomized at least once
    const [hasRandomized, setHasRandomized] = useState(false);

    const [numGroups, setNumGroups] = useState(4);
    const [playersPerGroup, setPlayersPerGroup] = useState(3);
    const [groups, setGroups] = useState<Group[]>([]);
    const [randomizing, setRandomizing] = useState(false);
    const [drawingPlayer, setDrawingPlayer] = useState<Player | null>(null);
    const [ytUrl, setYtUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [swappedIds, setSwappedIds] = useState<Set<string>>(new Set());

    // Replacement/Deletion state
    const [replacingParticipant, setReplacingParticipant] = useState<{ checkinId: string, displayName: string, pairId: string } | null>(null);
    const [participantToDelete, setParticipantToDelete] = useState<{ id: string, name: string } | null>(null);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<any[]>([]);

    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");

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

        setPlayers(prev => prev.map(p => {
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
                category: newPlayer.category || p.category
            };
        }));

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
        
        // Cleanup attendance/paid states
        setPresent(prev => {
            const next = new Set(prev);
            next.delete(registrationId);
            next.delete(`${registrationId}_0`);
            next.delete(`${registrationId}_1`);
            return next;
        });
        setPaid(prev => {
            const next = new Set(prev);
            next.delete(registrationId);
            next.delete(`${registrationId}_0`);
            next.delete(`${registrationId}_1`);
            return next;
        });
        
        setParticipantToDelete(null);
        toast.success("Participante eliminado de la lista");
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

    const totalSlots = numGroups * playersPerGroup;
    const assignedIds = new Set(groups.flatMap(g => g.players.map(p => p.id)));
    const unassigned = PRESENT_PLAYERS.filter(p => !assignedIds.has(p.id));
    const allFull = groups.every(g => g.players.length >= 2); // At least 2 per group to play
    const totalAssigned = assignedIds.size;

    const togglePaid = (id: string) => {
        setPaid(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const togglePresent = (id: string) => {
        setPresent(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleCheckAll = (type: 'paid' | 'present') => {
        let allCheckinIds: string[] = [];
        players.forEach(p => {
            if (isIndividual) {
                allCheckinIds.push(p.id);
            } else {
                allCheckinIds.push(`${p.id}_0`);
                if (p.player2 || p.name.includes(" / ")) allCheckinIds.push(`${p.id}_1`);
            }
        });

        if (type === 'paid') {
            const areAllPaid = allCheckinIds.every(id => paid.has(id));
            setPaid(areAllPaid ? new Set() : new Set(allCheckinIds));
        } else {
            const areAllPresent = allCheckinIds.every(id => present.has(id));
            setPresent(areAllPresent ? new Set() : new Set(allCheckinIds));
        }
    };


    const handleStart = () => {
        if (PRESENT_PLAYERS.length === 0) return;
        setGroups(buildGroups(numGroups));
        setStep("assign");
    };

    const handleConfirmGroups = async () => {
        setSaving(true);
        const currentMatches: Match[] = [];
        groups.forEach(g => {
            for (let i = 0; i < g.players.length; i++) {
                for (let j = i + 1; j < g.players.length; j++) {
                    currentMatches.push({
                        id: `m_${g.id}_${i}_${j}`,
                        groupId: g.id,
                        team1: g.players[i],
                        team2: g.players[j],
                        played: false,
                        confirmed: false,
                    });
                }
            }
        });

        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            youtubeUrl: ytUrl || undefined,
            groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
            matches: currentMatches,
            bracket: [],
        });

        if (res.ok) {
            router.push(`/tournaments/${tournamentId}/manage`);
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

    const handleRandomize = useCallback(async () => {
        if (PRESENT_PLAYERS.length === 0) return;
        setRandomizing(true);
        
        // Start with empty groups
        let currentGroups = buildGroups(numGroups);
        setGroups(currentGroups);
        
        // Very brief pause to see the clear
        await new Promise(r => setTimeout(r, 200));

        const shuffled = shuffle(PRESENT_PLAYERS);
        
        // Target sequence total duration: ~1.2 seconds 
        const delay = Math.max(50, Math.min(150, 1200 / shuffled.length));

        for (let i = 0; i < shuffled.length; i++) {
            const player = shuffled[i];
            const candidates = currentGroups.filter(g => g.players.length < playersPerGroup);
            if (candidates.length === 0) break;

            candidates.sort((a, b) => {
                const sameClubA = (player as any).clubId ? a.players.filter(p => (p as any).clubId === (player as any).clubId).length : 0;
                const sameClubB = (player as any).clubId ? b.players.filter(p => (p as any).clubId === (player as any).clubId).length : 0;
                if (sameClubA !== sameClubB) return sameClubA - sameClubB;
                return a.players.length - b.players.length;
            });

            candidates[0].players.push(player);
            setDrawingPlayer(player);
            setGroups([...currentGroups]);
            
            // Fast rhythmic delay based on count
            await new Promise(r => setTimeout(r, delay));
        }

        setDrawingPlayer(null);
        setHasRandomized(true);
        setRandomizing(false);
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
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-3xl border-b border-border/50 px-4 py-4">
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => {
                                    if (step === "assign") setStep("config");
                                    else if (step === "config") setStep("checkin");
                                    else router.push(`/tournaments/${tournamentId}/manage`);
                                }}
                                className="group flex items-center gap-2 text-foreground/40 hover:text-foreground transition-all font-black uppercase tracking-widest text-[9px] shrink-0 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                Volver
                            </button>

                            <div className="h-6 w-px bg-border/50 hidden md:block" />

                            <div className="hidden md:flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/60 leading-none mb-1">Torneo</span>
                                <span className="text-xs font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[150px] lg:max-w-[250px]">
                                    {tournamentName}
                                </span>
                            </div>

                            <div className="h-6 w-[1px] bg-border/50 hidden md:block" />

                            {/* Progressive Navbar / Stepper */}
                            <div className="hidden md:flex items-center gap-1">
                                {[
                                    { 
                                        id: "checkin", 
                                        icon: UserCheck, 
                                        label: "Asistencia", 
                                        active: step === "checkin",
                                        completed: step !== "checkin"
                                    },
                                    { 
                                        id: "sorteo", 
                                        icon: LayoutDashboard, 
                                        label: "Sorteo", 
                                        active: step === "config" || step === "assign",
                                        completed: false,
                                        subSteps: [
                                            { id: "config", label: "Ajustes", active: step === "config" },
                                            { id: "assign", label: "Cuadro", active: step === "assign" }
                                        ]
                                    },
                                    { id: "matches", icon: Swords, label: "Partidos", active: false, disabled: true },
                                    { id: "playoffs", icon: Trophy, label: "Finales", active: false, disabled: true }
                                ].map((s, idx) => {
                                    const Icon = s.icon;

                                    return (
                                        <div key={s.id} className="flex items-center">
                                            <button 
                                                onClick={() => {
                                                    if (s.disabled) return;
                                                    if (s.id === "checkin") setStep("checkin");
                                                    if (s.id === "sorteo") setStep("config");
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${s.active 
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                                    : s.completed
                                                        ? "text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                                                        : s.disabled 
                                                            ? "text-foreground/20 cursor-not-allowed" 
                                                            : "text-foreground/40 hover:bg-white/5"}`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-tight hidden lg:block">{s.label}</span>
                                                {s.completed && <Check className="w-2.5 h-2.5 ml-1" />}
                                            </button>
                                            {idx < 3 && (
                                                <div className="px-1.5 text-foreground/10">
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link
                                href={`/tournaments/${tournamentId}/edit`}
                                className="flex items-center gap-2 text-foreground/40 hover:text-foreground transition-all font-black uppercase tracking-widest text-[9px] bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Info</span>
                            </Link>

                            <div className="px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] italic hidden sm:block">
                                Gestión de Fixture
                            </div>
                        </div>
                    </div>

                    {/* Secondary Navigation (Index) for sub-steps */}
                    <AnimatePresence>
                        {(step === "config" || step === "assign") && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center justify-center gap-6 py-2 border-t border-border/30"
                            >
                                {[
                                    { id: "config", label: "1. Grupos y Participantes" },
                                    { id: "assign", label: "2. Armado de Grupos (Sorteo)" }
                                ].map((ss) => (
                                    <button
                                        key={ss.id}
                                        onClick={() => setStep(ss.id as any)}
                                        className={`group flex items-center gap-2 transition-all ${step === ss.id 
                                            ? "text-blue-500 font-black" 
                                            : "text-foreground/30 hover:text-foreground/50 font-bold"}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${step === ss.id ? "bg-blue-500 scale-150" : "bg-foreground/20 group-hover:bg-foreground/40"}`} />
                                        <span className="text-[9px] uppercase tracking-widest">{ss.label}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 pb-32">

                <AnimatePresence mode="wait">
                    {step === "checkin" && (
                        <motion.div
                            key="checkin"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Presentismo</h2>
                                    <p className="text-foreground/60 text-[10px] font-black tracking-widest uppercase">Confirmá asistencia y pagos</p>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <MonitorPlay className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40" />
                                            <input 
                                                type="text"
                                                placeholder="Buscar..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="bg-muted border border-border rounded-xl py-2 pl-9 pr-3 text-[10px] font-bold placeholder:text-foreground/30 outline-none focus:border-blue-500 transition-all w-32 md:w-48"
                                            />
                                        </div>
                                        <select 
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="bg-muted border border-border rounded-xl py-2 px-3 text-[10px] font-black uppercase italic outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="all">Cat.</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsPlayerModalOpen(true)}
                                            className="px-3 py-1.5 bg-blue-600/10 text-blue-600 border border-blue-500/30 rounded-lg font-black uppercase italic text-[8px] tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Inscribir Participante
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-3xl overflow-hidden divide-y divide-border shadow-2xl">
                                <div className="px-6 py-4 bg-card flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Lista de Asistencia</span>
                                        <span className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest mt-0.5">
                                            {isIndividual ? `${players.length} Jugadores` : `${players.length} Parejas (${players.length * 2} Jugadores)`}
                                        </span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleCheckAll('paid')} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">Todo Pago</button>
                                        <button onClick={() => handleCheckAll('present')} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">Todo Ok</button>
                                    </div>
                                </div>

                                <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                                    {(() => {
                                        const flatPlayers: any[] = [];
                                        players.forEach(p => {
                                            const matchesSearch = !searchQuery || 
                                                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                p.id.toLowerCase().includes(searchQuery.toLowerCase());
                                            
                                            const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
                                            
                                            if (matchesSearch && matchesCategory) {
                                                if (isIndividual) {
                                                    flatPlayers.push({ ...p, checkinId: p.id, displayName: p.name });
                                                } else {
                                                    // Separar en dos si es dobles
                                                    const names = p.name.split(" / ");
                                                    flatPlayers.push({ 
                                                        ...p, 
                                                        checkinId: `${p.id}_0`, 
                                                        displayName: p.player1 || names[0] || "Jugador 1",
                                                        pairName: p.name
                                                    });
                                                    flatPlayers.push({ 
                                                        ...p, 
                                                        checkinId: `${p.id}_1`, 
                                                        displayName: p.player2 || names[1] || "Jugador 2",
                                                        pairName: p.name,
                                                        isSecond: true
                                                    });
                                                }
                                            }
                                        });

                                        return flatPlayers.map(p => {
                                            const isPaid = paid.has(p.checkinId);
                                            const isPresent = present.has(p.checkinId);

                                            return (
                                                <div
                                                    key={p.checkinId}
                                                    className={`group flex items-center justify-between px-6 py-5 transition-all duration-300 ${isPresent 
                                                        ? "bg-emerald-500/[0.03] border-l-4 border-l-emerald-500" 
                                                        : "bg-card hover:bg-muted/30 border-l-4 border-l-transparent"
                                                    } ${p.isSecond ? "mt-[-2px]" : ""}`}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-black uppercase tracking-tight transition-all duration-300 ${isPresent ? "text-foreground" : "text-foreground/60"}`}>
                                                                {p.displayName}
                                                            </span>
                                                            {!isIndividual && (
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mt-1">
                                                                    Equipo: <span className="text-blue-500/60 ">{p.pairName}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 mt-1">
                                                            {isPaid && (
                                                                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
                                                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                                    Pago
                                                                </span>
                                                            )}
                                                            {isPresent && (
                                                                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                                                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                                    Presente
                                                                </span>
                                                            )}
                                                            {p.category && !p.isSecond && (
                                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-muted text-foreground/40 rounded-full border border-border">
                                                                    {p.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setParticipantToDelete({ id: p.id, name: p.displayName })}
                                                            className="w-11 h-11 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-foreground/20 hover:text-red-500 hover:border-red-500/50 transition-all transform active:scale-90"
                                                            title="Eliminar Participante"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => setReplacingParticipant({ checkinId: p.checkinId, displayName: p.displayName, pairId: p.id })}
                                                            className="w-11 h-11 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-foreground/20 hover:text-amber-500 hover:border-amber-500/50 transition-all transform active:scale-90"
                                                            title="Reemplazar Participante"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => togglePaid(p.checkinId)}
                                                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 transform active:scale-90 ${isPaid
                                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-600/20"
                                                                : "bg-muted/50 border border-border text-foreground/20 hover:text-foreground/40 hover:border-foreground/20"
                                                                }`}
                                                            title="Confirmar Pago"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => togglePresent(p.checkinId)}
                                                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 transform active:scale-90 ${isPresent
                                                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-600/20"
                                                                : "bg-muted/50 border border-border text-foreground/20 hover:text-foreground/40 hover:border-foreground/20"
                                                                }`}
                                                            title="Confirmar Presentismo"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                        </button>

                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep("config")}
                                disabled={present.size === 0}
                                className={`w-full py-6 rounded-3xl font-black uppercase italic tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 shadow-xl ${present.size > 0
                                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 translate-y-0"
                                    : "bg-card text-foreground/20 cursor-not-allowed border border-border translate-y-2 opacity-60 shadow-none"
                                    }`}
                            >
                                <span className={present.size > 0 ? "opacity-100" : "opacity-40"}>
                                    Continuar ({isIndividual ? `${present.size} jugadores` : `${present.size} jugadores / ${Math.floor(present.size / 2)} parejas`})
                                </span>
                                <ArrowRight className={`w-5 h-5 transition-transform duration-500 ${present.size > 0 ? "translate-x-0" : "-translate-x-4 opacity-0"}`} />
                            </button>
                        </motion.div>
                    )}

                    {step === "config" && (
                        <motion.div
                            key="config"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8"
                        >
                            <div className="px-2">
                                <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Estructura</h2>
                                <p className="text-foreground/60 text-[10px] font-black tracking-widest uppercase">Ajustá la configuración de los grupos</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 text-blue-500">
                                        <Users2 className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Cantidad de Grupos</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-muted rounded-2xl p-2">
                                        <button
                                            onClick={() => setNumGroups(Math.max(1, numGroups - 1))}
                                            className="w-12 h-12 rounded-xl bg-card flex items-center justify-center hover:bg-white/10 transition-colors"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <span className="text-3xl font-black italic">{numGroups}</span>
                                        <button
                                            onClick={() => setNumGroups(Math.min(16, numGroups + 1))}
                                            className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <Users className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Jugadores / Parejas</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-muted rounded-2xl p-2">
                                        <button
                                            onClick={() => setPlayersPerGroup(Math.max(2, playersPerGroup - 1))}
                                            className="w-12 h-12 rounded-xl bg-card flex items-center justify-center hover:bg-white/10 transition-colors"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <span className="text-3xl font-black italic">{playersPerGroup}</span>
                                        <button
                                            onClick={() => setPlayersPerGroup(Math.min(16, playersPerGroup + 1))}
                                            className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Check-in", value: isIndividual ? present.size : `${present.size} (${PRESENT_PLAYERS.length} eq.)`, color: "text-blue-500" },
                                    { label: "Cupos", value: numGroups * playersPerGroup, color: "text-foreground/60" },
                                    {
                                        label: PRESENT_PLAYERS.length > numGroups * playersPerGroup ? "Sobran" : "Faltan",
                                        value: Math.abs(PRESENT_PLAYERS.length - numGroups * playersPerGroup),
                                        color: PRESENT_PLAYERS.length === numGroups * playersPerGroup ? "text-emerald-500" : "text-amber-500"
                                    },
                                    { label: "Min. Partido", value: "2", color: "text-foreground/50" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-card border border-border rounded-2xl p-4 text-center">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-foreground/60 block mb-1">{stat.label}</span>
                                        <span className={`text-xl font-black italic ${stat.color}`}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep("checkin")}
                                    className="flex-1 py-5 bg-card hover:bg-white/10 border border-border rounded-3xl font-black uppercase italic tracking-widest transition-all"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={handleStart}
                                    className="flex-[2] py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase italic tracking-widest transition-all shadow-xl shadow-blue-900/40"
                                >
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
                            <div className="px-2 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Asignación</h2>
                                    <p className="text-foreground/60 text-[10px] font-black tracking-widest uppercase">Armá los grupos para el sorteo</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRandomize}
                                        disabled={randomizing || unassigned.length === 0}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all ${randomizing
                                            ? "bg-amber-500 text-white animate-pulse"
                                            : "bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white"
                                            }`}
                                    >
                                        <Dice5 className={`w-4 h-4 ${randomizing ? 'animate-spin' : ''}`} />
                                        {randomizing ? "Shuffling..." : "Sorteo"}
                                    </button>
                                    <button
                                        onClick={handleAddGroup}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nuevo Grupo
                                    </button>
                                </div>
                            </div>

                            {/* Player Pool */}
                            <div 
                                className="bg-card border border-border rounded-3xl p-6"
                                onDragOver={onDragOver}
                                onDrop={onDropOnPool}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/50">Sin Asignar ({unassigned.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <AnimatePresence>
                                        {unassigned.map(p => (
                                            <motion.button
                                                key={p.id}
                                                layoutId={p.id}
                                                draggable
                                                onDragStart={(e) => onDragStart(e as any, p.id)}
                                                onDragEnd={onDragEnd as any}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                onClick={() => {
                                                    const firstEmptyGroup = groups.find(g => g.players.length < playersPerGroup);
                                                    if (firstEmptyGroup) handleAddPlayer(p.id, firstEmptyGroup.id);
                                                }}
                                                className="px-4 py-2 bg-muted hover:bg-blue-500/20 border border-border rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-grab active:cursor-grabbing text-foreground"
                                            >
                                                {p.name}
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                    {unassigned.length === 0 && (
                                        <div className="w-full py-4 text-center border border-dashed border-border rounded-2xl">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60 italic">Todo listo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-40 md:pb-12">
                                {groups.map(g => (
                                    <div 
                                        key={g.id} 
                                        className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col"
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDropOnGroup(e as any, g.id)}
                                    >
                                        <div className="px-5 py-3 bg-muted border-b border-border/50 flex items-center justify-between">
                                            <span className="text-xs font-black uppercase italic tracking-[0.2em] text-blue-600">{g.name}</span>
                                            <span className="text-[10px] font-black text-foreground/30">{g.players.length} / {playersPerGroup}</span>
                                        </div>
                                        <div className="p-3 space-y-2 flex-1 min-h-[140px]">
                                            <AnimatePresence mode="popLayout">
                                                {g.players.map(p => (
                                                    <motion.div
                                                        key={p.id}
                                                        layoutId={p.id}
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e as any, p.id)}
                                                        onDragEnd={onDragEnd as any}
                                                        className={`flex items-center justify-between rounded-xl px-4 py-3 group cursor-grab active:cursor-grabbing transition-all duration-500 ${
                                                            swappedIds.has(p.id) 
                                                                ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)] text-white" 
                                                                : "bg-muted hover:bg-foreground/5 text-foreground"
                                                        }`}
                                                    >
                                                        <span className={`text-xs font-bold uppercase italic transition-colors ${
                                                            swappedIds.has(p.id) ? "text-white" : ""
                                                        }`}>{p.name}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemovePlayer(p.id); }}
                                                            className="text-foreground/40 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {/* Espacios faltantes */}
                                            {Array.from({ length: Math.max(0, playersPerGroup - g.players.length) }).map((_, i) => (
                                                <div 
                                                    key={`empty-${g.id}-${i}`} 
                                                    className="flex items-center justify-between rounded-xl px-4 py-3 bg-red-500/5 border border-dashed border-red-500/20 animate-pulse mt-2 first:mt-0"
                                                >
                                                    <span className="text-[9px] font-black uppercase text-red-500/50 tracking-widest">Cupo disponible</span>
                                                    <AlertCircle className="w-3.5 h-3.5 text-red-500/30" />
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const name = prompt("Nombre del invitado:");
                                                if (name) handleAddGuest(name, g.id);
                                            }}
                                            className="p-3 bg-muted/50 text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 hover:bg-blue-600 hover:text-white transition-all border-t border-border/50"
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
                                        onClick={() => setStep("checkin")}
                                        className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center hover:bg-white/10 transition-all backdrop-blur-xl"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        disabled={!allFull || saving}
                                        onClick={handleConfirmGroups}
                                        className={`flex-1 h-16 rounded-2xl font-black uppercase italic tracking-widest text-sm transition-all shadow-2xl flex items-center justify-center gap-3 backdrop-blur-xl ${!allFull
                                            ? "bg-card text-muted-foreground/30 border border-border/50"
                                            : "bg-emerald-600 text-white shadow-emerald-900/40"
                                            }`}
                                    >
                                        {saving ? "Guardando..." : allFull ? "Iniciar Torneo" : "Completá los grupos"}
                                        {!saving && allFull && <Trophy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Drawing Overlay */}
                {/* Drawing Overlay (Modern Strip Version) */}
                <AnimatePresence>
                    {randomizing && drawingPlayer && (
                        <motion.div
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={{ opacity: 0, scaleY: 0 }}
                            className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-[110] h-48 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl border-y border-blue-500/30 shadow-[0_0_100px_rgba(37,99,235,0.2)]"
                        >
                            {/* Decorative internal lights for the strip */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                                <div className="absolute bottom-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                            </div>

                            <div className="relative flex flex-col items-center">
                                {/* Label above the strip */}
                                <motion.span 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute -top-12 text-blue-400 text-[10px] font-black uppercase tracking-[0.5em] italic"
                                >
                                    Asignando Posición
                                </motion.span>

                                <div className="relative h-20 md:h-24 overflow-hidden flex items-center justify-center px-12">
                                    {/* Minimalist selection arrows */}
                                    <motion.div 
                                        animate={{ x: [-5, 0, -5] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute left-0 text-blue-500"
                                    >
                                        <ChevronRight className="w-8 h-8 stroke-[3]" />
                                    </motion.div>
                                    <motion.div 
                                        animate={{ x: [5, 0, 5] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute right-0 text-blue-500 rotate-180"
                                    >
                                        <ChevronRight className="w-8 h-8 stroke-[3]" />
                                    </motion.div>

                                    {/* Slot Machine Text Animation */}
                                    <AnimatePresence mode="popLayout">
                                        <motion.div
                                            key={drawingPlayer.id}
                                            initial={{ y: 40, opacity: 0, filter: "blur(10px)" }}
                                            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                            exit={{ y: -40, opacity: 0, filter: "blur(10px)" }}
                                            transition={{ duration: 0.1, ease: "easeOut" }}
                                            className="text-4xl md:text-7xl font-black text-white italic uppercase tracking-tighter"
                                        >
                                            {drawingPlayer.name}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Subtle Loading Line */}
                                <div className="absolute -bottom-8 w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "100%" }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                        className="h-full w-1/2 bg-blue-500 blur-[1px]"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Opción 1: Invitado Manual</span>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre del invitado..."
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={handleReplaceWithGuest}
                                        className="px-6 py-3 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                                    >
                                        Usar
                                    </button>
                                </div>
                            </div>

                            {/* Registrados */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Opción 2: Jugador Registrado</span>
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
                                        <div className="py-8 text-center animate-pulse text-xs font-black uppercase tracking-widest text-foreground/40">
                                            Cargando jugadores...
                                        </div>
                                    ) : allPotentialPlayers
                                        .filter(p => !playerSearchQuery || p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
                                        .slice(0, 10).map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleReplaceParticipant(p)}
                                            className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-blue-600 hover:text-white rounded-2xl border border-border/50 transition-all group/p"
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
                            <DialogTitle className="text-red-500">¿Eliminar Participante?</DialogTitle>
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
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}


