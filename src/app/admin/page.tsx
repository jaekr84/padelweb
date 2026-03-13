import { db } from "@/db";
import { users, tournaments } from "@/db/schema";
import { sql, eq, inArray } from "drizzle-orm";

export default async function AdminDashboardPage() {
    let tournamentCount = 0;
    let playerCount = 0;
    let clubCount = 0;

    try {
        const [{ count: tCount }] = await db.select({ count: sql<number>`count(*)` }).from(tournaments);
        const [{ count: pCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "jugador"));
        const [{ count: cCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "club"));

        tournamentCount = tCount;
        playerCount = pCount;
        clubCount = cCount;
    } catch (e) {
        console.error("Error fetching admin stats:", e);
    }

    return (
        <div>
            <h1 className="text-3xl font-black uppercase italic mb-8 border-b border-indigo-500/20 pb-4">
                Administración General
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Torneos Totales', value: tournamentCount, color: 'text-indigo-400' },
                    { label: 'Jugadores Registrados', value: playerCount, color: 'text-red-400' },
                    { label: 'Clubes / Centros', value: clubCount, color: 'text-emerald-400' }
                ].map((stat, idx) => (
                    <div
                        key={stat.label}
                        className="bg-slate-900/40 backdrop-blur-xl border border-white/5 md:px-8 md:py-6 p-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center transition-all hover:bg-slate-900/60"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                        <div className={`text-4xl md:text-5xl font-black mb-2 ${stat.color}`}>
                            {stat.value}
                        </div>
                        <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-500 text-center">
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Notifications Widget */}
            <div className="mt-12">
                <header className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Notificaciones Recientes</h2>
                </header>

                <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left relative z-10">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase italic text-white tracking-tight">Solicitudes de Registro</h3>
                            <p className="text-slate-400 font-medium max-w-md">
                                Tienes solicitudes externas de jugadores que quieren unirse a la asociación.
                            </p>
                        </div>

                        <a
                            href="/admin/requests"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] italic transition-all shadow-[0_0_50px_-10px_rgba(79,70,229,0.4)] flex items-center gap-3 active:scale-95"
                        >
                            Ver Solicitudes
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
