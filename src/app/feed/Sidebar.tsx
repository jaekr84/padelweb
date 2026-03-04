"use client";

import styles from "./layout.module.css";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = { href: string; icon: string; label: string };

const NAV: Record<string, NavItem[]> = {
    jugador: [
        { href: "/tournaments", icon: "🏠", label: "Inicio" },
        { href: "/tournaments", icon: "🏆", label: "Torneos" },
        { href: "/profile", icon: "👤", label: "Mi Perfil" },
        // { href: "/tournaments/live", icon: "🔴", label: "Live Score" },
        { href: "/ranking", icon: "⭐", label: "Ranking" },
        { href: "/directory", icon: "🗂️", label: "Directorio" },
        // { href: "/notifications", icon: "🔔", label: "Notificaciones" },
    ],
    profe: [
        { href: "/tournaments", icon: "🏠", label: "Inicio" },
        { href: "/tournaments", icon: "🏆", label: "Torneos" },
        { href: "/profile", icon: "👤", label: "Mi Perfil" },
        // { href: "/tournaments/live", icon: "🔴", label: "Live Score" },
        { href: "/ranking", icon: "⭐", label: "Ranking" },
        { href: "/directory", icon: "🗂️", label: "Directorio" },
        // { href: "/notifications", icon: "🔔", label: "Notificaciones" },
    ],
    centro_de_padel: [
        { href: "/tournaments", icon: "🏠", label: "Inicio" },
        { href: "/tournaments", icon: "🏆", label: "Torneos" },
        { href: "/profile", icon: "🏟️", label: "Mi Centro" },
        // { href: "/tournaments/dashboard", icon: "⚙️", label: "Mis Torneos" },
        // { href: "/tournaments/live", icon: "🔴", label: "Live Score" },
        { href: "/ranking", icon: "⭐", label: "Ranking" },
        { href: "/directory", icon: "🗂️", label: "Directorio" },
        // { href: "/notifications", icon: "🔔", label: "Notificaciones" },
    ],
    club: [
        { href: "/tournaments", icon: "🏠", label: "Inicio" },
        { href: "/tournaments", icon: "🏆", label: "Torneos" },
        { href: "/profiles/club", icon: "🏟️", label: "Mi Club" },
        { href: "/directory", icon: "🗂️", label: "Directorio" },
        // { href: "/notifications", icon: "🔔", label: "Notificaciones" },
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

    useEffect(() => {
        setRole(getCookieRole());

        // Re-read when cookie changes (e.g. after dev role switch + router.refresh)
        const id = setInterval(() => {
            const r = getCookieRole();
            setRole((prev) => (prev !== r ? r : prev));
        }, 800);
        return () => clearInterval(id);
    }, []);

    const navItems = NAV[role] ?? NAV["jugador"];
    const profileUrl = getProfileUrl(role);

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <div className={styles.logoRow}>
                    <Link href="/tournaments" className={styles.logo}>
                        <span className={styles.logoIcon}>🎾</span>
                        <span className={styles.logoText}>Padel Social</span>
                    </Link>
                    <div className={styles.headerActions}>
                        <ThemeToggle />
                        <div className={styles.userWrapper}>
                            <UserButton
                                showName={true}
                                appearance={{
                                    elements: {
                                        userButtonBox: { padding: "0.5rem", borderRadius: "0.5rem" },
                                        userButtonOuterIdentifier: { color: "var(--foreground)" },
                                    },
                                }}
                            >
                                <UserButton.MenuItems>
                                    <UserButton.Link
                                        label="Mi Perfil Público"
                                        labelIcon={<span style={{ fontSize: "1.2rem", marginLeft: "-0.2rem" }}>🎾</span>}
                                        href={profileUrl}
                                    />
                                </UserButton.MenuItems>
                            </UserButton>
                        </div>
                    </div>
                </div>

                <div className={styles.searchBox}>
                    <span>🔍</span>
                    <input type="text" placeholder="Buscar jugadores, clubes..." />
                </div>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <Link key={item.label} href={item.href} className={styles.navItem}>
                        <span className={styles.navIcon}>{item.icon}</span>
                        <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                ))}
                <button className={styles.postButton}>+ Postear</button>
            </nav>
        </aside>
    );
}
