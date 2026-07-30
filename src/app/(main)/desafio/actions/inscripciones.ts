"use server";

// Inscripción al desafío y escritura del punto de participación.
// Spec: docs/desafio-specs.md §5 "Inscribir jugador".
//
// Dos invariantes las garantiza la base, no este código:
//   · un jugador no se inscribe dos veces  → challenge_registrations_challenge_user_uniq
//   · un solo punto de participación       → challenge_points_ledger_uniq

import { db } from "@/db";
import {
    categoriesTable, challengePoints, challengeRegistrations, challenges, users,
} from "@/db/schema";
import { and, asc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { HIDDEN_USER_EMAILS } from "@/lib/hidden-users";
import {
    ESTADO_DESAFIO, ESTADO_INSCRIPCION, LADO,
    buscarCategoria, chequearCategoria, chequearTransicionInscripcion,
    entradaParticipacion, juegaParaArriba, normalizarLado,
    type CategoriaRef, type EstadoInscripcion, type Lado,
} from "@/lib/desafio";
import {
    ErrorDesafio, ejecutar, esAdmin, nuevoId, requerirAdmin, requerirSesion, revalidarDesafio,
} from "./_helpers";

export type InscriptoResumen = {
    id: string;
    userId: string;
    nombre: string;
    imagen: string | null;
    lado: Lado;
    categoria: string | null;
    estado: EstadoInscripcion;
    esExcepcion: boolean;
    juegaParaArriba: boolean;
    inscriptoEn: string;
};

export type CandidatoInscripcion = {
    userId: string;
    nombre: string;
    categoria: string | null;
    lado: Lado;
    elegible: boolean;
    motivo: string | null;
};

const nombreDe = (u: { firstName: string | null; lastName: string | null; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email.split("@")[0];

// ── Contexto de categorías ──────────────────────────────────────────────────

/**
 * Trae el desafío junto con su categoría resuelta y todas las categorías
 * activas, que es lo que necesita `chequearCategoria` para comparar órdenes.
 */
async function contextoDeCategoria(desafioId: string) {
    const [d] = await db
        .select({
            id: challenges.id,
            estado: challenges.status,
            cupo: challenges.maxSlots,
            puntosParticipacion: challenges.participationPoints,
            categoriaId: challenges.categoryId,
            categoriaNombre: categoriesTable.name,
            categoriaOrden: categoriesTable.categoryOrder,
        })
        .from(challenges)
        .leftJoin(categoriesTable, eq(challenges.categoryId, categoriesTable.id))
        .where(eq(challenges.id, desafioId))
        .limit(1);

    if (!d) throw new ErrorDesafio("El desafío no existe.");
    if (d.categoriaNombre == null || d.categoriaOrden == null) {
        throw new ErrorDesafio("El desafío tiene una categoría que ya no existe. Editalo antes de seguir.");
    }

    const todas: CategoriaRef[] = (
        await db
            .select({ nombre: categoriesTable.name, orden: categoriesTable.categoryOrder })
            .from(categoriesTable)
            .where(eq(categoriesTable.isActive, true))
            .orderBy(asc(categoriesTable.categoryOrder))
    ).map((c) => ({ nombre: c.nombre, orden: c.orden }));

    return {
        desafio: d,
        categoriaDesafio: { nombre: d.categoriaNombre, orden: d.categoriaOrden } as CategoriaRef,
        categorias: todas,
    };
}

// ── Lectura ─────────────────────────────────────────────────────────────────

export async function listarInscriptos(desafioId: string): Promise<InscriptoResumen[]> {
    const ctx = await contextoDeCategoria(desafioId).catch(() => null);

    const filas = await db
        .select({
            id: challengeRegistrations.id,
            userId: challengeRegistrations.userId,
            side: challengeRegistrations.side,
            categoryName: challengeRegistrations.categoryName,
            status: challengeRegistrations.status,
            isException: challengeRegistrations.isException,
            registeredAt: challengeRegistrations.registeredAt,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            imageUrl: users.imageUrl,
        })
        .from(challengeRegistrations)
        .innerJoin(users, eq(challengeRegistrations.userId, users.id))
        .where(and(eq(challengeRegistrations.challengeId, desafioId), ne(challengeRegistrations.status, ESTADO_INSCRIPCION.BAJA)))
        .orderBy(asc(challengeRegistrations.registeredAt));

    return filas.map((f) => {
        const suya = ctx ? buscarCategoria(f.categoryName, ctx.categorias) : null;
        return {
            id: f.id,
            userId: f.userId,
            nombre: nombreDe(f),
            imagen: f.imageUrl,
            lado: normalizarLado(f.side),
            categoria: f.categoryName,
            estado: f.status as EstadoInscripcion,
            esExcepcion: !!f.isException,
            juegaParaArriba: ctx ? juegaParaArriba(suya, ctx.categoriaDesafio) : false,
            inscriptoEn: f.registeredAt.toISOString(),
        };
    });
}

/**
 * Jugadores que el admin puede inscribir a mano. Devuelve también los que NO
 * son elegibles, con el motivo: el admin puede inscribirlos igual marcando
 * excepción, y ocultarlos haría parecer que no existen.
 */
export async function jugadoresParaInscribir(desafioId: string): Promise<CandidatoInscripcion[]> {
    const ctx = await contextoDeCategoria(desafioId);

    const yaInscriptos = await db
        .select({ userId: challengeRegistrations.userId })
        .from(challengeRegistrations)
        .where(and(eq(challengeRegistrations.challengeId, desafioId), ne(challengeRegistrations.status, ESTADO_INSCRIPCION.BAJA)));
    const excluidos = new Set(yaInscriptos.map((r) => r.userId));

    const candidatos = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            category: users.category,
            side: users.side,
        })
        .from(users)
        .where(notInArray(users.email, HIDDEN_USER_EMAILS as unknown as string[]));

    return candidatos
        .filter((u) => !excluidos.has(u.id))
        .map((u) => {
            const suya = buscarCategoria(u.category, ctx.categorias);
            const chequeo = chequearCategoria({ jugador: suya, desafio: ctx.categoriaDesafio });
            return {
                userId: u.id,
                nombre: nombreDe(u),
                categoria: u.category,
                lado: normalizarLado(u.side),
                elegible: chequeo.ok,
                motivo: chequeo.ok ? null : chequeo.error,
            };
        })
        .sort((a, b) => Number(b.elegible) - Number(a.elegible) || a.nombre.localeCompare(b.nombre));
}

// ── Alta ────────────────────────────────────────────────────────────────────

type OpcionesAlta = {
    /** Lado explícito. Si no viene, se usa `users.side`. */
    lado?: string | null;
    /** El admin saltea la validación de categoría. */
    excepcion?: boolean;
};

/**
 * Núcleo del alta, compartido por la inscripción propia y la del admin.
 * Corre en transacción: la inscripción y su punto de participación entran
 * juntos o no entra ninguno.
 */
async function altaInscripcion(desafioId: string, userId: string, opciones: OpcionesAlta) {
    const ctx = await contextoDeCategoria(desafioId);

    if (ctx.desafio.estado !== ESTADO_DESAFIO.ABIERTO) {
        throw new ErrorDesafio(
            ctx.desafio.estado === ESTADO_DESAFIO.BORRADOR
                ? "El desafío todavía no está abierto a inscripciones."
                : "El desafío ya está cerrado."
        );
    }

    const [u] = await db
        .select({ id: users.id, category: users.category, side: users.side, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    if (!u) throw new ErrorDesafio("El jugador no existe.");

    // Ya inscripto: puede ser una baja previa que se reactiva.
    const [previa] = await db
        .select({ id: challengeRegistrations.id, status: challengeRegistrations.status })
        .from(challengeRegistrations)
        .where(and(eq(challengeRegistrations.challengeId, desafioId), eq(challengeRegistrations.userId, userId)))
        .limit(1);
    if (previa && previa.status !== ESTADO_INSCRIPCION.BAJA) {
        throw new ErrorDesafio("Ese jugador ya está inscripto en el desafío.");
    }

    // Categoría: comparador invertido (ver src/lib/desafio/categorias.ts).
    const suya = buscarCategoria(u.category, ctx.categorias);
    const chequeo = chequearCategoria({
        jugador: suya,
        desafio: ctx.categoriaDesafio,
        esExcepcion: opciones.excepcion,
    });
    if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);

    // Lado: el explícito manda, si no el del perfil. Sin ninguno de los dos no
    // se adivina: se pide, porque de esto depende el armado de parejas.
    const ladoCrudo = opciones.lado ?? u.side;
    if (!ladoCrudo) {
        throw new ErrorDesafio("Elegí de qué lado de la cancha jugás (drive, revés o ambos).");
    }
    const lado = normalizarLado(ladoCrudo);

    // Cupo: las bajas no ocupan lugar.
    if (ctx.desafio.cupo > 0) {
        const [{ n }] = await db
            .select({ n: sql<number>`count(*)` })
            .from(challengeRegistrations)
            .where(and(eq(challengeRegistrations.challengeId, desafioId), ne(challengeRegistrations.status, ESTADO_INSCRIPCION.BAJA)));
        if (Number(n) >= ctx.desafio.cupo) {
            throw new ErrorDesafio(`El desafío alcanzó su cupo de ${ctx.desafio.cupo} jugadores.`);
        }
    }

    const punto = entradaParticipacion(userId, {
        participacion: ctx.desafio.puntosParticipacion,
        victoria: 0,
        derrota: 0,
    });

    await db.transaction(async (tx) => {
        if (previa) {
            // Reactivación: se refresca el snapshot, porque el perfil pudo cambiar.
            await tx
                .update(challengeRegistrations)
                .set({
                    status: ESTADO_INSCRIPCION.DISPONIBLE,
                    side: lado,
                    categoryName: u.category,
                    isException: !!opciones.excepcion,
                })
                .where(eq(challengeRegistrations.id, previa.id));
        } else {
            await tx.insert(challengeRegistrations).values({
                id: nuevoId(),
                challengeId: desafioId,
                userId,
                side: lado,
                categoryName: u.category,
                status: ESTADO_INSCRIPCION.DISPONIBLE,
                isException: !!opciones.excepcion,
            });
        }

        // El único del ledger lo hace idempotente: si el jugador ya se había
        // inscripto antes, no se duplica el punto.
        await tx
            .insert(challengePoints)
            .values({
                id: nuevoId(),
                challengeId: desafioId,
                userId,
                type: punto.tipo,
                points: punto.puntos,
                matchId: punto.matchId,
            })
            .onDuplicateKeyUpdate({ set: { points: punto.puntos } });
    });

    // Si el jugador no tenía lado en el perfil y acá eligió uno, se lo guardamos:
    // la próxima inscripción ya no se lo va a preguntar.
    if (!u.side && opciones.lado) {
        await db.update(users).set({ side: lado }).where(eq(users.id, userId));
    }

    revalidarDesafio(desafioId);
    return { userId, lado, nombre: nombreDe(u) };
}

/** Inscripción propia del jugador desde la página pública. */
export async function inscribirme(desafioId: string, lado?: string | null) {
    return ejecutar("inscribirme", async () => {
        const session = await requerirSesion();
        if (session.role !== "jugador" && !esAdmin(session.role)) {
            throw new ErrorDesafio("Solo los jugadores pueden inscribirse.");
        }
        return altaInscripcion(desafioId, session.userId, { lado });
    });
}

/** Alta manual del admin. `excepcion` saltea la validación de categoría. */
export async function inscribirJugador(
    desafioId: string,
    userId: string,
    opciones?: { lado?: string | null; excepcion?: boolean }
) {
    return ejecutar("inscribirJugador", async () => {
        await requerirAdmin();
        return altaInscripcion(desafioId, userId, {
            lado: opciones?.lado,
            excepcion: opciones?.excepcion,
        });
    });
}

// ── Baja ────────────────────────────────────────────────────────────────────

/**
 * Da de baja a un inscripto.
 *
 * El punto de participación se devuelve **sólo si el jugador no llegó a jugar
 * nada**: si ya tiene victorias o derrotas en el ledger, participó de verdad y
 * sus puntos no se tocan (§5 "Desarmar pareja" de la spec).
 */
async function bajaInscripcion(desafioId: string, userId: string) {
    const [insc] = await db
        .select({ id: challengeRegistrations.id, status: challengeRegistrations.status })
        .from(challengeRegistrations)
        .where(and(eq(challengeRegistrations.challengeId, desafioId), eq(challengeRegistrations.userId, userId)))
        .limit(1);
    if (!insc) throw new ErrorDesafio("Ese jugador no está inscripto en el desafío.");
    if (insc.status === ESTADO_INSCRIPCION.BAJA) return { userId, yaEstaba: true };

    const chequeo = chequearTransicionInscripcion(insc.status as EstadoInscripcion, ESTADO_INSCRIPCION.BAJA);
    if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);

    await db.transaction(async (tx) => {
        await tx
            .update(challengeRegistrations)
            .set({ status: ESTADO_INSCRIPCION.BAJA })
            .where(eq(challengeRegistrations.id, insc.id));

        const [{ n }] = await tx
            .select({ n: sql<number>`count(*)` })
            .from(challengePoints)
            .where(
                and(
                    eq(challengePoints.challengeId, desafioId),
                    eq(challengePoints.userId, userId),
                    inArray(challengePoints.type, ["victoria", "derrota"])
                )
            );

        if (Number(n) === 0) {
            await tx
                .delete(challengePoints)
                .where(
                    and(
                        eq(challengePoints.challengeId, desafioId),
                        eq(challengePoints.userId, userId),
                        eq(challengePoints.type, "participacion")
                    )
                );
        }
    });

    revalidarDesafio(desafioId);
    return { userId, yaEstaba: false };
}

/** Baja pedida por el propio jugador. */
export async function darmeDeBaja(desafioId: string) {
    return ejecutar("darmeDeBaja", async () => {
        const session = await requerirSesion();
        return bajaInscripcion(desafioId, session.userId);
    });
}

/** Baja aplicada por el admin. */
export async function darDeBajaJugador(desafioId: string, userId: string) {
    return ejecutar("darDeBajaJugador", async () => {
        await requerirAdmin();
        return bajaInscripcion(desafioId, userId);
    });
}

/** Cambia el lado de un inscripto sin tener que darlo de baja y volver a anotarlo. */
export async function cambiarLado(desafioId: string, userId: string, lado: string) {
    return ejecutar("cambiarLado", async () => {
        const session = await requerirSesion();
        if (session.userId !== userId) await requerirAdmin();

        const normalizado = normalizarLado(lado);
        if (![LADO.DRIVE, LADO.REVES, LADO.AMBOS].includes(normalizado)) {
            throw new ErrorDesafio("Lado inválido.");
        }

        const [insc] = await db
            .select({ id: challengeRegistrations.id })
            .from(challengeRegistrations)
            .where(and(eq(challengeRegistrations.challengeId, desafioId), eq(challengeRegistrations.userId, userId)))
            .limit(1);
        if (!insc) throw new ErrorDesafio("Ese jugador no está inscripto en el desafío.");

        await db.update(challengeRegistrations).set({ side: normalizado }).where(eq(challengeRegistrations.id, insc.id));

        revalidarDesafio(desafioId);
        return { userId, lado: normalizado };
    });
}
