"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Home, Trophy, User, Star, FolderOpen, Search, Plus, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";

type NavItem = { href: string; icon: any; label: string };

const NAV: Record<string, NavItem[]> = {
    jugador: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: User, label: "Mi Perfil" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
    ],
    profe: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: User, label: "Mi Perfil" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
    ],
    centro_de_padel: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: User, label: "Mi Centro" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
    ],
    club: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profiles/club", icon: User, label: "Mi Club" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
    ],
    superadmin: [
        { href: "/home", icon: Home, label: "Inicio" },
        { href: "/tournaments", icon: Trophy, label: "Torneos" },
        { href: "/profile", icon: User, label: "Mi Perfil" },
        { href: "/ranking", icon: Star, label: "Ranking" },
        { href: "/directory", icon: FolderOpen, label: "Clubes" },
    ],
};

function getProfileUrl(role: string): string {
    if (role === "club") return "/profiles/club";
    if (role === "centro_de_padel") return "/profiles/centro";
    if (role === "profesor" || role === "profe") return "/profiles/profe";
    if (role === "superadmin") return "/profile";
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
    }, [pathname]); // Refresh role when navigating to ensure current state

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
            <header className="md:hidden fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-5 h-16">
                <Link href="/home" className="flex items-center gap-2 group">
                    <Image src="/img/stickers 1.jpg" alt="A.C.A.P." width={32} height={32} className="rounded-full border border-border" priority />
                    <span className="text-lg font-extrabold tracking-tight text-foreground">A.C.A.P.</span>
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
            <aside className="hidden md:flex w-64 border-r border-border bg-background dark:bg-slate-950 flex-col h-screen sticky top-0 z-50">
                <div className="p-6 flex flex-col gap-6 border-b border-border">
                    <div className="flex items-center justify-between">
                        <Link href="/home" className="flex items-center gap-3 group">
                            <Image src="/img/stickers 1.jpg" alt="ACAP" width={40} height={40} className="rounded-full border border-border" priority />
                            <span className="text-xl font-extrabold tracking-tight text-foreground group-hover:text-indigo-600 transition-colors">ACAP</span>
                        </Link>
                        <ThemeToggle />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <UserButton
                            showName={true}
                            appearance={{
                                elements: {
                                    userButtonBox: "hover:bg-muted p-1.5 -ml-1.5 rounded-xl transition-colors",
                                    userButtonOuterIdentifier: "text-foreground font-medium text-sm",
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

                    <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-2xl border border-border text-sm focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <input type="text" placeholder="Buscar jugadores..." className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground font-medium" />
                    </div>
                </div>

                <nav className="flex-1 flex flex-col gap-1.5 p-4 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.label} href={item.href} className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all group font-semibold text-[15px] ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-80 group-hover:opacity-100'}`} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-5 border-t border-border">
                    <button className="flex items-center justify-center gap-2 w-full bg-foreground text-background font-bold py-3.5 px-4 rounded-2xl shadow-xl shadow-indigo-900/10 active:scale-[0.98] transition-all hover:opacity-90">
                        <Plus className="w-5 h-5" />
                        Nuevo Post
                    </button>
                </div>
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
