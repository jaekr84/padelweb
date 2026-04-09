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
    const [step, setStep] = useState<"checkin" | "config" | "assign">("checkin");
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
        if (PRESENT_PLAYERS.length < 2) {
            toast.error("Se necesitan al menos 2 jugadores para iniciar");
            return;
        }
        // Americano siempre usa 1 grupo único
        setGroups([{ id: 'g0', name: 'Grupo Único', players: PRESENT_PLAYERS }]);
        const m = generateAmericanoMatches(PRESENT_PLAYERS, matchesPerTeam, numCourts);
        setGeneratedMatches(m);
        setStep("assign");
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
        for (const [i, j] of possiblePairs) {
            const p1 = players[i];
            const p2 = players[j];
            if (playerMatchCount.get(p1.id)! < matchesPerPlayer && playerMatchCount.get(p2.id)! < matchesPerPlayer) {
                selectedMatches.push({ team1: p1, team2: p2 });
                playerMatchCount.set(p1.id, playerMatchCount.get(p1.id)! + 1);
                playerMatchCount.set(p2.id, playerMatchCount.get(p2.id)! + 1);
            }
        }

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
                    id: `m_g0_${currentRound}_${idx}_${Date.now()}_${Math.random()}`,
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

    const handleConfirmGroups = async () => {
        setSaving(true);
        const group = groups[0];
        if (!group) return;

        if (generatedMatches.length === 0) {
            toast.error("No hay partidos para guardar.");
            setSaving(false);
            return;
        }

        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            youtubeUrl: ytUrl || undefined,
            groups: [{ id: group.id, name: group.name, players: group.players }],
            matches: generatedMatches,
            bracket: [],
        });

        if (res.ok) {
            router.push(`/tournaments/${tournamentId}/manage`);
        } else {
            toast.error("Error al iniciar el torneo: " + res.error);
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
                                        id: "estructura", 
                                        icon: LayoutDashboard, 
                                        label: "Estructura", 
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
                                                    if (s.id === "estructura") setStep("config");
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${s.active 
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                                    : s.completed 
                                                        ? "text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
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
                            <div className="px-4 py-2 bg-blue-500/5 border border-blue-500/10 text-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] italic hidden sm:block">
                                Método Americano
                            </div>
                            {!isIndividual && (
                                <div className="p-2 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-500" title="Torneo de Parejas">
                                    <Users2 className="w-4 h-4" />
                                </div>
                            )}
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
                                    { id: "config", label: "1. Ajustes del Formato" },
                                    { id: "assign", label: "2. Generación del Cuadro" }
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
                        <motion.div key="checkin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Asistencia</h2>
                                    <p className="text-foreground/60 text-[10px] font-black tracking-widest uppercase">Confirmá quiénes están para jugar</p>
                                </div>
                                <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsPlayerModalOpen(true)}
                                            className="px-3 py-1.5 bg-blue-600/10 text-blue-600 border border-blue-500/30 rounded-lg font-black uppercase italic text-[8px] tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Inscribir
                                        </button>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-3xl overflow-hidden divide-y divide-border shadow-2xl">
                                <div className="px-6 py-4 border-b border-border/50 flex flex-col md:flex-row gap-4 bg-muted/20">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por nombre..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <select 
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="bg-background border border-border rounded-xl px-4 py-2 text-[10px] font-black uppercase italic outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                    >
                                        <option value="all">Categoría (Todas)</option>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="px-6 py-4 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Lista de Jugadores</span>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleCheckAll('paid')} className="text-[10px] font-black uppercase tracking-widest text-blue-600">Todo Pago</button>
                                        <button onClick={() => handleCheckAll('present')} className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Todo Ok</button>
                                    </div>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
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
                                                <div key={p.checkinId} className={`flex items-center justify-between px-6 py-4 transition-all duration-300 ${isPresent ? "bg-emerald-500/[0.03] border-l-4 border-l-emerald-500" : "bg-card border-l-4 border-l-transparent"}`}>
                                                    <div className="flex flex-col gap-1">
                                                        <p className={`text-sm font-black uppercase italic transition-colors ${isPresent ? "text-foreground" : "text-foreground/60"}`}>
                                                            {p.displayName}
                                                        </p>
                                                        {!isIndividual && (
                                                            <p className="text-[9px] text-foreground/30 font-bold uppercase tracking-widest">
                                                                Equipo: <span className="text-blue-500/60">{p.pairName}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => togglePaid(p.checkinId)} 
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isPaid ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" : "border-border text-foreground/20 hover:text-foreground/40"}`}
                                                            title="Confirmar Pago"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => togglePresent(p.checkinId)} 
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isPresent ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "border-border text-foreground/20 hover:text-foreground/40"}`}
                                                            title="Confirmar Presencia"
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
                                disabled={PRESENT_PLAYERS.length < 2}
                                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase italic tracking-[0.2em] shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                Continuar con {present.size} participantes
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {step === "config" && (
                        <motion.div key="config" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
                            <div className="px-2">
                                <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Configuración Americano</h2>
                                <p className="text-foreground/60 text-[10px] font-black tracking-widest uppercase">Definí la cantidad de partidos por equipo</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card border border-border rounded-3xl p-8 shadow-xl">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-blue-500">
                                            <Swords className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Partidos por Equipo</span>
                                        </div>
                                        <span className="text-3xl font-black italic">{matchesPerTeam}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max={Math.max(1, PRESENT_PLAYERS.length - 1)} 
                                        value={matchesPerTeam} 
                                        onChange={(e) => setMatchesPerTeam(parseInt(e.target.value))}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <p className="text-[10px] text-foreground/40 font-bold uppercase text-center">
                                        Cada equipo jugará {matchesPerTeam} partidos.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <MonitorPlay className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Canchas Disponibles</span>
                                        </div>
                                        <span className="text-3xl font-black italic">{numCourts}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="10" 
                                        value={numCourts} 
                                        onChange={(e) => setNumCourts(parseInt(e.target.value))}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <p className="text-[10px] text-foreground/40 font-bold uppercase text-center">
                                        Se usarán hasta {numCourts} canchas en simultáneo.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border md:col-span-2">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase text-foreground/40">Total Partidos</p>
                                        <p className="text-xl font-black italic">{generatedMatches.length || Math.ceil((PRESENT_PLAYERS.length * matchesPerTeam) / 2)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase text-foreground/40">Participantes</p>
                                        <p className="text-xl font-black italic">{PRESENT_PLAYERS.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla de Jugadores Confirmados */}
                            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                                <div className="p-4 bg-muted/50 border-b border-border flex items-center gap-2 text-foreground/40 uppercase font-black tracking-widest text-[10px]">
                                    <Users2 className="w-4 h-4" />
                                    <span>Jugadores Confirmados ({PRESENT_PLAYERS.length})</span>
                                </div>
                                <div>
                                    <table className="w-full text-left">
                                        <thead className="bg-muted text-[8px] font-black uppercase tracking-widest text-foreground/20 sticky top-0 z-10 border-b border-border">
                                            <tr>
                                                <th className="px-6 py-3">#</th>
                                                <th className="px-6 py-3">Nombre / Equipo</th>
                                                <th className="px-6 py-3">Categoría</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {PRESENT_PLAYERS.map((p, idx) => (
                                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4 text-[10px] font-black italic text-foreground/20">{idx + 1}</td>
                                                    <td className="px-6 py-4 text-xs font-black uppercase italic">{p.name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-[8px] font-black uppercase">{p.category || "D"}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setStep("checkin")} className="flex-1 py-5 bg-card border border-border rounded-3xl font-black uppercase italic tracking-widest">Atrás</button>
                                <button onClick={handleStart} className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black uppercase italic tracking-widest shadow-lg shadow-blue-900/20">Iniciar Torneo</button>
                            </div>
                        </motion.div>
                    )}

                    {step === "assign" && (
                        <motion.div key="assign" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 pb-20">
                            <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-8 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <button onClick={reshuffleMatches} className="p-2 hover:bg-blue-600/20 rounded-full transition-colors group" title="Sorteo Random">
                                        <Dice5 className="w-6 h-6 text-blue-500 animate-pulse group-hover:animate-spin" />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-black uppercase italic text-blue-500 mb-2">Partidos Generados</h3>
                                <p className="text-sm text-foreground/60 max-w-md mx-auto">
                                    Se armó un cuadro con <strong>{generatedMatches.length}</strong> partidos totales. 
                                    Cada equipo juega exactamente <strong>{matchesPerTeam}</strong> partidos.
                                </p>
                            </div>

                            <div className="space-y-12">
                                {Array.from(new Set(generatedMatches.map(m => m.roundIndex))).sort((a, b) => (a || 0) - (b || 0)).map(roundIdx => (
                                    <div key={roundIdx} className="space-y-4">
                                        <div className="flex items-center gap-4 px-2">
                                            <div className="h-px flex-1 bg-border/50" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30">Ronda {(roundIdx || 0) + 1}</h4>
                                            <div className="h-px flex-1 bg-border/50" />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {generatedMatches.filter(m => m.roundIndex === roundIdx).map((m, idx) => (
                                                <div key={idx} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-blue-500/30 transition-all relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 opacity-20" />
                                                    <div className="flex-1 text-right overflow-hidden break-words">
                                                        <span className="text-[10px] font-black uppercase italic">{m.team1.name}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                                                        <div className="px-3 py-1 bg-muted rounded-lg text-[10px] font-black text-foreground/20">VS</div>
                                                        <span className="text-[8px] font-black uppercase text-blue-500/40 tracking-tighter">Cancha {m.courtNumber}</span>
                                                    </div>
                                                    <div className="flex-1 text-left overflow-hidden break-words">
                                                        <span className="text-[10px] font-black uppercase italic">{m.team2.name}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4 sticky bottom-4">
                                <button onClick={() => setStep("config")} className="flex-1 py-5 bg-card border border-border rounded-3xl font-black uppercase italic tracking-widest shadow-2xl backdrop-blur-xl bg-card/80">Atrás</button>
                                <button
                                    onClick={handleConfirmGroups}
                                    disabled={saving}
                                    className="flex-[2] py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black uppercase italic tracking-[0.2em] shadow-2xl flex items-center justify-center gap-2"
                                >
                                    {saving ? "Generando..." : "Confirmar y Empezar"}
                                    <Zap className="w-5 h-5" />
                                </button>
                            </div>
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
