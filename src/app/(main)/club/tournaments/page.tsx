import { db } from "@/db";
import { tournaments, users, clubs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminTournamentsClient from "../../admin/tournaments/AdminTournamentsClient";

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
        // If the user has 'club' role but no club association, they can't manage tournaments
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-bold">No tienes un club asociado</h2>
                    <p className="text-muted-foreground">Contacta al administrador para vincular tu cuenta a un club.</p>
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
            <div className="max-w-7xl mx-auto space-y-8">
                {/* We reuse the Admin Client for consistency */}
                <AdminTournamentsClient initialTournaments={clubTournaments} />
            </div>
        </div>
    );
}
