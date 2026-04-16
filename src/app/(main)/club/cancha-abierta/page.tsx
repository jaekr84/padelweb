import { db } from "@/db";
import { openCourtEvents, clubs, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminOpenCourtClient from "@/app/(main)/admin/cancha-abierta/AdminOpenCourtClient";
import { eq, desc } from "drizzle-orm";
import { initializeOpenCourtTables } from "../../admin/cancha-abierta/init-db";

export default async function ClubOpenCourtPage() {
    const session = await getSession();

    if (!session || (session.role !== "club" && session.role !== "superadmin")) {
        redirect("/home");
    }

    // Auto-repair/Initialize tables if they don't exist
    await initializeOpenCourtTables();

    // Get the club ID for the current manager
    let userClubId: string | null = null;
    if (session.role === "club") {
        // Try to get clubId from user record first
        const [dbUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        userClubId = dbUser?.clubId || null;

        // Fallback: check if user is an owner of a club
        if (!userClubId) {
            const club = await db.query.clubs.findFirst({
                where: eq(clubs.ownerId, session.userId),
            });
            userClubId = club?.id || null;
        }
    }

    let eventsData: any[] = [];
    try {
        if (session.role === "superadmin") {
            eventsData = await db
                .select({
                    event: openCourtEvents,
                    club: clubs,
                })
                .from(openCourtEvents)
                .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id))
                .orderBy(desc(openCourtEvents.createdAt));
        } else {
            if (userClubId) {
                eventsData = await db
                    .select({
                        event: openCourtEvents,
                        club: clubs,
                    })
                    .from(openCourtEvents)
                    .where(eq(openCourtEvents.clubId, userClubId))
                    .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id))
                    .orderBy(desc(openCourtEvents.createdAt));
            } else {
                // If we are in club mode but found no club associated, return empty
                eventsData = [];
            }
        }
    } catch (e: any) {
        if (e.message?.includes("doesn't exist")) {
            await initializeOpenCourtTables();
        } else {
            throw e;
        }
    }

    // Map the data
    const events = eventsData.map(d => ({
        ...d.event,
        club: d.club,
        registrations: [] 
    }));

    return (
        <div className="min-h-screen p-6">
            <AdminOpenCourtClient initialEvents={events as any} />
        </div>
    );
}
