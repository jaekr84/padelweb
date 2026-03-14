
import RankingClient from "./RankingClient";
import { db } from "@/db";
import { users, registrations, categoriesTable } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";

export default async function RankingPage() {
    // 1. Fetch all users that are players (exclude clubs/centers)
    const allUsers = await db.select()
        .from(users)
        .where(eq(users.role, "jugador"));

    // 2. Fetch all tournament registrations to count tournaments played per player
    const allRegistrations = await db.select().from(registrations).where(eq(registrations.status, "confirmed"));

    // 3. Fetch custom categories
    const customCategories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    // 3. Map registrations to tournament counts
    const tournamentCounts: Record<string, number> = {};
    for (const reg of allRegistrations) {
        if (!tournamentCounts[reg.userId]) {
            tournamentCounts[reg.userId] = 0;
        }
        tournamentCounts[reg.userId]++;

        // Count for registered guest partner if any (or platform partner if registered together)
        if (reg.partnerUserId) {
            if (!tournamentCounts[reg.partnerUserId]) {
                tournamentCounts[reg.partnerUserId] = 0;
            }
            // we should be careful about double counting if both registered, but normally one makes the team reg
            tournamentCounts[reg.partnerUserId]++;
        }
    }

    // 4. Transform users mapping
    const rankingUsers = allUsers.map(u => ({
        id: u.id,
        name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.firstName || u.lastName || "Jugador"),
        email: u.email,
        category: u.category,
        gender: u.gender,
        points: u.points || 0
    }));

    return (
        <RankingClient 
            users={rankingUsers} 
            tournamentCounts={tournamentCounts} 
            availableCategories={customCategories}
        />
    );
}


