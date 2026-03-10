import { redirect } from "next/navigation";
import { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Users, Home, Trophy, User as UserIcon, LayoutDashboard, Settings, MessageSquare } from "lucide-react";

import { checkSuperadmin } from "@/lib/auth";
import { db } from "@/db";
import { registrationRequests } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    if (!(await checkSuperadmin())) {
        redirect("/");
    }

    const [pendingCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(registrationRequests)
        .where(eq(registrationRequests.status, "pendiente"));

    const pendingCount = Number(pendingCountResult?.count || 0);

    const adminNav = [
        { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/admin/categories", icon: Settings, label: "Categorías" },
        { href: "/admin/requests", icon: MessageSquare, label: "Notificaciones", badge: pendingCount > 0 ? pendingCount : null },
        { href: "/admin/invitations", icon: Users, label: "Invitaciones" },
    ];

    const siteNav = [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: UserIcon, label: "Mi Perfil" },
    ];

    return (
        <div className="min-h-screen bg-background text-white font-sans flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-slate-950 border-r border-border/50 flex flex-col md:min-h-screen p-6 gap-8">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-8 h-8 text-indigo-500" />
                    <h2 className="text-xl font-black uppercase tracking-widest italic">Superadmin</h2>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Admin section */}
                    <nav className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] mb-2 px-4">Administración</span>
                        {adminNav.map((item) => (
                            <Link key={item.label} href={item.href} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3 text-[13px] font-bold uppercase tracking-wider text-slate-300">
                                    <item.icon className="w-4 h-4 text-indigo-500/70" />
                                    {item.label}
                                </div>
                                {item.badge && (
                                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="h-px bg-border/40 mx-4" />

                    {/* Site navigation */}
                    <nav className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] mb-2 px-4">Sitio Principal</span>
                        {siteNav.map((item) => (
                            <Link key={item.label} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-[13px] font-bold uppercase tracking-wider text-slate-400">
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto bg-background">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
