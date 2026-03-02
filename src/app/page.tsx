import styles from "./page.module.css";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export const metadata = {
  title: "Padel Social - La Nueva Era del Pádel",
  description: "Conectá, jugá, competí. La primera red social exclusiva para el ecosistema del pádel.",
};

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.navbar}>
        <Link href="/" className={styles.navLogo}>
          🎾 Padel<span>Social</span>
        </Link>

        <div className={styles.navActions}>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.btnOutline}>Iniciar Sesión</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className={styles.btnSolid}>Registrarse</button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Link href="/feed" className={styles.btnOutline} style={{ textDecoration: 'none' }}>
              Ir al Feed
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <div className={styles.bgElements}>
        <div className={styles.glow}></div>
      </div>

      <div className={styles.contentWrapper}>
        <main className={styles.content}>
          <div className={styles.badge}>
            🎾 La Nueva Era del Pádel
          </div>

          <h1 className={styles.title}>
            Conectá. Jugá. <br />
            <span className={styles.highlight}>Competí.</span>
          </h1>

          <p className={styles.description}>
            La primera red social exclusiva para el mundo del pádel.
            Encontrá partidos, armá torneos profesionales y subí de ranking
            en una comunidad diseñada para jugadores, profes y clubes.
          </p>

          <div className={styles.actions}>
            <SignUpButton mode="modal">
              <button className={styles.buttonPrimary}>
                Unirse a la Comunidad
              </button>
            </SignUpButton>
            <Link href="/tournaments" className={styles.buttonSecondary}>
              Explorar Torneos
            </Link>
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>V1.0</span>
              <span className={styles.statLabel}>Próximo Lanzamiento</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>+4</span>
              <span className={styles.statLabel}>Roles de Usuario</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>Live</span>
              <span className={styles.statLabel}>Resultados en Vivo</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
