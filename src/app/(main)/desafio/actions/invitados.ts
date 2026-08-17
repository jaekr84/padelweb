"use server";

// Jugadores invitados: gente que juega un desafío sin tener cuenta.
//
// El invitado es una fila de `users` de verdad, con `isGuest = true`. No es una
// entidad aparte a propósito: todo el módulo guarda `userId` como varchar y hace
// join a `users` para nombre, categoría y foto (inscriptos, pool, parejas, las 4
// columnas de cada partido, el ledger). Con una fila de users no hay que tocar
// ninguna de esas consultas, y sobre todo: el día que se le da el alta el id no
// cambia, así que los puntos que ganó como invitado ya son suyos sin migrar nada.
//
// Un invitado no puede entrar a la app: se crea sin `passwordHash` y el login
// rechaza cualquier cuenta que no tenga uno.

import { db } from "@/db";
import {
    challengeMatches, challengePairs, challengePoints, challengeQueue,
    challengeRegistrations, invitations, users,
} from "@/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { SignJWT } from "jose";
import { normalizarLado } from "@/lib/desafio";
import { ErrorDesafio, ejecutar, limpiar, nuevoId, requerirAdmin, revalidarDesafio } from "./_helpers";
import { inscribirJugador } from "./inscripciones";

export type DatosInvitado = {
    nombre: string;
    apellido?: string | null;
    /** Nombre de la categoría, tal cual figura en `categories`. */
    categoria?: string | null;
    /** drive | reves | ambos. Sin lado no se puede armar pareja. */
    lado: string;
    telefono?: string | null;
};

export type InvitadoResumen = {
    userId: string;
    nombre: string;
    categoria: string | null;
    lado: string | null;
    telefono: string | null;
    creadoEn: string;
    /** En cuántos desafíos está inscripto y cuántos puntos lleva acumulados. */
    desafios: number;
    puntos: number;
};

/**
 * El email es NOT NULL UNIQUE, así que el invitado necesita uno. Se usa un
 * dominio inválido a propósito: nadie puede recibir mail ahí ni registrarse con
 * él por accidente. Al darle el alta se reemplaza por el real.
 */
const emailDeInvitado = (id: string) => `invitado.${id}@invitado.local`;

/** Mismo secreto y misma vida útil que el resto de las invitaciones del módulo. */
const SECRETO_INVITACION = new TextEncoder().encode(
    process.env.INVITATION_SECRET || "padel_secret_key_123_change_me"
);
const HORAS_DE_VIDA = 24;

const nombreCompleto = (u: { firstName: string | null; lastName: string | null }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Invitado";

// ── Alta del invitado ───────────────────────────────────────────────────────

/**
 * Crea el invitado y lo inscribe en el desafío de una. Si no entra por
 * categoría, entra como excepción: el admin lo está cargando a mano, ya sabe
 * lo que está haciendo.
 */
export async function crearInvitado(desafioId: string, datos: DatosInvitado) {
    return ejecutar("crearInvitado", async () => {
        await requerirAdmin();

        const nombre = limpiar(datos.nombre);
        if (!nombre) throw new ErrorDesafio("El nombre del invitado es obligatorio.");

        const lado = normalizarLado(datos.lado);
        if (!lado) throw new ErrorDesafio("Elegí de qué lado juega el invitado.");

        const id = nuevoId();
        await db.insert(users).values({
            id,
            email: emailDeInvitado(id),
            // Sin hash no hay login posible: ver src/app/login/actions.ts.
            passwordHash: null,
            role: "jugador",
            firstName: nombre,
            lastName: limpiar(datos.apellido),
            phone: limpiar(datos.telefono),
            category: limpiar(datos.categoria) ?? "D",
            side: lado,
            isGuest: true,
        });

        // La inscripción normal: valida cupo y estado, y escribe el punto de
        // participación como con cualquier jugador. Si la categoría no entra se
        // reintenta como excepción — el admin lo está cargando a mano —, pero
        // recién ahí, para no marcar de excepción a quien sí califica.
        let alta = await inscribirJugador(desafioId, id, { lado });
        if (!alta.ok) alta = await inscribirJugador(desafioId, id, { lado, excepcion: true });
        if (!alta.ok) {
            // Sin la inscripción el invitado no tiene razón de existir.
            await db.delete(users).where(eq(users.id, id));
            throw new ErrorDesafio(alta.error);
        }

        revalidarDesafio(desafioId);
        return { userId: id, nombre };
    });
}

// ── Listado ─────────────────────────────────────────────────────────────────

export async function listarInvitados(): Promise<InvitadoResumen[]> {
    const filas = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            category: users.category,
            side: users.side,
            phone: users.phone,
            createdAt: users.createdAt,
            desafios: sql<number>`(
                SELECT COUNT(*) FROM challenge_registrations r
                WHERE r.user_id = ${users.id} AND r.status != 'baja'
            )`,
            puntos: sql<number>`(
                SELECT COALESCE(SUM(p.points), 0) FROM challenge_points p WHERE p.user_id = ${users.id}
            )`,
        })
        .from(users)
        .where(eq(users.isGuest, true))
        .orderBy(asc(users.firstName));

    return filas.map((u) => ({
        userId: u.id,
        nombre: nombreCompleto(u),
        categoria: u.category,
        lado: u.side,
        telefono: u.phone,
        creadoEn: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
        desafios: Number(u.desafios) || 0,
        puntos: Number(u.puntos) || 0,
    }));
}

