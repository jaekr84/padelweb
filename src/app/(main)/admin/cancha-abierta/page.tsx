import { db } from "@/db";
import { openCourtEvents, clubs } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminOpenCourtClient from "@/app/(main)/admin/cancha-abierta/AdminOpenCourtClient";
import { eq, desc } from "drizzle-orm";
import { initializeOpenCourtTables } from "./init-db";

export default async function AdminOpenCourtPage() {
    const session = await getSession();

    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
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
            const club = await db.query.clubs.findFirst({
                where: eq(clubs.ownerId, session.userId),
            });
            
            if (club) {
                eventsData = await db
                    .select({
                        event: openCourtEvents,
                        club: clubs,
                    })
                    .from(openCourtEvents)
                    .where(eq(openCourtEvents.clubId, club.id))
                    .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id))
                    .orderBy(desc(openCourtEvents.createdAt));
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
        <div className="min-h-screen p-6">
            <AdminOpenCourtClient initialEvents={events as any} />
        </div>
    );
}
