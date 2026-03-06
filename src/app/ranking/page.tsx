import FeedLayout from "@/app/feed/layout";
import RankingClient from "./RankingClient";
import { db } from "@/db";
import { users, registrations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export default async function RankingPage() {
    // 1. Fetch all users that are players or instructors (exclude clubs/centers)
    const allUsers = await db.select()
        .from(users)
        .where(inArray(users.role, ["jugador", "profe"]));

    // 2. Fetch all tournament registrations to count tournaments played per player
    const allRegistrations = await db.select().from(registrations).where(eq(registrations.status, "confirmed"));

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
        name: u.name,
        email: u.email,
        category: u.category,
        points: u.points || 0
    }));

    return (
        <FeedLayout>
            <RankingClient users={rankingUsers} tournamentCounts={tournamentCounts} />
        </FeedLayout>
    );
}


