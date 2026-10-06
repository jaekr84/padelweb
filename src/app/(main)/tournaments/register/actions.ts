"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { registrations, users, tournaments, categoriesTable } from "@/db/schema";
import { eq, and, like, or, ne, sql, notInArray } from "drizzle-orm";
import { HIDDEN_USER_EMAILS, noEsInvitado } from "@/lib/hidden-users";
import { getRegistrationPhase, getMaxTeamsPerClub } from "@/lib/tournament-phase";
import { countClubTeams } from "@/lib/club-teams";

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
        points: users.points,
        clubId: users.clubId,
    }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!dbUser) throw new Error("Usuario no encontrado");
    if (session.role !== "jugador") {
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
                gender: users.gender,
                clubId: users.clubId
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

        // Validar que el usuario tenga la categoría exacta en la que se inscribe
        if (!u.category || u.category.trim().toLowerCase() !== input.category?.trim().toLowerCase()) {
            throw new Error(
                `El jugador ${userName} tiene categoría ${u.category || "no definida"}, por lo que no puede inscribirse en la categoría ${input.category}.`
            );
        }

        // --- C. VALIDACIÓN DE MEMBRESÍA ---
        if (tournament.isMembersOnly && tournament.clubId && u.clubId !== tournament.clubId) {
            throw new Error(`El jugador ${userName} no puede inscribirse: este torneo es exclusivo para miembros del club organizador.`);
        }
    };

    // Verify tournament exists and is published
    const [tournament] = await db.select({ 
        id: tournaments.id, 
        status: tournaments.status, 
        modalidad: tournaments.modalidad,
        categories: tournaments.categories,
        isMembersOnly: tournaments.isMembersOnly,
        clubId: tournaments.clubId,
        openDateClub: tournaments.openDateClub,
        openDateGeneral: tournaments.openDateGeneral,
    }).from(tournaments).where(eq(tournaments.id, input.tournamentId)).limit(1);
    
    if (!tournament) throw new Error("Torneo no encontrado");
    if (tournament.status !== "published") throw new Error("El torneo no está disponible para inscripción");

    // 🔍 Etapa de inscripción. Las pantallas ya ocultan el botón fuera de fecha,
    // pero esto es un server action: sin chequearlo acá, el tope por club de la
    // etapa de prioridad se esquivaría con un POST armado a mano.
    const phase = getRegistrationPhase(tournament);
    const userClubId = dbUser.clubId || null;
    const hasPartner = !!(input.partnerUserId || input.partnerName);

    if (phase === "cerrada") {
        throw new Error("Las inscripciones para este torneo todavía no están abiertas.");
    }
    if (phase === "prioridad") {
        if (!userClubId) {
            throw new Error("Por ahora sólo pueden inscribirse jugadores con club. Las inscripciones generales abren el " + (tournament.openDateGeneral || "día de apertura general") + ".");
        }
        // Un compañero sin cuenta no tiene club conocido, así que no se puede
        // validar que sea del mismo: en esta etapa se espera a la apertura general.
        if (hasPartner && !input.partnerUserId) {
            throw new Error("En la etapa de clubes tu compañero tiene que tener cuenta y ser de tu club. Con un compañero invitado podés inscribirte desde la apertura general.");
        }
    }

    // 🔍 La pareja tiene que ser del mismo club, en cualquier etapa. Si ninguno
    // tiene club, también son "del mismo" (ambos sin club).
    if (input.partnerUserId) {
        const [partner] = await db
            .select({ clubId: users.clubId })
            .from(users)
            .where(eq(users.id, input.partnerUserId))
            .limit(1);
        if (!partner) throw new Error("No encontramos a tu compañero.");
        if ((partner.clubId || null) !== userClubId) {
            throw new Error("Tu compañero tiene que ser del mismo club que vos.");
        }
    }

    // 🔍 3. Validar Jugador 1 
    await validatePlayerRequirements(userId, "principal");

    // 🔍 4. Validar Jugador 2 (solo si es un usuario registrado)
    if (input.partnerUserId) {
        await validatePlayerRequirements(input.partnerUserId, "tu compañero");
    }
    
    // 🔍 5. Cupos, tope por club, duplicado e insert, todo bajo un lock de la
    // fila del torneo. Sin el lock, dos inscripciones simultáneas podían contar
    // "queda 1 lugar" a la vez y entrar las dos, pasándose del cupo o del tope
    // del club. `FOR UPDATE` serializa las inscripciones de un mismo torneo.
    const tournamentMod = typeof tournament.modalidad === 'string' 
        ? JSON.parse(tournament.modalidad) 
        : tournament.modalidad;
    const maxSlots = Number(tournamentMod?.maxSlots || 0);
    const maxTeamsPerClub = getMaxTeamsPerClub(tournamentMod);

    const registrationData = {
        id: crypto.randomUUID(),
        tournamentId: input.tournamentId,
        userId,
        category: input.category || null,
        partnerName: input.partnerName || null,
        partnerUserId: input.partnerUserId || null,
        isGuestPartner: input.isGuestPartner,
        status: "confirmed",
    };

    await db.transaction(async (tx) => {
        await tx
            .select({ id: tournaments.id })
            .from(tournaments)
            .where(eq(tournaments.id, input.tournamentId))
            .for("update");

        if (maxSlots > 0) {
            const [regCount] = await tx
                .select({ count: sql<number>`count(*)` })
                .from(registrations)
                .where(
                    and(
                        eq(registrations.tournamentId, input.tournamentId),
                        eq(registrations.status, "confirmed")
                    )
                );
            if (Number((regCount as any).count || 0) >= maxSlots) {
                throw new Error(`Lo sentimos, el torneo ya ha alcanzado su cupo máximo de ${maxSlots} inscripciones.`);
            }
        }

        // Tope de equipos por club, sólo en la etapa de prioridad. Como la
        // pareja es del mismo club, el equipo cuenta para el club de quien inscribe.
        if (phase === "prioridad" && maxTeamsPerClub > 0 && userClubId) {
            const clubTeams = await countClubTeams(input.tournamentId, userClubId, tx);
            if (clubTeams >= maxTeamsPerClub) {
                throw new Error(`Tu club ya inscribió ${clubTeams} de ${maxTeamsPerClub} equipos permitidos en la etapa de clubes. Vas a poder inscribirte cuando se abra al público${tournament.openDateGeneral ? ` (${tournament.openDateGeneral})` : ""}.`);
            }
        }

        // Duplicado (mismo jugador en el mismo torneo)
        const [existing] = await tx
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

        await tx.insert(registrations).values(registrationData);
    });

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

