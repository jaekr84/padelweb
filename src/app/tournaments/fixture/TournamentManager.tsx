"use client";

import { useState, useCallback, useMemo } from "react";
import styles from "./fixture.module.css";
import { saveTournamentFixture } from "./actions";
import { useRouter } from "next/navigation";

export interface TournamentManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
}

type Player = { id: string; name: string };
type Group = { id: string; name: string; players: Player[] };

type Match = {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    score1?: number;
    score2?: number;
    played: boolean;
    confirmed: boolean;
};

type BracketSlot = Player | "BYE" | null;

type BracketMatch = {
    id: string;
    round: number;
    slot: number;
    team1: BracketSlot;
    team2: BracketSlot;
    score1?: number;
    score2?: number;
    confirmed: boolean;
    winnerId?: string;
};

export default function TournamentManager({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus
}: TournamentManagerProps) {
    const router = useRouter();
    const [groups] = useState<Group[]>(initialGroups);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [bracket, setBracket] = useState<BracketMatch[]>(initialBracket);
    const [step, setStep] = useState<"done" | "elim">(
        (initialStatus === "en_eliminatorias" || initialStatus === "finalizado") ? "elim" : "done"
    );
    const [qualPerGroup, setQualPerGroup] = useState(2);
    const [saving, setSaving] = useState(false);

    // Golden Rule: Detect if all matches are confirmed to enable Eliminatorias
    const isGroupStageFinished = useMemo(() => {
        return matches.length > 0 && matches.every(m => m.confirmed);
    }, [matches]);

    const totalGroupMatches = matches.length;
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const progressPercent = totalGroupMatches > 0
        ? Math.round((confirmedGroupMatches / totalGroupMatches) * 100)
        : 0;

    // ─── Shared Logic ───
    const computeStandings = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupMatches = matches.filter(m => m.groupId === groupId && m.confirmed);

        const standings = group.players.map(p => ({
            playerId: p.id,
            player: p,
            points: 0,
            matchesPlayed: 0,
            h2hNote: "",
        }));

        groupMatches.forEach(m => {
            if (m.score1 === undefined || m.score2 === undefined) return;
            const p1 = standings.find(s => s.playerId === m.team1.id);
            const p2 = standings.find(s => s.playerId === m.team2.id);
            if (p1 && p2) {
                p1.matchesPlayed++;
                p2.matchesPlayed++;
                p1.points += (m.score1 - m.score2);
                p2.points -= (m.score1 - m.score2);
            }
        });

        return standings.sort((a, b) => b.points - a.points);
    };

    const handleScoreChange = (matchId: string, s1: string, s2: string) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            const score1 = s1 === "" ? undefined : parseInt(s1, 10);
            const score2 = s2 === "" ? undefined : parseInt(s2, 10);
            const isPlayed = s1 !== "" && s2 !== "";

            return {
                ...m,
                score1,
                score2,
                played: isPlayed,
                // Optional: Auto-confirm if both are numbers? User asked for auto-save.
                // However, let's keep confirmation as a deliberate action for UX clarity 
                // OR auto-save the DRAFT and show a "Saving..." indicator.
            };
        }));
    };

    const handleConfirmScore = async (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match || match.score1 === undefined || match.score2 === undefined) return;

        const updatedMatches = matches.map(m => {
            if (m.id !== matchId) return m;
            return { ...m, confirmed: true };
        });
        setMatches(updatedMatches);

        setSaving(true);
        try {
            await saveTournamentFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players })),
                matches: updatedMatches,
                bracket: bracket,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleEditScore = (matchId: string) => {
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, confirmed: false } : m));
    };

    const generateBracket = async () => {
        const allQualifiers: { player: Player; seed: number }[] = [];
        groups.forEach(g => {
            const standings = computeStandings(g.id);
            standings.slice(0, qualPerGroup).forEach((s, idx) => {
                allQualifiers.push({ player: s.player, seed: idx + 1 });
            });
        });

        const numParticipants = allQualifiers.length;
        const numRounds = Math.ceil(Math.log2(numParticipants));
        const bracketSize = Math.pow(2, numRounds);

        const newBracket: BracketMatch[] = [];
        for (let r = numRounds - 1; r >= 0; r--) {
            const matchesInRound = Math.pow(2, r);
            for (let s = 0; s < matchesInRound; s++) {
                newBracket.push({
                    id: `b_${r}_${s}`,
                    round: r,
                    slot: s,
                    team1: null,
                    team2: null,
                    confirmed: false,
                });
            }
        }

        const firstRound = numRounds - 1;
        const firstRoundMatches = newBracket.filter(m => m.round === firstRound);
        allQualifiers.forEach((q, idx) => {
            const matchIdx = Math.floor(idx / 2);
            const isTeam2 = idx % 2 === 1;
            const match = firstRoundMatches[matchIdx];
            if (match) {
                if (!isTeam2) match.team1 = q.player;
                else match.team2 = q.player;
            }
        });

        setBracket(newBracket);
        setStep("elim");

        setSaving(true);
        await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: newBracket,
        });
        setSaving(false);
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        setBracket(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            return {
                ...m,
                score1: s1 === "" ? undefined : parseInt(s1, 10),
                score2: s2 === "" ? undefined : parseInt(s2, 10),
            };
        }));
    };

    const advanceBracketWinners = (currentBracket: BracketMatch[], totalRounds: number) => {
        for (let r = totalRounds - 1; r > 0; r--) {
            const roundMatches = currentBracket.filter(m => m.round === r);
            roundMatches.forEach(m => {
                if (m.confirmed && m.winnerId) {
                    const nextRound = r - 1;
                    const nextSlot = Math.floor(m.slot / 2);
                    const isTeam2 = m.slot % 2 === 1;
                    const nextMatch = currentBracket.find(nm => nm.round === nextRound && nm.slot === nextSlot);
                    if (nextMatch) {
                        const winner = [m.team1, m.team2].find(t => t !== null && t !== "BYE" && (t as Player).id === m.winnerId);
                        if (isTeam2) nextMatch.team2 = winner as Player;
                        else nextMatch.team1 = winner as Player;
                    }
                }
            });
        }
    };

    const handleBracketConfirm = async (matchId: string) => {
        let finalBracket: BracketMatch[] = [];
        setBracket(prev => {
            const updated = prev.map(m => {
                if (m.id !== matchId) return m;
                if (m.score1 === undefined || m.score2 === undefined) return m;
                const winnerId = m.score1 > m.score2
                    ? (m.team1 as Player)?.id
                    : (m.team2 as Player)?.id;
                return { ...m, confirmed: true, winnerId };
            });
            const totalRounds = updated.length > 0 ? Math.max(...updated.map(m => m.round)) + 1 : 0;
            advanceBracketWinners(updated, totalRounds);
            finalBracket = [...updated];
            return finalBracket;
        });

        setSaving(true);
        const isFinal = finalBracket.find(m => m.id === matchId)?.round === 0;
        await saveTournamentFixture({
            tournamentId,
            phase: isFinal ? "finalizado" : "eliminatorias",
            groups,
            matches,
            bracket: finalBracket,
        });
        setSaving(false);
    };

    const handleBracketEdit = (matchId: string) => {
        setBracket(prev => prev.map(m => m.id === matchId ? { ...m, confirmed: false } : m));
    };

    const roundsArr = useMemo(() => {
        const rounds = bracket.map(m => m.round);
        return Array.from(new Set(rounds)).sort((a, b) => b - a);
    }, [bracket]);

    const totalRounds = roundsArr.length;

    const slotName = (t: BracketSlot) => {
        if (t === null) return "En espera";
        if (t === "BYE") return "BYE";
        return (t as Player).name;
    };

    const roundLabel = (r: number) => {
        if (r === 0) return "Final 🏆";
        if (r === 1) return "Semifinal";
        if (r === 2) return "Cuartos";
        if (r === 3) return "Octavos";
        return `Ronda ${totalRounds - r}`;
    };

    const championMatch = bracket.find(m => m.round === 0 && m.confirmed);
    const championPlayer = championMatch?.winnerId
        ? [championMatch.team1, championMatch.team2].find(t => t !== null && t !== "BYE" && (t as Player).id === championMatch.winnerId) as Player
        : null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{tournamentName}</h1>
                <div className={styles.statusBadgeGlobal} data-status={initialStatus}>
                    {initialStatus === "finalizado" ? "🏆 Finalizado" :
                        initialStatus === "en_eliminatorias" ? "⚡ Eliminatorias" :
                            "🎾 En Grupos"}
                </div>
            </div>

            <div className={styles.phaseTabs}>
                <button
                    className={`${styles.phaseTab} ${step === "done" ? styles.phaseTabActive : ""}`}
                    onClick={() => setStep("done")}
                >
                    📊 Fase de Grupos
                </button>
                {(isGroupStageFinished || bracket.length > 0 || initialStatus === "finalizado") && (
                    <button
                        className={`${styles.phaseTab} ${step === "elim" ? styles.phaseTabActive : ""}`}
                        onClick={() => setStep("elim")}
                    >
                        ⚡ Eliminatorias
                    </button>
                )}
            </div>

            {step === "done" && (
                <div>
                    <div className={styles.progressContainer}>
                        <div className={styles.progressHeader}>
                            <span>Progreso Fase de Grupos</span>
                            <span>{confirmedGroupMatches} / {totalGroupMatches} partidos</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>

                    <div className={styles.groupsGrid}>
                        {groups.map((g) => {
                            const standings = computeStandings(g.id);
                            const groupMatches = matches.filter(m => m.groupId === g.id);
                            return (
                                <div key={g.id} className={styles.groupCard}>
                                    <div className={styles.groupHeader}><span className={styles.groupName}>{g.name}</span></div>
                                    <div className={styles.standingsTable}>
                                        <div className={styles.standingsHeader}><span>Pos</span><span style={{ flex: 1 }}>Equipo</span><span>PJ</span><span>Pts</span></div>
                                        {standings.map((s, i) => (
                                            <div key={s.playerId} className={styles.standingsRow}>
                                                <span className={styles.standingsPos}>{i + 1}</span>
                                                <span className={styles.standingsName}>{s.player.name}</span>
                                                <span className={styles.standingsVal}>{s.matchesPlayed}</span>
                                                <span className={styles.standingsPts}>{s.points > 0 ? `+${s.points}` : s.points}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.matchesList}>
                                        {groupMatches.map(m => (
                                            <div key={m.id} className={`${styles.matchRow} ${m.confirmed ? styles.matchConfirmed : ""}`}>
                                                <div className={styles.matchTeam}>{m.team1.name}</div>
                                                {!m.confirmed ? (
                                                    <div className={styles.matchScoreInputs}>
                                                        <input type="number" className={styles.scoreInput} value={m.score1 ?? ""} onChange={(e) => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")} />
                                                        <span>-</span>
                                                        <input type="number" className={styles.scoreInput} value={m.score2 ?? ""} onChange={(e) => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)} />
                                                        {m.played && <button className={styles.matchConfirmBtn} onClick={() => handleConfirmScore(m.id)}>✓</button>}
                                                    </div>
                                                ) : (
                                                    <div className={styles.matchScoreConfirmed}>
                                                        <span>{m.score1} - {m.score2}</span>
                                                        <button className={styles.matchEditBtn} onClick={() => handleEditScore(m.id)}>✎</button>
                                                    </div>
                                                )}
                                                <div className={styles.matchTeam}>{m.team2.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className={styles.actionBar}>
                        <div className={styles.qualPicker}>
                            <span>Clasifican por grupo:</span>
                            <button className={styles.counterBtn} onClick={() => setQualPerGroup(q => Math.max(1, q - 1))}>−</button>
                            <span className={styles.counterVal}>{qualPerGroup}</span>
                            <button className={styles.counterBtn} onClick={() => setQualPerGroup(q => Math.min(10, q + 1))}>+</button>
                        </div>
                        <button
                            className={styles.btnPrimary}
                            onClick={generateBracket}
                            disabled={!isGroupStageFinished}
                            title={!isGroupStageFinished ? "Completá todos los partidos para habilitar eliminatorias" : ""}
                        >
                            {isGroupStageFinished ? "Generar Bracket Eliminatorio →" : "Finalizá los grupos para continuar"}
                        </button>
                    </div>
                </div>
            )}

            {step === "elim" && (
                <div className={styles.bracketWrapper}>
                    <div className={styles.bracketContainer}>
                        {roundsArr.map((r, rIdx) => (
                            <div key={r} className={styles.bracketRound}>
                                <div className={styles.bracketRoundLabel}>{roundLabel(r)}</div>
                                <div className={styles.bracketMatches}>
                                    {bracket.filter(m => m.round === r).map(m => {
                                        const isWinner1 = m.confirmed && m.winnerId === (m.team1 as any)?.id;
                                        const isWinner2 = m.confirmed && m.winnerId === (m.team2 as any)?.id;
                                        const isBye = m.team2 === "BYE";

                                        return (
                                            <div key={m.id} className={`${styles.bracketMatch} ${m.confirmed ? styles.bracketMatchDone : ""}`}>
                                                {/* Team 1 */}
                                                <div className={`${styles.bracketSide} ${isWinner1 ? styles.bracketWinner : ""}`}>
                                                    <span className={styles.bracketTeamName}>
                                                        {m.team1 ? slotName(m.team1) : (m.round > 1 ? "Ganador TBD" : "Vacío")}
                                                    </span>
                                                    {m.confirmed && <span className={styles.bracketScoreVal}>{m.score1}</span>}
                                                </div>

                                                {/* Divider / Inputs */}
                                                {!m.confirmed && m.team1 && m.team2 && !isBye ? (
                                                    <div className={styles.bracketMatchAction}>
                                                        <div className={styles.bracketInputsInline}>
                                                            <input
                                                                type="number"
                                                                className={styles.miniScoreInput}
                                                                placeholder="S1"
                                                                value={m.score1 ?? ""}
                                                                onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                            />
                                                            <span className={styles.vsText}>VS</span>
                                                            <input
                                                                type="number"
                                                                className={styles.miniScoreInput}
                                                                placeholder="S2"
                                                                value={m.score2 ?? ""}
                                                                onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                            />
                                                        </div>
                                                        {m.score1 !== undefined && m.score2 !== undefined && (
                                                            <button className={styles.bracketConfirmBtn} onClick={() => handleBracketConfirm(m.id)}>✓</button>
                                                        )}
                                                    </div>
                                                ) : <div className={styles.bracketDivider} />}

                                                {/* Team 2 */}
                                                <div className={`${styles.bracketSide} ${isWinner2 ? styles.bracketWinner : ""}`}>
                                                    <span className={styles.bracketTeamName}>
                                                        {isBye ? "BYE (Pasa)" : m.team2 ? slotName(m.team2) : (m.round > 1 ? "Ganador TBD" : "Vacío")}
                                                    </span>
                                                    {m.confirmed && <span className={styles.bracketScoreVal}>{m.score2}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Champion Section */}
                        {(() => {
                            const finalMatch = bracket.find(m => m.round === 0);
                            if (finalMatch?.confirmed && finalMatch.winnerId) {
                                const allPlayers = groups.flatMap(g => g.players);
                                const champ = allPlayers.find(p => p.id === finalMatch.winnerId);
                                if (champ) {
                                    return (
                                        <div className={styles.championRound}>
                                            <div className={styles.bracketRoundLabel}>🏆 Campeón</div>
                                            <div className={styles.championCard}>
                                                <div className={styles.crown}>👑</div>
                                                <h3 className={styles.championNameText}>{champ.name}</h3>
                                                <p className={styles.championSub}>¡Felicidades Campeón!</p>

                                                {initialStatus !== "finalizado" && (
                                                    <button
                                                        className={styles.finalizeBtn}
                                                        onClick={async () => {
                                                            setSaving(true);
                                                            await saveTournamentFixture({
                                                                tournamentId,
                                                                phase: "finalizado",
                                                                championName: champ.name,
                                                                groups,
                                                                matches,
                                                                bracket,
                                                            });
                                                            setSaving(false);
                                                            // Optionally redirect or show success toast
                                                            alert("¡Torneo finalizado con éxito!");
                                                            router.refresh();
                                                        }}
                                                        disabled={saving}
                                                    >
                                                        {saving ? "Guardando..." : "Finalizar Torneo ✅"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
