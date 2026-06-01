"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { tournaments, users, registrations, categoriesTable } from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

export type RegistrationContext = {
    tournament: any;
    currentUser: any;
    allCategories: any[];
    initialRegistrations: any[];
    eligibility: {
        isEligible: boolean;
        reason?: "role" | "gender" | "category" | "membership" | "open_date" | "already_registered" | "full";
        message?: string;
    };
};

export async function getRegistrationContext(tournamentId: string): Promise<RegistrationContext> {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    // 1. Fetch Tournament
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    if (!tournament) throw new Error("Torneo no encontrado");

    // 2. Fetch User
    const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!dbUser) throw new Error("Usuario no encontrado");

    // 3. Eligibility Checks
    const eligibility: RegistrationContext["eligibility"] = { isEligible: true };

    // Role check
    if (session.role !== "jugador") {
        eligibility.isEligible = false;
        eligibility.reason = "role";
        eligibility.message = "Solo jugadores pueden inscribirse en torneos.";
    }

    // Already registered check
    if (eligibility.isEligible) {
        const [existing] = await db
            .select()
            .from(registrations)
            .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.userId, userId)))
            .limit(1);
        if (existing) {
            eligibility.isEligible = false;
            eligibility.reason = "already_registered";
            eligibility.message = "Ya estás inscripto en este torneo.";
        }
    }

    // Modalidad parsing for specific checks
    const mod = typeof tournament.modalidad === 'string' ? JSON.parse(tournament.modalidad) : tournament.modalidad;

    // Gender check
    if (eligibility.isEligible) {
        const reqGender = mod?.genero?.toLowerCase();
        const userGender = dbUser.gender?.toLowerCase();
        if (reqGender && reqGender !== "mixto") {
            const isMaleTournament = reqGender.startsWith("hombre");
            const isFemaleTournament = reqGender.startsWith("mujer");
            const isMalePlayer = userGender === "masculino";
            const isFemalePlayer = userGender === "femenino";
            if ((isMaleTournament && !isMalePlayer) || (isFemaleTournament && !isFemalePlayer)) {
                eligibility.isEligible = false;
                eligibility.reason = "gender";
                eligibility.message = `Este torneo es exclusivo para ${isMaleTournament ? "hombres" : "mujeres"}.`;
            }
        }
    }

    // Category check
    if (eligibility.isEligible) {
        let tCats: string[] = [];
        try {
            if (Array.isArray(tournament.categories)) tCats = tournament.categories;
            else if (typeof tournament.categories === 'string') tCats = JSON.parse(tournament.categories);
        } catch (e) { tCats = []; }

        if (tCats.length > 0 && !tCats.includes("libre")) {
            const userCat = dbUser.category?.trim().toLowerCase();
            const isEligible = tCats.some(tc => tc.trim().toLowerCase() === userCat);
            if (!isEligible) {
                eligibility.isEligible = false;
                eligibility.reason = "category";
                eligibility.message = `Tu categoría (${dbUser.category || "no definida"}) no está permitida.`;
            }
        }
    }

    // Membership check
    if (eligibility.isEligible && tournament.isMembersOnly && tournament.clubId && dbUser.clubId !== tournament.clubId) {
        eligibility.isEligible = false;
        eligibility.reason = "membership";
        eligibility.message = "Exclusivo para miembros del club organizador.";
    }

    // Capacity check
    if (eligibility.isEligible) {
        const maxSlots = Number(mod?.maxSlots || 0);
        if (maxSlots > 0) {
            const [regCount] = await db
                .select({ count: sql`count(*)` })
                .from(registrations)
                .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "confirmed")));
            const count = Number((regCount as any).count || 0);
            if (count >= maxSlots) {
                eligibility.isEligible = false;
                eligibility.reason = "full";
                eligibility.message = "El torneo ha alcanzado su cupo máximo.";
            }
        }
    }

    // 4. Fetch Meta Data
    const allCats = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true)).orderBy(categoriesTable.categoryOrder);

    const dbRegistrations = await db
        .select()
        .from(registrations)
        .where(eq(registrations.tournamentId, tournamentId))
        .orderBy(desc(registrations.createdAt));

    const allUserIds = [...new Set([
        ...dbRegistrations.map(r => r.userId),
        ...dbRegistrations.map(r => r.partnerUserId).filter(Boolean) as string[]
    ])];

    const dbUsersForRegs = allUserIds.length > 0 ? await db.select().from(users).where(inArray(users.id, allUserIds)) : [];

    const initialRegistrations = dbRegistrations.map(reg => {
        const user = dbUsersForRegs.find(u => u.id === reg.userId);
        const namePart1 = user ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0]) : "Jugador";
        let namePart2 = reg.partnerName;
        if (reg.partnerUserId) {
            const partnerUser = dbUsersForRegs.find(u => u.id === reg.partnerUserId);
            if (partnerUser) namePart2 = [partnerUser.firstName, partnerUser.lastName].filter(Boolean).join(" ");
        }
        return {
            id: reg.id,
            name: namePart2 ? `${namePart1} / ${namePart2}` : namePart1,
            category: reg.category || "Libre",
        };
    });

    return {
        tournament: JSON.parse(JSON.stringify(tournament)),
        currentUser: {
            id: userId,
            name: dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : (dbUser.firstName || "Usuario"),
            email: dbUser.email || "",
            gender: dbUser.gender,
        },
        allCategories: JSON.parse(JSON.stringify(allCats)),
        initialRegistrations,
        eligibility
    };
}