export async function cancelRegistration(tournamentId: string) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    // Find the registration where the user is either the main player or the partner
    const [registration] = await db
        .select({ id: registrations.id })
        .from(registrations)
        .where(
            and(
                eq(registrations.tournamentId, tournamentId),
                or(
                    eq(registrations.userId, userId),
                    eq(registrations.partnerUserId, userId)
                ),
                eq(registrations.status, "confirmed")
            )
        )
        .limit(1);

    if (!registration) {
        throw new Error("No se encontró una inscripción activa para este torneo.");
    }

    // Verify tournament status - can only unregister if still in registration phase
    const [tournament] = await db
        .select({ status: tournaments.status })
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId))
        .limit(1);

    if (!tournament) throw new Error("Torneo no encontrado");
    
    // Usually only allow cancellation if tournament is still in draft or published (registration open)
    if (tournament.status !== "published" && tournament.status !== "draft") {
        throw new Error("No puedes desincribirte una vez que el torneo ha comenzado o finalizado.");
    }

    // Delete the registration
    await db.delete(registrations).where(eq(registrations.id, registration.id));

    return { success: true };
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
                ne(users.id, session.userId),
                or(
                    like(users.firstName, `%${query}%`),
                    like(users.lastName, `%${query}%`),
                    like(users.email, `%${query}%`),
                    sql`CONCAT(${users.firstName}, ' ', ${users.lastName}) LIKE ${`%${query}%`}`
                ),
                notInArray(users.email, HIDDEN_USER_EMAILS as unknown as string[]),
                noEsInvitado()
            )
        )
        .limit(10);
}