/** Cuentas reales con las que se puede fusionar un invitado. */
export async function cuentasParaFusionar() {
    const filas = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            category: users.category,
        })
        .from(users)
        .where(and(eq(users.isGuest, false), eq(users.role, "jugador")))
        .orderBy(asc(users.firstName));

    return filas.map((u) => ({
        userId: u.id,
        nombre: nombreCompleto(u),
        email: u.email,
        categoria: u.category,
    }));
}

/** Carga el invitado o falla con un mensaje mostrable. */
async function traerInvitado(userId: string) {
    const [u] = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, isGuest: users.isGuest })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    if (!u) throw new ErrorDesafio("El invitado no existe.");
    if (!u.isGuest) throw new ErrorDesafio("Ese jugador ya tiene cuenta: no es un invitado.");
    return u;
}

// ── Link de activación ──────────────────────────────────────────────────────

/**
 * Genera el link para que el invitado active su propia cuenta.
 *
 * No sirve una invitación normal: esa crea una cuenta nueva (`registerAction`
 * inserta una fila con `id = email`), así que el invitado terminaría con dos
 * identidades y su historial quedaría en la vieja. Esta invitación lleva
 * `targetUserId`: activa la cuenta que ya existe, sin tocar el id.
 *
 * Comparte las garantías del módulo de invitaciones: vive en la base, dura 24
 * horas y se consume al usarse.
 */
