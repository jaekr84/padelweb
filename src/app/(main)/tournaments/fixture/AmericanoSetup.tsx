"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
    Users, CheckCircle2, Trophy, ArrowRight, ArrowLeft,
    Dice5, Check, Trash2, Settings, Plus, Minus,
    CreditCard, UserCheck, AlertCircle, ChevronRight,
    Users2, MonitorPlay, AlertTriangle, X, ChevronDown, Search, Zap,
    LayoutDashboard, Swords, BarChart3, Clock
} from "lucide-react";
import { saveTournamentFixture, getAvailablePlayers, quickInscribePlayer, registerManualPlayer } from "./actions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ManualRegistrationModal from "./ManualRegistrationModal";

export interface AmericanoSetupProps {
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
    category?: string; 
    email?: string; 
    gender?: string; 
    clubId?: string | null; 
    player1?: string | null; 
    player2?: string | null;
    userId?: string;
    partnerUserId?: string | null;
    image?: string | null;
};
type Group = { id: string; name: string; players: Player[] };

type Match = {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    played: boolean;
    confirmed: boolean;
    roundIndex?: number;
    courtNumber?: number;
};


export default function AmericanoSetup({
    tournamentId,
    tournamentName,
    initialStatus,
    initialPlayers,
    categories = ["A+", "A", "B", "C", "D"],
    isIndividual = false
}: AmericanoSetupProps) {
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [step, setStep] = useState<"checkin">("checkin");
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [present, setPresent] = useState<Set<string>>(new Set());

    const [numCourts, setNumCourts] = useState(2);
    const [matchesPerTeam, setMatchesPerTeam] = useState(2);
    const [groups, setGroups] = useState<Group[]>([]);
    const [generatedMatches, setGeneratedMatches] = useState<Match[]>([]);
    const [randomizing, setRandomizing] = useState(false);
    const [drawingPlayer, setDrawingPlayer] = useState<Player | null>(null);
    const [ytUrl, setYtUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

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
            return present.has(p.id) || (present.has(`${p.id}_0`) && present.has(`${p.id}_1`));
        }),
        [players, present, isIndividual]);

    const maxLimit = useMemo(() => {
        const len = PRESENT_PLAYERS.length;
        if (len < 2) return 0;
        return len % 2 === 0 ? len : len - 1;
    }, [PRESENT_PLAYERS]);

    const [bracketSize, setBracketSize] = useState(8);

    useEffect(() => {
        if (bracketSize < 2 || bracketSize % 2 !== 0) {
            setBracketSize(8);
        }
    }, []);

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





    const generateAmericanoMatches = (players: Player[], matchesPerPlayer: number, maxCourts: number): (Match & { roundIndex: number; courtNumber: number })[] => {
        const n = players.length;
        const playerMatchCount = new Map<string, number>();
        players.forEach(p => playerMatchCount.set(p.id, 0));

        // 1. Generar todos los pares posibles (todos contra todos)
        let possiblePairs: [number, number][] = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                possiblePairs.push([i, j]);
            }
        }
        
        // Mezclar pares inicialmente para aleatoriedad
        possiblePairs = possiblePairs.sort(() => Math.random() - 0.5);

        // 2. Seleccionar los partidos necesarios respetando matchesPerPlayer
        const selectedMatches: { team1: Player; team2: Player }[] = [];
        
        // Priorizar pares de clubes distintos
        const differentClubPairs = possiblePairs.filter(([i, j]) => {
            const p1 = players[i];
            const p2 = players[j];
            return !p1.clubId || !p2.clubId || p1.clubId !== p2.clubId;
        });
        const sameClubPairs = possiblePairs.filter(([i, j]) => {
            const p1 = players[i];
            const p2 = players[j];
            return p1.clubId && p2.clubId && p1.clubId === p2.clubId;
        });

        const tryPick = (pairList: [number, number][]) => {
            for (const [i, j] of pairList) {
                const p1 = players[i];
                const p2 = players[j];
                if (playerMatchCount.get(p1.id)! < matchesPerPlayer && playerMatchCount.get(p2.id)! < matchesPerPlayer) {
                    selectedMatches.push({ team1: p1, team2: p2 });
                    playerMatchCount.set(p1.id, playerMatchCount.get(p1.id)! + 1);
                    playerMatchCount.set(p2.id, playerMatchCount.get(p2.id)! + 1);
                }
            }
        };

        tryPick(differentClubPairs);
        tryPick(sameClubPairs);

        // 3. Programación Anti-Bottleneck (por Rondas y Canchas)
        const scheduledMatches: (Match & { roundIndex: number; courtNumber: number })[] = [];
        let remainingMatches = [...selectedMatches];
        let currentRound = 0;
        let lastRoundPlayers = new Set<string>();

        while (remainingMatches.length > 0) {
            const roundMatches: typeof selectedMatches = [];
            const roundPlayers = new Set<string>();
            
            // Priorizar jugadores que NO jugaron en la ronda anterior (Regla de Descanso)
            // Dividimos por prioridad
            const priorityMatches = remainingMatches.filter(m => 
                !lastRoundPlayers.has(m.team1.id) && !lastRoundPlayers.has(m.team2.id)
            );
            const others = remainingMatches.filter(m => 
                lastRoundPlayers.has(m.team1.id) || lastRoundPlayers.has(m.team2.id)
            );

            const attemptAssignment = (pool: typeof selectedMatches) => {
                for (let k = pool.length - 1; k >= 0; k--) {
                    const m = pool[k];
                    if (roundMatches.length < maxCourts && !roundPlayers.has(m.team1.id) && !roundPlayers.has(m.team2.id)) {
                        roundMatches.push(m);
                        roundPlayers.add(m.team1.id);
                        roundPlayers.add(m.team2.id);
                        // Remover de remainingMatches
                        const idx = remainingMatches.findIndex(rm => rm === m);
                        if (idx !== -1) remainingMatches.splice(idx, 1);
                    }
                }
            };

            attemptAssignment(priorityMatches);
            attemptAssignment(others);

            // Si en una ronda no pudimos meter a nadie (raro, pero posibe matemáticamente), 
            // y quedan partidos, forzamos el cierre de esta ronda.
            if (roundMatches.length === 0 && remainingMatches.length > 0) {
                // Forzar un partido aunque repita descanso si es la única opción
                const m = remainingMatches.shift()!;
                roundMatches.push(m);
                roundPlayers.add(m.team1.id);
                roundPlayers.add(m.team2.id);
            }

            // Asignar Canchas y Ronda
            roundMatches.forEach((m, idx) => {
                scheduledMatches.push({
                    id: crypto.randomUUID(),
                    groupId: 'g0',
                    team1: m.team1,
                    team2: m.team2,
                    played: false,
                    confirmed: false,
                    roundIndex: currentRound,
                    courtNumber: idx + 1
                } as any);
            });

            lastRoundPlayers = roundPlayers;
            currentRound++;

            // Seguridad por si el algoritmo entra en loop (no debería)
            if (currentRound > 500) break; 
        }

        return scheduledMatches;
    };

    const handleStart = async () => {
        if (PRESENT_PLAYERS.length < 2) {
            toast.error("Se necesitan al menos 2 jugadores para iniciar");
            return;
        }
        setSaving(true);
        const group: Group = {
            id: crypto.randomUUID(),
            name: "Americano",
            players: PRESENT_PLAYERS
        };

        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            youtubeUrl: ytUrl || undefined,
            groups: [group],
            matches: [], // Dynamically generated matches start empty
            bracket: [],
            modalidad: {
                numCourts,
                matchesPerTeam,
                isIndividual,
                bracketSize
            }
        });

        if (res.ok) {
            router.push(`/tournaments/${tournamentId}/manage`);
        } else {
            toast.error("Error al iniciar torneo: " + res.error);
        }
        setSaving(false);
    };

    const reshuffleMatches = () => {
        const m = generateAmericanoMatches(PRESENT_PLAYERS, matchesPerTeam, numCourts);
        setGeneratedMatches(m);
        toast.info("Partidos re-sorteados");
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-3xl border-b border-border/40 px-4 py-2">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/tournaments/${tournamentId}/manage`)}
                            className="group flex items-center gap-1.5 text-foreground/70 hover:text-foreground transition-all font-black uppercase tracking-widest text-[8px] shrink-0 bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/40"
                        >
                            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                            Volver
                        </button>

                        <div className="h-5 w-px bg-border/40 hidden md:block" />

                        <div className="hidden md:flex flex-col">
                            <span className="text-[6px] font-black uppercase tracking-[0.2em] text-azul-primary/60 leading-none mb-0.5">Torneo</span>
                            <span className="text-[10px] font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[150px]">
                                {tournamentName}
                            </span>
                        </div>

                        <div className="h-5 w-[1px] bg-border/40 hidden md:block" />

                        <div className="hidden md:flex items-center gap-1">
                            {[
                                { 
                                    id: "checkin", 
                                    icon: UserCheck, 
                                    label: "Asistencia", 
                                    active: step === "checkin",
                                    completed: false
                                },
                                { id: "matches", icon: Swords, label: "Partidos", active: false, disabled: true },
                                { id: "playoffs", icon: Trophy, label: "Finales", active: false, disabled: true }
                            ].map((s, idx) => {
                                const Icon = s.icon;
                                return (
                                    <div key={s.id} className="flex items-center">
                                        <button 
                                            disabled={s.disabled}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${s.active 
                                                ? "bg-azul-primary text-white shadow-sm" 
                                                : "text-foreground/40"}`}
                                        >
                                            <Icon className="w-3 h-3" />
                                            <span className="text-[8px] font-black uppercase tracking-tight">{s.label}</span>
                                        </button>
                                        {idx < 2 && (
                                            <div className="px-1 text-foreground/10">
                                                <ChevronRight className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-azul-primary/5 border border-azul-primary/10 text-azul-primary rounded-lg text-[7px] font-black uppercase tracking-[0.2em] italic hidden sm:block">
                            Método Americano
                        </div>
                        {!isIndividual && (
                            <div className="p-1.5 rounded-lg bg-celeste/5 border border-celeste/10 text-azul-primary">
                                <Users2 className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
                <AnimatePresence mode="wait">
                    {step === "checkin" && (
                        <motion.div key="checkin" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div>
                                    <h2 className="text-sm font-black uppercase italic tracking-tight text-foreground">Asistencia</h2>
                                    <p className="text-foreground/40 text-[6px] font-black tracking-[0.4em] uppercase">Panel de Control Técnico</p>
                                </div>
                                <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsPlayerModalOpen(true)}
                                            className="px-2.5 py-1.5 bg-azul-primary text-white rounded-lg font-black uppercase italic text-[7px] tracking-widest hover:bg-azul-dark shadow-sm transition-all flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Inscribir
                                        </button>
                                </div>
                            </div>

                            <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-4 py-2 border-b border-border/40 flex flex-col md:flex-row gap-3 bg-muted/10">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por nombre..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-muted/20 border border-border/40 rounded-lg py-1.5 pl-9 pr-3 text-[9px] font-bold outline-none focus:ring-1 focus:ring-azul-primary transition-all placeholder:text-foreground/20"
                                        />
                                    </div>
                                    <select 
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="bg-muted/20 border border-border/40 rounded-lg px-3 py-1.5 text-[8px] font-black uppercase outline-none focus:ring-1 focus:ring-azul-primary cursor-pointer"
                                    >
                                        <option value="all">Categoría (Todas)</option>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="px-4 py-1.5 flex items-center justify-between bg-muted/5 border-b border-border/30">
                                    <span className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/20">Lista de Jugadores</span>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleCheckAll('paid')} className="text-[7px] font-black uppercase tracking-widest text-azul-primary/60 hover:text-azul-primary transition-colors">Todo Pago</button>
                                        <button onClick={() => handleCheckAll('present')} className="text-[7px] font-black uppercase tracking-widest text-azul-primary/60 hover:text-azul-primary transition-colors">Todo Ok</button>
                                    </div>
                                </div>
                                <div className="">
                                    {(() => {
                                        const flatPlayers: any[] = [];
                                        players.forEach(p => {
                                            const matchesSearchFilter = !searchQuery || 
                                                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                (p.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                                p.id.toLowerCase().includes(searchQuery.toLowerCase());
                                            
                                            const matchesCategoryFilter = categoryFilter === "all" || p.category === categoryFilter;
                                            
                                            if (matchesSearchFilter && matchesCategoryFilter) {
                                                if (isIndividual) {
                                                    flatPlayers.push({ ...p, checkinId: p.id, displayName: p.name });
                                                } else {
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
                                                <div key={p.checkinId} className={`flex items-center justify-between px-4 py-1 border-b border-border/30 last:border-0 transition-all duration-300 ${isPresent ? "bg-azul-primary/[0.03]" : "bg-card"}`}>
                                                    <div className="flex flex-col">
                                                        <p className={`text-[9px] font-black uppercase transition-colors ${isPresent ? "text-foreground" : "text-foreground/50"}`}>
                                                            {p.displayName}
                                                        </p>
                                                        {!isIndividual && (
                                                            <p className="text-[6px] text-foreground/20 font-black uppercase tracking-[0.2em] leading-none">
                                                                Equipo • {p.pairName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button 
                                                            onClick={() => togglePaid(p.checkinId)} 
                                                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${isPaid ? "bg-azul-primary border-azul-primary text-white shadow-sm" : "border-border/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                                            title="Pago"
                                                        >
                                                            <CreditCard className="w-2.5 h-2.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => togglePresent(p.checkinId)} 
                                                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${isPresent ? "bg-azul-primary border-azul-primary text-white shadow-sm" : "border-border/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                                            title="Presente"
                                                        >
                                                            <UserCheck className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* Tarjeta de Configuración de Formato */}
                            <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-xl p-4 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase italic tracking-tight text-foreground flex items-center gap-1.5">
                                            <Settings className="w-3.5 h-3.5 text-azul-primary" />
                                            Configuración de Formato
                                        </span>
                                        <span className="text-foreground/40 text-[6px] font-black tracking-[0.2em] uppercase leading-none mt-0.5">Ajustes del Sistema de Partidos</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Cantidad de Canchas */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/20">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-foreground">Cantidad de Canchas</span>
                                            <span className="text-[6px] text-foreground/40 font-black uppercase tracking-wider">Canchas simultáneas a usar</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNumCourts(prev => Math.max(1, prev - 1))}
                                                className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-6 text-center text-xs font-black italic">{numCourts}</span>
                                            <button
                                                type="button"
                                                onClick={() => setNumCourts(prev => prev + 1)}
                                                className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Partidos por Jugador */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/20">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-foreground">
                                                {isIndividual ? "Partidos por Jugador" : "Partidos por Pareja"}
                                            </span>
                                            <span className="text-[6px] text-foreground/40 font-black uppercase tracking-wider">Objetivo de partidos mínimos</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setMatchesPerTeam(prev => Math.max(1, prev - 1))}
                                                className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-6 text-center text-xs font-black italic">{matchesPerTeam}</span>
                                            <button
                                                type="button"
                                                onClick={() => setMatchesPerTeam(prev => prev + 1)}
                                                className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Clasificados a Llaves */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/20">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-foreground">Clasificados a Llaves</span>
                                            <span className="text-[6px] text-foreground/40 font-black uppercase tracking-wider">Cantidad que avanza a eliminatorias</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBracketSize(prev => Math.max(2, prev - 2));
                                                }}
                                                disabled={bracketSize <= 2}
                                                className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer disabled:opacity-30"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
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
                                                    setBracketSize(cleanVal);
                                                }}
                                                className="w-8 bg-transparent text-center text-xs font-black italic focus:outline-none rounded no-spin-buttons text-foreground border-b border-border/20 focus:border-azul-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBracketSize(prev => prev + 2);
                                                }}
                                                className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-all text-foreground/75 active:scale-95 cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleStart}
                                disabled={PRESENT_PLAYERS.length < 2 || saving}
                                className="w-full py-3 bg-azul-primary hover:bg-azul-dark text-white rounded-xl font-black uppercase italic tracking-[0.2em] shadow-lg shadow-azul-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-[10px]"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Iniciar Torneo Técnico • {present.size} Jugadores
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}




                </AnimatePresence>
            </main>
            
            <ManualRegistrationModal 
                isOpen={isPlayerModalOpen}
                onClose={() => setIsPlayerModalOpen(false)}
                tournamentId={tournamentId}
                categories={categories}
                isIndividual={isIndividual}
                onSuccess={onPlayerAdded}
                existingPlayerIds={new Set(players.flatMap(p => [p.userId, p.partnerUserId]).filter(Boolean) as string[])}
            />
        </div>
    );
}
