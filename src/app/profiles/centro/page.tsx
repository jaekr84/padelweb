import { db } from "@/db";
import { clubs, tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import ClubProfileClient from "../club/ClubProfileClient";

export default async function CentroProfilePage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const resolvedSearchParams = await searchParams;
    const clubId = resolvedSearchParams?.id;

    if (!clubId) return <div>ID de centro no especificado</div>;

    const foundClubs = await db.select().from(clubs).where(eq(clubs.id, clubId));
    const club = foundClubs[0] || null;

    if (!club) return <div>Centro no encontrado</div>;

    // Fetch tournaments created by the owner
    const userTournaments = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.createdByUserId, club.ownerId));

    return (
        <FeedLayout>
            <ClubProfileClient
                user={null} // Passing null for user since it's a public view
                club={club}
                members={[]}
                userTournaments={JSON.parse(JSON.stringify(userTournaments))}
            />
        </FeedLayout>
    );
}
