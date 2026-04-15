import { db } from "@/db";
import { publicMatches, publicMatchRegistrations, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import MatchDetailClient from "./MatchDetailClient";

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
    const session = await getSession();
    
    // params is an object in Next.js 13/14 app dir, but in some versions it might be a promise.
    // In current versions of Next.js, it's safer to await it if using TS, but here we'll assume it's direct.
    // Wait, let's be careful with [id].
    const matchId = params.id;

    const matchData = await db
        .select({
            match: publicMatches,
            creator: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                imageUrl: users.imageUrl,
                category: users.category,
            }
        })
        .from(publicMatches)
        .where(eq(publicMatches.id, matchId))
        .leftJoin(users, eq(publicMatches.creatorId, users.id))
        .limit(1);

    if (!matchData || matchData.length === 0) notFound();

    const mainMatch = matchData[0].match;
    const creator = matchData[0].creator;

    // Fetch registrations with user info
    const registrations = await db
        .select({
            registration: publicMatchRegistrations,
            user: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                imageUrl: users.imageUrl,
                category: users.category,
            }
        })
        .from(publicMatchRegistrations)
        .where(eq(publicMatchRegistrations.matchId, matchId))
        .leftJoin(users, eq(publicMatchRegistrations.userId, users.id));

    const match = {
        ...mainMatch,
        creator: creator,
        registrations: registrations.map(r => ({
            ...r.registration,
            user: r.user
        }))
    };

    if (!match) notFound();

    return (
        <MatchDetailClient 
            match={JSON.parse(JSON.stringify(match))} 
            currentUserId={session?.userId}
            isLoggedIn={!!session}
        />
    );
}
