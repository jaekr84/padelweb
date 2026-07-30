"use server";

// Ciclo de vida del desafío: crear, editar, abrir, cerrar, reabrir, eliminar.
// Spec: docs/desafio-specs.md §4 (máquina de estados) y §5 (cerrar desafío).

import { db } from "@/db";
import {
    categoriesTable, challengeCourts, challengeMatches, challengePairs,
    challengePoints, challengeQueue, challengeRegistrations, challenges,
} from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
    ESTADO_DESAFIO, ESTADO_PARTIDO,
    chequearCierre, chequearTransicionDesafio, puedeEditarCategoria,
    type EstadoDesafio, type EstadoPartido,
} from "@/lib/desafio";
import { ErrorDesafio, ejecutar, limpiar, nuevoId, requerirAdmin, revalidarDesafio } from "./_helpers";

export type DatosDesafio = {
    nombre: string;
    categoriaId: string;
    descripcion?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    hora?: string | null;
    lugar?: string | null;
    inscripcion?: number | null;
    cupo?: number | null;
    puntosParticipacion?: number;
    puntosVictoria?: number;
    puntosDerrota?: number;
};

export type DesafioResumen = {
    id: string;
    nombre: string;
    descripcion: string | null;
    estado: EstadoDesafio;
    categoriaId: string;
    categoriaNombre: string | null;
    categoriaOrden: number | null;
    puntos: { participacion: number; victoria: number; derrota: number };
    fechaInicio: string | null;
    fechaFin: string | null;
    hora: string | null;
    lugar: string | null;
    inscripcion: number | null;
    cupo: number;
    inscriptos: number;
    creadoEn: string;
};

// ── Lectura ─────────────────────────────────────────────────────────────────

const filaAResumen = (r: any, inscriptos: number): DesafioResumen => ({
    id: r.id,
    nombre: r.name,
    descripcion: r.description,
    estado: r.status as EstadoDesafio,
    categoriaId: r.categoryId,
    categoriaNombre: r.categoriaNombre ?? null,
    categoriaOrden: r.categoriaOrden ?? null,
    puntos: {
        participacion: r.participationPoints,
        victoria: r.winPoints,
        derrota: r.lossPoints,
    },
    fechaInicio: r.startDate,
    fechaFin: r.endDate,
    hora: r.time,
    lugar: r.location,
    inscripcion: r.registrationFee,
    cupo: r.maxSlots,
    inscriptos,
    creadoEn: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
});

const SELECT_DESAFIO = {
    id: challenges.id,
    name: challenges.name,
    description: challenges.description,
    status: challenges.status,
    categoryId: challenges.categoryId,
    participationPoints: challenges.participationPoints,
    winPoints: challenges.winPoints,
    lossPoints: challenges.lossPoints,
    startDate: challenges.startDate,
    endDate: challenges.endDate,
    time: challenges.time,
    location: challenges.location,
    registrationFee: challenges.registrationFee,
    maxSlots: challenges.maxSlots,
    createdAt: challenges.createdAt,
    categoriaNombre: categoriesTable.name,
    categoriaOrden: categoriesTable.categoryOrder,
};

/** Cuenta de inscriptos activos (los dados de baja no ocupan cupo). */
async function contarInscriptos(desafioIds: string[]) {
    const mapa = new Map<string, number>();
    if (desafioIds.length === 0) return mapa;

    const filas = await db
        .select({ challengeId: challengeRegistrations.challengeId, n: sql<number>`count(*)` })
        .from(challengeRegistrations)
        .where(
            and(
                inArray(challengeRegistrations.challengeId, desafioIds),
                sql`${challengeRegistrations.status} != 'baja'`
            )
        )
        .groupBy(challengeRegistrations.challengeId);

    for (const f of filas) mapa.set(f.challengeId, Number(f.n) || 0);
    return mapa;
}

export async function listarDesafios(): Promise<DesafioResumen[]> {
    const filas = await db
        .select(SELECT_DESAFIO)
        .from(challenges)
        .leftJoin(categoriesTable, eq(challenges.categoryId, categoriesTable.id))
        .orderBy(desc(challenges.createdAt));

    const inscriptos = await contarInscriptos(filas.map((f) => f.id));
    return filas.map((f) => filaAResumen(f, inscriptos.get(f.id) ?? 0));
}

export async function obtenerDesafio(id: string): Promise<DesafioResumen | null> {
    const [fila] = await db
        .select(SELECT_DESAFIO)
        .from(challenges)
        .leftJoin(categoriesTable, eq(challenges.categoryId, categoriesTable.id))
        .where(eq(challenges.id, id))
        .limit(1);

    if (!fila) return null;
    const inscriptos = await contarInscriptos([id]);
    return filaAResumen(fila, inscriptos.get(id) ?? 0);
}

