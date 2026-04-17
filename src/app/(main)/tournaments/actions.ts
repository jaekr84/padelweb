"use server";

import { db } from "@/db";
import { registrations, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function getTournamentParticipants(tournamentId: string) {
    try {
        // 1. Fetch main participants
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

        if (participants.length === 0) return [];

        // 2. Optimization: Fetch all partner data in ONE query instead of N (solves N+1)
        const partnerUserIds = participants
            .map(p => p.partnerUserId)
            .filter((id): id is string => !!id);

        let partnerUsersMap = new Map();
        if (partnerUserIds.length > 0) {
            const partnerData = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    imageUrl: users.imageUrl,
                    category: users.category
                })
                .from(users)
                .where(inArray(users.id, partnerUserIds));
            
            partnerData.forEach(u => partnerUsersMap.set(u.id, u));
        }

        // 3. Merge results
        return participants.map(p => ({
            ...p,
            partnerUser: p.partnerUserId ? (partnerUsersMap.get(p.partnerUserId) || null) : null
        }));

    } catch (error) {
        console.error("Error fetching participants:", error);
        return [];
    }
}
