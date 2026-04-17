import { db } from "@/db";
import { clubs, users } from "@/db/schema";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
    const session = await getSession();
    const isLoggedIn = !!session;

    // 1. Fetch all clubs
    const clubList = await db.select().from(clubs).where(eq(clubs.type, "club"));

    // 2. Fetch all members that belong to ANY club to calculate rankings
    const allMembers = await db
        .select({
            clubId: users.clubId,
            points: users.points,
        })
        .from(users)
        .where(isNotNull(users.clubId));

    // 3. Group points by club
    const clubDataMap: Record<string, number[]> = {};
    allMembers.forEach(member => {
        if (!member.clubId) return;
        if (!clubDataMap[member.clubId]) {
            clubDataMap[member.clubId] = [];
        }
        clubDataMap[member.clubId].push(member.points || 0);
    });

    // 4. Calculate memberCount and rankingPoints (sum of top 5)
    const processedClubs = clubList.map(club => {
        const pointsArray = clubDataMap[club.id] || [];
        const count = pointsArray.length;

        // Sort points descending and take top 5
        const sortedPoints = [...pointsArray].sort((a, b) => b - a);
        const top5 = sortedPoints.slice(0, 5);
        const top5Sum = top5.reduce((acc, curr) => acc + curr, 0);
        
        // Calculate average instead of sum and round to integer
        const rankingPoints = top5.length > 0 
            ? Math.round(top5Sum / top5.length) 
            : 0;

        return {
            ...club,
            memberCount: count,
            rankingPoints: rankingPoints
        };
    });

    // 5. Sort by rankingPoints descending for the default view
    processedClubs.sort((a, b) => b.rankingPoints - a.rankingPoints);

    return (
        <DirectoryClient initialClubs={processedClubs as any} isLoggedIn={isLoggedIn} />
    );
}