/** Categorías activas, para el selector de creación. */
export async function listarCategorias() {
    return db
        .select({ id: categoriesTable.id, nombre: categoriesTable.name, orden: categoriesTable.categoryOrder })
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(categoriesTable.categoryOrder);
}

// ── Validación de entrada ───────────────────────────────────────────────────

async function validarDatos(datos: DatosDesafio) {
    const nombre = limpiar(datos.nombre);
    if (!nombre) throw new ErrorDesafio("El nombre del desafío es obligatorio.");

    if (!datos.categoriaId) throw new ErrorDesafio("Elegí la categoría del desafío.");
    const [categoria] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, datos.categoriaId))
        .limit(1);
    if (!categoria) throw new ErrorDesafio("La categoría elegida no existe.");

    const fechaInicio = limpiar(datos.fechaInicio);
    const fechaFin = limpiar(datos.fechaFin);
    // Las fechas son "YYYY-MM-DD": comparar como texto alcanza y evita zonas horarias.
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
        throw new ErrorDesafio("La fecha de fin no puede ser anterior a la de inicio.");
    }

    const cupo = Number(datos.cupo ?? 0);
    if (!Number.isInteger(cupo) || cupo < 0) throw new ErrorDesafio("El cupo tiene que ser un número igual o mayor a cero.");

    const inscripcion = datos.inscripcion == null ? null : Number(datos.inscripcion);
    if (inscripcion !== null && (!Number.isFinite(inscripcion) || inscripcion < 0)) {
        throw new ErrorDesafio("El monto de inscripción no puede ser negativo.");
    }

    const puntos = {
        participacion: Number(datos.puntosParticipacion ?? 1),
        victoria: Number(datos.puntosVictoria ?? 3),
        derrota: Number(datos.puntosDerrota ?? 0),
    };
    for (const [clave, valor] of Object.entries(puntos)) {
        if (!Number.isInteger(valor) || valor < 0) {
            throw new ErrorDesafio(`Los puntos por ${clave} tienen que ser un entero igual o mayor a cero.`);
        }
    }

    return {
        nombre,
        categoriaId: datos.categoriaId,
        descripcion: limpiar(datos.descripcion),
        fechaInicio,
        // Sin fecha de fin, el desafío dura lo mismo que su fecha de inicio.
        fechaFin: fechaFin ?? fechaInicio,
        hora: limpiar(datos.hora),
        lugar: limpiar(datos.lugar),
        inscripcion,
        cupo,
        puntos,
    };
}

/** Carga el desafío o falla con un mensaje mostrable. */
async function traerDesafio(id: string) {
    const [d] = await db
        .select({ id: challenges.id, nombre: challenges.name, estado: challenges.status })
        .from(challenges)
        .where(eq(challenges.id, id))
        .limit(1);
    if (!d) throw new ErrorDesafio("El desafío no existe.");
    return { ...d, estado: d.estado as EstadoDesafio };
}

// ── Escritura ───────────────────────────────────────────────────────────────

export async function crearDesafio(datos: DatosDesafio) {
    return ejecutar("crearDesafio", async () => {
        const session = await requerirAdmin();
        const v = await validarDatos(datos);

        const id = nuevoId();
        await db.insert(challenges).values({
            id,
            name: v.nombre,
            description: v.descripcion,
            status: ESTADO_DESAFIO.BORRADOR,
            categoryId: v.categoriaId,
            participationPoints: v.puntos.participacion,
            winPoints: v.puntos.victoria,
            lossPoints: v.puntos.derrota,
            startDate: v.fechaInicio,
            endDate: v.fechaFin,
            time: v.hora,
            location: v.lugar,
            registrationFee: v.inscripcion,
            maxSlots: v.cupo,
            createdByUserId: session.userId,
        });

        revalidarDesafio(id);
        return { id };
    });
}

export async function editarDesafio(id: string, datos: DatosDesafio) {
    return ejecutar("editarDesafio", async () => {
        await requerirAdmin();
        const actual = await traerDesafio(id);
        const v = await validarDatos(datos);

        // La categoría define quién puede inscribirse: cambiarla con gente ya
        // anotada dejaría inscriptos que no cumplen la regla.
        const [{ n }] = await db
            .select({ n: sql<number>`count(*)` })
            .from(challengeRegistrations)
            .where(and(eq(challengeRegistrations.challengeId, id), sql`${challengeRegistrations.status} != 'baja'`));
        const inscriptos = Number(n) || 0;

        const [previa] = await db.select({ categoryId: challenges.categoryId }).from(challenges).where(eq(challenges.id, id)).limit(1);
        const cambiaCategoria = previa.categoryId !== v.categoriaId;

        if (cambiaCategoria && !puedeEditarCategoria(actual.estado, inscriptos)) {
            throw new ErrorDesafio(
                `No se puede cambiar la categoría: el desafío ya está ${actual.estado} y tiene ${inscriptos} inscriptos.`
            );
        }

        await db
            .update(challenges)
            .set({
                name: v.nombre,
                description: v.descripcion,
                categoryId: v.categoriaId,
                participationPoints: v.puntos.participacion,
                winPoints: v.puntos.victoria,
                lossPoints: v.puntos.derrota,
                startDate: v.fechaInicio,
                endDate: v.fechaFin,
                time: v.hora,
                location: v.lugar,
                registrationFee: v.inscripcion,
                maxSlots: v.cupo,
            })
            .where(eq(challenges.id, id));

        revalidarDesafio(id);
        return { id };
    });
}

