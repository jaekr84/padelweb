import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { clubs, tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import ClubProfileClient from "./ClubProfileClient";

export default async function ClubProfilePage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const user = await currentUser();
    const resolvedSearchParams = await searchParams;
    const targetClubId = resolvedSearchParams?.id;

    let club = null;

    if (targetClubId) {
        // Viewing a specific club by ID
        const foundClubs = await db.select().from(clubs).where(eq(clubs.id, targetClubId));
        club = foundClubs[0] ?? null;
    } else if (user) {
        // Viewing own club profile
        const userClubs = await db.select().from(clubs).where(eq(clubs.ownerId, user.id));
        club = userClubs[0] ?? null;
    }

    if (!user && !club) {
        return <div className="flex items-center justify-center min-h-screen text-white/60">Debe iniciar sesión o especificar un club</div>;
    }
    if (!club) {
        return <div className="flex items-center justify-center min-h-screen text-white/60">Club no encontrado. Si sos dueño de un club, completá tu perfil para crearlo.</div>;
    }

    // Fetch tournaments created by the club owner
    const userTournaments = club.ownerId
        ? await db.select().from(tournaments).where(eq(tournaments.createdByUserId, club.ownerId))
        : [];

    const isOwner = user?.id === club.ownerId;

    return (
        <FeedLayout>
            <ClubProfileClient
                user={user ? JSON.parse(JSON.stringify(user)) : null}
                club={JSON.parse(JSON.stringify(club))}
                members={[]}
                userTournaments={JSON.parse(JSON.stringify(userTournaments))}
                isOwner={isOwner}
            />
        </FeedLayout>
    );
}
