import styles from "./page.module.css";
import Link from "next/link";

export const metadata = {
  title: "Padel Social - La Nueva Era del Pádel",
  description: "Conectá, jugá, competí. La primera red social exclusiva para el ecosistema del pádel.",
};

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.bgElements}>
        <div className={styles.glow}></div>
      </div>

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
          <Link href="/register" className={styles.buttonPrimary}>
            Unirse a la Comunidad
          </Link>
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
  );
}
