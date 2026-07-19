import { db } from "@/db";
import { users, tournaments, tournamentGroups, groupMatches, bracketMatches } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ResultadosPublicClient from "./ResultadosPublicClient";

interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResultadosPublicPage({ params }: Props) {
    const { id } = await params;

    const [tournament] = await db
        .select({
            id: tournaments.id,
            name: tournaments.name,
            status: tournaments.status,
            type: tournaments.type,
            modalidad: tournaments.modalidad,
            location: tournaments.location,
            startDate: tournaments.startDate,
            imageUrl: tournaments.imageUrl,
            presentPlayerIds: tournaments.presentPlayerIds,
        })
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();

    const dbGroups = await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, id));
    const dbMatches = await db.select().from(groupMatches).where(eq(groupMatches.tournamentId, id));
    const dbBracket = await db.select().from(bracketMatches).where(eq(bracketMatches.tournamentId, id));

    const parsePlayers = (data: any) => {
        if (!data) return [];
        if (typeof data === "string") {
            try { return JSON.parse(data); } catch { return []; }
        }
        return Array.isArray(data) ? data : [];
    };

    const rawGroups = dbGroups.map(g => ({
        id: g.id,
        name: g.name,
        courtNumber: (g as any).courtNumber ?? null,
        players: parsePlayers(g.players) as any[],
    }));

    const allPlayerIds = [...new Set(rawGroups.flatMap(g =>
        g.players.flatMap((p: any) => [p.userId, p.partnerUserId, p.id].filter(Boolean))
    ))];

    const dbUsers = allPlayerIds.length > 0
        ? await db.select({ id: users.id, imageUrl: users.imageUrl }).from(users).where(inArray(users.id, allPlayerIds as string[]))
        : [];

    const userImageMap = new Map(dbUsers.map(u => [u.id, u.imageUrl]));

    const initialGroups = rawGroups.map(g => ({
        ...g,
        players: g.players.map((p: any) => ({
            ...p,
            image: p.image || userImageMap.get(p.userId || p.id) || null,
            partnerImage: p.partnerImage || (p.partnerUserId ? userImageMap.get(p.partnerUserId) : null) || null,
        })),
    }));

    const allPlayersInGroups = initialGroups.flatMap(g => g.players);

    const getPlayerByIdOrName = (pid: string | null, name: string) => {
        const isUUID = (str: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        if (pid) {
            const found = allPlayersInGroups.find((p: any) => p.id === pid);
            if (found) return found;
        }
        if (isUUID(name)) {
            const found = allPlayersInGroups.find((p: any) => p.id === name);
            if (found) return found;
        }
        const found = allPlayersInGroups.find((p: any) => p.name === name);
        if (found) return found;
        return { id: pid || name, name: isUUID(name) ? "Jugador" : name };
    };

    const initialMatches = dbMatches.map(m => ({
        id: m.id,
        groupId: m.groupId,
        team1: getPlayerByIdOrName(m.team1Id ?? null, m.team1Name),
        team2: getPlayerByIdOrName(m.team2Id ?? null, m.team2Name),
        score1: m.score1 ?? 0,
        score2: m.score2 ?? 0,
        played: m.confirmed,
        confirmed: m.confirmed,
        status: m.status || (m.confirmed ? "finished" : "pending"),
        roundIndex: m.roundIndex ?? undefined,
        courtNumber: m.courtNumber ?? undefined,
    }));

    const initialBracket = dbBracket.map(bm => ({
        id: bm.id,
        round: bm.round,
        slot: bm.slot,
        team1: (bm.team1Name === "BYE" ? "BYE" : bm.team1Name ? getPlayerByIdOrName(bm.team1Id ?? null, bm.team1Name) : null) as any,
        team2: (bm.team2Name === "BYE" ? "BYE" : bm.team2Name ? getPlayerByIdOrName(bm.team2Id ?? null, bm.team2Name) : null) as any,
        score1: bm.score1 ?? 0,
        score2: bm.score2 ?? 0,
        confirmed: bm.confirmed,
        status: bm.status || (bm.confirmed ? "completed" : "pending"),
        winnerId: bm.winnerId ?? undefined,
        winnerName: bm.winnerName ?? undefined,
    }));

    let parsedModalidad: any = tournament.modalidad;
    try {
        if (typeof tournament.modalidad === "string" && tournament.modalidad.trim().startsWith("{")) {
            parsedModalidad = JSON.parse(tournament.modalidad);
        }
    } catch {}

    const isIndividual = parsedModalidad?.participacion === "individual" || parsedModalidad?.isIndividual || false;
    const isElimPhase = tournament.status === "en_eliminatorias" || tournament.status === "finalizado";

    return (
        <div className="theme-night min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <div className="w-7 h-7 rounded-full border border-azul-primary/30 overflow-hidden relative">
                            <Image src="/img/stickers 1.jpg" alt="Logo" fill className="object-cover" sizes="28px" />
                        </div>
                        <span className="font-black italic tracking-tighter text-xs uppercase hidden sm:block">A.C.A.P.</span>
                    </Link>
                    <h1 className="font-black uppercase italic tracking-tight text-sm text-center truncate max-w-[280px] sm:max-w-none">
                        {tournament.name}
                    </h1>
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href={`/tournaments/${id}/stats`}
                            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-celeste/10 text-celeste border-celeste/20 hover:bg-celeste hover:text-white transition-all"
                        >
                            Estadísticas
                        </Link>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            tournament.status === "finalizado"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : tournament.status === "en_eliminatorias"
                                    ? "bg-rojo/10 text-rojo border-rojo/20"
                                    : "bg-azul-primary/10 text-azul-primary border-azul-primary/20"
                        }`}>
                            {tournament.status === "finalizado" ? "Finalizado" :
                             tournament.status === "en_eliminatorias" ? "En Playoffs" :
                             tournament.status === "en_grupos" ? "En Grupos" : "En Curso"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <ResultadosPublicClient
                    tournamentId={id}
                    tournamentStatus={tournament.status}
                    initialGroups={initialGroups}
                    initialMatches={initialMatches}
                    initialBracket={initialBracket}
                    isIndividual={isIndividual}
                    isElimPhase={isElimPhase}
                />
            </div>
        </div>
    );
}