export async function generarLinkDeActivacion(invitadoId: string) {
    return ejecutar("generarLinkDeActivacion", async () => {
        const session = await requerirAdmin();
        const invitado = await traerInvitado(invitadoId);

        // Un link nuevo invalida el anterior: si el admin lo regenera es porque
        // el viejo se perdió, y dos links vivos para la misma cuenta es una
        // credencial de más dando vueltas.
        await db
            .update(invitations)
            .set({ revokedAt: new Date() })
            .where(and(eq(invitations.targetUserId, invitadoId), isNull(invitations.usedAt), isNull(invitations.revokedAt)));

        const jti = crypto.randomUUID();
        const expiraEn = new Date(Date.now() + HORAS_DE_VIDA * 60 * 60 * 1000);

        await db.insert(invitations).values({
            id: jti,
            role: "jugador",
            createdBy: session.userId,
            targetUserId: invitadoId,
            label: nombreCompleto(invitado),
            expiresAt: expiraEn,
        });

        const token = await new SignJWT({ jti, sub: invitadoId, tipo: "activacion" })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(`${HORAS_DE_VIDA}h`)
            .sign(SECRETO_INVITACION);

        const headerList = await headers();
        const host = headerList.get("host");
        const protocolo = host?.includes("localhost") ? "http" : "https";
        const base = host ? `${protocolo}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "https://acap.ar");

        revalidatePath("/gestionDesafio/invitados");
        return { url: `${base}/activar?token=${token}`, expiraEn: expiraEn.toISOString() };
    });
}

// ── Alta manual ─────────────────────────────────────────────────────────────

/**
 * Promueve al invitado a jugador con cuenta: le carga su email real y le saca
 * la marca de invitado. El id no cambia, así que conserva todo su historial.
 *
 * No se le pone contraseña acá a propósito: queda sin `passwordHash`, y la
 * persona la define desde una invitación (Admin → Invitaciones) o desde la
 * recuperación de clave. Poner nosotros una contraseña ajena sería peor.
 */
export async function promoverInvitado(userId: string, email: string) {
    return ejecutar("promoverInvitado", async () => {
        await requerirAdmin();
        await traerInvitado(userId);

        const limpio = (limpiar(email) ?? "").toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) throw new ErrorDesafio("Poné un email válido.");

        const [ocupado] = await db.select({ id: users.id }).from(users).where(eq(users.email, limpio)).limit(1);
        if (ocupado) {
            throw new ErrorDesafio(
                "Ya hay una cuenta con ese email. Si es la misma persona, fusionalo con esa cuenta en vez de promoverlo."
            );
        }

        await db.update(users).set({ email: limpio, isGuest: false }).where(eq(users.id, userId));

        revalidarDesafio();
        revalidatePath("/gestionDesafio/invitados");
        return { userId };
    });
}

/**
 * Fusiona el invitado con una cuenta ya existente: todo lo que jugó pasa a esa
 * cuenta y el invitado se borra.
 *
 * Va en una transacción porque a mitad de camino el historial quedaría partido
 * entre dos identidades. El ledger se limpia de choques antes de reasignar: el
 * único `(desafío, usuario, tipo, partido)` rechazaría, por ejemplo, dos puntos
 * de participación en el mismo desafío si la persona jugó con las dos cuentas.
 */
export async function fusionarInvitado(invitadoId: string, cuentaId: string) {
    return ejecutar("fusionarInvitado", async () => {
        await requerirAdmin();
        await traerInvitado(invitadoId);

        if (invitadoId === cuentaId) throw new ErrorDesafio("Elegí una cuenta distinta del invitado.");

        const [destino] = await db
            .select({ id: users.id, isGuest: users.isGuest })
            .from(users)
            .where(eq(users.id, cuentaId))
            .limit(1);
        if (!destino) throw new ErrorDesafio("La cuenta elegida no existe.");
        if (destino.isGuest) throw new ErrorDesafio("La cuenta destino también es un invitado: promové una de las dos primero.");

        await db.transaction(async (tx) => {
            // Ledger: primero se tiran las entradas del invitado que chocarían
            // con las que ya tiene la cuenta destino, y después se reasigna el resto.
            await tx.execute(sql`
                DELETE p FROM challenge_points p
                JOIN challenge_points q
                  ON q.challenge_id = p.challenge_id
                 AND q.type = p.type
                 AND q.match_id = p.match_id
                 AND q.user_id = ${cuentaId}
                WHERE p.user_id = ${invitadoId}
            `);
            await tx.update(challengePoints).set({ userId: cuentaId }).where(eq(challengePoints.userId, invitadoId));

            // Inscripciones: si la persona ya estaba inscripta con su cuenta en
            // ese desafío, la del invitado sobra (el único es por desafío+usuario).
            await tx.execute(sql`
                DELETE r FROM challenge_registrations r
                JOIN challenge_registrations s
                  ON s.challenge_id = r.challenge_id AND s.user_id = ${cuentaId}
                WHERE r.user_id = ${invitadoId}
            `);
            await tx
                .update(challengeRegistrations)
                .set({ userId: cuentaId })
                .where(eq(challengeRegistrations.userId, invitadoId));

            // Parejas y partidos: acá no hay únicos, se reasigna y listo.
            await tx.update(challengePairs).set({ playerAId: cuentaId }).where(eq(challengePairs.playerAId, invitadoId));
            await tx.update(challengePairs).set({ playerBId: cuentaId }).where(eq(challengePairs.playerBId, invitadoId));

            await tx.update(challengeMatches).set({ team1Player1Id: cuentaId }).where(eq(challengeMatches.team1Player1Id, invitadoId));
            await tx.update(challengeMatches).set({ team1Player2Id: cuentaId }).where(eq(challengeMatches.team1Player2Id, invitadoId));
            await tx.update(challengeMatches).set({ team2Player1Id: cuentaId }).where(eq(challengeMatches.team2Player1Id, invitadoId));
            await tx.update(challengeMatches).set({ team2Player2Id: cuentaId }).where(eq(challengeMatches.team2Player2Id, invitadoId));

            await tx.update(challengeMatches).set({ reportedByUserId: cuentaId }).where(eq(challengeMatches.reportedByUserId, invitadoId));
            await tx.update(challengeMatches).set({ confirmedByUserId: cuentaId }).where(eq(challengeMatches.confirmedByUserId, invitadoId));

            await tx.delete(users).where(eq(users.id, invitadoId));
        });

        revalidarDesafio();
        revalidatePath("/gestionDesafio/invitados");
        revalidatePath("/ranking");
        return { userId: cuentaId };
    });
}

/** Borra un invitado que se cargó por error. Sólo si no jugó nada. */
export async function eliminarInvitado(userId: string) {
    return ejecutar("eliminarInvitado", async () => {
        await requerirAdmin();
        await traerInvitado(userId);

        const [{ n }] = await db
            .select({ n: sql<number>`count(*)` })
            .from(challengePoints)
            .where(and(eq(challengePoints.userId, userId), sql`${challengePoints.type} != 'participacion'`));

        if (Number(n) > 0) {
            throw new ErrorDesafio(
                "Ese invitado ya jugó partidos: fusionalo con una cuenta o dejalo como está, borrarlo perdería esos puntos."
            );
        }

        await db.transaction(async (tx) => {
            await tx.delete(challengePoints).where(eq(challengePoints.userId, userId));
            await tx.delete(challengeQueue).where(
                sql`${challengeQueue.pairId} IN (SELECT id FROM challenge_pairs WHERE player_a_id = ${userId} OR player_b_id = ${userId})`
            );
            await tx.delete(challengePairs).where(
                sql`${challengePairs.playerAId} = ${userId} OR ${challengePairs.playerBId} = ${userId}`
            );
            await tx.delete(challengeRegistrations).where(eq(challengeRegistrations.userId, userId));
            await tx.delete(users).where(eq(users.id, userId));
        });

        revalidarDesafio();
        revalidatePath("/gestionDesafio/invitados");
        return { userId };
    });
}
