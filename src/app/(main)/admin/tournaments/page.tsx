import { db } from "@/db";
import { tournaments, users, clubs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AdminTournamentsClient from "./AdminTournamentsClient";

export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage() {
    const session = await getSession() as { userId: string, role: string } | null;

    if (!session || (session.role !== "superadmin" && session.role !== "club")) {
        redirect("/home");
    }

    const isClub = session.role === "club";
    let userClubId: string | null = null;

    if (isClub) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        userClubId = dbUser?.clubId || null;
    }

    // Fetch tournaments: all for superadmin, filtered for club
    let query = db
        .select({
            tournament: tournaments,
            club: clubs,
        })
        .from(tournaments)
        .leftJoin(clubs, eq(tournaments.clubId, clubs.id));

    if (isClub && userClubId) {
        // @ts-ignore - drizzle type issues sometimes with where clauses in builders
        query = query.where(eq(tournaments.clubId, userClubId));
    }

    const adminTournaments = await query.orderBy(desc(tournaments.createdAt));

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 pt-6 px-4">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Main Client Content with Filters */}
                <AdminTournamentsClient initialTournaments={adminTournaments} />
            </div>
        </div>
    );
}

