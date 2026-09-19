"use server";

// Contaduría por evento: las lecturas que arman el resultado de cada torneo,
// desafío y cancha abierta.
//
// No hay escritura propia. Los movimientos de un evento se cargan, editan y
// borran con las mismas acciones de la caja general (`../actions`): son la
// misma fila en la misma tabla, sólo que con el evento adentro.

import { db } from "@/db";
import { accountingEntries, accountingPrizeConfigs } from "@/db/schema";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import {
    MAX_PUESTOS, ORIGEN, PUNTOS_BASICOS_TOTALES, RUBRO, TIPO_MOVIMIENTO, calcularPool, claveDeEvento,
    esRubro, esTipoEvento, formatearPorcentaje, hoyISO, porFechaDesc, repartirPremios,
    type ConfigPremios, type EsperadoInscripciones, type Movimiento, type PuestoPremio,
    type ResumenEvento, type Rubro, type TipoEvento, type TipoMovimiento, type Totales,
} from "@/lib/contaduria";
import { leerEvento, obtenerPagadores, type Pagador } from "@/lib/contaduria-server";
import { obtenerMovimientos, obtenerOpcionesDeEvento, obtenerTotales } from "../actions";

async function esAdmin() {
    const session = await getSession();
    return session?.role === "admin" || session?.role === "superadmin";
}

/** Clave de agrupación en memoria. No sale a ningún lado. */
const clave = (tipo: string, id: string) => tipo + "::" + id;

type Agregado = { ingresos: number; gastos: number; movimientos: number };

/**
 * Ingresos, gastos y cantidad de movimientos por evento, de toda la historia.
 *
 * A propósito sin filtro de período: el resultado de un torneo son todos sus
 * movimientos, aunque el premio se haya pagado el mes siguiente. El período
 * filtra *qué eventos se listan*, no qué movimientos suma cada uno.
 */
async function agregadosPorEvento(): Promise<Map<string, Agregado>> {
    const filas = await db
        .select({
            tipoEvento: accountingEntries.eventType,
            idEvento: accountingEntries.eventId,
            tipo: accountingEntries.type,
            total: sql<string>`sum(${accountingEntries.amountCents})`,
            cantidad: count(),
        })
        .from(accountingEntries)
        .where(isNotNull(accountingEntries.eventId))
        .groupBy(accountingEntries.eventType, accountingEntries.eventId, accountingEntries.type);

    const mapa = new Map<string, Agregado>();
    for (const f of filas) {
        if (!f.tipoEvento || !f.idEvento) continue;
        const k = clave(f.tipoEvento, f.idEvento);
        const acumulado = mapa.get(k) ?? { ingresos: 0, gastos: 0, movimientos: 0 };
        const monto = Number(f.total ?? 0);
        if (f.tipo === TIPO_MOVIMIENTO.GASTO) acumulado.gastos += monto;
        else acumulado.ingresos += monto;
        acumulado.movimientos += Number(f.cantidad ?? 0);
        mapa.set(k, acumulado);
    }
    return mapa;
}

/**
 * Todos los eventos con su resultado, del más nuevo al más viejo.
 *
 * Se parte de los eventos y no de los movimientos: un torneo sin nada cargado
 * tiene que aparecer igual, porque justamente es el que hay que ir a cargar.
 */
export async function obtenerResumenEventos(periodo = "todos"): Promise<ResumenEvento[]> {
    if (!(await esAdmin())) return [];

    const [eventos, agregados] = await Promise.all([obtenerOpcionesDeEvento(), agregadosPorEvento()]);

    const delPeriodo = /^\d{4}-\d{2}$/.test(periodo)
        ? eventos.filter((e) => e.fecha?.startsWith(periodo))
        : eventos;

    return delPeriodo
        .map((e) => {
            const a = agregados.get(clave(e.tipo, e.id)) ?? { ingresos: 0, gastos: 0, movimientos: 0 };
            return {
                tipo: e.tipo,
                id: e.id,
                nombre: e.nombre,
                fecha: e.fecha,
                ingresos: a.ingresos,
                gastos: a.gastos,
                resultado: a.ingresos - a.gastos,
                movimientos: a.movimientos,
            };
        })
        .sort(porFechaDesc);
}

/** Meses que tienen algún evento. Alimenta el selector de período del listado. */
export async function obtenerMesesDeEventos(): Promise<string[]> {
    if (!(await esAdmin())) return [];
    const eventos = await obtenerOpcionesDeEvento();
    const meses = new Set(eventos.map((e) => e.fecha?.slice(0, 7)).filter(Boolean) as string[]);
    return [...meses].sort().reverse();
}

// ── Detalle de un evento ────────────────────────────────────────────────────

