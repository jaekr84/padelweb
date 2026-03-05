import { db } from "@/db";
import { instructorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import FeedLayout from "@/app/feed/layout";
import ProfeProfileClient from "./ProfeProfileClient";

export default async function ProfesorProfilePage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const user = await currentUser();
    const resolvedSearchParams = await searchParams;
    const profeId = resolvedSearchParams?.id;

    let profe;

    if (profeId) {
        const found = await db.select().from(instructorProfiles).where(eq(instructorProfiles.userId, profeId));
        profe = found[0] || null;
    } else if (user) {
        // Upsert for current user
        const result = await db
            .insert(instructorProfiles)
            .values({
                userId: user.id,
                name: user.fullName || user.emailAddresses[0]?.emailAddress.split('@')[0],
                bio: "Instructor de padel",
                level: "PROFE",
                experience: "En formación",
                rating: "0.0",
                verified: false,
                avatarUrl: user.imageUrl,
            })
            .onConflictDoUpdate({
                target: instructorProfiles.userId,
                set: { avatarUrl: user.imageUrl } // Keep it simple
            })
            .returning();
        profe = result[0];
    }

    const isOwner = user?.id === profe?.userId;

    return (
        <FeedLayout>
            <ProfeProfileClient profe={profe} isOwner={isOwner} />
        </FeedLayout>
    );
}
