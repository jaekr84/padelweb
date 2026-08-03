import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { tournaments, users, registrations } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";
import Link from "next/link";
import { Trophy, Ban, Users, Clock, Shield } from "lucide-react";

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
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 text-center">
                <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-xl max-w-sm">
                    <div className="w-20 h-20 bg-rojo/10 border border-rojo/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Ban className="w-10 h-10 text-rojo" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase text-foreground mb-2 italic">Acceso no permitido</h2>
                    <p className="text-muted-foreground text-xs mb-8 font-medium italic leading-relaxed">
                        Solo los <strong>jugadores</strong> pueden inscribirse en torneos. Los clubes y centros de pádel no pueden participar como jugadores.
                    </p>
                    <Link href="/tournaments" className="w-full inline-block py-4 bg-azul-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-azul-primary/20 active:scale-95 transition-all">
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
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 text-center">
                <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-xl max-w-sm w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-azul-primary" />
                    <div className="w-20 h-20 bg-azul-primary/5 border border-azul-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-10 h-10 text-azul-primary" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-foreground mb-2 italic">¡Ya estás inscripto!</h2>
                    <p className="text-muted-foreground text-xs font-bold mb-8 italic leading-relaxed">
                        Ya formás parte de <span className="text-azul-primary underline underline-offset-4 decoration-2">{tournament.name}</span>. Podés ver la lista de inscriptos y esperar el inicio del fixture.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link
                            href={`/tournaments/${tid}/manage`}
                            className="w-full py-4 bg-azul-primary hover:bg-azul-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-azul-primary/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Ver jugadores inscriptos
                        </Link>
                        <Link
                            href="/tournaments"
                            className="w-full py-4 bg-muted hover:bg-muted/70 text-muted-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-border"
                        >
                            Volver a torneos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Open date check
    const today = new Date().toLocaleString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).split(',')[0];
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
        isOpen = false;
        openDate = null;
    }

    // --- Pre-check Requirements (Gender and Category) ---
    const modalidad = typeof tournament.modalidad === 'string'
        ? JSON.parse(tournament.modalidad)
        : tournament.modalidad;

    const reqGender = modalidad?.genero?.toLowerCase();
    const userGender = dbUser.gender?.toLowerCase();

    // 1. Check Gender
    if (reqGender && reqGender !== "mixto") {
        const isMaleTournament = reqGender.startsWith("hombre");
        const isFemaleTournament = reqGender.startsWith("mujer");
        const isMalePlayer = userGender === "masculino";
        const isFemalePlayer = userGender === "femenino";

        if ((isMaleTournament && !isMalePlayer) || (isFemaleTournament && !isFemalePlayer)) {
            return (
                <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 text-center">
                    <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-xl max-w-sm">
                        <div className="w-20 h-20 bg-rojo/10 border border-rojo/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-rojo" />
                        </div>
                        <h2 className="text-2xl font-black italic uppercase text-foreground mb-2 italic">Requisito de Género</h2>
                        <p className="text-muted-foreground text-xs mb-8 font-medium italic leading-relaxed">
                            Este torneo es exclusivo para {isMaleTournament ? "hombres" : "mujeres"}. Tu perfil indica que no cumples con este requisito.
                        </p>
                        <Link href="/tournaments" className="w-full inline-block py-4 bg-muted text-muted-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest border border-border hover:bg-muted/70 transition-all">
                            ← Volver
                        </Link>
                    </div>
                </div>
            );
        }
    }

    const { categoriesTable } = require("@/db/schema");
    const allCats = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true)).orderBy(categoriesTable.categoryOrder);

    const tCats: string[] = Array.isArray(tournament.categories)
        ? tournament.categories
        : (typeof tournament.categories === 'string' ? JSON.parse(tournament.categories) : []);

    if (tCats.length > 0 && !tCats.includes("libre")) {
        const userCat = dbUser.category?.trim().toLowerCase();
        const isEligible = tCats.some(tc => tc.trim().toLowerCase() === userCat);

        if (!isEligible) {
            return (
                <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 text-center">
                    <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-xl max-w-sm">
                        <div className="w-20 h-20 bg-azul-primary/5 border border-azul-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-10 h-10 text-azul-primary" />
                        </div>
                        <h2 className="text-2xl font-black italic uppercase text-foreground mb-2 italic">Categoría No Permitida</h2>
                        <p className="text-muted-foreground text-xs mb-8 font-medium italic leading-relaxed">
                            Tu categoría ({dbUser.category || "no definida"}) no está permitida para este torneo. Categorías habilitadas: {tCats.join(", ")}.
                        </p>
                        <Link href="/tournaments" className="w-full inline-block py-4 bg-muted text-muted-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest border border-border hover:bg-muted/70 transition-all">
                            ← Volver
                        </Link>
                    </div>
                </div>
            );
        }
    }

    // 3. Check Club Membership if Members Only
    if (tournament.isMembersOnly && tournament.clubId && dbUser.clubId !== tournament.clubId) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 text-center">
                <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-xl max-w-sm">
                    <div className="w-20 h-20 bg-celeste/10 border border-celeste/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-celeste" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase text-foreground mb-2 italic">Exclusivo Miembros</h2>
                    <p className="text-muted-foreground text-xs mb-8 font-medium italic leading-relaxed">
                        Este torneo es exclusivo para miembros del club organizador. Tu perfil no está asociado a este club.
                    </p>
                    <Link href="/tournaments" className="w-full inline-block py-4 bg-muted text-muted-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest border border-border hover:bg-muted/70 transition-all">
                        ← Volver a Torneos
                    </Link>
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 text-center">
                <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-xl max-w-sm">
                    <div className="w-20 h-20 bg-azul-primary/5 border border-azul-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-azul-primary" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase text-foreground mb-2 italic">Inscripción no abierta</h2>
                    <p className="text-muted-foreground text-xs mb-8 font-medium italic leading-relaxed">
                        {openDate
                            ? `${message} ${new Date(openDate + "T12:00:00").toLocaleDateString("es-ES")}.`
                            : "Este torneo no tiene una fecha de inscripción definida o ya ha finalizado."
                        }
                    </p>
                    <Link href="/tournaments" className="w-full inline-block py-4 bg-azul-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-azul-primary/20 active:scale-95 transition-all">
                        ← Volver a Torneos
                    </Link>
                </div>
            </div>
        );
    }

    const serialized = JSON.parse(JSON.stringify(tournament));
    const serializedCats = JSON.parse(JSON.stringify(allCats));

    // Fetch all registrations to show in same page
    const dbRegistrations = await db
        .select()
        .from(registrations)
        .where(eq(registrations.tournamentId, tid))
        .orderBy(desc(registrations.createdAt));

    const allUserIds = [...new Set([
        ...dbRegistrations.map(r => r.userId),
        ...dbRegistrations.map(r => r.partnerUserId).filter(Boolean) as string[]
    ])];

    const dbUsersForRegs = allUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, allUserIds))
        : [];

    const initialRegistrations = dbRegistrations.map(reg => {
        const user = dbUsersForRegs.find(u => u.id === reg.userId);
        const namePart1 = user
            ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0])
            : "Jugador";

        let namePart2 = reg.partnerName;
        if (reg.partnerUserId) {
            const partnerUser = dbUsersForRegs.find(u => u.id === reg.partnerUserId);
            if (partnerUser) {
                namePart2 = [partnerUser.firstName, partnerUser.lastName].filter(Boolean).join(" ");
            }
        }

        return {
            id: reg.id,
            name: namePart2 ? `${namePart1} / ${namePart2}` : namePart1,
            category: reg.category || "Libre",
        };
    });

    return (
        <RegisterForm
            tournament={serialized}
            allCategories={serializedCats}
            currentUser={{
                id: userId,
                name: dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : (dbUser.firstName || "Usuario"),
                email: dbUser.email || "",
                gender: dbUser.gender,
            }}
            initialRegistrations={initialRegistrations}
        />
    );
}