export type DesgloseRubro = {
    rubro: Rubro;
    tipo: TipoMovimiento;
    montoCentavos: number;
};

export type DetalleEvento = {
    tipo: TipoEvento;
    id: string;
    nombre: string;
    fecha: string | null;
    /**
     * `false` cuando el evento ya no está en su tabla y lo único que queda son
     * sus movimientos. La pantalla sigue funcionando: el nombre sale del
     * snapshot y el esperado deja de calcularse.
     */
    existe: boolean;
    totales: Totales;
    movimientos: Movimiento[];
    desglose: DesgloseRubro[];
    /** `null` si el evento no existe o no tiene precio de inscripción. */
    inscripciones: EsperadoInscripciones | null;
    /**
     * Quiénes están marcados como pagados ahora mismo: el detalle detrás del
     * monto del asiento automático. Vacío en desafío, que no marca pagos.
     */
    pagadores: Pagador[];
};

/** Lo ya cargado en la caja con rubro "inscripciones" para este evento. */
async function cargadoEnInscripciones(tipo: TipoEvento, id: string): Promise<number> {
    const [fila] = await db
        .select({ total: sql<string>`sum(${accountingEntries.amountCents})` })
        .from(accountingEntries)
        .where(and(
            eq(accountingEntries.eventType, tipo),
            eq(accountingEntries.eventId, id),
            eq(accountingEntries.category, RUBRO.INSCRIPCIONES),
            eq(accountingEntries.type, TIPO_MOVIMIENTO.INGRESO),
        ));
    return Number(fila?.total ?? 0);
}

/** Ingresos y gastos del evento agrupados por rubro, de mayor a menor. */
async function desglosePorRubro(tipo: TipoEvento, id: string): Promise<DesgloseRubro[]> {
    const filas = await db
        .select({
            rubro: accountingEntries.category,
            tipo: accountingEntries.type,
            total: sql<string>`sum(${accountingEntries.amountCents})`,
        })
        .from(accountingEntries)
        .where(and(eq(accountingEntries.eventType, tipo), eq(accountingEntries.eventId, id)))
        .groupBy(accountingEntries.category, accountingEntries.type)
        .orderBy(desc(sql`sum(${accountingEntries.amountCents})`));

    return filas.map((f) => ({
        rubro: esRubro(f.rubro) ? f.rubro : RUBRO.OTROS,
        tipo: f.tipo === TIPO_MOVIMIENTO.GASTO ? TIPO_MOVIMIENTO.GASTO : TIPO_MOVIMIENTO.INGRESO,
        montoCentavos: Number(f.total ?? 0),
    }));
}

export async function obtenerDetalleEvento(tipoCrudo: string, id: string): Promise<DetalleEvento | null> {
    if (!(await esAdmin())) return null;
    if (!esTipoEvento(tipoCrudo) || !id) return null;
    const tipo = tipoCrudo;

    // Los movimientos y los totales se piden con las acciones de la caja
    // general: así el mapeo de filas es uno solo y no se puede desincronizar.
    const filtros = { evento: claveDeEvento(tipo, id) };

    const [evento, movimientos, totales, cargado, desglose, pagadores] = await Promise.all([
        leerEvento(tipo, id),
        obtenerMovimientos(filtros),
        obtenerTotales(filtros),
        cargadoEnInscripciones(tipo, id),
        desglosePorRubro(tipo, id),
        obtenerPagadores(tipo, id),
    ]);

    // Evento borrado: queda lo que diga la caja. Si tampoco hay movimientos no
    // hay nada que mostrar y la página va a 404.
    if (!evento) {
        if (movimientos.length === 0) return null;
        return {
            tipo, id,
            nombre: movimientos[0].evento?.nombre ?? "Evento eliminado",
            fecha: null,
            existe: false,
            totales, movimientos, desglose,
            inscripciones: null,
            pagadores: [],
        };
    }

    return {
        tipo, id,
        nombre: evento.nombre || "Evento sin nombre",
        fecha: evento.fecha,
        existe: true,
        totales,
        movimientos,
        desglose,
        pagadores,
        inscripciones: evento.feeCentavos > 0 || evento.esperadoCentavos > 0
            ? {
                feeCentavos: evento.feeCentavos,
                unidades: evento.unidades,
                esperadoCentavos: evento.esperadoCentavos,
                cargadoCentavos: cargado,
                base: evento.base,
            }
            : null,
    };
}

// ── Panel embebido en las pantallas de gestión ──────────────────────────────

/** Lo que muestra el panel plegable. Sin la lista de movimientos: sólo el resumen. */
export type CajaDeEvento = {
    nombre: string;
    totales: Totales;
    movimientos: number;
    inscripciones: EsperadoInscripciones | null;
};

