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

    if (session.role === "club") {
        redirect("/club/tournaments");
    }

    // Fetch all tournaments for superadmin
    const adminTournaments = await db
        .select({
            tournament: tournaments,
            club: clubs,
        })
        .from(tournaments)
        .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
        .orderBy(desc(tournaments.createdAt));

    return (
        <div className="min-h-screen bg-grid-carbon text-foreground pb-12 pt-4 px-4">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Main Client Content with Filters */}
                <AdminTournamentsClient initialTournaments={adminTournaments} />
            </div>
        </div>
    );
}