export async function abrirDesafio(id: string) {
    return ejecutar("abrirDesafio", async () => {
        await requerirAdmin();
        const d = await traerDesafio(id);

        const chequeo = chequearTransicionDesafio(d.estado, ESTADO_DESAFIO.ABIERTO);
        if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);

        await db
            .update(challenges)
            .set({ status: ESTADO_DESAFIO.ABIERTO, openedAt: new Date(), closedAt: null })
            .where(eq(challenges.id, id));

        revalidarDesafio(id);
        return { id };
    });
}

/**
 * Cierra el desafío. Se bloquea si hay partidos sin resolver: los
 * `resultado_cargado` cuentan igual que los `en_curso`, porque si no se
 * cerraría con puntos que nunca entraron al ranking.
 */
export async function cerrarDesafio(id: string) {
    return ejecutar("cerrarDesafio", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const [d] = await tx
                .select({ estado: challenges.status })
                .from(challenges)
                .where(eq(challenges.id, id))
                .limit(1);
            if (!d) throw new ErrorDesafio("El desafío no existe.");

            const chequeoEstado = chequearTransicionDesafio(d.estado as EstadoDesafio, ESTADO_DESAFIO.CERRADO);
            if (!chequeoEstado.ok) throw new ErrorDesafio(chequeoEstado.error);

            const pendientes = await tx
                .select({ id: challengeMatches.id, estado: challengeMatches.status })
                .from(challengeMatches)
                .where(
                    and(
                        eq(challengeMatches.challengeId, id),
                        inArray(challengeMatches.status, [ESTADO_PARTIDO.EN_CURSO, ESTADO_PARTIDO.RESULTADO_CARGADO])
                    )
                );

            const chequeoCierre = chequearCierre(
                pendientes.map((p) => ({ id: p.id, estado: p.estado as EstadoPartido }))
            );
            if (!chequeoCierre.ok) throw new ErrorDesafio(chequeoCierre.error);

            await tx
                .update(challenges)
                .set({ status: ESTADO_DESAFIO.CERRADO, closedAt: new Date() })
                .where(eq(challenges.id, id));

            revalidarDesafio(id);
            return { id };
        });
    });
}

/** Reabre un desafío cerrado para corregir resultados. Los puntos no se tocan. */
export async function reabrirDesafio(id: string) {
    return ejecutar("reabrirDesafio", async () => {
        await requerirAdmin();
        const d = await traerDesafio(id);

        const chequeo = chequearTransicionDesafio(d.estado, ESTADO_DESAFIO.ABIERTO);
        if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);

        await db.update(challenges).set({ status: ESTADO_DESAFIO.ABIERTO, closedAt: null }).where(eq(challenges.id, id));

        revalidarDesafio(id);
        return { id };
    });
}

/**
 * Elimina un desafío. Sólo si nunca se jugó nada: con partidos cargados el
 * historial y los puntos son parte del registro del club.
 */
export async function eliminarDesafio(id: string) {
    return ejecutar("eliminarDesafio", async () => {
        await requerirAdmin();
        await traerDesafio(id);

        const [{ n }] = await db
            .select({ n: sql<number>`count(*)` })
            .from(challengeMatches)
            .where(eq(challengeMatches.challengeId, id));

        if (Number(n) > 0) {
            throw new ErrorDesafio(
                "No se puede eliminar un desafío que ya tiene partidos. Cerralo en vez de borrarlo."
            );
        }

        // Sin FKs en el schema: el borrado en cascada se hace a mano. Van todas
        // las tablas hijas aunque a esta altura sólo puedan tener filas las dos
        // primeras — si mañana se agrega otra, el olvido deja basura huérfana.
        await db.transaction(async (tx) => {
            await tx.delete(challengePoints).where(eq(challengePoints.challengeId, id));
            await tx.delete(challengeQueue).where(eq(challengeQueue.challengeId, id));
            await tx.delete(challengePairs).where(eq(challengePairs.challengeId, id));
            await tx.delete(challengeRegistrations).where(eq(challengeRegistrations.challengeId, id));
            await tx.delete(challengeCourts).where(eq(challengeCourts.challengeId, id));
            await tx.delete(challenges).where(eq(challenges.id, id));
        });

        revalidarDesafio();
        return { id };
    });
}
