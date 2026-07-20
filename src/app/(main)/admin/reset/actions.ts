"use server";

import { db } from "@/db";
import {
    users, clubs, clubRequests, registrationRequests,
    tournaments, registrations, tournamentGroups, groupMatches, bracketMatches,
    openCourtEvents, openCourtRegistrations, openCourtCourts, openCourtMatches,
    publicMatches, publicMatchRegistrations,
    posts, postComments, marketplaceItems,
    conversations, messages, pushSubscriptions, contactMessages,
} from "@/db/schema";
import { getSession, comparePassword } from "@/lib/auth-server";
import { count, sql, inArray, or, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { RESET_CONFIRMATIONS, type ResetScope, type ResetCounts } from "./constants";
import { HIDDEN_USER_EMAILS } from "@/lib/hidden-users";

// ── Reset de datos de prueba ──────────────────────────────────────────────
// Pensado para dejar la base en punto de inicio antes de producción.
// Nunca toca: categorías, configuración del sistema (system_settings) ni
// sponsors — son datos maestros/comerciales, no de prueba.

// Cuentas que sobreviven a cualquier reset, además de todo rol superadmin.
const PROTECTED_EMAILS = HIDDEN_USER_EMAILS as readonly string[];

/** Un usuario está protegido si es superadmin o está en la lista de sistema. */
const protectedUserCondition = sql`(${users.role} LIKE '%superadmin%' OR ${users.email} IN (${sql.join(
    PROTECTED_EMAILS.map(e => sql`${e}`),
    sql`, `
)}))`;

const deletableUserCondition = sql`NOT ${protectedUserCondition}`;

async function checkSuperAdmin() {
    const session = await getSession() as { userId: string; role: string } | null;
    if (!session || session.role !== "superadmin") {
        throw new Error("Solo un superadmin puede resetear la base de datos");
    }
    return session;
}

/** Conteos reales para mostrarlos en la confirmación antes de borrar. */
export async function getResetCounts(): Promise<ResetCounts> {
    await checkSuperAdmin();

    const one = async (table: any, where?: any) => {
        const q = db.select({ v: count() }).from(table);
        const [row] = where ? await q.where(where) : await q;
        return Number(row?.v ?? 0);
    };

    const [
        deletableUsers, protectedUsers, tournamentsCount, tournamentRegs,
        ocEvents, ocRegs, matchesCount, matchRegs, clubsCount,
        postsCount, marketCount, convCount, msgCount,
    ] = await Promise.all([
        one(users, deletableUserCondition),
        one(users, protectedUserCondition),
        one(tournaments),
        one(registrations),
        one(openCourtEvents),
        one(openCourtRegistrations),
        one(publicMatches),
        one(publicMatchRegistrations),
        one(clubs),
        one(posts),
        one(marketplaceItems),
        one(conversations),
        one(messages),
    ]);

    return {
        users: deletableUsers,
        protectedUsers,
        tournaments: tournamentsCount,
        tournamentRegistrations: tournamentRegs,
        openCourtEvents: ocEvents,
        openCourtRegistrations: ocRegs,
        matches: matchesCount,
        matchRegistrations: matchRegs,
        clubs: clubsCount,
        posts: postsCount,
        marketplaceItems: marketCount,
        conversations: convCount,
        messages: msgCount,
    };
}

// Cada bloque borra de hijo a padre para no dejar registros huérfanos.
// `tx` es la transacción: si algo falla, no queda un reset a medias.

async function wipeTournaments(tx: any) {
    await tx.delete(bracketMatches);
    await tx.delete(groupMatches);
    await tx.delete(tournamentGroups);
    await tx.delete(registrations);
    await tx.delete(tournaments);
    // Los puntos vienen de torneos que ya no existen: el ranking quedaría inflado.
    await tx.update(users).set({ points: 0 });
}

async function wipeOpenCourt(tx: any) {
    await tx.delete(openCourtMatches);
    await tx.delete(openCourtRegistrations);
    await tx.delete(openCourtCourts);
    await tx.delete(openCourtEvents);
}

async function wipeMatches(tx: any) {
    await tx.delete(publicMatchRegistrations);
    await tx.delete(publicMatches);
}

async function wipeClubs(tx: any) {
    await tx.delete(clubRequests);
    await tx.delete(clubs);
    // Los usuarios que sobreviven quedarían apuntando a un club inexistente.
    await tx.update(users).set({ clubId: null });
}

async function wipeSocial(tx: any) {
    await tx.delete(postComments);
    await tx.delete(posts);
    await tx.delete(marketplaceItems);
    await tx.delete(messages);
    await tx.delete(conversations);
    await tx.delete(pushSubscriptions);
    await tx.delete(contactMessages);
    await tx.delete(registrationRequests);
}

/**
 * Borra los usuarios de prueba y todo lo que los referencia, para no dejar
 * inscripciones ni mensajes apuntando a cuentas inexistentes.
 * Conserva superadmins y las cuentas de sistema.
 */
async function wipeUsers(tx: any) {
    const deletableIds = (await tx
        .select({ id: users.id })
        .from(users)
        .where(deletableUserCondition)) as { id: string }[];

    if (deletableIds.length === 0) return;
    const ids = deletableIds.map(u => u.id);

    // En lotes: un IN con miles de ids revienta el límite de la consulta.
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);

        // Todo lo que cuelga de un usuario borrado.
        await tx.delete(registrations).where(inArray(registrations.userId, chunk));
        await tx.delete(publicMatchRegistrations).where(inArray(publicMatchRegistrations.userId, chunk));
        await tx.delete(openCourtRegistrations).where(inArray(openCourtRegistrations.userId, chunk));
        await tx.delete(postComments).where(inArray(postComments.userId, chunk));
        await tx.delete(posts).where(inArray(posts.userId, chunk));
        await tx.delete(marketplaceItems).where(inArray(marketplaceItems.userId, chunk));
        await tx.delete(messages).where(inArray(messages.senderId, chunk));
        await tx.delete(conversations).where(
            or(inArray(conversations.user1Id, chunk), inArray(conversations.user2Id, chunk))
        );
        await tx.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, chunk));
    }

    await tx.delete(registrationRequests);

    await tx.delete(users).where(deletableUserCondition);
}

