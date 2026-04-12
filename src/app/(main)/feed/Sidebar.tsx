"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Home, Trophy, User, Users, Star, FolderOpen, Search, ChevronDown, Settings, LogOut, ShoppingBag, LayoutDashboard, MessageSquare, BookOpen, UserPlus, TrendingUp, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { logoutAction, getSidebarUser } from "@/app/login/actions";
import { switchActiveRole } from "@/app/actions/role";

type NavItem = { href: string; icon: any; label: string };

const NAV: Record<string, NavItem[]> = {
    jugador: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
        { href: "/profile", icon: User, label: "Mi Perfil" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/reglamento", icon: BookOpen, label: "Reglamento" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
    ],

    club: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
        { href: "/profiles/club", icon: User, label: "Mi Club" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/reglamento", icon: BookOpen, label: "Reglamento" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
    ],
    superadmin: [
        { href: "/home", icon: Home, label: "Feed" },
        { href: "/admin/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/admin", icon: LayoutDashboard, label: "Administración" },
        { href: "/admin/users", icon: Users, label: "Usuarios" },
        { href: "/admin/requests", icon: MessageSquare, label: "Solicitudes" },
        { href: "/admin/promotions", icon: TrendingUp, label: "Promociones" },
        { href: "/admin/categories", icon: Settings, label: "Categorías" },
        { href: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/reglamento", icon: BookOpen, label: "Reglamento" },
        { href: "/profile", icon: User, label: "Mi Perfil" },
    ],
};


const ROLE_LABELS: Record<string, string> = {
    jugador: "Jugador",

    club: "Club",
    superadmin: "Administrador",
};

function getProfileUrl(role: string): string {
    if (role === "club") return "/profiles/club";

    if (role === "superadmin") return "/profile";
    return "/profile";
}

function getCookieRole(): string {
    if (typeof document === "undefined") return "jugador";
    const match = document.cookie.match(/(?:^|;\s*)__padel_role=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "jugador";
}

export default function Sidebar({ initialUser }: { initialUser?: any }) {
    const [role, setRole] = useState(initialUser?.role || "jugador");
    const [userData, setUserData] = useState<{ name: string; role: string; dbRole: string } | null>(
        initialUser?.userId ? { name: "", role: initialUser.role, dbRole: initialUser.dbRole } : null
    );
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (initialUser?.userId) {
            getSidebarUser().then(data => {
                if (data) {
                    setUserData(data);
                    if (data.role !== role) setRole(data.role);
                }
            });
        }
    }, [initialUser, role]);

    const [keyboardOpen, setKeyboardOpen] = useState(false);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const onResize = () => {
            const ratio = vv.height / window.innerHeight;
            setKeyboardOpen(ratio < 0.75);
        };

        vv.addEventListener("resize", onResize);
        return () => vv.removeEventListener("resize", onResize);
    }, []);

    const navItems = NAV[role] ?? NAV["jugador"];
    const profileUrl = getProfileUrl(role);

    const handleLogout = async () => {
        await logoutAction();
    };

    return (
        <>
            {/* MOBILE TOP HEADER */}
            <header className="md:hidden fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-5 h-16">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 -ml-2 rounded-xl border border-border bg-background shadow-sm hover:bg-muted transition-colors"
                    >
                        <Menu className="w-5 h-5 text-foreground" />
                    </button>
                    <Link href="/home" className="flex items-center gap-2 group">
                        <Image src="/img/stickers 1.jpg" alt="A.C.A.P." width={32} height={32} className="rounded-full border border-border shadow-sm" priority />
                        <span className="text-lg font-extrabold tracking-tight text-foreground text-nowrap">A.C.A.P.</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    {userData?.dbRole?.includes(",") && (
                        <div className="relative">
                            <select
                                value={userData.role}
                                onChange={async (e) => {
                                    const newRole = e.target.value;
                                    await switchActiveRole(newRole);
                                    window.location.href = "/home";
                                }}
                                className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg appearance-none cursor-pointer outline-none"
                            >
                                {["superadmin", "club", "jugador"].filter(r => {
                                    const userRoles = userData.dbRole?.split(',').map(ur => ur.trim()) || [];
                                    if (userRoles.includes('superadmin')) return true;
                                    return userRoles.includes(r);
                                }).map(r => (
                                    <option key={r} value={r}>
                                        {r === "superadmin" ? "🛡️ ADMIN" : r === "club" ? "🏟️ CLUB" : "🎾 JUGADOR"}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <Link href={profileUrl} className="p-1 rounded-full border border-border bg-muted">
                        <User className="w-5 h-5 text-muted-foreground" />
                    </Link>
                </div>
            </header>

            {/* MOBILE OVERLAY MENU (DRAWER) */}
            <div 
                className={`md:hidden fixed inset-0 z-[60] bg-background/95 backdrop-blur-md transition-all duration-300 ${isCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <div className="flex flex-col h-full p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Image src="/img/stickers 1.jpg" alt="A.C.A.P." width={40} height={40} className="rounded-full border border-border shadow-sm" priority />
                            <span className="text-xl font-extrabold tracking-tight text-foreground">A.C.A.P.</span>
                        </div>
                        <button 
                            onClick={() => setIsCollapsed(false)}
                            className="p-2 rounded-xl border border-border bg-background shadow-sm hover:bg-muted text-foreground"
                        >
                            <Menu className="w-6 h-6 rotate-90" />
                        </button>
                    </div>

                    <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link 
                                    key={item.href + item.label} 
                                    href={item.href} 
                                    onClick={() => setIsCollapsed(false)}
                                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-lg ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                >
                                    <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-8 pt-6 border-t border-border flex flex-col gap-4">
                        <div className="flex items-center gap-4 px-2">
                             <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center">
                                <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-lg font-bold truncate text-foreground">{userData?.name || 'Usuario'}</span>
                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                    {ROLE_LABELS[role] || role}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-muted text-red-500 font-bold hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>

            {/* DESKTOP SIDEBAR */}
            <aside className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} border-r border-border bg-background flex-col h-screen sticky top-0 z-50 transition-all duration-300 ease-in-out`}>
                <style>{`
                    .sidebar-scroll::-webkit-scrollbar {
                        width: 5px;
                    }
                    .sidebar-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .sidebar-scroll::-webkit-scrollbar-thumb {
                        background: rgba(0, 0, 0, 0.05);
                        border-radius: 10px;
                    }
                    .sidebar-scroll:hover::-webkit-scrollbar-thumb {
                        background: rgba(99, 102, 241, 0.2);
                    }
                    .dark .sidebar-scroll::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.05);
                    }
                    .dark .sidebar-scroll:hover::-webkit-scrollbar-thumb {
                        background: rgba(99, 102, 241, 0.3);
                    }
                `}</style>
                <div className={`p-6 flex flex-col gap-6 border-b border-border ${isCollapsed ? 'items-center' : ''}`}>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <Link href="/home" className="flex items-center gap-3 group">
                            <Image src="/img/stickers 1.jpg" alt="ACAP" width={40} height={40} className="rounded-full border border-border shadow-sm" priority />
                            {!isCollapsed && <span className="text-xl font-extrabold tracking-tight text-foreground group-hover:text-indigo-600 transition-colors">ACAP</span>}
                        </Link>
                        {!isCollapsed && (
                            <button 
                                onClick={() => setIsCollapsed(true)}
                                className="p-2 rounded-xl text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {isCollapsed && (
                        <button 
                            onClick={() => setIsCollapsed(false)}
                            className="p-2 -mt-4 rounded-xl text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}

                    {!isCollapsed && (
                        <>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-3 w-full group">
                                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        {userData ? (
                                            <>
                                                <span className="text-sm font-bold truncate text-foreground">{userData.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                                        {ROLE_LABELS[userData.role] || userData.role}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-1.5 py-1">
                                                <div className="h-3.5 w-24 bg-muted animate-pulse rounded-full" />
                                                <div className="h-2.5 w-16 bg-muted/50 animate-pulse rounded-full" />
                                            </div>
                                        )}
                                        <button
                                            onClick={handleLogout}
                                            className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-400 transition-colors text-left mt-0.5"
                                        >
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ROLE SIMULATOR BLOCK */}
                            {userData?.dbRole && (userData.dbRole.includes(",") || userData.dbRole === "superadmin") && (
                                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600/60">Cambiar Vista</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    </div>
                                    <div className="relative group">
                                        <select
                                            value={userData.role}
                                            onChange={async (e) => {
                                                const newRole = e.target.value;
                                                await switchActiveRole(newRole);
                                                window.location.href = "/home";
                                            }}
                                            className="w-full bg-background border border-indigo-500/20 text-foreground text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl appearance-none cursor-pointer hover:border-indigo-500/40 transition-all outline-none"
                                        >
                                            {["superadmin", "club", "jugador"].filter(r => {
                                                const userRoles = userData.dbRole?.split(',').map(ur => ur.trim()) || [];
                                                if (userRoles.includes('superadmin')) return true;
                                                return userRoles.includes(r);
                                            }).map(r => (
                                                <option key={r} value={r}>
                                                    {r === "superadmin" ? "🛡️ Administrador" : r === "club" ? "🏟️ Modo Club" : "🎾 Modo Jugador"}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-600 pointer-events-none opacity-50" />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-2xl border border-border text-sm focus-within:border-indigo-500/50 transition-all shadow-sm">
                                <Search className="w-4 h-4 text-muted-foreground" />
                                <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground font-medium" />
                            </div>
                        </>
                    )}
                </div>

                <nav className="flex-1 flex flex-col gap-1.5 p-4 overflow-y-auto sidebar-scroll">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link 
                                key={item.href + item.label} 
                                href={item.href} 
                                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all group font-semibold text-[15px] ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${isCollapsed ? 'justify-center px-0' : ''}`}
                                title={isCollapsed ? item.label : ""}
                            >
                                <Icon className={`w-5 h-5 transition-transform duration-300 pointer-events-none ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-80 group-hover:opacity-100'}`} />
                                {!isCollapsed && <span className="tracking-tight pointer-events-none truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {isCollapsed && (
                    <div className="p-4 mt-auto border-t border-border flex flex-col items-center gap-4">
                        <Link href={profileUrl} title="Perfil">
                            <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                        </Link>
                        <button 
                            onClick={handleLogout}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </aside>

            {/* MOBILE BOTTOM TAB BAR */}
            <nav className={`md:hidden fixed bottom-0 w-full z-[100] bg-background/90 backdrop-blur-xl border-t border-border pb-safe transition-transform duration-200 ${keyboardOpen ? "translate-y-full pointer-events-none" : "translate-y-0"}`}>
                <div className="flex items-center justify-around px-2 py-2">
                    {navItems.slice(0, 5).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl relative">
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                                )}
                                <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-600/10 text-indigo-600' : 'text-muted-foreground'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={`text-[10px] font-bold tracking-wide transition-colors ${isActive ? 'text-indigo-600' : 'text-muted-foreground'}`}>
                                    {item.label.split(' ')[0]}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
