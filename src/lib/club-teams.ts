import { db } from "@/db";
import { registrations, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

/** Equipos confirmados de un club en un torneo (por el club de quien inscribió). */
export async function countClubTeams(
    tournamentId: string,
    clubId: string,
    // Dentro de una transacción se pasa `tx` para contar bajo su lock.
    conn: Pick<typeof db, "select"> = db,
) {
    const [row] = await conn
        .select({ count: sql<number>`count(*)` })
        .from(registrations)
        .innerJoin(users, eq(users.id, registrations.userId))
        .where(and(
            eq(registrations.tournamentId, tournamentId),
            eq(registrations.status, "confirmed"),
            eq(users.clubId, clubId),
        ));
    return Number((row as any)?.count || 0);
}
