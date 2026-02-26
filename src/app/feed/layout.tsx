import styles from "./layout.module.css";
import Link from "next/link";
import { ReactNode } from "react";

export default function FeedLayout({ children }: { children: ReactNode }) {
    return (
        <div className={styles.layout}>
            {/* Left Sidebar */}
            <aside className={styles.sidebar}>
                <Link href="/feed" className={styles.logo}>
                    <span style={{ fontSize: "1.5rem" }}>🎾</span>
                    <span>Padel Social</span>
                </Link>

                {/* Search moved to sidebar */}
                <div className={styles.searchBox}>
                    <span>🔍</span>
                    <input type="text" placeholder="Buscar jugadores, clubes..." />
                </div>

                <nav className={styles.nav}>
                    <Link href="/feed" className={styles.navItem}>
                        🏠 <span>Inicio</span>
                    </Link>
                    <Link href="/tournaments" className={styles.navItem}>
                        🏆 <span>Torneos</span>
                    </Link>
                    <Link href="/tournaments/create" className={styles.navItem}>
                        ➕ <span>Crear Torneo</span>
                    </Link>
                    <Link href="/tournaments/dashboard" className={styles.navItem}>
                        ⚙️ <span>Panel Organizador</span>
                    </Link>
                    <Link href="/tournaments/setup" className={styles.navItem}>
                        📝 <span>Armar Fixture</span>
                    </Link>
                    <Link href="/tournaments/live" className={styles.navItem}>
                        🔴 <span>Live Score</span>
                    </Link>
                    <Link href="/tournaments/fixture" className={styles.navItem}>
                        📋 <span>Fixture</span>
                    </Link>
                    <Link href="/ranking" className={styles.navItem}>
                        ⭐ <span>Ranking</span>
                    </Link>
                    <Link href="/directory" className={styles.navItem}>
                        🗂️ <span>Directorio</span>
                    </Link>
                    <Link href="/notifications" className={styles.navItem}>
                        🔔 <span>Notificaciones</span>
                    </Link>
                    <Link href="/profile" className={styles.navItem}>
                        👤 <span>Perfil</span>
                    </Link>
                    <button className={styles.postButton}>+ Postear</button>
                </nav>
            </aside>

            {/* Main content — full remaining width */}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
