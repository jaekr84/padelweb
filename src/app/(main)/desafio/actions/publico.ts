"use server";

// Lo que ve el jugador en /desafio.
//
// Hay dos lecturas y no una sola a propósito:
//   · `datosLista`   — la lista paginada. Por desafío sólo pide lo que se ve en
//                      una tarjeta chica, así abrir la página no cuesta N × 3
//                      queries pesadas.
//   · `datosDesafio` — el detalle de uno solo, con inscriptos, pool y tabla.
//
// Los partidos activos del jugador salen aparte y sin filtrar por página: si
// tenés un resultado para cargar tiene que aparecerte entres donde entres.

import { db } from "@/db";
import {
    categoriesTable, challengeMatches, challengePairs, challengeRegistrations, challenges, users,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
    ESTADO_DESAFIO, ESTADO_INSCRIPCION, ESTADO_PARTIDO,
    buscarCategoria, chequearCategoria,
    type CategoriaRef, type EstadoInscripcion, type Lado,
} from "@/lib/desafio";
import { DESAFIOS_POR_PAGINA, esAdmin } from "./_helpers";
import { listarInscriptos, type InscriptoResumen } from "./inscripciones";
import { poolDisponibles, type PoolDisponibles } from "./parejas";
import { rankingDelDesafio, type FilaRankingUI } from "./ranking";
import { obtenerDesafio, type DesafioResumen } from "./desafios";

export type MiPartido = {
    id: string;
    compañero: string;
    rivales: string[];
    canchaNumero: number | null;
    estado: string;
    puedeCargar: boolean;
    motivoRechazo: string | null;
};

/** El mismo partido, ubicado: la franja de arriba vive fuera de su desafío. */
export type MiPartidoActivo = MiPartido & { desafioId: string; desafioNombre: string };

/** Mi situación en un desafío. Es lo que decide qué botón se ve. */
export type MiSituacion = {
    inscripto: boolean;
    miEstado: EstadoInscripcion | null;
    puedeInscribirse: boolean;
    motivo: string | null;
};

/** Una fila de la lista: sólo lo que entra en la tarjeta chica. */
export type ItemLista = MiSituacion & { desafio: DesafioResumen };

export type DatosLista = {
    userId: string | null;
    esAdmin: boolean;
    necesitaLado: boolean;
    items: ItemLista[];
    /** Página servida (1..paginas) y cuántos desafíos hay en total. */
    pagina: number;
    paginas: number;
    total: number;
    misPartidos: MiPartidoActivo[];
};

export type DetalleDesafio = MiSituacion & {
    desafio: DesafioResumen;
    userId: string | null;
    esAdmin: boolean;
    necesitaLado: boolean;
    miLado: Lado | null;
    miCompañero: string | null;
    miPartido: MiPartido | null;
    inscriptos: InscriptoResumen[];
    pool: PoolDisponibles;
    ranking: FilaRankingUI[];
};

const nombreDe = (u: { firstName: string | null; lastName: string | null; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email.split("@")[0];

/** Las categorías activas, en el formato que espera `chequearCategoria`. */
async function categoriasActivas(): Promise<CategoriaRef[]> {
    const filas = await db
        .select({ nombre: categoriesTable.name, orden: categoriesTable.categoryOrder })
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));
    return filas.map((c) => ({ nombre: c.nombre, orden: c.orden }));
}

/**
 * Por qué sí o por qué no me puedo inscribir. La regla vive acá sola para que
 * la lista y el detalle nunca digan cosas distintas.
 */
function situacion(args: {
    desafio: DesafioResumen;
    inscripto: boolean;
    miEstado: EstadoInscripcion | null;
    session: { role?: string | null } | null;
    miCategoria: CategoriaRef | null;
}): MiSituacion {
    const { desafio, inscripto, miEstado, session, miCategoria } = args;

    if (!session) {
        return { inscripto: false, miEstado: null, puedeInscribirse: false, motivo: "Iniciá sesión para inscribirte." };
    }
    if (inscripto) return { inscripto, miEstado, puedeInscribirse: false, motivo: null };

    const chequeo = chequearCategoria({ jugador: miCategoria, desafio: desafio.categorias });

    let motivo: string | null = null;
    if (desafio.estado !== ESTADO_DESAFIO.ABIERTO) motivo = "La inscripción no está abierta.";
    else if (session.role !== "jugador" && !esAdmin(session.role)) motivo = "Solo los jugadores pueden inscribirse.";
    else if (!chequeo.ok) motivo = chequeo.error;
    else if (desafio.cupo > 0 && desafio.inscriptos >= desafio.cupo) motivo = "El desafío alcanzó su cupo.";

    return { inscripto, miEstado, puedeInscribirse: !motivo, motivo };
}

