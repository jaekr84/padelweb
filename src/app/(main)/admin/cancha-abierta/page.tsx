import { db } from "@/db";
import { openCourtEvents, clubs, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminOpenCourtClient from "@/app/(main)/admin/cancha-abierta/AdminOpenCourtClient";
import { eq, desc } from "drizzle-orm";
import { initializeOpenCourtTables } from "./init-db";

export const dynamic = "force-dynamic";

export default async function AdminOpenCourtPage() {
    const session = await getSession();

    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "club")) {
        redirect("/home");
    }

    // Auto-repair/Initialize tables if they don't exist
    await initializeOpenCourtTables();

    // Fetch all events for this admin's club or all if superadmin
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
            // Role is club or admin, we treat them both as club managers
            let userClubId: string | null = null;
            
            // Try by ownerId first (classic admin role pattern)
            const clubByOwner = await db.query.clubs.findFirst({
                where: eq(clubs.ownerId, session.userId),
            });
            userClubId = clubByOwner?.id || null;

            // Try by user.clubId if not found (new club role pattern)
            if (!userClubId) {
                const [dbUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
                userClubId = dbUser?.clubId || null;
            }
            
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
                // Return empty if no club found for this manager
                eventsData = [];
            }
        }
    } catch (e: any) {
        if (e.message?.includes("doesn't exist")) {
            console.log("Detectadas tablas faltantes. Inicializando...");
            await initializeOpenCourtTables();
            // Recargar para aplicar cambios (esto se hace en la siguiente recarga del usuario)
        } else {
            throw e;
        }
    }

    // Map the data to include registrations (we can fetch them separately or just pass empty for now if not needed in the main list)
    const events = eventsData.map(d => ({
        ...d.event,
        club: d.club,
        registrations: [] // Fetching registrations for each event in a list can be heavy, usually better in the management view
    }));

    return (
        <div className="min-h-screen bg-grid-carbon text-foreground pb-12 pt-4 px-4">
            <AdminOpenCourtClient initialEvents={events as any} />
        </div>
    );
}
