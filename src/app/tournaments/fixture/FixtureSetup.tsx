"use client";

import { useState, useCallback, useMemo } from "react";
import styles from "./fixture.module.css";
import { saveTournamentFixture } from "./actions";
import { useRouter } from "next/navigation";

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
    const [players] = useState<Player[]>(initialPlayers);
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
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{tournamentName}</h1>
                <div className={styles.stepper}>
                    <div className={`${styles.step} ${step === "checkin" ? styles.stepActive : ""}`}>1. Presentismo</div>
                    <div className={`${styles.step} ${step === "config" ? styles.stepActive : ""}`}>2. Configuración</div>
                    <div className={`${styles.step} ${step === "assign" ? styles.stepActive : ""}`}>3. Armado de Grupos</div>
                </div>
            </div>

            {step === "checkin" && (
                <div className={styles.checkinCard}>
                    <div className={styles.checkinHeader}>
                        <span className={styles.checkinName}>Jugador / Pareja</span>
                        <div className={styles.checkinColLabel} onClick={() => handleCheckAll('paid')} title="Marcar todos como pagados">
                            <span>Pago</span>
                            <span className={styles.checkAllIcon}>⇅</span>
                        </div>
                        <div className={styles.checkinColLabel} onClick={() => handleCheckAll('present')} title="Marcar todos como presentes">
                            <span>Presente</span>
                            <span className={styles.checkAllIcon}>⇅</span>
                        </div>
                    </div>
                    <div className={styles.checkinList}>
                        {players.map(p => (
                            <div key={p.id} className={`${styles.checkinRow} ${present.has(p.id) ? styles.checkinRowPresent : ""}`}>
                                <span className={styles.checkinName}>{p.name}</span>
                                <div className={styles.checkinCheck}>
                                    <input type="checkbox" className={styles.checkbox} checked={paid.has(p.id)} onChange={() => togglePaid(p.id)} />
                                </div>
                                <div className={styles.checkinCheck}>
                                    <input type="checkbox" className={styles.checkbox} checked={present.has(p.id)} onChange={() => togglePresent(p.id)} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={styles.actionBar}>
                        <button className={styles.btnPrimary} disabled={present.size === 0} onClick={() => setStep("config")}>
                            {present.size === 0 ? "Marcá al menos 1 presente" : `Continuar con ${present.size} jugadores →`}
                        </button>
                    </div>
                </div>
            )}

            {step === "config" && (
                <div className={styles.configCard}>
                    <h2 className={styles.configTitle}>Configuración de Grupos</h2>
                    <div className={styles.configGrid}>
                        <div className={styles.configField}>
                            <label className={styles.configLabel}>Cantidad de grupos</label>
                            <div className={styles.counterRow}>
                                <button className={styles.counterBtn} onClick={() => setNumGroups(Math.max(1, numGroups - 1))}>−</button>
                                <span className={styles.counterVal}>{numGroups}</span>
                                <button className={styles.counterBtn} onClick={() => setNumGroups(Math.min(16, numGroups + 1))}>＋</button>
                            </div>
                        </div>
                        <div className={styles.configField}>
                            <label className={styles.configLabel}>Jugadores por grupo</label>
                            <div className={styles.counterRow}>
                                <button className={styles.counterBtn} onClick={() => setPlayersPerGroup(Math.max(2, playersPerGroup - 1))}>−</button>
                                <span className={styles.counterVal}>{playersPerGroup}</span>
                                <button className={styles.counterBtn} onClick={() => setPlayersPerGroup(Math.min(16, playersPerGroup + 1))}>＋</button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.configSummary}>
                        <div className={`${styles.summaryPill} ${styles.pillInfo}`}>
                            <span>Participantes: <strong>{PRESENT_PLAYERS.length}</strong></span>
                        </div>
                        <div className={`${styles.summaryPill} ${PRESENT_PLAYERS.length === numGroups * playersPerGroup ? styles.pillOk : styles.pillWarn}`}>
                            <span>Cupos: <strong>{numGroups * playersPerGroup}</strong></span>
                        </div>
                        {PRESENT_PLAYERS.length > numGroups * playersPerGroup && (
                            <div className={`${styles.summaryPill} ${styles.pillWarn}`}>
                                <span>Sobran: <strong>{PRESENT_PLAYERS.length - numGroups * playersPerGroup}</strong></span>
                            </div>
                        )}
                        {PRESENT_PLAYERS.length < numGroups * playersPerGroup && (
                            <div className={`${styles.summaryPill} ${styles.pillWarn}`}>
                                <span>Faltan: <strong>{numGroups * playersPerGroup - PRESENT_PLAYERS.length}</strong></span>
                            </div>
                        )}
                    </div>

                    <button className={styles.btnPrimary} onClick={handleStart}>Crear Grupos →</button>
                </div>
            )}

            {step === "assign" && (
                <div>
                    <div className={styles.poolSection}>
                        <div className={styles.poolHeader}>
                            <span className={styles.poolTitle}>Sin asignar ({unassigned.length})</span>
                            <button className={styles.randomBtn} onClick={handleRandomize} disabled={randomizing || unassigned.length === 0}>
                                {randomizing ? "🎲 Sorteando..." : "🎲 Sorteo Aleatorio"}
                            </button>
                        </div>
                        <div className={styles.playerPool}>
                            {unassigned.map(p => (
                                <div key={p.id} className={styles.playerChip} onClick={() => {
                                    const firstEmptyGroup = groups.find(g => g.players.length < playersPerGroup);
                                    if (firstEmptyGroup) handleAddPlayer(p.id, firstEmptyGroup.id);
                                }}>
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.groupsGrid}>
                        {groups.map(g => (
                            <div key={g.id} className={styles.groupCard}>
                                <div className={styles.groupHeader}>
                                    <span className={styles.groupName}>{g.name}</span>
                                    <span className={styles.groupCount}>{g.players.length}/{playersPerGroup}</span>
                                </div>
                                <div className={styles.groupSlotList}>
                                    {g.players.map(p => (
                                        <div key={p.id} className={styles.groupSlot}>
                                            <span className={styles.slotName}>{p.name}</span>
                                            <button className={styles.slotRemove} onClick={() => handleRemovePlayer(p.id)}>×</button>
                                        </div>
                                    ))}
                                    {Array.from({ length: playersPerGroup - g.players.length }).map((_, i) => (
                                        <div key={i} className={styles.groupSlotEmpty}>Vacío</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.actionBar}>
                        <button className={styles.btnSecondary} onClick={() => setStep("config")}>← Reconfigurar</button>
                        <button className={styles.btnPrimary} disabled={!allFull || saving} onClick={handleConfirmGroups}>
                            {saving ? "⏳ Iniciando..." : allFull ? "Confirmar Grupos ✓" : "Faltan jugadores"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
