import { db } from "@/db";
import { instructorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import FeedLayout from "@/app/feed/layout";
import ProfeProfileClient from "./ProfeProfileClient";

export default async function ProfesorProfilePage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    const resolvedSearchParams = await searchParams;
    const profeId = resolvedSearchParams?.id;

    let profe = null;

    if (profeId) {
        // Try searching by primary key (ID) or by userId (Clerk ID)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profeId);

        let found: any[] = [];
        if (isUuid) {
            found = await db.select().from(instructorProfiles).where(eq(instructorProfiles.id, profeId));
        }

        // If not found by ID or not a UUID, try by userId
        if (found.length === 0) {
            found = await db.select().from(instructorProfiles).where(eq(instructorProfiles.userId, profeId));
        }

        profe = found[0] || null;
    } else if (session?.userId) {
        // Upsert for current user profile if no ID provided (own profile)
        const result = await db
            .insert(instructorProfiles)
            .values({
                userId: session.userId,
                name: session.email.split('@')[0], // Simplified naming
                bio: "Instructor de padel",
                level: "PROFE Nacional",
                experience: "En formación",
                rating: "0.0",
                verified: false,
            })
            .onConflictDoUpdate({
                target: instructorProfiles.userId,
                set: { workingZones: [] } // Just to have an update target
            })
            .returning();
        profe = result[0];
    }

    const isOwner = session?.userId === profe?.userId;

    return (
        <FeedLayout>
            <ProfeProfileClient profe={profe ? JSON.parse(JSON.stringify(profe)) : null} isOwner={isOwner} />
        </FeedLayout>
    );
}
