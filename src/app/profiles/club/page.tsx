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
    const clubId = resolvedSearchParams?.id;

    let club;
    let clubOwnerId;

    if (clubId) {
        const foundClubs = await db.select().from(clubs).where(eq(clubs.id, clubId));
        club = foundClubs[0] || null;
        clubOwnerId = club?.ownerId;
    } else if (user) {
        const userClubs = await db.select().from(clubs).where(eq(clubs.ownerId, user.id));
        club = userClubs[0] || null;
        clubOwnerId = user.id;
    }

    if (!club && !user) return <div>Debe iniciar sesión o especificar un club</div>;
    if (!club) return <div>Club no encontrado</div>;

    // Fetch tournaments created by the club owner
    const userTournaments = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.createdByUserId, clubOwnerId || ""));

    return (
        <FeedLayout>
            <ClubProfileClient
                user={user ? JSON.parse(JSON.stringify(user)) : null}
                club={club}
                members={[]}
                userTournaments={JSON.parse(JSON.stringify(userTournaments))}
            />
        </FeedLayout>
    );
}
