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
                isIndividual
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
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-3xl border-b border-border/50 px-4 py-4">
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => {
                                    if (step === "config") setStep("checkin");
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
                                        completed: false
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
                                onClick={handleStart}
                                disabled={PRESENT_PLAYERS.length < 2 || saving}
                                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase italic tracking-[0.2em] shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Iniciar Torneo con {present.size} participantes
                                        <ArrowRight className="w-5 h-5" />
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
