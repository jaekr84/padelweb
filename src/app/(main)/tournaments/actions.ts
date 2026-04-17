"use server";

import { db } from "@/db";
import { registrations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getTournamentParticipants(tournamentId: string) {
    try {
        const participants = await db
            .select({
                id: registrations.id,
                userId: registrations.userId,
                partnerName: registrations.partnerName,
                partnerUserId: registrations.partnerUserId,
                category: registrations.category,
                user: {
                    firstName: users.firstName,
                    lastName: users.lastName,
                    imageUrl: users.imageUrl,
                    category: users.category
                }
            })
            .from(registrations)
            .leftJoin(users, eq(registrations.userId, users.id))
            .where(
                and(
                    eq(registrations.tournamentId, tournamentId),
                    eq(registrations.status, "confirmed")
                )
            );

        // Fetch partner user data if they are registered users
        const detailedParticipants = await Promise.all(participants.map(async (p) => {
            let partnerUser = null;
            if (p.partnerUserId) {
                const [pu] = await db
                    .select({
                        firstName: users.firstName,
                        lastName: users.lastName,
                        imageUrl: users.imageUrl,
                        category: users.category
                    })
                    .from(users)
                    .where(eq(users.id, p.partnerUserId))
                    .limit(1);
                partnerUser = pu;
            }
            return {
                ...p,
                partnerUser
            };
        }));

        return detailedParticipants;
    } catch (error) {
        console.error("Error fetching participants:", error);
        return [];
    }
}
