import { db } from "@/db";
import { openCourtEvents, openCourtRegistrations, openCourtCourts, openCourtMatches, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminLiveManagementClient from "@/app/(main)/admin/cancha-abierta/[id]/AdminLiveManagementClient";
import { eq, and, desc } from "drizzle-orm";
import { initializeOpenCourtTables } from "../init-db";
import { getAllPlayers } from "@/app/actions/players";

export default async function AdminLiveManagementPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();

    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        redirect("/home");
    }

    const eventId = params.id;

    // Auto-repair/Initialize tables if they don't exist
    await initializeOpenCourtTables();

    // Fetch basic event data
    const [eventBase] = await db
        .select()
        .from(openCourtEvents)
        .where(eq(openCourtEvents.id, eventId))
        .limit(1);

    if (!eventBase) {
        redirect("/admin/cancha-abierta");
    }

    // Fetch related data in separate queries for maximum compatibility
    const registrationsData = await db
        .select({
            registration: openCourtRegistrations,
            user: users,
        })
        .from(openCourtRegistrations)
        .leftJoin(users, eq(openCourtRegistrations.userId, users.id))
        .where(eq(openCourtRegistrations.eventId, eventId));

    const registrations = registrationsData.map(r => ({
        ...r.registration,
        user: r.user
    }));

    const courts = await db
        .select()
        .from(openCourtCourts)
        .where(eq(openCourtCourts.eventId, eventId));

    const matches = await db
        .select()
        .from(openCourtMatches)
        .where(eq(openCourtMatches.eventId, eventId))
        .orderBy(desc(openCourtMatches.startedAt));

    const allPlayers = await getAllPlayers();

    // Combine into the expected structure
    const event = {
        ...eventBase,
        registrations,
        courts,
        matches
    };

    return (
        <div className="min-h-screen p-4 md:p-8 bg-background">
            <AdminLiveManagementClient 
                initialEvent={event as any}
                initialRegistrations={registrations as any}
                allPlayers={allPlayers as any}
            />
        </div>
    );
}
