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
        <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-emerald-500/30">
            {/* CSS KEYFRAMES */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #10b981, #3b82f6, #06b6d4, #10b981);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: color-mix(in srgb, var(--card) 90%, transparent);
                    backdrop-filter: blur(20px);
                    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
                }
                .glass-card:hover {
                    border-color: rgba(16, 185, 129, 0.5);
                }
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 2rem;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-button:hover::before {
                    opacity: 1;
                }
                @keyframes fade-slide-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-slide-up 0.6s ease-out forwards;
                }
            `}</style>
            
            {/* Ambient glow */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16 space-y-16">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-border/40 pb-12 animate-fade-in">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/80">Administración General</p>
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tight text-foreground leading-[0.9]">
                            Panel de <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">Control</span>
                        </h1>
                    </div>
                    <Link href="/home" className="group flex items-center gap-3 glass-card px-6 py-3.5 rounded-2xl transition-all hover:shadow-lg active:scale-95 relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Home className="relative z-10 w-4 h-4 text-muted-foreground transition-colors group-hover:text-emerald-500" />
                        <span className="relative z-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Volver</span>
                    </Link>
                </header>

                {/* Dashboard Stats */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
                    {[
                        { label: 'Torneos', value: tournamentCount, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                        { label: 'Jugadores', value: playerCount, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/5' },
                        { label: 'Clubes', value: clubCount, icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-500/5' }
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="glass-card p-8 rounded-[2rem] flex items-center justify-between group transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="space-y-1 relative z-10">
                                <dd className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">
                                    Total {stat.label}
                                </dd>
                                <dt className={`text-4xl font-black tracking-tighter ${stat.color}`}>
                                    {stat.value}
                                </dt>
                            </div>
                            <div className={`relative z-10 w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity backdrop-blur-sm`}>
                                <stat.icon className="w-5 h-5 shrink-0" />
                            </div>
                        </div>
                    ))}
                </section>

                {/* Grid of 8x3 Square Buttons */}
                <section className="space-y-8 animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
                    <div className="border-l-2 border-emerald-500/40 pl-6 space-y-1">
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Accesos Rápidos</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Panel administrativo</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                        {allItems.map((item, idx) => (
                            item.isReset ? (
                                <div key="reset-button" className="glass-card rounded-2xl aspect-square flex items-center justify-center p-2 group hover:shadow-emerald-500/10 transition-all duration-300">
                                    <ResetDatabaseButton compact={true} />
                                </div>
                            ) : (
                                <Link
                                    key={item.label + idx}
                                    href={item.href}
                                    className="group glass-card rounded-2xl aspect-square flex flex-col items-center justify-center transition-all duration-300 active:scale-95 shadow-sm hover:shadow-emerald-500/10 relative overflow-hidden"
                                >
                                    <div className="absolute top-[-20%] right-[-20%] w-16 h-16 bg-blue-500/10 rounded-full blur-[20px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <div className={`relative z-10 w-12 h-12 rounded-2xl bg-muted/30 ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform mb-3`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.15em] text-foreground text-center px-2 line-clamp-2">
                                        {item.label}
                                    </span>
                                </Link>
                            )
                        ))}
                    </div>
                </section>

                {/* Notifications / Critical Actions Callout */}
                <section className="glass-card p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in relative overflow-hidden" style={{ animationDelay: '0.3s', opacity: 0 }}>
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-14 h-14 bg-foreground border border-border text-background rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-lg font-black uppercase italic tracking-tight text-foreground">Acciones Críticas</h4>
                            <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed max-w-md">Hay solicitudes pendientes que requieren tu validación manual para completar el registro.</p>
                        </div>
                    </div>
                    <Link 
                        href="/admin/requests" 
                        className="glow-button relative z-10 w-full md:w-auto px-10 bg-foreground hover:bg-foreground/90 text-background flex items-center justify-center py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 active:scale-95 text-center border border-border"
                    >
                        Revisar Ahora
                    </Link>
                </section>
            </div>
        </div>
    );
}
