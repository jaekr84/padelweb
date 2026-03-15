import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { tournaments, users, registrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";
import Link from "next/link";
import { Trophy } from "lucide-react";

type Props = {
    searchParams: Promise<{ id?: string }>;
};

const ALLOWED_ROLES = ["jugador"];

export default async function RegisterPage({ searchParams }: Props) {
    const params = await searchParams;
    const tid = params?.id;

    // Must be logged in
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) redirect("/login");
    const userId = session.userId;

    // Fetch role from DB
    const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // Block clubs / centros
    if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role)) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem" }}>
                <div style={{ textAlign: "center", maxWidth: 420, padding: "2.5rem", borderRadius: "1rem", border: "1px solid var(--surface-border)", background: "var(--surface)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>Acceso no permitido</h2>
                    <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                        Solo los <strong>jugadores</strong> pueden inscribirse en torneos. Los clubes y centros de pádel no pueden participar como jugadores.
                    </p>
                    <Link href="/tournaments" style={{ display: "inline-block", padding: "0.75rem 1.5rem", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                        ← Volver a Torneos
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch tournament and check existing registration
    if (!tid) redirect("/tournaments");
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tid)).limit(1);
    if (!tournament) redirect("/tournaments");

    const [existingRegistration] = await db
        .select()
        .from(registrations)
        .where(
            and(
                eq(registrations.tournamentId, tid),
                eq(registrations.userId, userId)
            )
        )
        .limit(1);

    if (existingRegistration) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="bg-card border border-border p-10 rounded-[2.5rem] text-center shadow-2xl max-w-sm w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
                    <div className="w-20 h-20 bg-blue-600/10 border border-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">¡Ya estás inscripto!</h2>
                    <p className="text-slate-400 text-sm font-bold mb-8">
                        Ya formás parte de {tournament.name}. Podés ver la lista de inscriptos y esperar el inicio del fixture.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link 
                            href={`/tournaments/${tid}/manage`} 
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Ver jugadores inscriptos
                        </Link>
                        <Link 
                            href="/tournaments" 
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                            Volver a torneos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Open date check
    const today = new Date().toISOString().split("T")[0];
    const hasClub = !!dbUser.clubId;
    
    let isOpen = false;
    let openDate: string | null = null;
    let message = "";

    if (tournament.status === "published") {
        if (hasClub) {
            openDate = tournament.openDateClub;
            isOpen = openDate ? today >= openDate : false;
            message = "Las inscripciones para jugadores con club se habilitarán el ";
        } else {
            openDate = tournament.openDateGeneral;
            isOpen = openDate ? today >= openDate : false;
            message = "Las inscripciones generales se habilitarán el ";
        }
    } else if (tournament.status !== "draft") {
        // If it's already live or finished, registration is closed
        isOpen = false;
        openDate = null;
    }

    if (!isOpen) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem" }}>
                <div style={{ textAlign: "center", maxWidth: 420, padding: "2.5rem", borderRadius: "1rem", border: "1px solid var(--surface-border)", background: "var(--surface)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>Inscripción no abierta</h2>
                    <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                        {openDate 
                            ? `${message} ${new Date(openDate + "T12:00:00").toLocaleDateString("es-ES")}.`
                            : "Este torneo no tiene una fecha de inscripción definida o ya ha finalizado."
                        }
                    </p>
                    <Link href="/tournaments" style={{ display: "inline-block", padding: "0.75rem 1.5rem", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                        ← Volver a Torneos
                    </Link>
                </div>
            </div>
        );
    }

    const serialized = JSON.parse(JSON.stringify(tournament));

    return (
        <RegisterForm
            tournament={serialized}
            currentUser={{
                id: userId,
                name: dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : (dbUser.firstName || "Usuario"),
                email: dbUser.email || "",
            }}
        />
    );
}