// ── Lista ───────────────────────────────────────────────────────────────────

export async function datosLista(paginaPedida = 1): Promise<DatosLista> {
    const session = await getSession();
    const userId = session?.userId ?? null;

    // Sólo los ids: armar una tarjeta cuesta varias queries, así que primero se
    // decide cuáles entran en la página. Los abiertos primero y después los
    // cerrados, del más nuevo al más viejo: el historial no se recorta, se pagina.
    const visibles = await db
        .select({ id: challenges.id })
        .from(challenges)
        .where(ne(challenges.status, ESTADO_DESAFIO.BORRADOR))
        .orderBy(sql`FIELD(${challenges.status}, 'abierto', 'cerrado')`, desc(challenges.createdAt));

    const total = visibles.length;
    const paginas = Math.max(1, Math.ceil(total / DESAFIOS_POR_PAGINA));
    const pagina = Math.min(Math.max(1, Math.trunc(paginaPedida) || 1), paginas);
    const ids = visibles
        .slice((pagina - 1) * DESAFIOS_POR_PAGINA, pagina * DESAFIOS_POR_PAGINA)
        .map((d) => d.id);

    const [yo] = userId
        ? await db.select({ category: users.category, side: users.side }).from(users).where(eq(users.id, userId)).limit(1)
        : [undefined];

    // Mis inscripciones de toda la página en una sola query, no una por tarjeta.
    const mias = userId && ids.length > 0
        ? await db
            .select({ challengeId: challengeRegistrations.challengeId, status: challengeRegistrations.status })
            .from(challengeRegistrations)
            .where(
                and(
                    eq(challengeRegistrations.userId, userId),
                    inArray(challengeRegistrations.challengeId, ids),
                    ne(challengeRegistrations.status, ESTADO_INSCRIPCION.BAJA)
                )
            )
        : [];
    const miInscripcion = new Map(mias.map((m) => [m.challengeId, m.status as EstadoInscripcion]));

    const [categorias, misPartidos] = await Promise.all([
        categoriasActivas(),
        userId ? partidosActivosDe(userId) : Promise.resolve([]),
    ]);
    const miCategoria = buscarCategoria(yo?.category, categorias);

    const items: ItemLista[] = [];
    for (const id of ids) {
        const desafio = await obtenerDesafio(id);
        if (!desafio) continue;

        const miEstado = miInscripcion.get(id) ?? null;
        items.push({
            desafio,
            ...situacion({ desafio, inscripto: !!miEstado, miEstado, session, miCategoria }),
        });
    }

    return {
        userId,
        esAdmin: esAdmin(session?.role),
        // Si el jugador no tiene lado cargado, la inscripción se lo va a pedir.
        necesitaLado: !!userId && !yo?.side,
        items,
        pagina,
        paginas,
        total,
        misPartidos,
    };
}

// ── Detalle ─────────────────────────────────────────────────────────────────

