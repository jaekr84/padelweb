"use client";

import Link from "next/link";
import styles from "./landing.module.css";

export default function LandingPage() {
    return (
        <div className={styles.root}>
            {/* ── Navbar ── */}
            <nav className={styles.nav}>
                <div className={styles.navBrand}>
                    <span className={styles.navLogo}>🎾</span>
                    <span className={styles.navName}>PadelApp</span>
                </div>
                <div className={styles.navActions}>
                    <Link href="/sign-in" className={styles.navSignIn}>Iniciar sesión</Link>
                    <Link href="/sign-up" className={styles.navSignUp}>Registrarse</Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className={styles.hero}>
                <div className={styles.heroGlow} />
                <div className={styles.heroContent}>
                    <div className={styles.heroBadge}>🏆 La plataforma de pádel en Argentina</div>
                    <h1 className={styles.heroTitle}>
                        Tu comunidad<br />
                        <span className={styles.heroAccent}>de pádel</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Encontrá torneos, reservá clases con instructores certificados
                        y conectá con tu centro de pádel favorito.
                    </p>
                    <div className={styles.heroCTAs}>
                        <Link href="/sign-up" className={styles.ctaPrimary}>
                            Comenzar gratis →
                        </Link>
                        <Link href="/sign-in" className={styles.ctaSecondary}>
                            Ya tengo cuenta
                        </Link>
                    </div>
                </div>

                {/* Floating court visual */}
                <div className={styles.heroVisual}>
                    <div className={styles.courtCard}>
                        <div className={styles.courtTop}>
                            <span className={styles.courtEmoji}>🎾</span>
                            <div>
                                <div className={styles.courtTitle}>Torneo Apertura 2025</div>
                                <div className={styles.courtSub}>Palermo · 3ra–5ta · Inscripción abierta</div>
                            </div>
                            <span className={styles.liveBadge}>🔴 LIVE</span>
                        </div>
                        <div className={styles.courtStats}>
                            <div className={styles.cStat}><div className={styles.cNum}>48</div><div className={styles.cLbl}>Inscriptos</div></div>
                            <div className={styles.cStat}><div className={styles.cNum}>12</div><div className={styles.cLbl}>Grupos</div></div>
                            <div className={styles.cStat}><div className={styles.cNum}>3</div><div className={styles.cLbl}>Canchas</div></div>
                        </div>
                    </div>
                    <div className={styles.proCard}>
                        <span className={styles.proAvatar}>🎓</span>
                        <div>
                            <div className={styles.proName}>Carlos Rodríguez</div>
                            <div className={styles.proLevel}>Profesor Nacional · ⭐ 4.9</div>
                        </div>
                        <Link href="/sign-up" className={styles.proBook}>Reservar</Link>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className={styles.features}>
                <div className={styles.featuresGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🏆</div>
                        <h3>Torneos en vivo</h3>
                        <p>Seguí los partidos, resultados y grupos en tiempo real. Inscribite en segundos.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🎓</div>
                        <h3>Instructores certificados</h3>
                        <p>Elegí tu profe ideal, chequeá su horario y reservá por WhatsApp sin salir de la app.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🏟️</div>
                        <h3>Centros de pádel</h3>
                        <p>Encontrá canchas cerca tuyo, consultá horarios y reservá donde quieras.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📊</div>
                        <h3>Tu ranking personal</h3>
                        <p>Acumulá puntos en cada torneo y escalá el ranking de tu categoría.</p>
                    </div>
                </div>
            </section>

            {/* ── CTA final ── */}
            <section className={styles.ctaSection}>
                <h2 className={styles.ctaTitle}>¿Listo para jugar?</h2>
                <p className={styles.ctaDesc}>Creá tu cuenta gratis y empezá a ser parte de la comunidad.</p>
                <Link href="/sign-up" className={styles.ctaPrimary} style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}>
                    Crear cuenta gratis →
                </Link>
            </section>

            {/* ── Footer ── */}
            <footer className={styles.footer}>
                <span>🎾 PadelApp · Argentina 2025</span>
            </footer>
        </div>
    );
}
