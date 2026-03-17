"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { registrations, users, tournaments, categoriesTable } from "@/db/schema";
import { eq, and, like, or, ne, sql } from "drizzle-orm";

type RegisterInput = {
    tournamentId: string;
    category: string | null;
    partnerName: string | null;
    partnerUserId: string | null;
    isGuestPartner: boolean;
};

export async function registerForTournament(input: RegisterInput) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    // Verify user role and points
    const [dbUser] = await db.select({ 
        role: users.role,
        points: users.points 
    }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!dbUser) throw new Error("Usuario no encontrado");
    if (dbUser.role !== "jugador") {
        throw new Error("Solo jugadores pueden inscribirse");
    }

    // 🔍 1. Obtener todas las categorías para entender la jerarquía y rangos
    const allCategories = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(categoriesTable.categoryOrder);

    // Identificar la categoría del torneo
    const targetCat = allCategories.find(c => 
        c.name.toLowerCase() === input.category?.toLowerCase()
    );

    // 🔍 2. Definir función de validación robusta
    const validatePlayerRequirements = async (userIdToValidate: string, label: string) => {
        const [u] = await db
            .select({ 
                points: users.points, 
                category: users.category,
                firstName: users.firstName,
                lastName: users.lastName,
                gender: users.gender
            })
            .from(users)
            .where(eq(users.id, userIdToValidate))
            .limit(1);

        if (!u || !targetCat) return;
        const userName = u.firstName ? `${u.firstName} ${u.lastName || ""}` : label;

        // --- A. VALIDACIÓN DE GÉNERO ---
        // Obtenemos el género requerido del torneo
        const tournamentMod = typeof tournament.modalidad === 'string' 
            ? JSON.parse(tournament.modalidad) 
            : tournament.modalidad;
        
        const requiredGender = tournamentMod?.genero?.toLowerCase(); // hombre, mujer, mixto
        const playerGender = u.gender?.toLowerCase(); // masculino, femenino

        if (requiredGender && requiredGender !== "mixto") {
            const isMaleTournament = requiredGender.startsWith("hombre");
            const isFemaleTournament = requiredGender.startsWith("mujer");
            const isMalePlayer = playerGender === "masculino";
            const isFemalePlayer = playerGender === "femenino";

            if (isMaleTournament && !isMalePlayer) {
                throw new Error(`El jugador ${userName} no puede inscribirse: el torneo es exclusivo para hombres.`);
            }
            if (isFemaleTournament && !isFemalePlayer) {
                throw new Error(`La jugadora ${userName} no puede inscribirse: el torneo es exclusivo para mujeres.`);
            }
        }

        // --- B. VALIDACIÓN DE CATEGORÍA ---
        if (input.category?.toLowerCase() === "libre") return;

        // Buscamos la categoría del usuario en la tabla maestra (flexibilidad con espacios y mayúsculas)
        const userCatData = allCategories.find(c => 
            c.name.trim().toLowerCase() === u.category?.trim().toLowerCase()
        );

        // B.1 Jerarquía (categoryOrder: 1=Top, 10=Bottom)
        if (userCatData && userCatData.categoryOrder < targetCat.categoryOrder) {
            throw new Error(
                `El jugador ${userName} tiene categoría ${u.category}, que es superior a la permitida (${targetCat.name}).`
            );
        }

        // B.2 Puntos (Backup)
        const points = u.points || 0;
        if (points > targetCat.maxPoints) {
            throw new Error(
                `El puntaje de ${userName} (${points} pts) supera el límite máximo de la categoría ${targetCat.name} (${targetCat.maxPoints} pts).`
            );
        }
    };

    // Verify tournament exists and is published
    const [tournament] = await db.select({ 
        id: tournaments.id, 
        status: tournaments.status, 
        modalidad: tournaments.modalidad
    }).from(tournaments).where(eq(tournaments.id, input.tournamentId)).limit(1);
    
    if (!tournament) throw new Error("Torneo no encontrado");
    if (tournament.status !== "published") throw new Error("El torneo no está disponible para inscripción");

    // 🔍 3. Validar Jugador 1 
    await validatePlayerRequirements(userId, "principal");

    // 🔍 4. Validar Jugador 2 (solo si es un usuario registrado)
    if (input.partnerUserId) {
        await validatePlayerRequirements(input.partnerUserId, "tu compañero");
    }
    
    // 🔍 5. Verificar cupos disponibles (si hay límite)
    const tournamentMod = typeof tournament.modalidad === 'string' 
        ? JSON.parse(tournament.modalidad) 
        : tournament.modalidad;
    
    const maxSlots = tournamentMod?.maxSlots;

    if (maxSlots && maxSlots > 0) {
        const [regCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(registrations)
            .where(
                and(
                    eq(registrations.tournamentId, input.tournamentId),
                    eq(registrations.status, "confirmed")
                )
            );
        
        const count = Number((regCount as any).count || 0);
        if (count >= maxSlots) {
            throw new Error(`Lo sentimos, el torneo ya ha alcanzado su cupo máximo de ${maxSlots} inscripciones.`);
        }
    }

    // Check duplicate registration (same user in same tournament)
    const [existing] = await db
        .select({ id: registrations.id })
        .from(registrations)
        .where(
            and(
                eq(registrations.tournamentId, input.tournamentId),
                eq(registrations.userId, userId),
                eq(registrations.status, "confirmed")
            )
        )
        .limit(1);

    if (existing) throw new Error("Ya estás inscripto en este torneo");

    // Insert
    const newId = crypto.randomUUID();
    const registrationData = {
        id: newId,
        tournamentId: input.tournamentId,
        userId,
        category: input.category || null,
        partnerName: input.partnerName || null,
        partnerUserId: input.partnerUserId || null,
        isGuestPartner: input.isGuestPartner,
        status: "confirmed",
    };

    await db.insert(registrations).values(registrationData);

    // Update last participation date for the user
    await db.update(users)
        .set({ lastParticipationAt: new Date() })
        .where(eq(users.id, userId));
    
    // If partner is a registered user, update them too
    if (input.partnerUserId) {
        await db.update(users)
            .set({ lastParticipationAt: new Date() })
            .where(eq(users.id, input.partnerUserId));
    }

    return registrationData;
}

export async function searchPlayersForPartner(query: string) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");

    if (!query || query.length < 2) return [];

    return await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            category: users.category,
            points: users.points,
            imageUrl: users.imageUrl
        })
        .from(users)
        .where(
            and(
                eq(users.role, "jugador"),
                ne(users.id, session.userId),
                or(
                    like(users.firstName, `%${query}%`),
                    like(users.lastName, `%${query}%`),
                    like(users.email, `%${query}%`)
                ),
                sql`${users.email} NOT IN ('dev@jae.com', 'jae@dev.com')`
            )
        )
        .limit(10);
}