/**
 * Resumen de la caja de un evento para el panel de su pantalla de gestión.
 *
 * Devuelve `null` cuando quien mira no es admin, y ese es el único control de
 * acceso que hace falta: a las pantallas de torneo y cancha abierta también
 * entran usuarios `club` y dueños de torneo, que no tienen acceso a la caja.
 * Con el gate acá, el panel no necesita saber nada de roles — si no le llegan
 * datos, no se dibuja.
 */
export async function obtenerCajaDeEvento(tipoCrudo: string, id: string): Promise<CajaDeEvento | null> {
    if (!(await esAdmin())) return null;
    if (!esTipoEvento(tipoCrudo) || !id) return null;
    const tipo = tipoCrudo;

    const [evento, totales, cantidad, cargado] = await Promise.all([
        leerEvento(tipo, id),
        obtenerTotales({ evento: claveDeEvento(tipo, id) }),
        contarMovimientos(tipo, id),
        cargadoEnInscripciones(tipo, id),
    ]);

    // El evento ya no está en su tabla: se sigue mostrando lo que haya en la
    // caja, sin el esperado (no hay contra qué calcularlo).
    if (!evento) {
        if (cantidad === 0) return null;
        return { nombre: "Evento eliminado", totales, movimientos: cantidad, inscripciones: null };
    }

    return {
        nombre: evento.nombre || "Evento sin nombre",
        totales,
        movimientos: cantidad,
        inscripciones: evento.feeCentavos > 0 || evento.esperadoCentavos > 0
            ? {
                feeCentavos: evento.feeCentavos,
                unidades: evento.unidades,
                esperadoCentavos: evento.esperadoCentavos,
                cargadoCentavos: cargado,
                base: evento.base,
            }
            : null,
    };
}

async function contarMovimientos(tipo: TipoEvento, id: string): Promise<number> {
    const [fila] = await db
        .select({ cantidad: count() })
        .from(accountingEntries)
        .where(and(eq(accountingEntries.eventType, tipo), eq(accountingEntries.eventId, id)));
    return Number(fila?.cantidad ?? 0);
}

// ── Reparto de premios ──────────────────────────────────────────────────────

export type DatosPremios = {
    /** Ingresos del evento ahora mismo: la base sobre la que se calcula el pool. */
    ingresosCentavos: number;
    /** `null` si el evento nunca generó premios. */
    config: ConfigPremios | null;
};

/** Ingresos del evento (todos los rubros). Es la base del pool de premios. */
async function ingresosDelEvento(tipo: TipoEvento, id: string): Promise<number> {
    const [fila] = await db
        .select({ total: sql<string>`sum(${accountingEntries.amountCents})` })
        .from(accountingEntries)
        .where(and(
            eq(accountingEntries.eventType, tipo),
            eq(accountingEntries.eventId, id),
            eq(accountingEntries.type, TIPO_MOVIMIENTO.INGRESO),
        ));
    return Number(fila?.total ?? 0);
}

/** Los puestos guardados, tolerando basura en el JSON. */
function leerPuestos(json: unknown): PuestoPremio[] {
    let valor = json;
    if (typeof valor === "string") {
        try { valor = JSON.parse(valor); } catch { return []; }
    }
    if (!Array.isArray(valor)) return [];

    return valor
        .map((p) => ({
            rotulo: String((p as PuestoPremio)?.rotulo ?? "").slice(0, 120),
            puntosBasicos: Math.round(Number((p as PuestoPremio)?.puntosBasicos ?? 0)),
        }))
        .filter((p) => p.rotulo && Number.isFinite(p.puntosBasicos) && p.puntosBasicos >= 0);
}

export async function obtenerDatosPremios(tipoCrudo: string, id: string): Promise<DatosPremios | null> {
    if (!(await esAdmin())) return null;
    if (!esTipoEvento(tipoCrudo) || !id) return null;
    const tipo = tipoCrudo;

    const [ingresosCentavos, filas] = await Promise.all([
        ingresosDelEvento(tipo, id),
        db.select({
            pool: accountingPrizeConfigs.poolBasisPoints,
            puestos: accountingPrizeConfigs.positions,
            base: accountingPrizeConfigs.baseCents,
        })
            .from(accountingPrizeConfigs)
            .where(and(
                eq(accountingPrizeConfigs.eventType, tipo),
                eq(accountingPrizeConfigs.eventId, id),
            ))
            .limit(1),
    ]);

    const guardada = filas[0];
    return {
        ingresosCentavos,
        config: guardada
            ? {
                poolPuntosBasicos: Number(guardada.pool ?? 0),
                puestos: leerPuestos(guardada.puestos),
                baseCentavos: Number(guardada.base ?? 0),
            }
            : null,
    };
}

