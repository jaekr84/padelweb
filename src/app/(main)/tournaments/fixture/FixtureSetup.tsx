"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
    Users, CheckCircle2, Trophy, ArrowRight, ArrowLeft,
    Dice5, Check, Trash2, Settings, Plus, Minus,
    CreditCard, UserCheck, AlertCircle, ChevronRight,
    Users2, MonitorPlay, AlertTriangle, X, ChevronDown, Search, Zap, ArrowRightLeft,
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
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ManualRegistrationModal from "./ManualRegistrationModal";

export interface FixtureSetupProps {
    tournamentId: string;
    tournamentName: string;
    initialStatus: string;
    initialPlayers: Player[];
    initialGroups?: Group[];
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
    initialGroups = [],
    categories = ["A+", "A", "B", "C", "D"], // Default fallback
    isIndividual = false
}: FixtureSetupProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlStep = searchParams.get("step") as "checkin" | "config" | "assign" | null;

    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [step, setStep] = useState<"checkin" | "config" | "assign">(urlStep || "checkin");
    
    // Initialize paid/present based on initialGroups if they exist
    const [paid, setPaid] = useState<Set<string>>(() => {
        const set = new Set<string>();
        if (initialGroups.length > 0) {
            initialGroups.forEach(g => g.players.forEach(p => {
                if (isIndividual) set.add(p.id);
                else { set.add(`${p.id}_0`); set.add(`${p.id}_1`); }
            }));
        }
        return set;
    });
    const [present, setPresent] = useState<Set<string>>(() => {
        const set = new Set<string>();
        if (initialGroups.length > 0) {
            initialGroups.forEach(g => g.players.forEach(p => {
                if (isIndividual) set.add(p.id);
                else { set.add(`${p.id}_0`); set.add(`${p.id}_1`); }
            }));
        }
        return set;
    });

    // New: Track if randomized at least once
    const [hasRandomized, setHasRandomized] = useState(initialGroups.length > 0);

    const [numGroups, setNumGroups] = useState(initialGroups.length || 4);
    const [playersPerGroup, setPlayersPerGroup] = useState(initialGroups[0]?.players.length || 3);
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [randomizing, setRandomizing] = useState(false);
    const [drawingPlayer, setDrawingPlayer] = useState<Player | null>(null);
    const [ytUrl, setYtUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [swappedIds, setSwappedIds] = useState<Set<string>>(new Set());
    const [firstSelectedPlayerId, setFirstSelectedPlayerId] = useState<string | null>(null);

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
                                className="group flex items-center gap-2 text-foreground/70 hover:text-foreground transition-all font-black uppercase tracking-widest text-[9px] shrink-0 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                Volver
                            </button>

                            <div className="h-6 w-px bg-border/50 hidden md:block" />

                            <div className="hidden md:flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-celeste leading-none mb-1">Torneo</span>
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
                                                    ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20" 
                                                    : s.completed
                                                        ? "text-celeste bg-celeste/5 hover:bg-celeste/10"
                                                        : s.disabled 
                                                            ? "text-foreground/20 cursor-not-allowed" 
                                                            : "text-foreground/70 hover:bg-white/5"}`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-tight hidden lg:block">{s.label}</span>
                                                {s.completed && <Check className="w-2.5 h-2.5 ml-1 text-celeste" />}
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
                                className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-all font-black uppercase tracking-widest text-[9px] bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Info</span>
                            </Link>

                            <div className="px-4 py-2 bg-azul-primary/5 border border-azul-primary/10 text-azul-primary rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] italic hidden sm:block">
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
                                            ? "text-azul-primary font-black" 
                                            : "text-foreground/60 hover:text-foreground/70 font-bold"}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${step === ss.id ? "bg-azul-primary scale-150" : "bg-foreground/20 group-hover:bg-foreground/40"}`} />
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
                                    <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground">Presentismo</h2>
                                    <p className="text-foreground/60 text-[9px] font-black tracking-widest uppercase">Confirmá asistencia y pagos</p>
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
                                                className="bg-muted border border-border rounded-xl py-2 pl-9 pr-3 text-[10px] font-bold placeholder:text-foreground/60 outline-none focus:border-azul-primary transition-all w-32 md:w-48"
                                            />
                                        </div>
                                        <select 
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="bg-muted border border-border rounded-xl py-2 px-3 text-[10px] font-black uppercase italic outline-none focus:border-azul-primary/50 appearance-none cursor-pointer"
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
                                            className="px-3 py-1.5 bg-azul-primary/10 text-azul-primary border border-azul-primary/30 rounded-lg font-black uppercase italic text-[8px] tracking-widest hover:bg-azul-primary hover:text-white transition-all flex items-center gap-2"
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
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">Lista de Asistencia</span>
                                        <span className="text-[10px] font-bold text-azul-primary/60 uppercase tracking-widest mt-0.5">
                                            {isIndividual ? `${players.length} Jugadores` : `${players.length} Parejas (${players.length * 2} Jugadores)`}
                                        </span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleCheckAll('paid')} className="text-[10px] font-black uppercase tracking-widest text-azul-primary hover:text-azul-primary/80 transition-colors">Todo Pago</button>
                                        <button onClick={() => handleCheckAll('present')} className="text-[10px] font-black uppercase tracking-widest text-celeste hover:text-celeste/80 transition-colors">Todo Ok</button>
                                    </div>
                                </div>

                                <div className="">
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
                                                    className={`group flex items-center justify-between px-4 py-1.5 transition-all duration-300 ${isPresent 
                                                        ? "bg-celeste/[0.03] border-l-4 border-l-celeste" 
                                                        : "bg-card hover:bg-muted/30 border-l-4 border-l-transparent"
                                                    } ${p.isSecond ? "mt-[-1px]" : ""}`}
                                                >
                                                    <div className="flex flex-col">
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-black uppercase tracking-tight transition-all duration-300 ${isPresent ? "text-foreground" : "text-foreground/60"}`}>
                                                                {p.displayName}
                                                            </span>
                                                            {!isIndividual && (
                                                                <span className="text-[8px] font-bold uppercase tracking-widest text-foreground/40 leading-none">
                                                                    Equipo: <span className="text-azul-primary/40 ">{p.pairName}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(isPaid || isPresent || (p.category && !p.isSecond)) && (
                                                            <div className="flex gap-1.5 mt-0.5">
                                                                {isPaid && (
                                                                    <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-1.5 py-0 bg-azul-primary/10 text-azul-primary rounded-full border border-azul-primary/20">
                                                                        Pago
                                                                    </span>
                                                                )}
                                                                {isPresent && (
                                                                    <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-1.5 py-0 bg-celeste/10 text-celeste rounded-full border border-celeste/20">
                                                                        Ok
                                                                    </span>
                                                                )}
                                                                {p.category && !p.isSecond && (
                                                                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0 bg-muted text-foreground/70 rounded-full border border-border">
                                                                        {p.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => setParticipantToDelete({ id: p.id, name: p.displayName })}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/30 border border-border/40 text-foreground/20 hover:text-red-500 hover:border-red-500/50 transition-all transform active:scale-90"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>

                                                        <button
                                                            onClick={() => setReplacingParticipant({ checkinId: p.checkinId, displayName: p.displayName, pairId: p.id })}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/30 border border-border/40 text-foreground/20 hover:text-azul-primary hover:border-azul-primary/50 transition-all transform active:scale-90"
                                                            title="Reemplazar"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                        </button>

                                                        <button
                                                            onClick={() => togglePaid(p.checkinId)}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 transform active:scale-90 ${isPaid
                                                                ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/30 ring-1 ring-azul-primary/20"
                                                                : "bg-muted/30 border border-border/40 text-foreground/20 hover:text-foreground/70"
                                                                }`}
                                                            title="Pago"
                                                        >
                                                            <CreditCard className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => togglePresent(p.checkinId)}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 transform active:scale-90 ${isPresent
                                                                ? "bg-celeste text-azul-primary shadow-lg shadow-celeste/30 ring-1 ring-celeste/20"
                                                                : "bg-muted/30 border border-border/40 text-foreground/20 hover:text-foreground/70"
                                                                }`}
                                                            title="Ok"
                                                        >
                                                            <UserCheck className="w-3.5 h-3.5" />
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
                                className={`w-full py-3 rounded-2xl font-black uppercase italic tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 shadow-xl ${present.size > 0
                                    ? "bg-azul-primary hover:bg-azul-primary/90 text-white shadow-azul-primary/40 translate-y-0"
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
                            className="space-y-6"
                        >
                            <div className="px-2">
                                <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground">Estructura</h2>
                                <p className="text-foreground/60 text-[9px] font-black tracking-widest uppercase">Ajustá la configuración de los grupos</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {/* Grupos Selector */}
                                <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-azul-primary/70">
                                        <Users2 className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Cantidad de Grupos</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                                        <button
                                            onClick={() => setNumGroups(Math.max(1, numGroups - 1))}
                                            className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-black italic text-slate-800 leading-none">{numGroups}</span>
                                            <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Grupos</span>
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
                                <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-celeste/70">
                                        <Users className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Integrantes / Grupo</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                                        <button
                                            onClick={() => setPlayersPerGroup(Math.max(2, playersPerGroup - 1))}
                                            className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-black italic text-slate-800 leading-none">{playersPerGroup}</span>
                                            <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{isIndividual ? "Jugadores" : "Parejas"}</span>
                                        </div>
                                        <button
                                            onClick={() => setPlayersPerGroup(Math.min(16, playersPerGroup + 1))}
                                            className="w-7 h-7 rounded-md bg-celeste flex items-center justify-center text-white shadow-sm shadow-celeste/20 hover:scale-105 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[
                                    { label: "Check-in", value: isIndividual ? present.size : `${Math.floor(present.size / 2)} eq.`, detail: `${present.size} jug.`, color: "text-azul-primary" },
                                    { label: "Cupos", value: numGroups * playersPerGroup, detail: "Disponibilidad", color: "text-slate-600" },
                                    {
                                        label: PRESENT_PLAYERS.length > numGroups * playersPerGroup ? "Excedente" : "Pendientes",
                                        value: Math.abs(PRESENT_PLAYERS.length - numGroups * playersPerGroup),
                                        detail: PRESENT_PLAYERS.length === numGroups * playersPerGroup ? "Match Ideal" : "Diferencia",
                                        color: PRESENT_PLAYERS.length === numGroups * playersPerGroup ? "text-emerald-500" : "text-celeste"
                                    },
                                    { label: "Partidos", value: (playersPerGroup * (playersPerGroup - 1) / 2) * numGroups, detail: "Etapa Grupos", color: "text-slate-500" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm text-center">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">{stat.label}</span>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-xs md:text-sm font-black italic ${stat.color} leading-none`}>{stat.value}</span>
                                            <span className="text-[6px] font-bold text-slate-300 uppercase mt-0.5">{stat.detail}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setStep("checkin")}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black uppercase italic tracking-widest text-[9px] transition-all text-slate-600"
                                >
                                    Atrás
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
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                                            firstSelectedPlayerId 
                                                ? "bg-azul-primary/10 border-azul-primary/30" 
                                                : "bg-slate-50/50 border-slate-200"
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 ${
                                            firstSelectedPlayerId ? "bg-azul-primary text-white" : "bg-slate-200 text-slate-400"
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
                                        disabled={randomizing || unassigned.length === 0}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all ${randomizing
                                            ? "bg-celeste text-white animate-pulse"
                                            : "bg-azul-primary/10 text-azul-primary border border-azul-primary/20 hover:bg-azul-primary hover:text-white"
                                            }`}
                                    >
                                        <Dice5 className={`w-4 h-4 ${randomizing ? 'animate-spin' : ''}`} />
                                        {randomizing ? "Shuffling..." : "Sorteo"}
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
                                className="bg-slate-50/30 border border-slate-200 rounded-2xl p-3"
                                onDragOver={onDragOver}
                                onDrop={onDropOnPool}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Sin Asignar ({unassigned.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <AnimatePresence>
                                        {unassigned.map(p => (
                                             <motion.button
                                                key={p.id}
                                                layoutId={p.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                onClick={() => handlePlayerClick(p.id)}
                                                className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all flex items-center gap-2 ${
                                                    swappedIds.has(p.id)
                                                        ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                        : "bg-muted hover:bg-azul-primary/10 border-border text-foreground/80"
                                                }`}
                                            >
                                                <ArrowRightLeft className={`w-3 h-3 ${swappedIds.has(p.id) ? "animate-pulse" : ""}`} />
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

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-40 md:pb-12">
                                {groups.map(g => (
                                    <div 
                                        key={g.id} 
                                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm"
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDropOnGroup(e as any, g.id)}
                                    >
                                        <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase italic tracking-[0.15em] text-azul-primary">{g.name}</span>
                                            <span className="text-[9px] font-black text-slate-400">{g.players.length} / {playersPerGroup}</span>
                                        </div>
                                        <div className="p-1.5 space-y-1 flex-1 min-h-[120px]">
                                            <AnimatePresence mode="popLayout">
                                                {g.players.map(p => (
                                                    <motion.div
                                                        key={p.id}
                                                        layoutId={p.id}
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e as any, p.id)}
                                                        onDragEnd={onDragEnd as any}
                                                        onClick={() => handlePlayerClick(p.id)}
                                                        className={`flex items-center justify-between rounded-xl px-3 py-1.5 group cursor-pointer transition-all duration-500 ${
                                                            swappedIds.has(p.id) 
                                                                ? "bg-azul-primary shadow-[0_0_20px_rgba(var(--azul-primary-rgb),0.3)] text-white" 
                                                                : "bg-muted hover:bg-foreground/5 text-foreground"
                                                        }`}
                                                    >
                                                        <span className={`text-[11px] font-black uppercase italic transition-colors ${
                                                            swappedIds.has(p.id) ? "text-white" : ""
                                                        }`}>{p.name}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePlayerClick(p.id); }}
                                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                                                    swappedIds.has(p.id) 
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
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {/* Espacios faltantes */}
                                            {Array.from({ length: Math.max(0, playersPerGroup - g.players.length) }).map((_, i) => (
                                                <div 
                                                    key={`empty-${g.id}-${i}`} 
                                                    onClick={() => handleEmptySpotClick(g.id)}
                                                    className={`flex items-center justify-between rounded-xl px-3 py-1.5 border border-dashed animate-pulse mt-1 first:mt-0 cursor-pointer transition-all ${
                                                        firstSelectedPlayerId ? "bg-celeste/10 border-celeste/40 scale-[1.02]" : "bg-rojo/5 border-rojo/20"
                                                    }`}
                                                >
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                        firstSelectedPlayerId ? "text-celeste" : "text-rojo/50"
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
                                        onClick={() => setStep("checkin")}
                                        className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-white/10 transition-all backdrop-blur-xl"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        disabled={!allFull || saving}
                                        onClick={handleConfirmGroups}
                                        className={`flex-1 h-12 rounded-xl font-black uppercase italic tracking-widest text-[10px] md:text-xs transition-all shadow-2xl flex items-center justify-center gap-3 backdrop-blur-xl ${!allFull
                                            ? "bg-card text-muted-foreground/60 border border-border/50"
                                            : "bg-celeste text-white shadow-celeste/40"
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
                                    className="absolute -top-12 text-azul-primary text-[10px] font-black uppercase tracking-[0.5em] italic"
                                >
                                    Asignando Posición
                                </motion.span>

                                <div className="relative h-20 md:h-24 overflow-hidden flex items-center justify-center px-12">
                                    {/* Minimalist selection arrows */}
                                    <motion.div 
                                        animate={{ x: [-5, 0, -5] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute left-0 text-azul-primary"
                                    >
                                        <ChevronRight className="w-8 h-8 stroke-[3]" />
                                    </motion.div>
                                    <motion.div 
                                        animate={{ x: [5, 0, 5] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute right-0 text-azul-primary rotate-180"
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
                                        className="h-full w-1/2 bg-azul-primary blur-[1px]"
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
                                                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center group-hover/p:bg-white/20">
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
            </main>
        </div>
    );
}


