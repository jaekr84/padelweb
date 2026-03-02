import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import FeedLayout from "@/app/feed/layout";
import LiveRefresher from "./LiveRefresher";
import styles from "./live.module.css";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string | null): string | null {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/,
        /youtube\.com\/embed\/([\w-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

function getStatusLabel(status: string) {
    switch (status) {
        case "en_curso": return "🔴 En Vivo – Fase de Grupos";
        case "en_eliminatorias": return "🔴 En Vivo – Eliminatorias";
        case "finalizado": return "🏆 Finalizado";
        default: return status;
    }
}

type Player = { id: string; name: string; category?: string };
type GroupData = { id: string; name: string; players: Player[] };
type MatchRow = { id: string; team1Name: string; team2Name: string; score1: number | null; score2: number | null; confirmed: boolean };
type BracketRow = { id: string; round: number; slot: number; team1Name: string | null; team2Name: string | null; score1: number | null; score2: number | null; confirmed: boolean; winnerName: string | null };

// ─── Standings computation (server side) ──────────────────────────────────────
function computeStandings(players: Player[], matches: MatchRow[]) {
    const map = new Map<string, { name: string; pts: number; mp: number }>();
    players.forEach(p => map.set(p.name, { name: p.name, pts: 0, mp: 0 }));

    matches.filter(m => m.confirmed).forEach(m => {
        const a = map.get(m.team1Name);
        const b = map.get(m.team2Name);
        if (!a || !b || m.score1 === null || m.score2 === null) return;
        const diff = m.score1 - m.score2;
        a.pts += diff; a.mp += 1;
        b.pts -= diff; b.mp += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.pts - a.pts);
}

function roundLabel(r: number, totalRounds: number) {
    if (r === 0) return "Final 🏆";
    if (r === 1) return "Semifinal";
    if (r === 2) return "Cuartos";
    if (r === 3) return "Octavos";
    return `Ronda ${totalRounds - r}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function TournamentLivePage({ params }: { params: { id: string } }) {
    const [tournamentRow] = await db.select().from(tournaments).where(eq(tournaments.id, params.id)).limit(1);
    if (!tournamentRow) notFound();

    const isLive = tournamentRow.status === "en_curso" || tournamentRow.status === "en_eliminatorias";
    const showGroups = tournamentRow.status === "en_curso" || tournamentRow.status === "en_eliminatorias" || tournamentRow.status === "finalizado";
    const showBracket = tournamentRow.status === "en_eliminatorias" || tournamentRow.status === "finalizado";

    const groups = await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, params.id));
    const groupIds = groups.map(g => g.id);

    // Fetch all group matches at once
    const allGroupMatches: MatchRow[] = groupIds.length > 0
        ? (await db.select().from(groupMatches).where(eq(groupMatches.tournamentId, params.id))).map(m => ({
            id: m.id,
            team1Name: m.team1Name,
            team2Name: m.team2Name,
            score1: m.score1 ?? null,
            score2: m.score2 ?? null,
            confirmed: m.confirmed,
        }))
        : [];

    const allBracket: BracketRow[] = showBracket
        ? (await db.select().from(bracketMatches).where(eq(bracketMatches.tournamentId, params.id))).map(m => ({
            id: m.id,
            round: m.round,
            slot: m.slot,
            team1Name: m.team1Name ?? null,
            team2Name: m.team2Name ?? null,
            score1: m.score1 ?? null,
            score2: m.score2 ?? null,
            confirmed: m.confirmed,
            winnerName: m.winnerName ?? null,
        }))
        : [];

    const ytId = extractYouTubeId(tournamentRow.youtubeUrl);
    const totalRounds = allBracket.length > 0 ? Math.max(...allBracket.map(m => m.round)) + 1 : 0;
    const championMatch = allBracket.find(m => m.round === 0 && m.confirmed && m.winnerName);

    return (
        <FeedLayout>
            <div className={styles.page}>

                {/* ── Header ── */}
                <div className={styles.header}>
                    <Link href="/tournaments" className={styles.backLink}>← Torneos</Link>
                    <div className={styles.headerContent}>
                        <div className={styles.statusPill}>
                            {isLive && <span className={styles.liveDot} />}
                            {getStatusLabel(tournamentRow.status)}
                        </div>
                        <h1 className={styles.title}>{tournamentRow.name}</h1>
                        {tournamentRow.startDate && (
                            <p className={styles.subtitle}>📅 {tournamentRow.startDate}{tournamentRow.endDate && tournamentRow.endDate !== tournamentRow.startDate ? ` → ${tournamentRow.endDate}` : ""}</p>
                        )}
                    </div>
                </div>

                {/* ── Champion Banner ── */}
                {championMatch && (
                    <div className={styles.championBanner}>
                        <span className={styles.championTrophy}>🏆</span>
                        <div>
                            <div className={styles.championLabel}>Campeón del Torneo</div>
                            <div className={styles.championName}>{championMatch.winnerName}</div>
                        </div>
                    </div>
                )}

                {/* ── YouTube Stream ── */}
                {ytId && (
                    <div className={styles.streamSection}>
                        <div className={styles.streamHeader}>
                            {isLive && <span className={styles.livePill}>▶ EN VIVO</span>}
                            <span className={styles.streamTitle}>Transmisión YouTube</span>
                            <a
                                href={`https://www.youtube.com/watch?v=${ytId}`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.ytExternalLink}
                            >
                                Abrir en YouTube ↗
                            </a>
                        </div>
                        <div className={styles.iframeWrapper}>
                            <iframe
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                                title="Transmisión en Vivo"
                            />
                        </div>
                    </div>
                )}

                {tournamentRow.youtubeUrl && !ytId && (
                    <div className={styles.ytLinkOnly}>
                        <span>📺</span>
                        <a href={tournamentRow.youtubeUrl} target="_blank" rel="noreferrer" className={styles.ytExternalLink}>
                            Ver transmisión en YouTube ↗
                        </a>
                    </div>
                )}

                {/* ── No Stream placeholder ── */}
                {!tournamentRow.youtubeUrl && isLive && (
                    <div className={styles.noStreamPlaceholder}>
                        <span style={{ fontSize: "2rem" }}>📡</span>
                        <p>Sin transmisión de video por el momento</p>
                    </div>
                )}

                {/* ── Fixture: Fase de Grupos ── */}
                {showGroups && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>📋 Fase de Grupos</h2>
                        </div>

                        {groups.length === 0 ? (
                            <p className={styles.emptyState}>Fixture de grupos aún no generado.</p>
                        ) : (
                            <div className={styles.groupsGrid}>
                                {groups.map(g => {
                                    const players = (g.players as Player[]) ?? [];
                                    const gMatches = allGroupMatches.filter(m => {
                                        const playerNames = players.map(p => p.name);
                                        return playerNames.includes(m.team1Name) && playerNames.includes(m.team2Name);
                                    });
                                    const standings = computeStandings(players, gMatches);

                                    return (
                                        <div key={g.id} className={styles.groupCard}>
                                            <div className={styles.groupHeader}>{g.name}</div>

                                            {/* Standings */}
                                            <div className={styles.standingsTable}>
                                                <div className={`${styles.standingsRow} ${styles.standingsHead}`}>
                                                    <span className={styles.standingsPos}>Pos</span>
                                                    <span className={styles.standingsName}>Equipo</span>
                                                    <span className={styles.standingsNum} title="Partidos jugados">PJ</span>
                                                    <span className={styles.standingsNum} title="Diferencia de sets">Pts</span>
                                                </div>
                                                {standings.map((s, i) => (
                                                    <div key={s.name} className={`${styles.standingsRow} ${i < 2 ? styles.standingsQual : ""}`}>
                                                        <span className={`${styles.standingsPos} ${i < 2 ? styles.standingsPosQual : ""}`}>{i + 1}</span>
                                                        <span className={styles.standingsName}>{s.name}</span>
                                                        <span className={styles.standingsNum}>{s.mp}</span>
                                                        <span className={`${styles.standingsNum} ${styles.standingsPts}`}>
                                                            {s.pts > 0 ? `+${s.pts}` : s.pts}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Matches — read only, show scores when available */}
                                            <div className={styles.matchesList}>
                                                <div className={styles.matchesListTitle}>Partidos</div>
                                                {gMatches.length === 0 && <div className={styles.emptyState}>Sin partidos</div>}
                                                {gMatches.map(m => {
                                                    const hasScore = m.score1 !== null && m.score2 !== null;
                                                    return (
                                                        <div key={m.id} className={`${styles.matchRow} ${m.confirmed ? styles.matchConfirmed : hasScore ? styles.matchProvisional : ""}`}>
                                                            <span className={styles.matchTeam}>{m.team1Name}</span>
                                                            <span className={styles.matchScore}>
                                                                {hasScore
                                                                    ? `${m.score1} – ${m.score2}`
                                                                    : "vs"}
                                                            </span>
                                                            <span className={`${styles.matchTeam} ${styles.matchTeamRight}`}>{m.team2Name}</span>
                                                            {m.confirmed && <span className={styles.matchBadgeOk}>✓</span>}
                                                            {!m.confirmed && hasScore && <span className={styles.matchBadgePending}>●</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Progress bar */}
                                            <div className={styles.groupProgress}>
                                                <div className={styles.groupProgressBar}
                                                    style={{ width: `${gMatches.length === 0 ? 0 : Math.round((gMatches.filter(m => m.confirmed).length / gMatches.length) * 100)}%` }}
                                                />
                                                <span className={styles.groupProgressLabel}>
                                                    {gMatches.filter(m => m.confirmed).length}/{gMatches.length} partidos confirmados
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* ── Fixture: Eliminatorias ── */}
                {showBracket && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>🏆 Eliminatorias</h2>
                        </div>

                        {allBracket.length === 0 ? (
                            <p className={styles.emptyState}>Bracket de eliminatorias aún no generado.</p>
                        ) : (
                            <div className={styles.bracketScroll}>
                                <div className={styles.bracket}>
                                    {Array.from({ length: totalRounds }, (_, i) => totalRounds - 1 - i).map(round => {
                                        const roundMatches = allBracket
                                            .filter(m => m.round === round)
                                            .sort((a, b) => a.slot - b.slot);
                                        return (
                                            <div key={round} className={styles.bracketRound}>
                                                <div className={styles.bracketRoundLabel}>{roundLabel(round, totalRounds)}</div>
                                                {roundMatches.map(m => {
                                                    const isBye = m.team1Name === "BYE" || m.team2Name === "BYE";
                                                    return (
                                                        <div key={m.id} className={`${styles.bracketMatch} ${m.confirmed ? styles.bracketMatchDone : ""} ${isBye ? styles.bracketBye : ""}`}>
                                                            <div className={`${styles.bracketTeam} ${m.confirmed && m.winnerName === m.team1Name ? styles.winner : ""}`}>
                                                                <span>{m.team1Name ?? "Por definir"}</span>
                                                                {m.confirmed && <span className={styles.bracketScore}>{m.score1}</span>}
                                                            </div>
                                                            <div className={styles.bracketDivider} />
                                                            <div className={`${styles.bracketTeam} ${m.confirmed && m.winnerName === m.team2Name ? styles.winner : ""}`}>
                                                                <span>{m.team2Name ?? "Por definir"}</span>
                                                                {m.confirmed && <span className={styles.bracketScore}>{m.score2}</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Empty state for tournaments not yet started */}
                {!showGroups && !isLive && (
                    <div className={styles.notStartedState}>
                        <span style={{ fontSize: "3rem" }}>⏳</span>
                        <h3>El torneo aún no ha comenzado</h3>
                        <p>El fixture estará disponible una vez que el club inicie el torneo.</p>
                        <Link href="/tournaments" className={styles.backLink}>← Volver a torneos</Link>
                    </div>
                )}

                {/* Refresh footer — always visible */}
                <LiveRefresher />

            </div>
        </FeedLayout>
    );
}
