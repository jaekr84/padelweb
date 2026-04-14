import { db } from "@/db";
import { openCourtEvents, clubs, openCourtRegistrations } from "@/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import OpenCourtPublicClient from "@/app/(main)/cancha-abierta/OpenCourtPublicClient";
import { getSession } from "@/lib/auth-server";

export default async function CanchaAbiertaPublicPage() {
    const session = await getSession();

    // Fetch active and completed events from the database
    // We join with clubs to get club info and use a subquery/count for registrations
    const eventsData = await db
        .select({
            event: openCourtEvents,
            clubName: clubs.name,
            clubImage: clubs.logoUrl,
            regCount: sql<number>`(SELECT COUNT(*) FROM open_court_registrations WHERE event_id = ${openCourtEvents.id})`,
        })
        .from(openCourtEvents)
        .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id))
        .where(inArray(openCourtEvents.status, ["active", "completed"]))
        .orderBy(desc(openCourtEvents.createdAt));

    // Map to a cleaner structure
    const events = eventsData.map(d => ({
        ...d.event,
        club: {
            name: d.clubName,
            image: d.clubImage
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
        <div className="min-h-screen pb-20">
            <OpenCourtPublicClient 
                initialEvents={events} 
                userRegistrations={userRegistrations}
                isLoggedIn={!!session?.userId}
            />
        </div>
    );
}
