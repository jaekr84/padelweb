"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, or, like } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

export async function searchPlayersAction(query: string) {
    const session = await getSession();
    if (!session) throw new Error("No autorizado");

    if (!query || query.length < 3) return [];

    return await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        documentNumber: users.documentNumber,
        imageUrl: users.imageUrl,
        clubId: users.clubId
    })
    .from(users)
    .where(
        and(
            eq(users.role, "jugador"),
            or(
                like(users.email, `%${query}%`),
                like(users.firstName, `%${query}%`),
                like(users.lastName, `%${query}%`),
                eq(users.documentNumber, query)
            )
        )
    )
    .limit(10);
}
