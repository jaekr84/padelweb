import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Trophy, LayoutGrid, Timer, Zap, Hourglass, MapPin } from "lucide-react";
import { computeTournamentStats, formatDuration, type TimedMatch } from "@/lib/tournament-stats";

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string }>;
}

/**
 * A dónde vuelve el botón de atrás. `from` lo manda la barra de gestión con la
 * ruta desde la que se entró, así que volver desde la gestión no te tira a la
 * página pública. Se valida que sea una ruta interna de torneos: un `from`
 * armado a mano no puede redirigir a otro sitio.
 */
const backTarget = (id: string, from?: string) => {
    const safe = from
        && from.startsWith(`/tournaments/${id}`)
        && !from.startsWith("//")
        && !from.includes(":");
    if (!safe) return { href: `/tournaments/${id}/resultados`, label: "Resultados" };
    return { href: from!, label: "Gestión" };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const cleanPair = (name: string | null) =>
    (name || "").split(/[\/\+]/).map(n => n.trim()).filter(Boolean).join(" / ") || "—";

const bracketRoundName = (round: number, _totalRounds: number) => {
    // Winners advance from higher rounds to lower ones, so round 0 is the final.
    if (round === 0) return "Final";
    if (round === 1) return "Semifinal";
    if (round === 2) return "Cuartos";
    if (round === 3) return "Octavos";
    return `Ronda ${round + 1}`;
};

export default async function TournamentStatsPage({ params, searchParams }: Props) {
    const { id } = await params;
    const { from } = await searchParams;
    const back = backTarget(id, from);

    const [tournament] = await db
        .select({
            id: tournaments.id,
            name: tournaments.name,
            status: tournaments.status,
            finalizedAt: tournaments.finalizedAt,
        })
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();

    const [dbGroups, dbMatches, dbBracket] = await Promise.all([
        db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, id)),
        db.select().from(groupMatches).where(eq(groupMatches.tournamentId, id)),
        db.select().from(bracketMatches).where(eq(bracketMatches.tournamentId, id)),
    ]);

    const groupNameById = new Map(dbGroups.map(g => [g.id, g.name]));
    const totalBracketRounds = dbBracket.length ? Math.max(...dbBracket.map(b => b.round)) + 1 : 0;

    const timed: TimedMatch[] = [
        ...dbMatches.map(m => ({
            id: m.id,
            label: `${cleanPair(m.team1Name)} vs ${cleanPair(m.team2Name)}`,
            groupId: m.groupId,
            groupName: groupNameById.get(m.groupId) || "Grupo",
            courtNumber: m.courtNumber ?? null,
            startedAt: m.startedAt,
            finishedAt: m.finishedAt,
        })),
        ...dbBracket.map(b => ({
            id: b.id,
            label: `${cleanPair(b.team1Name)} vs ${cleanPair(b.team2Name)}`,
            groupId: null,
            groupName: bracketRoundName(b.round, totalBracketRounds),
            courtNumber: null,
            startedAt: b.startedAt,
            finishedAt: b.finishedAt,
        })),
    ];

    const stats = computeTournamentStats(timed, tournament.finalizedAt);
    const hasData = stats.playedMatches > 0;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                    <Link
                        href={back.href}
                        className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors font-black uppercase tracking-widest text-[9px] bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {back.label}
                    </Link>
                    <div className="text-right">
                        <h1 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter leading-none">{tournament.name}</h1>
                        <p className="text-celeste text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-1">Estadísticas del Torneo</p>
                    </div>
                </div>

                {!hasData ? (
                    <div className="rounded-2xl border border-border/50 bg-card/40 p-10 text-center space-y-2">
                        <Clock className="w-8 h-8 mx-auto text-foreground/20" />
                        <p className="text-sm font-black uppercase italic tracking-tight">Sin datos de tiempo todavía</p>
                        <p className="text-[11px] text-foreground/50 font-bold max-w-md mx-auto">
                            Los tiempos se registran a partir de que los partidos se inician (Comenzar) y se finalizan (FIN).
                            Cuando se jueguen partidos con el nuevo sistema, vas a ver acá las duraciones.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Top KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Kpi icon={<Timer className="w-4 h-4" />} label="Duración total" value={formatDuration(stats.totalMs)} accent="text-celeste" />
                            <Kpi icon={<Trophy className="w-4 h-4" />} label="Partidos jugados" value={`${stats.playedMatches}/${stats.totalMatches}`} accent="text-emerald-400" />
                            <Kpi icon={<Hourglass className="w-4 h-4" />} label="Promedio x partido" value={formatDuration(stats.avgMatchMs)} accent="text-amber-400" />
                            <Kpi icon={<Zap className="w-4 h-4" />} label="Más rápido / largo" value={`${formatDuration(stats.fastest?.durationMs)} / ${formatDuration(stats.longest?.durationMs)}`} accent="text-rojo" small />
                        </div>

                        {/* Per group */}
                        <Section icon={<LayoutGrid className="w-3.5 h-3.5" />} title="Por grupo">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead className="text-foreground/40 border-b border-border/50 uppercase tracking-widest text-[9px] font-black">
                                        <tr>
                                            <th className="px-2 py-1.5">Grupo</th>
                                            <th className="px-2 py-1.5 text-center">Partidos</th>
                                            <th className="px-2 py-1.5 text-center">Duración</th>
                                            <th className="px-2 py-1.5 text-center">Prom. x partido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {stats.groups.map(g => (
                                            <tr key={g.groupId} className="hover:bg-muted/20">
                                                <td className="px-2 py-1.5 font-black uppercase italic">{g.name}</td>
                                                <td className="px-2 py-1.5 text-center font-bold">{g.matchesPlayed}</td>
                                                <td className="px-2 py-1.5 text-center font-black text-celeste">{formatDuration(g.durationMs)}</td>
                                                <td className="px-2 py-1.5 text-center font-bold text-foreground/70">{formatDuration(g.avgMatchMs)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>

                        {/* Per court */}
                        {stats.courts.length > 0 && (
                            <Section icon={<MapPin className="w-3.5 h-3.5" />} title="Uso de canchas">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px]">
                                        <thead className="text-foreground/40 border-b border-border/50 uppercase tracking-widest text-[9px] font-black">
                                            <tr>
                                                <th className="px-2 py-1.5">Cancha</th>
                                                <th className="px-2 py-1.5 text-center">Partidos</th>
                                                <th className="px-2 py-1.5 text-center">Tiempo en juego</th>
                                                <th className="px-2 py-1.5 text-center">Ventana</th>
                                                <th className="px-2 py-1.5 text-center">Ocioso aprox.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {stats.courts.map(c => (
                                                <tr key={c.court} className="hover:bg-muted/20">
                                                    <td className="px-2 py-1.5 font-black uppercase italic">Cancha {c.court}</td>
                                                    <td className="px-2 py-1.5 text-center font-bold">{c.matchesCount}</td>
                                                    <td className="px-2 py-1.5 text-center font-black text-emerald-400">{formatDuration(c.busyMs)}</td>
                                                    <td className="px-2 py-1.5 text-center font-bold text-foreground/70">{formatDuration(c.spanMs)}</td>
                                                    <td className="px-2 py-1.5 text-center font-bold text-amber-400">{formatDuration(c.idleMs)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Section>
                        )}

                        {/* Per match */}
                        <Section icon={<Clock className="w-3.5 h-3.5" />} title="Tiempo por partido">
                            <div className="space-y-1">
                                {stats.matches.map(m => (
                                    <div key={m.id} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg bg-muted/20 border border-border/30">
                                        <div className="min-w-0">
                                            <p className="font-black uppercase italic text-[11px] truncate">{m.label}</p>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-foreground/40">
                                                {m.groupName}{m.court != null ? ` · Cancha ${m.court}` : ""}
                                            </p>
                                        </div>
                                        <span className="shrink-0 font-black text-celeste tabular-nums">{formatDuration(m.durationMs)}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </>
                )}
            </div>
        </div>
    );
}

function Kpi({ icon, label, value, accent, small }: { icon: React.ReactNode; label: string; value: string; accent: string; small?: boolean }) {
    return (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-3 shadow-sm">
            <div className={`flex items-center gap-1.5 ${accent}`}>
                {icon}
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/40">{label}</span>
            </div>
            <p className={`mt-1.5 font-black italic ${small ? "text-sm" : "text-xl md:text-2xl"} ${accent}`}>{value}</p>
        </div>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-foreground/60">
                {icon}
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em]">{title}</h2>
            </div>
            {children}
        </div>
    );
}
