import { db } from "@/db";
import { tournaments, registrations, users, groupMatches, bracketMatches, instructorProfiles, clubs } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PlayerProfileClient from "./PlayerProfileClient";

export default async function ProfilePage() {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    // Read role from Clerk publicMetadata (set during onboarding)
    const clerkRole = (user.publicMetadata?.role as string) || "jugador";

    // Fetch user from our DB or create if missing — always sync the role from Clerk
    const [dbUser] = await db
        .insert(users)
        .values({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            name: user.fullName || user.emailAddresses[0]?.emailAddress.split('@')[0],
            role: clerkRole,
            points: 0,
            category: "5ta",
        })
        .onConflictDoUpdate({
            target: users.id,
            set: {
                email: user.emailAddresses[0]?.emailAddress,
                // Keep role in sync with Clerk metadata
                role: clerkRole,
            }
        })
        .returning();

    // Fetch registrations with tournament details
    const userRegistrations = await db
        .select({
            id: registrations.id,
            tournamentId: registrations.tournamentId,
            partnerName: registrations.partnerName,
            category: registrations.category,
            status: registrations.status,
            tournament: {
                id: tournaments.id,
                name: tournaments.name,
                status: tournaments.status,
                startDate: tournaments.startDate,
                surface: tournaments.surface,
            }
        })
        .from(registrations)
        .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
        .where(eq(registrations.userId, user.id))
        .orderBy(desc(registrations.createdAt));

    // Fetch match results for these tournaments
    const tournamentIds = userRegistrations.map(r => r.tournamentId);

    let allMatches: any[] = [];
    let allBracketMatches: any[] = [];

    if (tournamentIds.length > 0) {
        allMatches = await db
            .select({
                match: groupMatches,
                tournamentName: tournaments.name
            })
            .from(groupMatches)
            .innerJoin(tournaments, eq(groupMatches.tournamentId, tournaments.id))
            .where(inArray(groupMatches.tournamentId, tournamentIds));

        allBracketMatches = await db
            .select({
                match: bracketMatches,
                tournamentName: tournaments.name
            })
            .from(bracketMatches)
            .innerJoin(tournaments, eq(bracketMatches.tournamentId, tournaments.id))
            .where(inArray(bracketMatches.tournamentId, tournamentIds));
    }

    // Fetch instructor profile if exists
    const [profeProfile] = await db.select().from(instructorProfiles).where(eq(instructorProfiles.userId, user.id));

    // Fetch club profile if exists
    const [clubProfile] = await db.select().from(clubs).where(eq(clubs.ownerId, user.id));

    return (
        <PlayerProfileClient
            user={JSON.parse(JSON.stringify(user))}
            dbUser={dbUser}
            registrations={userRegistrations}
            matches={allMatches}
            bracketMatches={allBracketMatches}
            isOwnProfile={true}
            profeProfile={profeProfile || null}
            clubProfile={clubProfile || null}
        />
    );
}
