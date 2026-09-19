"use server";

// Contaduría por evento: las lecturas que arman el resultado de cada torneo,
// desafío y cancha abierta.
//
// No hay escritura propia. Los movimientos de un evento se cargan, editan y
// borran con las mismas acciones de la caja general (`../actions`): son la
// misma fila en la misma tabla, sólo que con el evento adentro.

import { db } from "@/db";
import {
    accountingEntries, challengeRegistrations, challenges, openCourtEvents,
    openCourtRegistrations, tournaments,
} from "@/db/schema";
import { and, count, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
    RUBRO, TIPO_EVENTO, TIPO_MOVIMIENTO, claveDeEvento, esRubro, esTipoEvento, porFechaDesc,
    type EsperadoInscripciones, type Movimiento, type ResumenEvento, type Rubro, type TipoEvento,
    type TipoMovimiento, type Totales,
} from "@/lib/contaduria";
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
};

/** "2026-08-31T00:00" → "2026-08-31". Cualquier otra cosa → null. */
function soloFecha(valor: string | null | undefined): string | null {
    const recortado = (valor ?? "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(recortado) ? recortado : null;
}

type DatosEvento = {
    nombre: string;
    fecha: string | null;
    feeCentavos: number;
    unidades: number;
    /** Ej: "24 pagos marcados". Se muestra para que el criterio no se adivine. */
    base: string;
};

/**
 * Datos del evento en su propia tabla. Devuelve `null` si ya no está.
 *
 * `registration_fee` está en PESOS en las tres tablas (así se carga y así se
 * muestra en el resto de la app); la contaduría trabaja en centavos, y la
 * conversión se hace acá, en el único lugar donde se cruzan los dos mundos.
 */
async function leerEvento(tipo: TipoEvento, id: string): Promise<DatosEvento | null> {
    if (tipo === TIPO_EVENTO.TORNEO) {
        const [t] = await db
            .select({
                nombre: tournaments.name,
                fecha: tournaments.startDate,
                fee: tournaments.registrationFee,
                pagos: tournaments.paidPlayerIds,
            })
            .from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!t) return null;

        // `paid_player_ids` es un JSON de ids de jugador. Se cuenta por Set
        // porque la lista se reescribe entera en cada guardado del fixture y
        // un id repetido cobraría dos veces.
        const pagos = Array.isArray(t.pagos) ? new Set(t.pagos as unknown[]).size : 0;
        return {
            nombre: t.nombre,
            fecha: soloFecha(t.fecha),
            feeCentavos: (t.fee ?? 0) * 100,
            unidades: pagos,
            base: pagos + (pagos === 1 ? " pago marcado" : " pagos marcados"),
        };
    }

    if (tipo === TIPO_EVENTO.DESAFIO) {
        const [d] = await db
            .select({ nombre: challenges.name, fecha: challenges.startDate, fee: challenges.registrationFee })
            .from(challenges).where(eq(challenges.id, id)).limit(1);
        if (!d) return null;

        // El desafío no marca pagos uno por uno: lo más cerca que hay del
        // esperado son los inscriptos que no se dieron de baja.
        const [c] = await db
            .select({ cantidad: count() })
            .from(challengeRegistrations)
            .where(and(eq(challengeRegistrations.challengeId, id), ne(challengeRegistrations.status, "baja")));
        const inscriptos = Number(c?.cantidad ?? 0);
        return {
            nombre: d.nombre,
            fecha: soloFecha(d.fecha),
            feeCentavos: (d.fee ?? 0) * 100,
            unidades: inscriptos,
            base: inscriptos + (inscriptos === 1 ? " inscripto" : " inscriptos"),
        };
    }

    const [e] = await db
        .select({ nombre: openCourtEvents.name, fecha: openCourtEvents.date, fee: openCourtEvents.registrationFee })
        .from(openCourtEvents).where(eq(openCourtEvents.id, id)).limit(1);
    if (!e) return null;

    const [c] = await db
        .select({ cantidad: count() })
        .from(openCourtRegistrations)
        .where(and(eq(openCourtRegistrations.eventId, id), eq(openCourtRegistrations.hasPaid, true)));
    const pagos = Number(c?.cantidad ?? 0);
    return {
        nombre: e.nombre,
        fecha: soloFecha(e.fecha),
        feeCentavos: (e.fee ?? 0) * 100,
        unidades: pagos,
        base: pagos + (pagos === 1 ? " pago marcado" : " pagos marcados"),
    };
}

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

    const [evento, movimientos, totales, cargado, desglose] = await Promise.all([
        leerEvento(tipo, id),
        obtenerMovimientos(filtros),
        obtenerTotales(filtros),
        cargadoEnInscripciones(tipo, id),
        desglosePorRubro(tipo, id),
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
        inscripciones: evento.feeCentavos > 0
            ? {
                feeCentavos: evento.feeCentavos,
                unidades: evento.unidades,
                esperadoCentavos: evento.feeCentavos * evento.unidades,
                cargadoCentavos: cargado,
                base: evento.base,
            }
            : null,
    };
}
