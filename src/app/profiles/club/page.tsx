import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { clubs, tournaments, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import ClubProfileClient from "./ClubProfileClient";

export default async function ClubProfilePage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    const resolvedSearchParams = await searchParams;
    const targetClubId = resolvedSearchParams?.id;

    let club = null;

    if (targetClubId) {
        // Viewing a specific club by ID
        const foundClubs = await db.select().from(clubs).where(eq(clubs.id, targetClubId));
        club = foundClubs[0] ?? null;
    } else if (session?.userId) {
        // Viewing own club profile
        const userClubs = await db.select().from(clubs).where(eq(clubs.ownerId, session.userId));
        club = userClubs[0] ?? null;
    }

    if (!session && !club) {
        return <div className="flex items-center justify-center min-h-screen text-white/60">Debe iniciar sesión o especificar un club</div>;
    }
    if (!club) {
        return <div className="flex items-center justify-center min-h-screen text-white/60">Club no encontrado. Si sos dueño de un club, completá tu perfil para crearlo.</div>;
    }

    const userTournaments = club.ownerId
        ? await db.select().from(tournaments).where(eq(tournaments.createdByUserId, club.ownerId))
        : [];

    const clubMembers = await db
        .select()
        .from(users)
        .where(eq(users.clubId, club.id))
        .orderBy(desc(users.points));

    const isOwner = session?.userId === club.ownerId;

    return (
        <FeedLayout>
            <ClubProfileClient
                user={session ? { id: session.userId, email: session.email, publicMetadata: { role: session.role } } : null}
                club={JSON.parse(JSON.stringify(club))}
                members={JSON.parse(JSON.stringify(clubMembers))}
                userTournaments={JSON.parse(JSON.stringify(userTournaments))}
                isOwner={isOwner}
            />
        </FeedLayout>
    );
}
