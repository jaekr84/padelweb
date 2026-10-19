import { db } from "@/db";
import { openCourtEvents, clubs } from "@/db/schema";
import { getManagedClubId } from "@/lib/managed-club";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminOpenCourtClient from "@/app/(main)/admin/cancha-abierta/AdminOpenCourtClient";
import { eq, desc } from "drizzle-orm";
import { initializeOpenCourtTables } from "../../admin/cancha-abierta/init-db";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

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
        // El club propio primero; el de `users.clubId` es su membresía como jugador.
        userClubId = await getManagedClubId(session.userId);
    }

    if (session.role === "club" && !userClubId) {
        return (
            <div className="min-h-screen bg-grid-carbon text-foreground flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-card/60 backdrop-blur-xl border border-hairline rounded-[2.5rem] p-12 text-center shadow-2xl space-y-6">
                    <div className="w-20 h-20 bg-azul-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-azul-primary/20">
                        <ShieldAlert className="w-10 h-10 text-azul-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl heading-sport text-foreground">Acceso Restringido</h2>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                            No tienes un club asociado a tu cuenta de gestión. 
                            Contactá al administrador de la plataforma para vincular tu club.
                        </p>
                    </div>
                </div>
            </div>
        );
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
            eventsData = await db
                .select({
                    event: openCourtEvents,
                    club: clubs,
                })
                .from(openCourtEvents)
                .where(eq(openCourtEvents.clubId, userClubId!))
                .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id))
                .orderBy(desc(openCourtEvents.createdAt));
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
        <div className="min-h-screen bg-grid-carbon text-foreground pb-20 pt-6 px-4">
            <div className="max-w-7xl mx-auto">
                <AdminOpenCourtClient initialEvents={events as any} />
            </div>
        </div>
    );
}
