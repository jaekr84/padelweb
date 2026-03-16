import { db } from "@/db";
import { tournaments, users, clubs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import Link from "next/link";
import { Trophy, Edit, LayoutDashboard, Plus, Calendar, MapPin, Trash2, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import DeleteTournamentButton from "./DeleteTournamentButton";
import FinalizeTournamentButton from "./FinalizeTournamentButton";

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
            <div className="max-w-4xl mx-auto space-y-8">
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

                {/* List */}
                <div className="grid grid-cols-1 gap-4">
                    {adminTournaments.length === 0 ? (
                        <div className="bg-card border border-border p-12 rounded-[2.5rem] text-center">
                            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trophy className="w-8 h-8 text-blue-500/30" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic text-muted-foreground/40">No tenés torneos creados</h3>
                        </div>
                    ) : (
                        adminTournaments.map(({ tournament, club }) => {
                            const isFinished = tournament.status === 'finalizado';
                            
                            return (
                                <div key={tournament.id} className="bg-card border border-border p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden group">
                                    {/* Image */}
                                    <div className="w-20 h-20 bg-blue-500/5 border border-blue-500/10 rounded-3xl shrink-0 overflow-hidden flex items-center justify-center">
                                        {tournament.imageUrl ? (
                                            <img src={tournament.imageUrl} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <Trophy className="w-8 h-8 text-blue-500/20" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 text-center md:text-left">
                                        <h3 className="text-xl font-black uppercase italic tracking-tight mb-1 truncate">{tournament.name}</h3>
                                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <Calendar className="w-3 h-3 text-blue-500" />
                                                {tournament.startDate || "Sin fecha"}
                                            </div>
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <div className={`w-2 h-2 rounded-full ${isFinished ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'}`} />
                                                {tournament.status}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap justify-center gap-3 shrink-0">
                                        {isFinished ? (
                                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-slate-500 font-bold uppercase text-[9px] tracking-widest">
                                                <Lock className="w-3.5 h-3.5" />
                                                Torneo Cerrado
                                            </div>
                                        ) : (
                                            <>
                                                <Link href={`/tournaments/${tournament.id}/edit`}>
                                                    <button className="flex items-center gap-1.5 bg-muted/30 hover:bg-muted/50 border border-border text-foreground font-black uppercase tracking-widest text-[9px] py-3 px-5 rounded-xl transition-all active:scale-95">
                                                        <Edit className="w-3.5 h-3.5" />
                                                        Editar Info
                                                    </button>
                                                </Link>
                                                <Link href={`/tournaments/${tournament.id}/manage`}>
                                                    <button className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black uppercase tracking-widest text-[9px] py-3.5 px-5 rounded-xl transition-all active:scale-95">
                                                        <LayoutDashboard className="w-3.5 h-3.5" />
                                                        Gestionar Fixture
                                                    </button>
                                                </Link>
                                                <FinalizeTournamentButton 
                                                    tournamentId={tournament.id} 
                                                    tournamentName={tournament.name} 
                                                />
                                            </>
                                        )}
                                        <DeleteTournamentButton 
                                            tournamentId={tournament.id} 
                                            tournamentName={tournament.name} 
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
