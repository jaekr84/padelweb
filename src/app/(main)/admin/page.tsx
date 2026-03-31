import { db } from "@/db";
import { users, tournaments } from "@/db/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ResetDatabaseButton from "./ResetDatabaseButton";

import { 
    Home, 
    Trophy, 
    ShoppingBag, 
    MessageSquare, 
    UserPlus, 
    Users, 
    TrendingUp, 
    Settings, 
    Star, 
    BookOpen, 
    User, 
    FolderOpen, 
    PlusCircle,
    LayoutDashboard,
    MapPin,
    ChevronRight
} from "lucide-react";


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

    const allItems = [
        // Comunidad
        { label: 'Usuarios', href: '/admin/users', icon: Users, color: 'text-blue-500' },
        { label: 'Clubes', href: '/directory', icon: MapPin, color: 'text-indigo-500' },
        { label: 'Solicitudes', href: '/admin/requests', icon: MessageSquare, color: 'text-sky-500' },
        { label: 'Invitaciones', href: '/admin/invitations', icon: UserPlus, color: 'text-violet-500' },
        
        // Competencia
        { label: 'Torneos', href: '/admin/tournaments', icon: Trophy, color: 'text-amber-500' },
        { label: 'Nuevo Evento', href: '/tournaments/create', icon: PlusCircle, color: 'text-emerald-500' },
        { label: 'Categorías', href: '/admin/categories', icon: Settings, color: 'text-slate-500' },
        { label: 'Promociones', href: '/admin/promotions', icon: TrendingUp, color: 'text-rose-500' },
        
        // Sistema
        { label: 'Ranking', href: '/ranking', icon: Star, color: 'text-yellow-500' },
        { label: 'Marketplace', href: '/marketplace', icon: ShoppingBag, color: 'text-teal-500' },
        { label: 'Reglamento', href: '/reglamento', icon: BookOpen, color: 'text-orange-500' },
        { label: 'Mi Perfil', href: '/profile', icon: User, color: 'text-slate-400' },

        { label: 'Reset', href: '#', icon: Settings, color: 'text-red-500', isReset: true },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Background Accents */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[5%] right-[-5%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16 space-y-16">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-border/40 pb-12">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">Administración General</p>
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tight text-foreground leading-[0.9]">
                            Panel de <span className="text-muted-foreground/20">Control</span>
                        </h1>
                    </div>
                    <Link href="/home" className="group flex items-center gap-3 bg-card border border-border/60 hover:border-indigo-500/40 px-6 py-3.5 rounded-2xl transition-all hover:shadow-lg active:scale-95">
                        <Home className="w-4 h-4 text-muted-foreground transition-colors group-hover:text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Volver</span>
                    </Link>
                </header>

                {/* Dashboard Stats */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Torneos', value: tournamentCount, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                        { label: 'Jugadores', value: playerCount, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/5' },
                        { label: 'Clubes', value: clubCount, icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-500/5' }
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-card/40 backdrop-blur-sm border border-border/40 p-8 rounded-[2rem] flex items-center justify-between group hover:border-indigo-500/20 transition-all"
                        >
                            <div className="space-y-1">
                                <dd className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">
                                    Total {stat.label}
                                </dd>
                                <dt className={`text-4xl font-black tracking-tighter ${stat.color}`}>
                                    {stat.value}
                                </dt>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity`}>
                                <stat.icon className="w-5 h-5 shrink-0" />
                            </div>
                        </div>
                    ))}
                </section>

                {/* Grid of 8x3 Square Buttons */}
                <section className="space-y-8">
                    <div className="border-l-2 border-indigo-500/40 pl-6 space-y-1">
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Accesos Rápidos</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Panel administrativo</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                        {allItems.map((item, idx) => (
                            item.isReset ? (
                                <div key="reset-button" className="aspect-square">
                                    <ResetDatabaseButton compact={true} />
                                </div>
                            ) : (
                                <Link
                                    key={item.label + idx}
                                    href={item.href}
                                    className="group relative aspect-square flex flex-col items-center justify-center bg-card border border-border/40 rounded-xl transition-all hover:bg-muted/10 hover:border-indigo-500/40 active:scale-95 shadow-sm hover:shadow-indigo-500/10"
                                >
                                    <div className={`w-12 h-12 rounded-2xl bg-muted/50 ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform mb-3`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-foreground text-center px-2 line-clamp-2">
                                        {item.label}
                                    </span>
                                </Link>
                            )
                        ))}
                    </div>
                </section>

                {/* Notifications / Critical Actions Callout */}
                <section className="bg-indigo-600/5 border border-indigo-500/10 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <MessageSquare className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-lg font-black uppercase italic tracking-tight">Acciones Críticas</h4>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">Hay solicitudes pendientes que requieren tu validación manual para completar el registro.</p>
                        </div>
                    </div>
                    <Link 
                        href="/admin/requests" 
                        className="w-full md:w-auto px-10 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/10 active:scale-95 text-center"
                    >
                        Revisar Ahora
                    </Link>
                </section>
            </div>
        </div>
    );
}
