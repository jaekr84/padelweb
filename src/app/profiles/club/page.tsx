import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { clubs, tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import ClubProfileClient from "./ClubProfileClient";

export default async function ClubProfilePage() {
    const user = await currentUser();
    if (!user) return null;

    // Fetch club data for the current user
    const userClubs = await db.select().from(clubs).where(eq(clubs.ownerId, user.id));
    const club = userClubs[0] || null;

    // Fetch tournaments created by this user
    const userTournaments = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.createdByUserId, user.id));

    return (
        <FeedLayout>
            <ClubProfileClient
                user={JSON.parse(JSON.stringify(user))}
                club={club}
                members={[]}
                userTournaments={JSON.parse(JSON.stringify(userTournaments))}
            />
        </FeedLayout>
    );
}
