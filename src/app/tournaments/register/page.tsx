import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { tournaments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";
import FeedLayout from "@/app/feed/layout";


type Props = {
    searchParams: Promise<{ id?: string }>;
};

const ALLOWED_ROLES = ["jugador", "profe"];

export default async function RegisterPage({ searchParams }: Props) {
    const params = await searchParams;
    const tid = params?.id;

    // Must be logged in
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");

    // Fetch role from DB
    const [dbUser] = await db.select().from(users).where(eq(users.id, clerkUser.id)).limit(1);

    // Block clubs / centros
    if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role)) {
        return (
            <FeedLayout>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem" }}>
                    <div style={{ textAlign: "center", maxWidth: 420, padding: "2.5rem", borderRadius: "1rem", border: "1px solid var(--surface-border)", background: "var(--surface)" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>Acceso no permitido</h2>
                        <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                            Solo los <strong>jugadores</strong> y <strong>profes</strong> pueden inscribirse en torneos. Los clubes y centros de pádel no pueden participar como jugadores.
                        </p>
                        <a href="/tournaments" style={{ display: "inline-block", padding: "0.75rem 1.5rem", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                            ← Volver a Torneos
                        </a>
                    </div>
                </div>
            </FeedLayout>
        );
    }

    // Fetch tournament
    if (!tid) redirect("/tournaments");
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tid)).limit(1);
    if (!tournament) redirect("/tournaments");

    // 7-day rule check
    function getDaysUntil(dateStr: string | null): number | null {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tournamentDate = new Date(dateStr);
        if (dateStr.length === 10) {
            tournamentDate.setMinutes(tournamentDate.getMinutes() + tournamentDate.getTimezoneOffset());
        }
        tournamentDate.setHours(0, 0, 0, 0);
        const diffTime = tournamentDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const daysUntil = getDaysUntil(tournament.startDate);
    const isWithin7Days = daysUntil !== null && daysUntil <= 7;

    if (tournament.status === "published" && !isWithin7Days) {
        return (
            <FeedLayout>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem" }}>
                    <div style={{ textAlign: "center", maxWidth: 420, padding: "2.5rem", borderRadius: "1rem", border: "1px solid var(--surface-border)", background: "var(--surface)" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>Inscripción no abierta</h2>
                        <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                            Las inscripciones para este torneo se habilitarán 7 días antes de la fecha de inicio ({new Date(tournament.startDate!).toLocaleDateString("es-ES")}).
                            <br /><br />
                            Faltan <strong>{daysUntil! - 7} días</strong> para que abra la inscripción.
                        </p>
                        <a href="/tournaments" style={{ display: "inline-block", padding: "0.75rem 1.5rem", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                            ← Volver a Torneos
                        </a>
                    </div>
                </div>
            </FeedLayout>
        );
    }

    const serialized = JSON.parse(JSON.stringify(tournament));

    return (
        <FeedLayout>
            <RegisterForm
                tournament={serialized}
                currentUser={{
                    id: clerkUser.id,
                    name: clerkUser.fullName ?? clerkUser.username ?? "Usuario",
                    email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
                }}
            />
        </FeedLayout>
    );
}
