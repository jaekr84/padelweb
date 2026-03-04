"use client";

import Link from "next/link";
import styles from "./landing.module.css";

export default function LandingPage() {
    return (
        <div className={styles.root}>

            {/* ══ NAV (Floating Pill) ══ */}
            <div className={styles.navWrapper}>
                <nav className={styles.nav}>
                    <div className={styles.navBrand}>
                        <img
                            src="/img/stickers 1.jpg"
                            alt="Logo ACAP"
                            className={styles.navLogoImg}
                        />
                        <div className={styles.navName}>
                            <span className={styles.navNameTop}>Asociación Coreana Argentina de</span>
                            <span className={styles.navNameBottom}>PÁDEL</span>
                        </div>
                    </div>

                    <div className={styles.navLinks}>
                        <a href="#torneos" className={styles.navLink}>Torneos</a>
                        <a href="#ranking" className={styles.navLink}>Ranking</a>
                        <a href="#profes" className={styles.navLink}>Instructores</a>
                        <a href="#centros" className={styles.navLink}>Centros</a>
                    </div>

                    <div className={styles.navActions}>
                        <Link href="/sign-in" className={styles.navSignIn}>Iniciar Sesión</Link>
                        <Link href="/sign-up" className={styles.navSignUp}>Registrarse</Link>
                    </div>
                </nav>
            </div>

            {/* ══ HERO ══ */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.heroBadge}>
                        🇰🇷 🇦🇷 &nbsp; Comunidad Oficial · Buenos Aires
                    </div>
                    <div className={styles.heroTitleSmall}>Asociación Coreana Argentina de</div>
                    <h1 className={styles.heroTitle}>
                        PÁDEL
                    </h1>
                    <p className={styles.heroSubtitle}>
                        La plataforma oficial de la Asociación donde podés inscribirte a torneos,
                        seguir el ranking en tiempo real, encontrar instructores certificados
                        y explorar los mejores centros de pádel.
                    </p>
                    <div className={styles.heroCTAs}>
                        <Link href="/sign-up" className={styles.ctaPrimary}>
                            Registrarse Gratis →
                        </Link>
                    </div>
                </div>

                <div className={styles.heroVisual}>
                    <div className={styles.logoWrapper}>
                        <img
                            src="/img/stickers 1.jpg"
                            alt="Asociación Coreana Argentina de Pádel"
                            className={styles.bigLogoImg}
                        />
                    </div>

                    {/* Stats Grid exactly next to logo like UI mockup */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>+50</div>
                            <div className={styles.statLbl}>Torneos</div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>+300</div>
                            <div className={styles.statLbl}>Jugadores</div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>+15</div>
                            <div className={styles.statLbl}>Centros</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ DIVIDER ══ */}
            <div className={styles.dividerStrip} />

            {/* ══ FEATURES ══ */}
            <section className={styles.features} id="torneos">
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionLabel}>Features</p>
                    <h2 className={styles.sectionTitle}>¿Qué podés hacer?</h2>
                </div>

                <div className={styles.featuresGrid}>
                    <div className={styles.featureCard} id="ranking">
                        <div className={styles.featureIcon}>🏆</div>
                        <div className={styles.featureText}>
                            <h3>Torneos Oficiales</h3>
                        </div>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⭐</div>
                        <div className={styles.featureText}>
                            <h3>Ranking Federado</h3>
                        </div>
                    </div>

                    <div className={styles.featureCard} id="profes">
                        <div className={styles.featureIcon}>🎓</div>
                        <div className={styles.featureText}>
                            <h3>Instructores Certificados</h3>
                        </div>
                    </div>

                    <div className={styles.featureCard} id="centros">
                        <div className={styles.featureIcon}>🏟️</div>
                        <div className={styles.featureText}>
                            <h3>Centros de Pádel</h3>
                        </div>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📊</div>
                        <div className={styles.featureText}>
                            <h3>Estadísticas Personales</h3>
                        </div>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🗂️</div>
                        <div className={styles.featureText}>
                            <h3>Directorio Comunitario</h3>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ CTA ══ */}
            <section className={styles.ctaSection}>
                <div className={styles.ctaInner}>
                    <h2 className={styles.ctaTitle}>
                        Formá parte de la <span className={styles.accentSky}>Asociación Coreana Argentina</span> de Pádel
                    </h2>
                    <div className={styles.ctaButtons}>
                        <Link href="/sign-up" className={styles.ctaButtonPrimary}>
                            CTA →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <div className={styles.footerBrand}>
                        <img src="/img/stickers 1.jpg" alt="ACAP" className={styles.footerLogo} />
                        <span className={styles.footerName}>
                            ASOCIACIÓN COREANA ARGENTINA DE PÁDEL
                        </span>
                    </div>
                    <p className={styles.footerCopy}>
                        © {new Date().getFullYear()} - All rights reserved.
                    </p>
                </div>
            </footer>

        </div>
    );
}
