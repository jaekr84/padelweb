import { db } from "@/db";
import { openCourtEvents, clubs, openCourtRegistrations, users } from "@/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import OpenCourtPublicClient from "@/app/(main)/cancha-abierta/OpenCourtPublicClient";
import { getSession } from "@/lib/auth-server";
import { initializeOpenCourtTables } from "@/app/(main)/admin/cancha-abierta/init-db";

export default async function CanchaAbiertaPublicPage() {
    const session = await getSession();

    // Auto-repair/Initialize tables if they don't exist or are missing columns
    await initializeOpenCourtTables();

    // Fetch active and completed events from the database
    // We join with clubs to get club info and users to get creator info
    const eventsData = await db
        .select({
            event: openCourtEvents,
            clubName: clubs.name,
            clubImage: clubs.logoUrl,
            clubOwnerId: clubs.ownerId,
            regCount: sql<number>`(SELECT COUNT(*) FROM open_court_registrations WHERE event_id = ${openCourtEvents.id})`,
            creator: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                imageUrl: users.imageUrl,
            }
        })
        .from(openCourtEvents)
        .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id))
        .leftJoin(users, eq(openCourtEvents.creatorId, users.id))
        .where(inArray(openCourtEvents.status, ["active", "completed"]))
        .orderBy(desc(openCourtEvents.createdAt));

    // Map to a cleaner structure
    const events = eventsData.map(d => ({
        ...d.event,
        creator: d.creator,
        club: {
            name: d.clubName,
            image: d.clubImage,
            ownerId: d.clubOwnerId
        },
        registrationCount: Number(d.regCount)
    }));

    // If logged in, check which events the user is already registered for
    let userRegistrations: string[] = [];
    if (session?.userId) {
        const regs = await db
            .select({ eventId: openCourtRegistrations.eventId })
            .from(openCourtRegistrations)
            .where(eq(openCourtRegistrations.userId, session.userId));
        userRegistrations = regs.map(r => r.eventId);
    }

    return (
        <div className="min-h-screen pb-20 bg-carbon-950">
            <OpenCourtPublicClient 
                initialEvents={events} 
                userRegistrations={userRegistrations}
                isLoggedIn={!!session?.userId}
                currentUserId={session?.userId}
                userRole={session?.role}
            />
        </div>
    );
}
