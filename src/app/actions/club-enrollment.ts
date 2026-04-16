"use server";

import { db } from "@/db";
import { users, registrations, clubs, tournaments } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function getMyClubMembers() {
    try {
        const session = await getSession();
        if (!session || !session.userId) throw new Error("No autorizado");

        // Find the club owned by this user
        const club = await db.query.clubs.findFirst({
            where: eq(clubs.ownerId, session.userId)
        });

        if (!club) return [];

        // Find all users who belong to this club
        const members = await db.select({
            id: users.id,
            name: users.firstName, // simplified for mapping
            lastName: users.lastName,
            email: users.email,
            category: users.category,
            gender: users.gender,
            imageUrl: users.imageUrl,
        }).from(users).where(eq(users.clubId, club.id));

        return members.map(u => ({
            ...u,
            displayName: [u.name, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0]
        }));
    } catch (err) {
        console.error("[getMyClubMembers]", err);
        return [];
    }
}

export type ClubMassInscribeInput = {
    tournamentId: string;
    registrations: {
        userId: string;
        partnerUserId?: string;
        category: string;
    }[];
};

export async function clubMassInscribe(input: ClubMassInscribeInput) {
    try {
        const session = await getSession();
        if (!session || !session.userId) throw new Error("No autorizado");

        const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, input.tournamentId)).limit(1);
        if (!tournament) throw new Error("Torneo no encontrado");

        // 1. Validate if user is truly club role (already checked in getSession override but dbRole is safer)
        if (session.dbRole !== "club" && session.dbRole !== "superadmin") {
             throw new Error("No tenés permisos de club para esta acción");
        }

        // 2. Validate membership if tournament isMembersOnly
        if (tournament.isMembersOnly) {
            const ownerClub = await db.query.clubs.findFirst({
                where: eq(clubs.ownerId, session.userId)
            });
            if (!ownerClub || (tournament.clubId && ownerClub.id !== tournament.clubId)) {
                 throw new Error("Este torneo es exclusivo para miembros del club organizador");
            }
        }

        // 2. Insert registrations in batch
        const values = input.registrations.map(r => ({
            id: crypto.randomUUID(),
            tournamentId: input.tournamentId,
            userId: r.userId,
            partnerUserId: r.partnerUserId || null,
            category: r.category,
            status: "confirmed" as const
        }));

        if (values.length > 0) {
            await db.insert(registrations).values(values);
        }

        revalidatePath(`/tournaments/${input.tournamentId}`);
        revalidatePath("/tournaments");

        return { ok: true, count: values.length };
    } catch (err: any) {
        console.error("[clubMassInscribe]", err);
        return { ok: false, error: err.message || "Error al inscribir" };
    }
}
