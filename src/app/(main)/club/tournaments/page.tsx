import { db } from "@/db";
import { tournaments, users, clubs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminTournamentsClient from "../../admin/tournaments/AdminTournamentsClient";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClubTournamentsPage() {
    const session = await getSession() as { userId: string, role: string } | null;

    if (!session || session.role !== "club") {
        redirect("/home");
    }

    // Identify the club for this user (either as owner or staff)
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
    });

    let userClubId = user?.clubId || null;

    if (!userClubId) {
        const ownedClub = await db.query.clubs.findFirst({
            where: eq(clubs.ownerId, session.userId),
        });
        userClubId = ownedClub?.id || null;
    }

    if (!userClubId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-card/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-12 text-center shadow-2xl space-y-6">
                    <div className="w-20 h-20 bg-azul-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-azul-primary/20">
                        <ShieldAlert className="w-10 h-10 text-azul-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Acceso Restringido</h2>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                            No tienes un club asociado a tu cuenta de gestión. 
                            Contactá al administrador de la plataforma para vincular tu club.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Fetch tournaments filtered for this club
    const clubTournaments = await db
        .select({
            tournament: tournaments,
            club: clubs,
        })
        .from(tournaments)
        .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
        .where(eq(tournaments.clubId, userClubId))
        .orderBy(desc(tournaments.createdAt));

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 pt-6 px-4">
            <div className="max-w-7xl mx-auto">
                {/* We reuse the Admin Client for consistency */}
                <AdminTournamentsClient initialTournaments={clubTournaments} />
            </div>
        </div>
    );
}
