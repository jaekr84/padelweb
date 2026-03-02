"use client";

import { useState, useCallback } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "./fixture.module.css";
import Link from "next/link";
import { saveTournamentFixture } from "./actions";

export interface FixtureClientProps {
    tournamentId: string;
    tournamentName: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Player = { id: string; name: string; category?: string };
type Group = { id: string; name: string; players: Player[] };

type Match = {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    score1?: number; // Games won by team 1
    score2?: number; // Games won by team 2
    played: boolean;
    confirmed: boolean;
};

type GroupStanding = {
    playerId: string;
    points: number;
    matchesPlayed: number;
};

type BracketSlot = Player | "BYE" | null;

type BracketMatch = {
    id: string;
    round: number;   // 0 = final, 1 = semis, 2 = quarters...
    slot: number;    // position within the round
    team1: BracketSlot;
    team2: BracketSlot;
    score1?: number;
    score2?: number;
    confirmed: boolean;
    winnerId?: string; // id of winning team
};

// ─── Mock inscriptos (will come from DB in next sprint) ───────────────────────
const MOCK_PLAYERS: Player[] = [
    { id: "p1", name: "Perez / García" },
    { id: "p2", name: "Torres / Silva" },
    { id: "p3", name: "Gomez / Lopez" },
    { id: "p4", name: "Ruiz / Soto" },
    { id: "p5", name: "Fernandez / Díaz" },
    { id: "p6", name: "Ríos / Mora" },
    { id: "p7", name: "Muñoz / Herrera" },
    { id: "p8", name: "Vega / Castro" },
    { id: "p9", name: "Tapia / Coello" },
    { id: "p10", name: "Lebron / Paquito" },
    { id: "p11", name: "Martín / Brea" },
    { id: "p12", name: "Lima / Tello" },
    { id: "p13", name: "Acosta / Benítez" },
    { id: "p14", name: "Quiroga / Navarro" },
    { id: "p15", name: "Méndez / Rojas" },
    { id: "p16", name: "Cabrera / Salas" },
    { id: "p17", name: "Figueroa / Ibáñez" },
    { id: "p18", name: "Paredes / Esquivel" },
    { id: "p19", name: "Vera / Delgado" },
    { id: "p20", name: "Aguilar / Reyes" },
    { id: "p21", name: "Blanco / Fuentes" },
    { id: "p22", name: "Ojeda / Leiva" },
    { id: "p23", name: "Romero / Valdez" },
    { id: "p24", name: "Saez / Contreras" },
    { id: "p25", name: "Campos / Arias" },
    { id: "p26", name: "Guzmán / Peralta" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildGroups(count: number): Group[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `g${i}`,
        name: `Grupo ${String.fromCharCode(65 + i)}`, // A, B, C...
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlayerChip({
    player,
    inGroup,
    onAdd,
    onRemove,
}: {
    player: Player;
    inGroup: boolean;
    onAdd?: () => void;
    onRemove?: () => void;
}) {
    return (
        <div className={`${styles.playerChip} ${inGroup ? styles.chipInGroup : ""}`}>
            <span className={styles.chipAvatar}>
                {player.name.split(" ")[0][0]}
            </span>
            <span className={styles.chipName}>{player.name}</span>
            {!inGroup && onAdd && (
                <button className={styles.chipBtn} onClick={onAdd} title="Agregar al grupo">＋</button>
            )}
            {inGroup && onRemove && (
                <button className={styles.chipBtnRemove} onClick={onRemove} title="Quitar del grupo">✕</button>
            )}
        </div>
    );
}

function GroupCard({
    group,
    maxPlayers,
    availablePlayers,
    onRemovePlayer,
    onAddPlayer,
    onAddGuest,
}: {
    group: Group;
    maxPlayers: number;
    availablePlayers: Player[];
    onRemovePlayer: (playerId: string) => void;
    onAddPlayer: (playerId: string, groupId: string) => void;
    onAddGuest: (name: string, groupId: string) => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const [showGuest, setShowGuest] = useState(false);
    const [guestInput, setGuestInput] = useState("");
    const isFull = group.players.length >= maxPlayers;
    const hasPool = availablePlayers.length > 0;

    const commitGuest = () => {
        const name = guestInput.trim();
        if (!name) return;
        onAddGuest(name, group.id);
        setGuestInput("");
        setShowGuest(false);
    };

    return (
        <div className={`${styles.groupCard} ${isFull ? styles.groupFull : ""}`}>
            <div className={styles.groupHeader}>
                <span className={styles.groupName}>{group.name}</span>
                <span className={styles.groupCount}>{group.players.length}/{maxPlayers}</span>
            </div>

            <div className={styles.groupPlayers}>
                {group.players.map((p) => (
                    <PlayerChip
                        key={p.id}
                        player={p}
                        inGroup
                        onRemove={() => onRemovePlayer(p.id)}
                    />
                ))}
                {group.players.length === 0 && (
                    <div className={styles.emptyGroup}>Sin jugadores aún</div>
                )}
            </div>

            {/* Footer actions */}
            {!isFull && (
                <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.4rem" }}>

                    {/* Option A: pick from pool (always shown if pool has players) */}
                    {hasPool && (
                        <div style={{ position: "relative" }}>
                            <button
                                className={styles.addToGroupBtn}
                                onClick={() => { setShowPicker((s) => !s); setShowGuest(false); }}
                            >
                                ＋ Agregar jugador
                            </button>
                            {showPicker && (
                                <div className={styles.pickerDropdown}>
                                    {availablePlayers.map((p) => (
                                        <button
                                            key={p.id}
                                            className={styles.pickerItem}
                                            onClick={() => {
                                                onAddPlayer(p.id, group.id);
                                                setShowPicker(false);
                                            }}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Option B: add guest */}
                    {!showGuest ? (
                        <button
                            className={styles.addGuestBtn}
                            onClick={() => { setShowGuest(true); setShowPicker(false); }}
                        >
                            👤 Agregar invitado
                        </button>
                    ) : (
                        <div className={styles.guestInputRow}>
                            <input
                                className={styles.guestInput}
                                placeholder="Nombre / Pareja invitada…"
                                value={guestInput}
                                onChange={(e) => setGuestInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && commitGuest()}
                                autoFocus
                            />
                            <button
                                className={styles.guestConfirmBtn}
                                onClick={commitGuest}
                                disabled={!guestInput.trim()}
                            >
                                ✓
                            </button>
                            <button
                                className={styles.guestCancelBtn}
                                onClick={() => { setShowGuest(false); setGuestInput(""); }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            )}
            {isFull && <div className={styles.fullBadge}>✓ Completo</div>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Step = "checkin" | "config" | "assign" | "done" | "elim";

export default function FixtureClientInner({ tournamentId, tournamentName }: FixtureClientProps) {
    const [step, setStep] = useState<Step>("checkin");
    const [numGroups, setNumGroups] = useState(2);
    const [playersPerGroup, setPlayersPerGroup] = useState(4);
    const [groups, setGroups] = useState<Group[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [randomizing, setRandomizing] = useState(false);
    const [bracket, setBracket] = useState<BracketMatch[]>([]);
    const [qualPerGroup, setQualPerGroup] = useState(2);
    const [ytUrl, setYtUrl] = useState("");

    // ── Check-in state ──────────────────────────────────────────────────────────
    const [paid, setPaid] = useState<Set<string>>(new Set());
    const [present, setPresent] = useState<Set<string>>(new Set());
    const [paidLocked, setPaidLocked] = useState(false);
    const [presentLocked, setPresentLocked] = useState(false);

    const togglePaid = (id: string) => {
        if (paidLocked) return;
        setPaid(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const togglePresent = (id: string) => {
        if (presentLocked) return;
        setPresent(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleAll = (field: "paid" | "present") => {
        if (field === "paid" && !paidLocked) {
            setPaid(prev => prev.size === MOCK_PLAYERS.length ? new Set() : new Set(MOCK_PLAYERS.map(p => p.id)));
        } else if (field === "present" && !presentLocked) {
            setPresent(prev => prev.size === MOCK_PLAYERS.length ? new Set() : new Set(MOCK_PLAYERS.map(p => p.id)));
        }
    };

    // Only players marked as present are available in the fixture pool
    const PRESENT_PLAYERS = MOCK_PLAYERS.filter(p => present.has(p.id));

    // All players that are NOT yet assigned to any group (from present players only)
    const assignedIds = groups.flatMap((g) => g.players.map((p) => p.id));
    const unassigned = PRESENT_PLAYERS.filter((p) => !assignedIds.includes(p.id));

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleStart = () => {
        setGroups(buildGroups(numGroups));
        setStep("assign");
    };

    const handleRandomize = useCallback(() => {
        setRandomizing(true);
        setTimeout(() => {
            const shuffled = shuffle(PRESENT_PLAYERS);
            const newGroups = buildGroups(numGroups);
            shuffled.forEach((player, idx) => {
                const groupIdx = idx % numGroups;
                if (newGroups[groupIdx].players.length < playersPerGroup) {
                    newGroups[groupIdx].players.push(player);
                }
            });
            setGroups(newGroups);
            setRandomizing(false);
        }, 600);
    }, [numGroups, playersPerGroup, PRESENT_PLAYERS]);

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

    const generateMatches = useCallback(() => {
        const newMatches: Match[] = [];
        groups.forEach(g => {
            // Round robin within group
            for (let i = 0; i < g.players.length; i++) {
                for (let j = i + 1; j < g.players.length; j++) {
                    newMatches.push({
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
        setMatches(newMatches);
    }, [groups]);

    const handleConfirmGroups = async () => {
        generateMatches();
        setStep("done");
        // Auto-start: save groups to DB → sets tournament to en_curso
        setSaving(true);
        setSaveError(null);
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
        await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            youtubeUrl: ytUrl || undefined,
            groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
            matches: currentMatches,
            bracket: [],
        });
        setSaving(false);
    };

    const handleScoreChange = (matchId: string, s1: string, s2: string) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            const score1 = s1 === "" ? undefined : parseInt(s1, 10);
            const score2 = s2 === "" ? undefined : parseInt(s2, 10);
            return {
                ...m,
                score1,
                score2,
                played: score1 !== undefined && score2 !== undefined,
                confirmed: false
            };
        }));
    };

    const handleConfirmScore = (matchId: string) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            return { ...m, confirmed: true };
        }));
    };

    const handleEditScore = (matchId: string) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            return { ...m, confirmed: false };
        }));
    };

    const computeStandings = (groupId: string): (GroupStanding & { player: Player; h2hNote?: string })[] => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];

        const standingsMap = new Map<string, GroupStanding>();
        group.players.forEach(p => {
            standingsMap.set(p.id, { playerId: p.id, points: 0, matchesPlayed: 0 });
        });

        const confirmedMatches = matches.filter(m => m.groupId === groupId && m.confirmed);
        confirmedMatches.forEach(m => {
            if (m.score1 !== undefined && m.score2 !== undefined) {
                const diff = m.score1 - m.score2;
                const s1 = standingsMap.get(m.team1.id)!;
                s1.matchesPlayed++;
                s1.points += diff;
                const s2 = standingsMap.get(m.team2.id)!;
                s2.matchesPlayed++;
                s2.points -= diff;
            }
        });

        // Build enriched list
        const list = Array.from(standingsMap.values()).map(s => ({
            ...s,
            player: group.players.find(p => p.id === s.playerId)!,
            h2hNote: undefined as string | undefined,
        }));

        // Head-to-head tiebreaker helper
        const h2hPoints = (aId: string, bIds: string[]): number => {
            let pts = 0;
            confirmedMatches.forEach(m => {
                if (m.score1 === undefined || m.score2 === undefined) return;
                const opponentIds = bIds.filter(id => id !== aId);
                // a was team1 and opponent was team2
                if (m.team1.id === aId && opponentIds.includes(m.team2.id)) pts += (m.score1 - m.score2);
                // a was team2 and opponent was team1
                if (m.team2.id === aId && opponentIds.includes(m.team1.id)) pts -= (m.score1 - m.score2);
            });
            return pts;
        };

        // Sort with tiebreaker
        list.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;

            // Tied — find all players with same points
            const tiedIds = list.filter(s => s.points === a.points).map(s => s.playerId);

            const aH2H = h2hPoints(a.playerId, tiedIds);
            const bH2H = h2hPoints(b.playerId, tiedIds);

            if (bH2H !== aH2H) return bH2H - aH2H;

            // Still tied — total game diff in H2H matches as last resort
            return 0;
        });

        // Annotate tied entries that were resolved by H2H
        const seenPoints = new Set<number>();
        list.forEach((entry, i) => {
            const others = list.filter((_, j) => j !== i && _.points === entry.points);
            if (others.length > 0 && !seenPoints.has(entry.points)) {
                seenPoints.add(entry.points);
                // Mark them with an H2H note so the UI can show the indicator
                const tiedIds = list.filter(s => s.points === entry.points).map(s => s.playerId);
                list.filter(s => s.points === entry.points).forEach(s => {
                    s.h2hNote = `Desempate H2H vs ${tiedIds.filter(id => id !== s.playerId).length} eq.`;
                });
            }
        });

        return list;
    };


    const generateBracket = async () => {
        // Collect qualifiers: top `qualPerGroup` from each group (by H2H standings)
        const qualifiers: Player[] = [];
        groups.forEach(g => {
            const standings = computeStandings(g.id);
            standings.slice(0, qualPerGroup).forEach(s => qualifiers.push(s.player));
        });

        // Standard bracket seeding: interleave groups (A1 vs B2, B1 vs A2...)
        // Number of slots = next power of 2
        const n = qualifiers.length;
        const slots = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
        const numRounds = Math.log2(slots);

        // Seed slots: top-seed vs bottom-seed pairing
        const seeded: BracketSlot[] = Array(slots).fill("BYE");
        qualifiers.forEach((p, i) => { seeded[i] = p; });

        // Build round 1 matches
        const newBracket: BracketMatch[] = [];
        const totalRounds = Math.ceil(numRounds);
        const r1Count = slots / 2;
        for (let slot = 0; slot < r1Count; slot++) {
            const t1 = seeded[slot];
            const t2 = seeded[slots - 1 - slot];
            // Auto-advance BYE immediately
            const autoBye = t1 === "BYE" || t2 === "BYE";
            const winner = autoBye ? (t1 !== "BYE" ? (t1 as Player).id : (t2 as Player).id) : undefined;
            newBracket.push({
                id: `bm_r${totalRounds - 1}_s${slot}`,
                round: totalRounds - 1,
                slot,
                team1: t1,
                team2: t2,
                confirmed: autoBye,
                winnerId: winner,
            });
        }

        // Build placeholder matches for subsequent rounds
        for (let r = totalRounds - 2; r >= 0; r--) {
            const count = Math.pow(2, r);
            for (let slot = 0; slot < count; slot++) {
                newBracket.push({
                    id: `bm_r${r}_s${slot}`,
                    round: r,
                    slot,
                    team1: null,
                    team2: null,
                    confirmed: false,
                });
            }
        }

        // Propagate BYE wins to next rounds
        advanceBracketWinners(newBracket, totalRounds);
        setBracket(newBracket);
        setStep("elim");
        // Auto-advance: save bracket seed → sets tournament to en_eliminatorias
        setSaving(true);
        setSaveError(null);
        await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
            matches,
            bracket: newBracket.map(bm => ({
                id: bm.id,
                round: bm.round,
                slot: bm.slot,
                team1: bm.team1,
                team2: bm.team2,
                score1: bm.score1,
                score2: bm.score2,
                confirmed: bm.confirmed,
                winnerId: bm.winnerId,
            })),
        });
        setSaving(false);
    };

    const advanceBracketWinners = (bm: BracketMatch[], totalRounds: number) => {
        // For each confirmed match, propagate winner to the next round
        for (let r = totalRounds - 1; r > 0; r--) {
            const roundMatches = bm.filter(m => m.round === r);
            roundMatches.forEach(m => {
                if (!m.winnerId) return;
                const winnerPlayer = [...groups.flatMap(g => g.players)]
                    .find(p => p.id === m.winnerId) ?? null;
                const nextSlot = Math.floor(m.slot / 2);
                const nextMatch = bm.find(nm => nm.round === r - 1 && nm.slot === nextSlot);
                if (!nextMatch) return;
                if (m.slot % 2 === 0) nextMatch.team1 = winnerPlayer;
                else nextMatch.team2 = winnerPlayer;
                // Auto-advance if other side is BYE
                if (nextMatch.team1 !== null && nextMatch.team2 !== null) {
                    if (nextMatch.team1 === "BYE" || nextMatch.team2 === "BYE") {
                        const winner = nextMatch.team1 !== "BYE" ? (nextMatch.team1 as Player).id : (nextMatch.team2 as Player).id;
                        nextMatch.confirmed = true;
                        nextMatch.winnerId = winner;
                    }
                }
            });
        }
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        setBracket(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            const score1 = s1 === "" ? undefined : parseInt(s1, 10);
            const score2 = s2 === "" ? undefined : parseInt(s2, 10);
            return { ...m, score1, score2 };
        }));
    };

    const handleBracketConfirm = (matchId: string) => {
        setBracket(prev => {
            const updated = prev.map(m => {
                if (m.id !== matchId) return m;
                if (m.score1 === undefined || m.score2 === undefined) return m;
                const winnerId = m.score1 > m.score2
                    ? (m.team1 as Player)?.id
                    : (m.team2 as Player)?.id;
                return { ...m, confirmed: true, winnerId };
            });
            const totalRounds = updated.length > 0
                ? Math.max(...updated.map(m => m.round)) + 1
                : 0;
            advanceBracketWinners(updated, totalRounds);
            return [...updated];
        });
    };

    const handleBracketEdit = (matchId: string) => {
        setBracket(prev => prev.map(m => m.id === matchId ? { ...m, confirmed: false, winnerId: undefined } : m));
    };

    const totalSlots = numGroups * playersPerGroup;
    const totalAssigned = assignedIds.length;
    const allFull = groups.length > 0 && groups.every((g) => g.players.length >= playersPerGroup);

    // Bracket helpers
    const totalRoundsInBracket = bracket.length > 0 ? Math.max(...bracket.map(m => m.round)) + 1 : 0;
    const roundsArr = Array.from({ length: totalRoundsInBracket }, (_, i) => totalRoundsInBracket - 1 - i);
    const roundLabel = (r: number) => {
        if (r === 0) return "Final 🏆";
        if (r === 1) return "Semifinal";
        if (r === 2) return "Cuartos";
        if (r === 3) return "Octavos";
        return `Ronda ${totalRoundsInBracket - r}`;
    };
    const champion = bracket.find(m => m.round === 0 && m.confirmed && m.winnerId);
    const championPlayer = champion ? [...groups.flatMap(g => g.players)].find(p => p.id === champion.winnerId) : null;
    const slotName = (t: BracketSlot) => t === null ? "Por definir" : t === "BYE" ? "BYE" : (t as Player).name;

    // ── Finalize ──────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // NOTE: tournamentId comes from props (passed by the server page component)
    // const TOURNAMENT_ID = tournamentId; // alias for clarity

    const handleFinalize = async () => {
        setSaving(true);
        setSaveError(null);
        const result = await saveTournamentFixture({
            tournamentId: tournamentId,
            phase: "finalizado",
            groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
            matches,
            bracket,
            championName: championPlayer?.name,
        });
        setSaving(false);
        if (result.ok) {
            setSaved(true);
        } else {
            setSaveError(result.error ?? "Error desconocido");
        }
    };

    return (
        <FeedLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <Link href="/tournaments" className={styles.backLink}>← Torneos</Link>
                    <div className={styles.titleRow}>
                        <div>
                            <h1 className={styles.title}>Armar Fixture</h1>
                            <p className={styles.subtitle}>📋 {tournamentName} · Configurá los grupos</p>
                        </div>
                        {step === "assign" && (
                            <button
                                className={styles.randomBtn}
                                onClick={handleRandomize}
                                disabled={randomizing}
                            >
                                {randomizing ? "⏳ Organizando..." : "🎲 Organizar Random"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Step indicator */}
                <div className={styles.stepBar}>
                    {(["checkin", "config", "assign", "done"] as Step[]).map((s, i) => {
                        const labels = ["Check-in", "Configurar", "Asignar", "Listo"];
                        const allSteps = ["checkin", "config", "assign", "done"];
                        const idx = allSteps.indexOf(step);
                        return (
                            <div key={s} className={styles.stepBarItem}>
                                <div className={`${styles.stepDot} ${i < idx ? styles.stepDone : ""} ${s === step ? styles.stepActive : ""}`}>
                                    {i < idx ? "✓" : i + 1}
                                </div>
                                <span className={`${styles.stepLabel} ${s === step ? styles.stepLabelActive : ""}`}>{labels[i]}</span>
                                {i < 3 && <div className={`${styles.stepLine} ${i < idx ? styles.stepLineDone : ""}`} />}
                            </div>
                        );
                    })}
                </div>

                {/* ── STEP 0: Check-in ───────────────────────────────────────── */}
                {step === "checkin" && (
                    <div className={styles.checkinCard}>
                        <h2 className={styles.configTitle}>Check-in de Jugadores</h2>
                        <p className={styles.configSub}>
                            Confirmá el pago y la presencia de cada equipo. Solo los <strong>presentes</strong> participarán del fixture.
                        </p>

                        <div className={styles.checkinTable}>
                            {/* Header */}
                            <div className={styles.checkinHeader}>
                                <span className={styles.checkinName}>Equipo</span>
                                <label className={`${styles.checkinColLabel} ${paidLocked ? styles.colLocked : ""}`}>
                                    <input type="checkbox"
                                        checked={paid.size === MOCK_PLAYERS.length}
                                        onChange={() => toggleAll("paid")}
                                        disabled={paidLocked}
                                    />
                                    Pagó {paidLocked && "🔒"}
                                </label>
                                <label className={`${styles.checkinColLabel} ${presentLocked ? styles.colLocked : ""}`}>
                                    <input type="checkbox"
                                        checked={present.size === MOCK_PLAYERS.length}
                                        onChange={() => toggleAll("present")}
                                        disabled={presentLocked}
                                    />
                                    Presente {presentLocked && "🔒"}
                                </label>
                            </div>

                            {/* Rows */}
                            {MOCK_PLAYERS.map(p => (
                                <div key={p.id} className={`${styles.checkinRow} ${present.has(p.id) ? styles.checkinRowPresent : ""}`}>
                                    <span className={styles.checkinName}>{p.name}</span>
                                    <div className={styles.checkinCheck}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={paid.has(p.id)}
                                            onChange={() => togglePaid(p.id)}
                                            disabled={paidLocked}
                                        />
                                    </div>
                                    <div className={styles.checkinCheck}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={present.has(p.id)}
                                            onChange={() => togglePresent(p.id)}
                                            disabled={presentLocked}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Footer lock row */}
                            <div className={styles.checkinFooter}>
                                <span className={styles.checkinName} />
                                <div className={styles.checkinCheck}>
                                    {!paidLocked ? (
                                        <button className={styles.lockBtn} onClick={() => setPaidLocked(true)} title="Confirmar pagos">
                                            ✓ Confirmar
                                        </button>
                                    ) : (
                                        <button className={styles.unlockBtn} onClick={() => setPaidLocked(false)} title="Editar pagos">
                                            ✎ Editar
                                        </button>
                                    )}
                                </div>
                                <div className={styles.checkinCheck}>
                                    {!presentLocked ? (
                                        <button className={styles.lockBtn} onClick={() => setPresentLocked(true)} title="Confirmar presencia">
                                            ✓ Confirmar
                                        </button>
                                    ) : (
                                        <button className={styles.unlockBtn} onClick={() => setPresentLocked(false)} title="Editar presencia">
                                            ✎ Editar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.checkinSummary}>
                            <span>✅ {present.size} presentes</span>
                            <span>💰 {paid.size} pagaron</span>
                            {paid.size < present.size && (
                                <span className={styles.checkinWarning}>⚠️ {present.size - paid.size} presentes sin pago confirmado</span>
                            )}
                        </div>

                        <div className={styles.actionBar}>
                            <button
                                className={styles.btnPrimary}
                                disabled={present.size === 0}
                                onClick={() => setStep("config")}
                            >
                                {present.size === 0 ? "Marcá al menos 1 presente" : `Continuar con ${present.size} jugadores →`}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 1: Configurar ─────────────────────────────────── */}
                {step === "config" && (
                    <div className={styles.configCard}>
                        <h2 className={styles.configTitle}>Configuración de Grupos</h2>
                        <p className={styles.configSub}>
                            Hay <strong>{MOCK_PLAYERS.length}</strong> equipos inscriptos.
                            Definí cómo querés armar los grupos.
                        </p>

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
                            <div className={styles.summaryPill}>
                                <span>📦 Total slots</span>
                                <strong>{totalSlots}</strong>
                            </div>
                            <div className={styles.summaryPill}>
                                <span>👥 Inscriptos</span>
                                <strong>{MOCK_PLAYERS.length}</strong>
                            </div>
                            <div className={`${styles.summaryPill} ${totalSlots < MOCK_PLAYERS.length ? styles.pillWarn : totalSlots === MOCK_PLAYERS.length ? styles.pillOk : styles.pillInfo}`}>
                                <span>{totalSlots < MOCK_PLAYERS.length ? "⚠️ Faltan slots" : totalSlots === MOCK_PLAYERS.length ? "✓ Exacto" : `ℹ️ Sobran ${totalSlots - MOCK_PLAYERS.length} slots`}</span>
                            </div>
                        </div>

                        <button className={styles.btnPrimary} onClick={handleStart}>
                            Crear Grupos →
                        </button>
                    </div>
                )}

                {/* ── STEP 2: Asignar ────────────────────────────────────── */}
                {step === "assign" && (
                    <div>
                        {/* Unassigned pool */}
                        <div className={styles.poolSection}>
                            <div className={styles.poolHeader}>
                                <span className={styles.poolTitle}>Sin asignar ({unassigned.length})</span>
                                <span className={styles.poolSub}>Asignados: {totalAssigned} · Restantes: {unassigned.length}</span>
                            </div>
                            <div className={styles.playerPool}>
                                {unassigned.length === 0 ? (
                                    <div className={styles.poolEmpty}>🎉 Todos los equipos están asignados</div>
                                ) : (
                                    unassigned.map((p) => (
                                        <PlayerChip key={p.id} player={p} inGroup={false} />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Groups grid */}
                        <div className={styles.groupsGrid}>
                            {groups.map((g) => (
                                <GroupCard
                                    key={g.id}
                                    group={g}
                                    maxPlayers={playersPerGroup}
                                    availablePlayers={unassigned}
                                    onAddPlayer={handleAddPlayer}
                                    onRemovePlayer={handleRemovePlayer}
                                    onAddGuest={handleAddGuest}
                                />
                            ))}
                        </div>

                        <div className={styles.actionBar}>
                            <button className={styles.btnSecondary} onClick={() => { setGroups([]); setStep("config"); }}>
                                ← Reconfigurar
                            </button>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                                <input
                                    type="url"
                                    placeholder="📺 Link YouTube (opcional)"
                                    value={ytUrl}
                                    onChange={e => setYtUrl(e.target.value)}
                                    style={{ flex: 1, padding: "0.45rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--surface-border)", background: "var(--surface)", color: "var(--foreground)", fontSize: "0.85rem" }}
                                />
                            </div>
                            <button
                                className={styles.btnPrimary}
                                disabled={!allFull || saving}
                                onClick={handleConfirmGroups}
                            >
                                {saving ? "⏳ Iniciando..." : allFull ? "Confirmar Grupos ✓" : `Faltan ${groups.reduce((acc, g) => acc + (playersPerGroup - g.players.length), 0)} jugadores`}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Done ───────────────────────────────────────── */}
                {step === "done" && (
                    <div>
                        <div className={styles.doneHeader}>
                            <div className={styles.doneIcon}>✅</div>
                            <h2 className={styles.doneTitle}>Grupos confirmados</h2>
                            <p className={styles.doneSub}>Los grupos están listos. Podés generar el bracket de eliminación directa desde acá.</p>
                        </div>

                        <div className={styles.groupsGrid}>
                            {groups.map((g) => {
                                const standings = computeStandings(g.id);
                                const groupMatches = matches.filter(m => m.groupId === g.id);

                                return (
                                    <div key={g.id} className={styles.groupCard}>
                                        <div className={styles.groupHeader}>
                                            <span className={styles.groupName}>{g.name}</span>
                                        </div>

                                        <div className={styles.standingsTable}>
                                            <div className={styles.standingsHeader}>
                                                <span>Pos</span>
                                                <span style={{ flex: 1 }}>Equipo</span>
                                                <span title="Partidos Jugados">PJ</span>
                                                <span title="Diferencia">Pts</span>
                                            </div>
                                            {standings.map((s, i) => (
                                                <div key={s.playerId} className={styles.standingsRow}>
                                                    <span className={styles.standingsPos}>{i + 1}</span>
                                                    <span className={styles.standingsName}>
                                                        {s.player.name}
                                                        {s.h2hNote && (
                                                            <span className={styles.h2hBadge} title={s.h2hNote}>H2H</span>
                                                        )}
                                                    </span>
                                                    <span className={styles.standingsVal}>{s.matchesPlayed}</span>
                                                    <span className={styles.standingsPts}>{s.points > 0 ? `+${s.points}` : s.points}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.matchesList}>
                                            <div className={styles.matchesTitle}>Partidos</div>
                                            {groupMatches.map(m => (
                                                <div key={m.id} className={`${styles.matchRow} ${m.confirmed ? styles.matchConfirmed : ""}`}>
                                                    <div className={styles.matchTeam}>
                                                        <span>{m.team1.name}</span>
                                                    </div>

                                                    {!m.confirmed ? (
                                                        <div className={styles.matchScoreInputs}>
                                                            <input
                                                                type="number"
                                                                className={styles.scoreInput}
                                                                value={m.score1 ?? ""}
                                                                onChange={(e) => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                            />
                                                            <span>-</span>
                                                            <input
                                                                type="number"
                                                                className={styles.scoreInput}
                                                                value={m.score2 ?? ""}
                                                                onChange={(e) => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                            />
                                                            {m.played && (
                                                                <button className={styles.matchConfirmBtn} onClick={() => handleConfirmScore(m.id)} title="Confirmar resultado">
                                                                    ✓
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={styles.matchScoreConfirmed}>
                                                            <span className={styles.confirmedScoreVal}>{m.score1}</span>
                                                            <span style={{ color: "var(--text-muted)" }}>-</span>
                                                            <span className={styles.confirmedScoreVal}>{m.score2}</span>
                                                            <button className={styles.matchEditBtn} onClick={() => handleEditScore(m.id)} title="Editar resultado">
                                                                ✎
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className={styles.matchTeam}>
                                                        <span>{m.team2.name}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.actionBar}>
                            <button className={styles.btnSecondary} onClick={() => setStep("assign")}>
                                ← Editar grupos
                            </button>
                            <div className={styles.qualPicker}>
                                <span className={styles.configLabel}>Clasifican por grupo:</span>
                                <button className={styles.counterBtn} onClick={() => setQualPerGroup(q => Math.max(1, q - 1))}>−</button>
                                <span className={styles.counterVal}>{qualPerGroup}</span>
                                <button className={styles.counterBtn} onClick={() => setQualPerGroup(q => Math.min(playersPerGroup, q + 1))}>+</button>
                            </div>
                            <button className={styles.btnPrimary} onClick={generateBracket}>
                                🏆 Generar Bracket de Eliminación
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Eliminatorias ───────────────────────────────── */}
                {step === "elim" && (
                    <div>
                        <div className={styles.doneHeader}>
                            {championPlayer ? (
                                <>
                                    <div className={styles.doneIcon}>🏆</div>
                                    <h2 className={styles.doneTitle}>¡Campeón: {championPlayer.name}!</h2>
                                    <p className={styles.doneSub}>El torneo ha finalizado.</p>
                                </>
                            ) : (
                                <>
                                    <h2 className={styles.doneTitle}>Bracket de Eliminatorias</h2>
                                    <p className={styles.doneSub}>Ingresá los resultados de cada partido para avanzar al siguiente round.</p>
                                </>
                            )}
                        </div>

                        <div className={styles.bracketContainer}>
                            {roundsArr.map(r => {
                                const roundMatches = bracket.filter(m => m.round === r).sort((a, b) => a.slot - b.slot);
                                return (
                                    <div key={r} className={styles.bracketRound}>
                                        <div className={styles.bracketRoundLabel}>{roundLabel(r)}</div>
                                        <div className={styles.bracketMatches}>
                                            {roundMatches.map(m => {
                                                const isBye = m.team1 === "BYE" || m.team2 === "BYE";
                                                const isPending = m.team1 === null || m.team2 === null;
                                                const canInput = !m.confirmed && !isBye && !isPending;
                                                const winner = m.winnerId ? [...groups.flatMap(g => g.players)].find(p => p.id === m.winnerId) : null;

                                                return (
                                                    <div key={m.id} className={`${styles.bracketMatch} ${m.confirmed ? styles.bracketMatchDone : ""} ${isPending ? styles.bracketMatchPending : ""}`}>
                                                        <div className={`${styles.bracketTeam} ${m.winnerId && m.team1 && m.team1 !== "BYE" && (m.team1 as Player).id === m.winnerId ? styles.bracketWinner : ""}`}>
                                                            {slotName(m.team1)}
                                                        </div>
                                                        <div className={styles.bracketVs}>
                                                            {m.confirmed ? (
                                                                <span className={styles.bracketScore}>{m.score1} - {m.score2}</span>
                                                            ) : canInput ? (
                                                                <div className={styles.bracketInputs}>
                                                                    <input type="number" className={styles.scoreInput}
                                                                        value={m.score1 ?? ""}
                                                                        onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                    />
                                                                    <span>-</span>
                                                                    <input type="number" className={styles.scoreInput}
                                                                        value={m.score2 ?? ""}
                                                                        onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                    />
                                                                    {m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2 && (
                                                                        <button className={styles.matchConfirmBtn} onClick={() => handleBracketConfirm(m.id)}>✓</button>
                                                                    )}
                                                                </div>
                                                            ) : isPending ? (
                                                                <span className={styles.bracketPendingLabel}>En espera</span>
                                                            ) : isBye ? (
                                                                <span className={styles.bracketByeLabel}>BYE</span>
                                                            ) : null}
                                                        </div>
                                                        <div className={`${styles.bracketTeam} ${m.winnerId && m.team2 && m.team2 !== "BYE" && (m.team2 as Player).id === m.winnerId ? styles.bracketWinner : ""}`}>
                                                            {slotName(m.team2)}
                                                        </div>
                                                        {m.confirmed && !isBye && (
                                                            <button className={styles.matchEditBtn} onClick={() => handleBracketEdit(m.id)} title="Editar">✎</button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.actionBar}>
                            <button className={styles.btnSecondary} onClick={() => setStep("done")} disabled={saving}>
                                ← Volver a grupos
                            </button>

                            {saved ? (
                                <div className={styles.savedBanner}>
                                    ✅ Torneo finalizado y guardado correctamente
                                </div>
                            ) : (
                                <button
                                    className={styles.btnPrimary}
                                    onClick={handleFinalize}
                                    disabled={saving || !championPlayer}
                                    title={!championPlayer ? "Completá todos los partidos primero" : ""}
                                >
                                    {saving ? "⏳ Guardando..." : "🏆 Finalizar Torneo"}
                                </button>
                            )}

                            {saveError && (
                                <span className={styles.saveError}>⚠️ {saveError}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </FeedLayout>
    );
}