/**
 * Guarda el reparto y genera los gastos de premio, uno por puesto.
 *
 * Reemplaza los premios que ya había para el evento en vez de sumarles: el
 * reparto es una foto del podio, no un historial. Por eso la pantalla avisa
 * antes de pisar una edición hecha a mano.
 */
export async function generarPremios(
    tipoCrudo: string,
    id: string,
    poolPuntosBasicos: number,
    puestosCrudos: PuestoPremio[],
): Promise<{ ok: true; generados: number; totalCentavos: number } | { ok: false; error: string }> {
    try {
        const session = await getSession();
        if (session?.role !== "admin" && session?.role !== "superadmin") {
            return { ok: false, error: "No tenés permiso para gestionar la contaduría." };
        }
        if (!esTipoEvento(tipoCrudo) || !id) return { ok: false, error: "El evento no es válido." };
        const tipo = tipoCrudo;

        const pool = Math.round(Number(poolPuntosBasicos));
        if (!Number.isFinite(pool) || pool <= 0 || pool > PUNTOS_BASICOS_TOTALES) {
            return { ok: false, error: "El porcentaje destinado a premios tiene que estar entre 0 y 100." };
        }

        const puestos = leerPuestos(puestosCrudos);
        if (puestos.length === 0) return { ok: false, error: "Agregá al menos un puesto." };
        if (puestos.length > MAX_PUESTOS) return { ok: false, error: `No puede haber más de ${MAX_PUESTOS} puestos.` };

        const suma = puestos.reduce((t, p) => t + p.puntosBasicos, 0);
        if (suma > PUNTOS_BASICOS_TOTALES) {
            return { ok: false, error: "Los porcentajes de los puestos suman más del 100%." };
        }

        const evento = await leerEvento(tipo, id);
        const ingresos = await ingresosDelEvento(tipo, id);
        const poolCentavos = calcularPool(ingresos, pool);
        if (poolCentavos <= 0) {
            return { ok: false, error: "Todavía no hay ingresos cargados en el evento: no hay nada para repartir." };
        }

        const premios = repartirPremios(poolCentavos, puestos).filter((p) => p.montoCentavos > 0);
        if (premios.length === 0) {
            return { ok: false, error: "Con esos porcentajes ningún puesto llega a un peso." };
        }

        // La fecha contable es la del evento, igual que en las inscripciones: el
        // premio pertenece al torneo, no al día en que se apretó el botón.
        const fecha = evento?.fecha ?? hoyISO();
        const nombreEvento = evento?.nombre ?? null;

        await db.transaction(async (tx) => {
            // Reemplazo, no acumulación: si no, regenerar duplicaría el podio.
            await tx.delete(accountingEntries).where(and(
                eq(accountingEntries.eventType, tipo),
                eq(accountingEntries.eventId, id),
                eq(accountingEntries.origin, ORIGEN.PREMIOS),
            ));

            await tx.insert(accountingEntries).values(premios.map((p) => ({
                id: crypto.randomUUID(),
                type: TIPO_MOVIMIENTO.GASTO,
                date: fecha,
                // El porcentaje va en la descripción para que el movimiento se
                // explique solo cuando se lo mira desde la caja general.
                description: `${p.rotulo} (${formatearPorcentaje(p.puntosBasicos)}%)`.toUpperCase().slice(0, 255),
                amountCents: p.montoCentavos,
                category: RUBRO.PREMIOS_DINERO,
                origin: ORIGEN.PREMIOS,
                eventType: tipo,
                eventId: id,
                eventName: nombreEvento,
                createdByUserId: session.userId,
            })));

            // `base_cents` guarda con qué recaudación se generó: es lo que
            // después permite avisar "entró más plata, el pool cambió".
            await tx.insert(accountingPrizeConfigs).values({
                eventType: tipo,
                eventId: id,
                poolBasisPoints: pool,
                positions: puestos,
                baseCents: ingresos,
                updatedByUserId: session.userId,
            }).onDuplicateKeyUpdate({
                set: {
                    poolBasisPoints: pool,
                    positions: puestos,
                    baseCents: ingresos,
                    updatedByUserId: session.userId,
                },
            });
        });

        revalidatePath("/admin/contaduria", "layout");
        return {
            ok: true,
            generados: premios.length,
            totalCentavos: premios.reduce((t, p) => t + p.montoCentavos, 0),
        };
    } catch (error) {
        console.error("[generarPremios]", error);
        return { ok: false, error: "No se pudieron generar los premios." };
    }
}
