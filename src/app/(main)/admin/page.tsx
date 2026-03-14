import { db } from "@/db";
import { users, tournaments } from "@/db/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboardPage() {
    const session = await getSession();

    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

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
        <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 space-y-12">
            <header className="border-b border-border pb-8">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight text-foreground leading-none">
                        Administración
                    </h1>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-muted-foreground mt-2">Panel de Control General</p>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
                {[
                    { label: 'Torneos', value: tournamentCount, color: 'text-indigo-500' },
                    { label: 'Jugadores', value: playerCount, color: 'text-rose-500' },
                    { label: 'Clubes', value: clubCount, color: 'text-emerald-500' }
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-card border border-border md:px-8 md:py-10 py-5 px-2 rounded-2xl md:rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center transition-all hover:scale-[1.02] duration-300"
                    >
                        <dt className={`text-xl md:text-6xl font-black mb-1 md:mb-3 ${stat.color} tracking-tighter`}>
                            {stat.value}
                        </dt>
                        <dd className="text-[8px] md:text-[11px] font-black uppercase tracking-wider md:tracking-[0.2em] text-muted-foreground text-center">
                            {stat.label}
                        </dd>
                    </div>
                ))}
            </div>

            {/* Quick Access Modules Hub (Square Buttons) */}
            <section className="space-y-8">
                <header className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Gestión de Módulos</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acceso rápido a todas las herramientas</p>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                        { label: 'Crear Torneo', href: '/tournaments/create', icon: '✨', color: 'from-indigo-600/20 to-indigo-600/5', text: 'text-indigo-600' },
                        { label: 'Torneos', href: '/admin/tournaments', icon: '🏆', color: 'from-amber-500/20 to-amber-500/5', text: 'text-amber-500' },
                        { label: 'Solicitudes', href: '/admin/requests', icon: '📩', color: 'from-blue-500/20 to-blue-500/5', text: 'text-blue-500' },
                        { label: 'Usuarios', href: '/admin/users', icon: '👤', color: 'from-rose-500/20 to-rose-500/5', text: 'text-rose-500' },
                        { label: 'Invitaciones', href: '/admin/invitations', icon: '🔗', color: 'from-indigo-500/20 to-indigo-500/5', text: 'text-indigo-500' },
                        { label: 'Configuración', href: '/admin/categories', icon: '⚙️', color: 'from-slate-500/20 to-slate-500/5', text: 'text-slate-500' },
                        { label: 'Mi Perfil', href: '/profile', icon: '👤', color: 'from-rose-500/20 to-rose-500/5', text: 'text-rose-500' },
                    ].map((module) => (
                        <Link
                            key={module.label}
                            href={module.href}
                            className={`group relative aspect-square bg-card border border-border rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 transition-all hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-95 overflow-hidden`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                            
                            <div className="text-4xl md:text-5xl mb-2 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-12">
                                {module.icon}
                            </div>
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-foreground text-center relative z-10">
                                {module.label}
                            </span>
                            
                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <svg className={`w-4 h-4 ${module.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Pending Actions Section */}
            <section className="mt-16 bg-indigo-600/[0.03] border border-indigo-500/10 rounded-[3rem] p-8 md:p-14 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left relative z-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[9px] font-black uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            Acción Pendiente
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black uppercase italic text-foreground tracking-tight leading-tight">
                            Solicitudes de <br className="hidden md:block" /> Registro
                        </h3>
                        <p className="text-muted-foreground font-medium max-w-sm leading-relaxed text-sm md:text-base">
                            Hay nuevos perfiles esperando validación para unirse a la asociación.
                        </p>
                    </div>

                    <Link
                        href="/admin/requests"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/40 flex items-center gap-4 active:scale-95 shrink-0"
                    >
                        Revisar Ahora
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </section>
        </div>
    );

}
