"use server";

// Lo que ve el jugador en /desafio: los desafíos vigentes, su situación en cada
// uno (inscripto, con pareja, jugando) y la tabla de posiciones.

import { db } from "@/db";
import {
    categoriesTable, challengeMatches, challengePairs, challengeRegistrations, challenges, users,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
    ESTADO_DESAFIO, ESTADO_INSCRIPCION, ESTADO_PARTIDO,
    buscarCategoria, chequearCategoria, normalizarLado,
    type CategoriaRef, type EstadoInscripcion, type Lado,
} from "@/lib/desafio";
import { esAdmin } from "./_helpers";
import { listarInscriptos, type InscriptoResumen } from "./inscripciones";
import { poolDisponibles, type PoolDisponibles } from "./parejas";
import { rankingDelDesafio, type FilaRankingUI } from "./ranking";
import { obtenerDesafio, type DesafioResumen } from "./desafios";

/** Cuántos desafíos ya cerrados se siguen mostrando. */
const CERRADOS_VISIBLES = 3;

export type MiPartido = {
    id: string;
    compañero: string;
    rivales: string[];
    canchaNumero: number | null;
    estado: string;
    puedeCargar: boolean;
    motivoRechazo: string | null;
};

export type TarjetaPublica = {
    desafio: DesafioResumen;
    inscripto: boolean;
    miEstado: EstadoInscripcion | null;
    puedeInscribirse: boolean;
    motivo: string | null;
    miLado: Lado | null;
    miCompañero: string | null;
    miPartido: MiPartido | null;
    inscriptos: InscriptoResumen[];
    pool: PoolDisponibles;
    ranking: FilaRankingUI[];
};

export type DatosPublicos = {
    userId: string | null;
    esAdmin: boolean;
    necesitaLado: boolean;
    tarjetas: TarjetaPublica[];
};

const nombreDe = (u: { firstName: string | null; lastName: string | null; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email.split("@")[0];

export async function datosPublicos(): Promise<DatosPublicos> {
    const session = await getSession();
    const userId = session?.userId ?? null;

    const abiertos = await db
        .select({ id: challenges.id })
        .from(challenges)
        .where(ne(challenges.status, ESTADO_DESAFIO.BORRADOR))
        .orderBy(sql`FIELD(${challenges.status}, 'abierto', 'cerrado')`, desc(challenges.createdAt));

    // Los abiertos primero; de los cerrados sólo los últimos.
    const ids: string[] = [];
    let cerrados = 0;
    for (const { id } of abiertos) {
        const [d] = await db.select({ estado: challenges.status }).from(challenges).where(eq(challenges.id, id)).limit(1);
        if (d.estado === ESTADO_DESAFIO.CERRADO) {
            if (cerrados >= CERRADOS_VISIBLES) continue;
            cerrados++;
        }
        ids.push(id);
    }

    const categorias: CategoriaRef[] = (
        await db
            .select({ nombre: categoriesTable.name, orden: categoriesTable.categoryOrder })
            .from(categoriesTable)
            .where(eq(categoriesTable.isActive, true))
            .orderBy(asc(categoriesTable.categoryOrder))
    ).map((c) => ({ nombre: c.nombre, orden: c.orden }));

    const [yo] = userId
        ? await db.select({ category: users.category, side: users.side }).from(users).where(eq(users.id, userId)).limit(1)
        : [undefined];

    const tarjetas: TarjetaPublica[] = [];
    for (const id of ids) {
        const desafio = await obtenerDesafio(id);
        if (!desafio) continue;

        const [inscriptos, pool, ranking] = await Promise.all([
            listarInscriptos(id),
            poolDisponibles(id),
            rankingDelDesafio(id),
        ]);

        let inscripto = false;
        let miEstado: EstadoInscripcion | null = null;
        let miLado: Lado | null = null;
        let miCompañero: string | null = null;
        let miPartido: MiPartido | null = null;
        let puedeInscribirse = false;
        let motivo: string | null = null;

        if (userId) {
            const mia = inscriptos.find((i) => i.userId === userId);
            if (mia) {
                inscripto = true;
                miEstado = mia.estado;
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

                miPartido = await buscarMiPartido(id, userId, inscriptos);
            }

            const chequeo = chequearCategoria({
                jugador: buscarCategoria(yo?.category, categorias),
                desafio: {
                    nombre: desafio.categoriaNombre ?? "",
                    orden: desafio.categoriaOrden ?? 0,
                },
            });

            if (inscripto) motivo = null;
            else if (desafio.estado !== ESTADO_DESAFIO.ABIERTO) motivo = "La inscripción no está abierta.";
            else if (session!.role !== "jugador" && !esAdmin(session!.role)) motivo = "Solo los jugadores pueden inscribirse.";
            else if (!chequeo.ok) motivo = chequeo.error;
            else if (desafio.cupo > 0 && desafio.inscriptos >= desafio.cupo) motivo = "El desafío alcanzó su cupo.";
            else puedeInscribirse = true;
        } else {
            motivo = "Iniciá sesión para inscribirte.";
        }

        tarjetas.push({
            desafio, inscripto, miEstado, puedeInscribirse, motivo,
            miLado, miCompañero, miPartido, inscriptos, pool, ranking,
        });
    }

    return {
        userId,
        esAdmin: esAdmin(session?.role),
        // Si el jugador no tiene lado cargado, la inscripción se lo va a pedir.
        necesitaLado: !!userId && !yo?.side,
        tarjetas,
    };
}

/** El partido que el jugador tiene abierto: en curso o rechazado para recargar. */
async function buscarMiPartido(
    desafioId: string,
    userId: string,
    inscriptos: InscriptoResumen[]
): Promise<MiPartido | null> {
    const filas = await db
        .select({
            id: challengeMatches.id,
            status: challengeMatches.status,
            t1p1: challengeMatches.team1Player1Id,
            t1p2: challengeMatches.team1Player2Id,
            t2p1: challengeMatches.team2Player1Id,
            t2p2: challengeMatches.team2Player2Id,
            rejectionReason: challengeMatches.rejectionReason,
            canchaNumero: sql<number | null>`(SELECT number FROM challenge_courts WHERE id = ${challengeMatches.courtId})`,
        })
        .from(challengeMatches)
        .where(
            and(
                eq(challengeMatches.challengeId, desafioId),
                inArray(challengeMatches.status, [ESTADO_PARTIDO.EN_CURSO, ESTADO_PARTIDO.RECHAZADO]),
                or(
                    eq(challengeMatches.team1Player1Id, userId),
                    eq(challengeMatches.team1Player2Id, userId),
                    eq(challengeMatches.team2Player1Id, userId),
                    eq(challengeMatches.team2Player2Id, userId)
                )
            )
        )
        .orderBy(desc(challengeMatches.startedAt))
        .limit(1);

    const m = filas[0];
    if (!m) return null;

    const nombre = (id: string) => inscriptos.find((i) => i.userId === id)?.nombre ?? "Jugador";
    const enEquipo1 = m.t1p1 === userId || m.t1p2 === userId;
    const mios = enEquipo1 ? [m.t1p1, m.t1p2] : [m.t2p1, m.t2p2];
    const otros = enEquipo1 ? [m.t2p1, m.t2p2] : [m.t1p1, m.t1p2];

    return {
        id: m.id,
        compañero: nombre(mios.find((x) => x !== userId)!),
        rivales: otros.map(nombre),
        canchaNumero: m.canchaNumero ?? null,
        estado: m.status,
        puedeCargar: true,
        motivoRechazo: m.rejectionReason,
    };
}
