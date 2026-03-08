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
        const [{ count: cCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(inArray(users.role, ["club", "centro_de_padel"]));

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
        </div>
    );
}
