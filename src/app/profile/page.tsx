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

    // Fetch user from our DB or create if missing
    // We only update the role if the current role is 'jugador' (default) or null
    // to avoid overwriting development overrides.
    const [existingUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, user.id));

    const roleToSet = (existingUser?.role && existingUser.role !== "jugador")
        ? existingUser.role
        : clerkRole;

    const invitedByClubId = (user.publicMetadata?.invitedByClubId as string) || null;

    const [dbUser] = (await db
        .insert(users)
        .values({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            name: user.fullName || user.emailAddresses[0]?.emailAddress.split('@')[0],
            role: roleToSet,
            points: 0,
            category: "5ta",
            clubId: invitedByClubId,
        })
        .onConflictDoUpdate({
            target: users.id,
            set: {
                email: user.emailAddresses[0]?.emailAddress,
                role: roleToSet, // respects the logic above
                clubId: invitedByClubId,
            }
        })
        .returning()) as any[];

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

    // Fetch tournaments created by the user (for Club/Profe)
    const createdTournaments = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.createdByUserId, user.id))
        .orderBy(desc(tournaments.createdAt));

    // Fetch club members if it is a club
    let clubMembers: any[] = [];
    if (clubProfile) {
        clubMembers = await db
            .select()
            .from(users)
            .where(eq(users.clubId, clubProfile.id))
            .orderBy(desc(users.points));
    }

    return (
        <PlayerProfileClient
            dbUser={dbUser}
            registrations={userRegistrations}
            matchHistory={[...allMatches, ...allBracketMatches]}
            isOwnProfile={true}
            profeProfile={profeProfile || null}
            clubProfile={clubProfile || null}
            members={JSON.parse(JSON.stringify(clubMembers))}
            createdTournaments={JSON.parse(JSON.stringify(createdTournaments))}
        />
    );
}
