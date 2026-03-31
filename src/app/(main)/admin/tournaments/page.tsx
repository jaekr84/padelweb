import { db } from "@/db";
import { tournaments, users, clubs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import Link from "next/link";
import { Trophy, Edit, LayoutDashboard, Plus, Calendar, MapPin, Trash2, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import AdminTournamentsClient from "./AdminTournamentsClient";

export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage() {
    const session = await getSession() as { userId: string, role: string } | null;

    if (!session || session.role !== "superadmin") {
        redirect("/home");
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
        <div className="min-h-screen bg-background text-foreground pb-20 pt-6 px-4">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tight">Gestionar Torneos</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Panel de Administración</p>
                    </div>
                    <Link href="/tournaments/create">
                        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-6 rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95">
                            <Plus className="w-4 h-4" />
                            Crear Torneo
                        </button>
                    </Link>
                </div>

                {/* Main Client Content with Filters */}
                <AdminTournamentsClient initialTournaments={adminTournaments} />
            </div>
        </div>
    );
}

