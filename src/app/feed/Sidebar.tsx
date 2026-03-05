"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Home, Trophy, User, Star, FolderOpen, Search, Plus } from "lucide-react";
import { usePathname } from "next/navigation";

type NavItem = { href: string; icon: any; label: string };

const NAV: Record<string, NavItem[]> = {
    jugador: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: User, label: "Mi Perfil" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Directorio" },
    ],
    profe: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: User, label: "Mi Perfil" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Directorio" },
    ],
    centro_de_padel: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: User, label: "Mi Centro" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Directorio" },
    ],
    club: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profiles/club", icon: User, label: "Mi Club" },
        { href: "/directory", icon: FolderOpen, label: "Directorio" },
    ],
};

function getProfileUrl(role: string): string {
    if (role === "club") return "/profiles/club";
    if (role === "centro_de_padel") return "/profiles/centro";
    if (role === "profesor" || role === "profe") return "/profiles/profe";
    return "/profile";
}

function getCookieRole(): string {
    if (typeof document === "undefined") return "jugador";
    const match = document.cookie.match(/(?:^|;\s*)__padel_role=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "jugador";
}

export default function Sidebar() {
    const [role, setRole] = useState("jugador");
    const pathname = usePathname();

    useEffect(() => {
        setRole(getCookieRole());
        const id = setInterval(() => {
            const r = getCookieRole();
            setRole((prev) => (prev !== r ? r : prev));
        }, 800);
        return () => clearInterval(id);
    }, []);

    // ── Hide bottom nav when iOS virtual keyboard is open ──────────────────
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const onResize = () => {
            // When keyboard opens, visual viewport height shrinks significantly
            const ratio = vv.height / window.innerHeight;
            setKeyboardOpen(ratio < 0.75);
        };

        vv.addEventListener("resize", onResize);
        return () => vv.removeEventListener("resize", onResize);
    }, []);


    const navItems = NAV[role] ?? NAV["jugador"];
    const profileUrl = getProfileUrl(role);

    return (
        <>
            {/* MOBILE TOP HEADER */}
            <header className="md:hidden fixed top-0 w-full z-50 bg-white/80 dark:bg-[#090A0F]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between px-5 h-16">
                <Link href="/tournaments" className="flex items-center gap-2 group">
                    <span className="text-xl pt-0.5">🎾</span>
                    <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Padel Social</span>
                </Link>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <UserButton
                        showName={false}
                        appearance={{
                            elements: {
                                userButtonBox: "p-1 rounded-full",
                                userButtonOuterIdentifier: "text-slate-300",
                            },
                        }}
                    >
                        <UserButton.MenuItems>
                            <UserButton.Link
                                label="Mi Perfil Público"
                                labelIcon={<User className="w-4 h-4 ml-1" />}
                                href={profileUrl}
                            />
                        </UserButton.MenuItems>
                    </UserButton>
                </div>
            </header>

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex w-64 border-r border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-[#090A0F]/50 flex-col h-screen sticky top-0 z-50">
                <div className="p-6 flex flex-col gap-6 border-b border-slate-200/80 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <Link href="/tournaments" className="flex items-center gap-2 group">
                            <span className="text-2xl pt-1">🎾</span>
                            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">Padel Social</span>
                        </Link>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <UserButton
                            showName={true}
                            appearance={{
                                elements: {
                                    userButtonBox: "hover:bg-slate-200/50 dark:hover:bg-white/5 p-1.5 -ml-1.5 rounded-xl transition-colors",
                                    userButtonOuterIdentifier: "text-slate-700 dark:text-slate-300 font-medium text-sm",
                                },
                            }}
                        >
                            <UserButton.MenuItems>
                                <UserButton.Link
                                    label="Mi Perfil Público"
                                    labelIcon={<User className="w-4 h-4 ml-1" />}
                                    href={profileUrl}
                                />
                            </UserButton.MenuItems>
                        </UserButton>
                        <ThemeToggle />
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-sm focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Buscar jugadores..." className="bg-transparent border-none outline-none w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-medium" />
                    </div>
                </div>

                <nav className="flex-1 flex flex-col gap-1.5 p-4 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.label} href={item.href} className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all group font-semibold text-[15px] ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-80 group-hover:opacity-100'}`} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-5 border-t border-slate-200/80 dark:border-white/5">
                    <button className="flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 px-4 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-white/10 active:scale-[0.98] transition-all hover:opacity-90">
                        <Plus className="w-5 h-5" />
                        Nuevo Post
                    </button>
                </div>
            </aside>

            {/* MOBILE BOTTOM TAB BAR */}
            <nav className={`md:hidden fixed bottom-0 w-full z-[100] bg-white/90 dark:bg-[#090A0F]/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/5 pb-safe transition-transform duration-200 ${keyboardOpen ? "translate-y-full pointer-events-none" : "translate-y-0"}`}>
                <div className="flex items-center justify-around px-2 py-2">
                    {navItems.slice(0, 5).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl relative">
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                                )}
                                <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={`text-[10px] font-bold tracking-wide transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {item.label.split(' ')[0]} {/* Shorten label for mobile if needed */}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