export async function datosDesafio(id: string): Promise<DetalleDesafio | null> {
    const session = await getSession();
    const userId = session?.userId ?? null;

    const desafio = await obtenerDesafio(id);
    if (!desafio || desafio.estado === ESTADO_DESAFIO.BORRADOR) return null;

    const [inscriptos, pool, ranking, categorias] = await Promise.all([
        listarInscriptos(id),
        poolDisponibles(id),
        rankingDelDesafio(id),
        categoriasActivas(),
    ]);

    const [yo] = userId
        ? await db.select({ category: users.category, side: users.side }).from(users).where(eq(users.id, userId)).limit(1)
        : [undefined];

    let miLado: Lado | null = null;
    let miCompañero: string | null = null;
    let miPartido: MiPartido | null = null;

    const mia = userId ? inscriptos.find((i) => i.userId === userId) : undefined;
    if (userId && mia) {
        miLado = mia.lado;

        const [pareja] = await db
            .select()
            .from(challengePairs)
            .where(
                and(
                    eq(challengePairs.challengeId, id),
                    eq(challengePairs.active, true),
                    or(eq(challengePairs.playerAId, userId), eq(challengePairs.playerBId, userId))
                )
            )
            .limit(1);

        if (pareja) {
            const otroId = pareja.playerAId === userId ? pareja.playerBId : pareja.playerAId;
            miCompañero = inscriptos.find((i) => i.userId === otroId)?.nombre ?? null;
        }

        miPartido = (await partidosActivosDe(userId, id))[0] ?? null;
    }

    return {
        desafio,
        userId,
        esAdmin: esAdmin(session?.role),
        necesitaLado: !!userId && !yo?.side,
        ...situacion({
            desafio,
            inscripto: !!mia,
            miEstado: mia?.estado ?? null,
            session,
            miCategoria: buscarCategoria(yo?.category, categorias),
        }),
        miLado,
        miCompañero,
        miPartido,
        inscriptos,
        pool,
        ranking,
    };
}

// ── Mis partidos ────────────────────────────────────────────────────────────

/**
 * Los partidos que el jugador tiene abiertos: en curso, o rechazados para
 * volver a cargar. Sin `desafioId` los busca en todos los desafíos, que es lo
 * que necesita la franja de arriba de la lista.
 */
async function partidosActivosDe(userId: string, desafioId?: string): Promise<MiPartidoActivo[]> {
    const filas = await db
        .select({
            id: challengeMatches.id,
            desafioId: challengeMatches.challengeId,
            desafioNombre: challenges.name,
            status: challengeMatches.status,
            t1p1: challengeMatches.team1Player1Id,
            t1p2: challengeMatches.team1Player2Id,
            t2p1: challengeMatches.team2Player1Id,
            t2p2: challengeMatches.team2Player2Id,
            rejectionReason: challengeMatches.rejectionReason,
            canchaNumero: sql<number | null>`(SELECT number FROM challenge_courts WHERE id = ${challengeMatches.courtId})`,
        })
        .from(challengeMatches)
        .innerJoin(challenges, eq(challenges.id, challengeMatches.challengeId))
        .where(
            and(
                desafioId ? eq(challengeMatches.challengeId, desafioId) : undefined,
                inArray(challengeMatches.status, [ESTADO_PARTIDO.EN_CURSO, ESTADO_PARTIDO.RECHAZADO]),
                or(
                    eq(challengeMatches.team1Player1Id, userId),
                    eq(challengeMatches.team1Player2Id, userId),
                    eq(challengeMatches.team2Player1Id, userId),
                    eq(challengeMatches.team2Player2Id, userId)
                )
            )
        )
        .orderBy(desc(challengeMatches.startedAt));

    if (filas.length === 0) return [];

    // Los nombres de los otros tres, para todos los partidos de una sola vez.
    const otrosIds = [...new Set(filas.flatMap((m) => [m.t1p1, m.t1p2, m.t2p1, m.t2p2]))];
    const personas = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(inArray(users.id, otrosIds));
    const porId = new Map(personas.map((p) => [p.id, p]));
    const nombre = (id: string) => {
        const u = porId.get(id);
        return u ? nombreDe(u) : "Jugador";
    };

    return filas.map((m) => {
        const enEquipo1 = m.t1p1 === userId || m.t1p2 === userId;
        const mios = enEquipo1 ? [m.t1p1, m.t1p2] : [m.t2p1, m.t2p2];
        const otros = enEquipo1 ? [m.t2p1, m.t2p2] : [m.t1p1, m.t1p2];

        return {
            id: m.id,
            desafioId: m.desafioId,
            desafioNombre: m.desafioNombre,
            compañero: nombre(mios.find((x) => x !== userId)!),
            rivales: otros.map(nombre),
            canchaNumero: m.canchaNumero ?? null,
            estado: m.status,
            puedeCargar: true,
            motivoRechazo: m.rejectionReason,
        };
    });
}
