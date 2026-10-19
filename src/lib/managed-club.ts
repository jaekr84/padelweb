import { db } from "@/db";
import { clubs, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/** ¿El string de roles (`"jugador,club"`) incluye este rol? */
export const hasRole = (roles: string | null | undefined, role: string) =>
    (roles || "").split(",").map(r => r.trim().toLowerCase()).includes(role);

/**
 * El club que gestiona una cuenta con rol club.
 *
 * Primero el club del que es dueño, y recién si no tiene uno, el de
 * `users.clubId` (personal de un club ajeno). El orden importa: `clubId` es la
 * membresía como jugador, y un responsable que se registró con el link de otro
 * club la tiene apuntando a ese otro club. Mirarla primero hacía que viera y
 * creara torneos en el club equivocado.
 */
export async function getManagedClubId(userId: string): Promise<string | null> {
    const [owned] = await db
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.ownerId, userId))
        .limit(1);
    if (owned) return owned.id;

    const [user] = await db
        .select({ clubId: users.clubId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    return user?.clubId ?? null;
}

/**
 * Id para un club nuevo. Por convención es el id de su dueño, pero desde que
 * un club puede cambiar de responsable ese id puede estar tomado por el club
 * que esa persona tuvo antes (el club conserva su id al transferirse). En ese
 * caso va un uuid: nada en la app asume que `club.id === ownerId`.
 */
export async function freeClubId(conn: Pick<typeof db, "select">, userId: string): Promise<string> {
    const [taken] = await conn
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.id, userId))
        .limit(1);
    return taken ? crypto.randomUUID() : userId;
}
