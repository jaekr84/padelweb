"use client";

import { useState, useCallback, useMemo } from "react";
import {
    Users, CheckCircle2, Trophy, ArrowRight, ArrowLeft,
    Dice5, Check, Trash2, Settings, Plus, Minus,
    CreditCard, UserCheck, AlertCircle, ChevronRight,
    Users2, MonitorPlay, FlaskConical, AlertTriangle
} from "lucide-react";
import { saveTournamentFixture } from "./actions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export interface FixtureSetupProps {
    tournamentId: string;
    tournamentName: string;
    initialStatus: string;
    initialPlayers: Player[];
}

type Player = { id: string; name: string; category?: string };
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
    initialPlayers
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
    const [ytUrl, setYtUrl] = useState("");
    const [saving, setSaving] = useState(false);

    // ─── DEV: nombres de prueba ───
    const TEST_NAMES = [
        "Pablo Ruiz", "Diego Torres", "Martín López", "Sebastián García",
        "Andrés Pérez", "Lucas Sánchez", "Nicolás Fernández", "Matías González",
        "Rodrigo Díaz", "Tomás Álvarez", "Facundo Romero", "Ignacio Moreno",
        "Gustavo Jiménez", "Federico Herrera", "Ramiro Medina", "Santiago Molina",
    ];

    function addTestPlayers(count = 8) {
        const existing = new Set(players.map(p => p.name));
        const newPlayers: Player[] = TEST_NAMES
            .filter(n => !existing.has(n))
            .slice(0, count)
            .map((name, i) => ({ id: `test_${Date.now()}_${i}`, name }));
        const merged = [...players, ...newPlayers];
        setPlayers(merged);
        // Auto-marcar todos como presentes y pagos
        setPaid(new Set(merged.map(p => p.id)));
        setPresent(new Set(merged.map(p => p.id)));
    }

    function removeTestPlayers() {
        const real = players.filter(p => !p.id.startsWith("test_"));
        setPlayers(real);
        setPaid(new Set(real.map(p => p.id).filter(id => paid.has(id))));
        setPresent(new Set(real.map(p => p.id).filter(id => present.has(id))));
    }

    const PRESENT_PLAYERS = useMemo(() =>
        players.filter(p => present.has(p.id)),
        [players, present]);

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
        const allIds = players.map(p => p.id);
        if (type === 'paid') {
            const areAllPaid = allIds.every(id => paid.has(id));
            setPaid(areAllPaid ? new Set() : new Set(allIds));
        } else {
            const areAllPresent = allIds.every(id => present.has(id));
            setPresent(areAllPresent ? new Set() : new Set(allIds));
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
                return { ...g, players: [...g.players, { id: guestId, name: `${name} (inv.)` }] };
            })
        );
    }, [playersPerGroup]);

    const handleRandomize = useCallback(() => {
        if (PRESENT_PLAYERS.length === 0) return;
        setRandomizing(true);

        // Simulating a brief "shuffling" effect for better UX
        setTimeout(() => {
            const shuffled = shuffle(PRESENT_PLAYERS);
            const newGroups = buildGroups(numGroups);

            // Distribute players in a snake-like or round-robin fashion
            shuffled.forEach((player, idx) => {
                const groupIdx = idx % numGroups;
                if (newGroups[groupIdx].players.length < playersPerGroup) {
                    newGroups[groupIdx].players.push(player);
                }
            });

            setGroups(newGroups);
            setHasRandomized(true);
            setRandomizing(false);
        }, 800);
    }, [numGroups, playersPerGroup, PRESENT_PLAYERS]);

    return (
        <div className="min-h-screen bg-[#090A0F] text-white">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-[#090A0F]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Fixture</span>
                                <div className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 italic">Setup</span>
                            </div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight leading-none truncate max-w-[180px]">
                                {tournamentName}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                        {[
                            { id: "checkin", icon: UserCheck },
                            { id: "config", icon: Settings },
                            { id: "assign", icon: Users2 }
                        ].map((s, idx) => {
                            const Icon = s.icon;
                            const isActive = step === s.id;
                            const isPast = (step === "config" && idx === 0) || (step === "assign" && idx < 2);

                            return (
                                <div
                                    key={s.id}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110"
                                        : isPast
                                            ? "text-emerald-500"
                                            : "text-white/20"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 pb-32">

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
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight">Presentismo</h2>
                                    <p className="text-white/40 text-[10px] font-black tracking-widest uppercase">Confirmá asistencia y pagos</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Inscriptos</span>
                                    <span className="text-2xl font-black italic text-blue-500 leading-none">{players.length}</span>
                                </div>
                            </div>

                            {/* ── DEV: Botón de jugadores de prueba ── */}
                            <div className="flex items-center gap-2 px-1">
                                <button
                                    onClick={() => addTestPlayers(8)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <FlaskConical className="h-3.5 w-3.5" />
                                    + 8 jugadores de prueba
                                </button>
                                {players.some(p => p.id.startsWith("test_")) && (
                                    <button
                                        onClick={removeTestPlayers}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Limpiar
                                    </button>
                                )}
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-2xl">
                                <div className="px-6 py-4 bg-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Jugadores</span>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleCheckAll('paid')} className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors">Todo Pago</button>
                                        <button onClick={() => handleCheckAll('present')} className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors">Todo Ok</button>
                                    </div>
                                </div>

                                <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                                    {players.map(p => {
                                        const isPaid = paid.has(p.id);
                                        const isPresent = present.has(p.id);

                                        return (
                                            <div
                                                key={p.id}
                                                className={`group flex items-center justify-between px-6 py-4 transition-all ${isPresent ? "bg-blue-600/5" : "opacity-40"
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`font-black uppercase italic tracking-tight transition-colors ${isPresent ? "text-white" : "text-white/40"}`}>
                                                        {p.name}
                                                    </span>
                                                    <div className="flex gap-2 mt-1">
                                                        {isPaid && <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Pago</span>}
                                                        {isPresent && <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">Ok</span>}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => togglePaid(p.id)}
                                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isPaid
                                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                            : "bg-white/5 border border-white/10 text-white/20 hover:border-white/20"
                                                            }`}
                                                    >
                                                        <CreditCard className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => togglePresent(p.id)}
                                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isPresent
                                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                                            : "bg-white/5 border border-white/10 text-white/20 hover:border-white/20"
                                                            }`}
                                                    >
                                                        <UserCheck className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep("config")}
                                disabled={present.size === 0}
                                className={`w-full py-5 rounded-3xl font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${present.size > 0
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
                                    : "bg-white/5 text-white/20 cursor-not-allowed"
                                    }`}
                            >
                                <span>Continuar ({present.size})</span>
                                <ArrowRight className="w-5 h-5" />
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
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Estructura</h2>
                                <p className="text-white/40 text-[10px] font-black tracking-widest uppercase">Ajustá la configuración de los grupos</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 text-blue-500">
                                        <Users2 className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Cantidad de Grupos</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-black/20 rounded-2xl p-2">
                                        <button
                                            onClick={() => setNumGroups(Math.max(1, numGroups - 1))}
                                            className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
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

                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <Users className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Jugadores / Parejas</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-black/20 rounded-2xl p-2">
                                        <button
                                            onClick={() => setPlayersPerGroup(Math.max(2, playersPerGroup - 1))}
                                            className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
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

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Check-in", value: PRESENT_PLAYERS.length, color: "text-blue-500" },
                                    { label: "Cupos", value: numGroups * playersPerGroup, color: "text-white/40" },
                                    {
                                        label: PRESENT_PLAYERS.length > numGroups * playersPerGroup ? "Sobran" : "Faltan",
                                        value: Math.abs(PRESENT_PLAYERS.length - numGroups * playersPerGroup),
                                        color: PRESENT_PLAYERS.length === numGroups * playersPerGroup ? "text-emerald-500" : "text-amber-500"
                                    },
                                    { label: "Min. Partido", value: "2", color: "text-white/20" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1">{stat.label}</span>
                                        <span className={`text-xl font-black italic ${stat.color}`}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep("checkin")}
                                    className="flex-1 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl font-black uppercase italic tracking-widest transition-all"
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
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight">Asignación</h2>
                                    <p className="text-white/40 text-[10px] font-black tracking-widest uppercase">Armá los grupos para el sorteo</p>
                                </div>
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
                            </div>

                            {/* Player Pool */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sin Asignar ({unassigned.length})</span>
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
                                                onClick={() => {
                                                    const firstEmptyGroup = groups.find(g => g.players.length < playersPerGroup);
                                                    if (firstEmptyGroup) handleAddPlayer(p.id, firstEmptyGroup.id);
                                                }}
                                                className="px-4 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all"
                                            >
                                                {p.name}
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                    {unassigned.length === 0 && (
                                        <div className="w-full py-4 text-center border border-dashed border-white/10 rounded-2xl">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Todo listo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-40 md:pb-12">
                                {groups.map(g => (
                                    <div key={g.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
                                        <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                            <span className="text-xs font-black uppercase italic tracking-[0.2em] text-blue-500">{g.name}</span>
                                            <span className="text-[10px] font-black text-white/20">{g.players.length} / {playersPerGroup}</span>
                                        </div>
                                        <div className="p-3 space-y-2 flex-1 min-h-[140px]">
                                            <AnimatePresence mode="popLayout">
                                                {g.players.map(p => (
                                                    <motion.div
                                                        key={p.id}
                                                        layoutId={p.id}
                                                        className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 group"
                                                    >
                                                        <span className="text-xs font-bold uppercase italic">{p.name}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemovePlayer(p.id); }}
                                                            className="text-white/20 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const name = prompt("Nombre del invitado:");
                                                if (name) handleAddGuest(name, g.id);
                                            }}
                                            className="p-3 bg-black/20 text-[8px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors border-t border-white/5"
                                        >
                                            + Invitado
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Sticky Footer */}
                            <div className="fixed bottom-20 md:bottom-0 left-0 right-0 px-6 pb-4 pt-8 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/95 to-transparent z-50">
                                <div className="max-w-4xl mx-auto flex gap-4">
                                    <button
                                        onClick={() => setStep("config")}
                                        className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all backdrop-blur-xl"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        disabled={!allFull || saving}
                                        onClick={handleConfirmGroups}
                                        className={`flex-1 h-16 rounded-2xl font-black uppercase italic tracking-widest text-sm transition-all shadow-2xl flex items-center justify-center gap-3 backdrop-blur-xl ${!allFull
                                            ? "bg-white/5 text-white/10 border border-white/5"
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
            </main>
        </div>
    );
}
