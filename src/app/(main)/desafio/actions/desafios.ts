"use server";

// Ciclo de vida del desafío: crear, editar, abrir, cerrar, reabrir, eliminar.
// Spec: docs/desafio-specs.md §4 (máquina de estados) y §5 (cerrar desafío).

import { db } from "@/db";
import {
    categoriesTable, challengeCategories, challengeCourts, challengeMatches, challengePairs,
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
    /** Categorías admitidas. Al menos una; la membresía es estricta. */
    categoriaIds: string[];
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

export type CategoriaDesafio = { id: string; nombre: string; orden: number };

export type DesafioResumen = {
    id: string;
    nombre: string;
    descripcion: string | null;
    estado: EstadoDesafio;
    /** Todas las admitidas, de la más baja a la más alta. */
    categorias: CategoriaDesafio[];
    puntos: { participacion: number; victoria: number; derrota: number };
    fechaInicio: string | null;
    fechaFin: string | null;
    hora: string | null;
    lugar: string | null;
    inscripcion: number | null;
    cupo: number;
    inscriptos: number;
    /** Partidos generados (de cualquier estado). Lo usa el borrado para avisar qué se pierde. */
    partidos: number;
    creadoEn: string;
};

// ── Lectura ─────────────────────────────────────────────────────────────────

const filaAResumen = (
    r: any,
    inscriptos: number,
    categorias: CategoriaDesafio[],
    partidos: number
): DesafioResumen => ({
    id: r.id,
    nombre: r.name,
    descripcion: r.description,
    estado: r.status as EstadoDesafio,
    categorias,
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
    partidos,
    creadoEn: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
});

const SELECT_DESAFIO = {
    id: challenges.id,
    name: challenges.name,
    description: challenges.description,
    status: challenges.status,
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
};

/**
 * Las categorías admitidas por cada desafío, ordenadas de la más baja a la más
 * alta. Fuente de verdad de la elegibilidad: ver src/lib/desafio/categorias.ts.
 */
export async function categoriasDeDesafios(desafioIds: string[]) {
    const mapa = new Map<string, CategoriaDesafio[]>();
    if (desafioIds.length === 0) return mapa;

    const filas = await db
        .select({
            challengeId: challengeCategories.challengeId,
            id: categoriesTable.id,
            nombre: categoriesTable.name,
            orden: categoriesTable.categoryOrder,
        })
        .from(challengeCategories)
        .innerJoin(categoriesTable, eq(challengeCategories.categoryId, categoriesTable.id))
        .where(inArray(challengeCategories.challengeId, desafioIds))
        .orderBy(categoriesTable.categoryOrder);

    for (const f of filas) {
        const lista = mapa.get(f.challengeId) ?? [];
        lista.push({ id: f.id, nombre: f.nombre, orden: f.orden });
        mapa.set(f.challengeId, lista);
    }
    return mapa;
}

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

/** Partidos por desafío, de cualquier estado: es lo que el borrado se lleva puesto. */
async function contarPartidos(desafioIds: string[]) {
    const mapa = new Map<string, number>();
    if (desafioIds.length === 0) return mapa;

    const filas = await db
        .select({ challengeId: challengeMatches.challengeId, n: sql<number>`count(*)` })
        .from(challengeMatches)
        .where(inArray(challengeMatches.challengeId, desafioIds))
        .groupBy(challengeMatches.challengeId);

    for (const f of filas) mapa.set(f.challengeId, Number(f.n) || 0);
    return mapa;
}

export async function listarDesafios(): Promise<DesafioResumen[]> {
    const filas = await db
        .select(SELECT_DESAFIO)
        .from(challenges)
        .orderBy(desc(challenges.createdAt));

    const ids = filas.map((f) => f.id);
    const [inscriptos, categorias, partidos] = await Promise.all([
        contarInscriptos(ids),
        categoriasDeDesafios(ids),
        contarPartidos(ids),
    ]);
    return filas.map((f) =>
        filaAResumen(f, inscriptos.get(f.id) ?? 0, categorias.get(f.id) ?? [], partidos.get(f.id) ?? 0)
    );
}

export async function obtenerDesafio(id: string): Promise<DesafioResumen | null> {
    const [fila] = await db
        .select(SELECT_DESAFIO)
        .from(challenges)
        .where(eq(challenges.id, id))
        .limit(1);

    if (!fila) return null;
    const [inscriptos, categorias, partidos] = await Promise.all([
        contarInscriptos([id]),
        categoriasDeDesafios([id]),
        contarPartidos([id]),
    ]);
    return filaAResumen(fila, inscriptos.get(id) ?? 0, categorias.get(id) ?? [], partidos.get(id) ?? 0);
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

    // Se deduplica acá y no en la base: la PK compuesta las rechazaría, pero
    // con un error de driver en vez de un mensaje mostrable.
    const categoriaIds = [...new Set(datos.categoriaIds ?? [])].filter(Boolean);
    if (categoriaIds.length === 0) throw new ErrorDesafio("Elegí al menos una categoría para el desafío.");

    const categorias = await db
        .select({ id: categoriesTable.id, orden: categoriesTable.categoryOrder })
        .from(categoriesTable)
        .where(inArray(categoriesTable.id, categoriaIds));
    if (categorias.length !== categoriaIds.length) {
        throw new ErrorDesafio("Alguna de las categorías elegidas ya no existe.");
    }

    // `challenges.category_id` es un derivado: siempre la más alta del conjunto.
    const principal = categorias.reduce((a, b) => (b.orden > a.orden ? b : a));

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
        categoriaIds,
        categoriaPrincipalId: principal.id,
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
        // El desafío y sus categorías entran juntos: uno sin las otras sería un
        // desafío al que nadie puede inscribirse.
        await db.transaction(async (tx) => {
            await tx.insert(challenges).values({
                id,
                name: v.nombre,
                description: v.descripcion,
                status: ESTADO_DESAFIO.BORRADOR,
                categoryId: v.categoriaPrincipalId,
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
            await tx.insert(challengeCategories).values(
                v.categoriaIds.map((categoryId) => ({ challengeId: id, categoryId }))
            );
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

        // Las categorías definen quién puede inscribirse: cambiarlas con gente
        // ya anotada dejaría inscriptos que no cumplen la regla.
        const [{ n }] = await db
            .select({ n: sql<number>`count(*)` })
            .from(challengeRegistrations)
            .where(and(eq(challengeRegistrations.challengeId, id), sql`${challengeRegistrations.status} != 'baja'`));
        const inscriptos = Number(n) || 0;

        const previas = (await db
            .select({ categoryId: challengeCategories.categoryId })
            .from(challengeCategories)
            .where(eq(challengeCategories.challengeId, id))).map((c) => c.categoryId);

        const nuevas = new Set(v.categoriaIds);
        const cambiaCategoria =
            previas.length !== nuevas.size || previas.some((c) => !nuevas.has(c));

        if (cambiaCategoria && !puedeEditarCategoria(actual.estado, inscriptos)) {
            throw new ErrorDesafio(
                `No se pueden cambiar las categorías: el desafío ya está ${actual.estado} y tiene ${inscriptos} inscriptos.`
            );
        }

        await db.transaction(async (tx) => {
            await tx
                .update(challenges)
                .set({
                    name: v.nombre,
                    description: v.descripcion,
                    categoryId: v.categoriaPrincipalId,
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

            if (cambiaCategoria) {
                await tx.delete(challengeCategories).where(eq(challengeCategories.challengeId, id));
                await tx.insert(challengeCategories).values(
                    v.categoriaIds.map((categoryId) => ({ challengeId: id, categoryId }))
                );
            }
        });

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
 * Elimina un desafío en cualquier estado, con todo lo que cuelga de él.
 *
 * Con partidos ya jugados el borrado se lleva puesto el historial y los puntos
 * del ranking de ese desafío, así que en ese caso hace falta pasar
 * `confirmarConHistorial`: la UI lo manda recién después de una segunda
 * confirmación explícita, para que no se pierda un desafío entero por un clic.
 */
export async function eliminarDesafio(id: string, confirmarConHistorial = false) {
    return ejecutar("eliminarDesafio", async () => {
        await requerirAdmin();
        await traerDesafio(id);

        const [{ n }] = await db
            .select({ n: sql<number>`count(*)` })
            .from(challengeMatches)
            .where(eq(challengeMatches.challengeId, id));
        const partidos = Number(n) || 0;

        if (partidos > 0 && !confirmarConHistorial) {
            throw new ErrorDesafio(
                `Este desafío ya tiene ${partidos} partidos: confirmá el borrado para eliminarlos junto con sus puntos.`
            );
        }

        // Sin FKs en el schema: el borrado en cascada se hace a mano. Van todas
        // las tablas hijas — si mañana se agrega otra, el olvido deja basura
        // huérfana.
        await db.transaction(async (tx) => {
            await tx.delete(challengePoints).where(eq(challengePoints.challengeId, id));
            await tx.delete(challengeQueue).where(eq(challengeQueue.challengeId, id));
            await tx.delete(challengeMatches).where(eq(challengeMatches.challengeId, id));
            await tx.delete(challengePairs).where(eq(challengePairs.challengeId, id));
            await tx.delete(challengeRegistrations).where(eq(challengeRegistrations.challengeId, id));
            await tx.delete(challengeCourts).where(eq(challengeCourts.challengeId, id));
            await tx.delete(challengeCategories).where(eq(challengeCategories.challengeId, id));
            await tx.delete(challenges).where(eq(challenges.id, id));
        });

        revalidarDesafio();
        return { id };
    });
}