/**
 * Ejecuta el reset del ámbito indicado. `confirmation` debe coincidir
 * exactamente con RESET_CONFIRMATIONS[scope] — se valida también acá y no
 * solo en la UI, para que no se pueda disparar desde afuera por accidente.
 */
export async function resetScope(scope: ResetScope, confirmation: string, password: string) {
    const session = await checkSuperAdmin();

    const expected = RESET_CONFIRMATIONS[scope];
    if (!expected) throw new Error("Ámbito de reset inválido");
    if (confirmation.trim() !== expected) {
        throw new Error(`Confirmación incorrecta. Escribí exactamente: ${expected}`);
    }

    // Segunda capa: reconfirmar identidad. Tener la sesión abierta no alcanza
    // para borrar datos — protege el caso de una pantalla desbloqueada.
    if (!password) throw new Error("Ingresá tu contraseña para confirmar");

    const [me] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

    if (!me?.passwordHash) throw new Error("No se pudo verificar tu identidad");

    const passwordOk = await comparePassword(password, me.passwordHash);
    if (!passwordOk) {
        console.warn(`[RESET] contraseña incorrecta para ${session.userId} (scope="${scope}")`);
        throw new Error("Contraseña incorrecta");
    }

    const before = await getResetCounts();

    await db.transaction(async (tx) => {
        switch (scope) {
            case "tournaments": await wipeTournaments(tx); break;
            case "openCourt": await wipeOpenCourt(tx); break;
            case "matches": await wipeMatches(tx); break;
            case "clubs": await wipeClubs(tx); break;
            case "social": await wipeSocial(tx); break;
            case "users": await wipeUsers(tx); break;
            case "all":
                // Orden: primero lo que depende de usuarios, después los usuarios.
                await wipeTournaments(tx);
                await wipeOpenCourt(tx);
                await wipeMatches(tx);
                await wipeSocial(tx);
                await wipeUsers(tx);
                await wipeClubs(tx);
                break;
        }
    });

    console.warn(
        `[RESET] scope="${scope}" ejecutado por ${session.userId} el ${new Date().toISOString()}`,
        before
    );

    for (const path of ["/admin/users", "/admin/reset", "/tournaments", "/cancha-abierta", "/partidos", "/ranking", "/clubes", "/home"]) {
        revalidatePath(path);
    }

    const after = await getResetCounts();
    return { success: true, before, after };
}
