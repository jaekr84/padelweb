"use server";

// Contaduría: alta, edición y borrado de movimientos, más las lecturas que
// alimentan la pantalla (listado del período, totales y meses disponibles).

import { db } from "@/db";
import { accountingEntries, challenges, openCourtEvents, tournaments, users } from "@/db/schema";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import {
    MONTO_MAXIMO_CENTAVOS, MOVIMIENTOS_POR_PERIODO, ORIGEN, RUBRO, SIN_EVENTO, TIPO_EVENTO, TIPO_MOVIMIENTO,
    esAutomatico, esFechaValida, esOrigen, esRubro, esTipoEvento, esTipoMovimiento, parsearClaveEvento,
    porFechaDesc,
    rubroValido,
    type EventoRef, type Movimiento, type OpcionEvento, type Rubro, type TipoEvento, type TipoMovimiento,
    type Totales,
} from "@/lib/contaduria";

/** Igual que en el resto de los módulos nuevos: el error viaja como dato. */
export type Resultado<T = void> = { ok: true; data: T } | { ok: false; error: string };

class ErrorContaduria extends Error { }

async function ejecutar<T>(etiqueta: string, fn: () => Promise<T>): Promise<Resultado<T>> {
    try {
        return { ok: true, data: await fn() };
    } catch (err: unknown) {
        if (err instanceof ErrorContaduria) return { ok: false, error: err.message };
        console.error(`[${etiqueta}]`, err);
        return { ok: false, error: "No se pudo completar la operación." };
    }
}

/**
 * Filas tocadas por un UPDATE/DELETE. mysql2 devuelve `[header, campos]` y
 * drizzle a veces desenvuelve el header: se contemplan las dos formas.
 */
function filasAfectadas(resultado: unknown): number {
    const header = Array.isArray(resultado) ? resultado[0] : resultado;
    return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

/** La caja es de la app, no de un club: sólo admin y superadmin. */
async function requerirAdmin() {
    const session = await getSession();
    if (!session?.userId) throw new ErrorContaduria("Necesitás iniciar sesión.");
    if (session.role !== "admin" && session.role !== "superadmin") {
        throw new ErrorContaduria("No tenés permiso para gestionar la contaduría.");
    }
    return session;
}

export type DatosMovimiento = {
    tipo: TipoMovimiento;
    /** "YYYY-MM-DD" */
    fecha: string;
    descripcion: string;
    /** Positivo, en centavos. */
    montoCentavos: number;
    rubro: Rubro;
    /**
     * El evento que generó el movimiento, o `null` si es de la caja general.
     * El nombre se guarda como snapshot en la fila, así que viaja acá.
     */
    evento: EventoRef | null;
};

/** Período = un mes "YYYY-MM", o "todos". */
export type Periodo = string;

const TODOS = "todos";

export type Filtros = {
    periodo?: Periodo;
    /** Un rubro, o vacío/"todos" para no filtrar. */
    rubro?: string;
    /** "tipo:id", `SIN_EVENTO`, o vacío/"todos" para no filtrar. */
    evento?: string;
};

/** Filtro por mes sin funciones sobre la columna, para que el índice de `date` sirva. */
function filtroDePeriodo(periodo: Periodo) {
    if (!periodo || periodo === TODOS || !/^\d{4}-\d{2}$/.test(periodo)) return undefined;
    return and(gte(accountingEntries.date, `${periodo}-01`), lte(accountingEntries.date, `${periodo}-31`));
}

/** Filtro de un evento puntual. Entra por el índice `(event_type, event_id)`. */
function filtroDeEvento(tipo: TipoEvento, id: string) {
    return and(eq(accountingEntries.eventType, tipo), eq(accountingEntries.eventId, id));
}

/**
 * Las tres condiciones de la pantalla, combinadas. Se arma una sola vez y la
 * usan el listado y los totales: si divergieran, el saldo dejaría de explicar
 * las filas que se están viendo.
 */
function condicionesDe(filtros: Filtros) {
    const partes = [];

    const periodo = filtroDePeriodo(filtros.periodo ?? TODOS);
    if (periodo) partes.push(periodo);

    if (filtros.rubro && filtros.rubro !== TODOS && esRubro(filtros.rubro)) {
        partes.push(eq(accountingEntries.category, filtros.rubro));
    }

    if (filtros.evento === SIN_EVENTO) {
        partes.push(isNull(accountingEntries.eventId));
    } else if (filtros.evento && filtros.evento !== TODOS) {
        const ref = parsearClaveEvento(filtros.evento);
        // Una clave inválida no puede caer en "sin filtro": eso mostraría toda
        // la caja como si fuera de un evento. Se fuerza un conjunto vacío.
        partes.push(ref ? filtroDeEvento(ref.tipo, ref.id) : sql`1 = 0`);
    }

    return partes.length ? and(...partes) : undefined;
}

const nombreDe = (nombre: string | null, apellido: string | null, email: string | null) => {
    const completo = [nombre, apellido].filter(Boolean).join(" ").trim();
    return completo || email || "Usuario eliminado";
};

/** Validación compartida por el alta y la edición. */
function validar(datos: DatosMovimiento): DatosMovimiento {
    if (!esTipoMovimiento(datos.tipo)) throw new ErrorContaduria("Elegí si es un ingreso o un gasto.");

    // En mayúsculas acá y no sólo en el formulario: así el listado queda parejo
    // venga el movimiento de donde venga.
    const descripcion = (datos.descripcion ?? "").trim().toUpperCase();
    if (!descripcion) throw new ErrorContaduria("Poné una descripción del movimiento.");
    if (descripcion.length > 255) throw new ErrorContaduria("La descripción no puede pasar de 255 caracteres.");

    if (!esFechaValida(datos.fecha)) throw new ErrorContaduria("La fecha no es válida.");

    // El monto llega ya parseado a centavos; acá se chequea el rango porque el
    // cliente puede mandar cualquier cosa.
    const monto = Math.round(Number(datos.montoCentavos));
    if (!Number.isFinite(monto) || monto <= 0) throw new ErrorContaduria("El monto tiene que ser mayor a cero.");
    if (monto > MONTO_MAXIMO_CENTAVOS) throw new ErrorContaduria("El monto es demasiado grande.");

    // Un rubro desconocido cae en "Otros" en vez de frenar la carga: es una
    // clasificación, no un dato que pueda invalidar un movimiento real. Uno que
    // no corresponde al tipo sí se rechaza — un ingreso no puede ser "premios".
    const rubro = esRubro(datos.rubro) ? datos.rubro : RUBRO.OTROS;
    if (!rubroValido(datos.tipo, rubro)) {
        throw new ErrorContaduria("Ese rubro no corresponde a un " + datos.tipo + ".");
    }

    return { tipo: datos.tipo, fecha: datos.fecha, descripcion, montoCentavos: monto, rubro, evento: validarEvento(datos.evento) };
}

/**
 * El evento llega del cliente con el nombre incluido, porque ese nombre se
 * guarda como snapshot. Se valida la forma, no la existencia: si el torneo se
 * borra entre que se abre el modal y se guarda, el movimiento igual tiene que
 * poder cargarse — la plata se movió.
 */
function validarEvento(evento: EventoRef | null | undefined): EventoRef | null {
    if (!evento) return null;
    if (!esTipoEvento(evento.tipo)) throw new ErrorContaduria("El tipo de evento no es válido.");

    const id = (evento.id ?? "").trim();
    if (!id || id.length > 36) throw new ErrorContaduria("El evento elegido no es válido.");

    const nombre = (evento.nombre ?? "").trim().slice(0, 256) || "Evento sin nombre";
    return { tipo: evento.tipo, id, nombre };
}

// ── Lectura ─────────────────────────────────────────────────────────────────

export async function obtenerMovimientos(filtros: Filtros = {}): Promise<Movimiento[]> {
    if (!(await esAdmin())) return [];

    const filas = await db
        .select({
            id: accountingEntries.id,
            tipo: accountingEntries.type,
            fecha: accountingEntries.date,
            descripcion: accountingEntries.description,
            montoCentavos: accountingEntries.amountCents,
            rubro: accountingEntries.category,
            origen: accountingEntries.origin,
            eventoTipo: accountingEntries.eventType,
            eventoId: accountingEntries.eventId,
            eventoNombre: accountingEntries.eventName,
            creadoEn: accountingEntries.createdAt,
            autorId: accountingEntries.createdByUserId,
            autorNombre: users.firstName,
            autorApellido: users.lastName,
            autorEmail: users.email,
        })
        .from(accountingEntries)
        // Left join: si el usuario que cargó el gasto ya no está, el movimiento
        // se sigue viendo (la caja no puede perder filas por eso).
        .leftJoin(users, eq(users.id, accountingEntries.createdByUserId))
        .where(condicionesDe(filtros))
        .orderBy(desc(accountingEntries.date), desc(accountingEntries.createdAt))
        .limit(MOVIMIENTOS_POR_PERIODO);

    return filas.map(aMovimiento);
}

/** Fila cruda → `Movimiento`. La comparten el listado general y el del evento. */
type FilaMovimiento = {
    id: string;
    tipo: string;
    fecha: string;
    descripcion: string;
    montoCentavos: number;
    rubro: string;
    origen: string;
    eventoTipo: string | null;
    eventoId: string | null;
    eventoNombre: string | null;
    creadoEn: Date;
    autorId: string;
    autorNombre: string | null;
    autorApellido: string | null;
    autorEmail: string | null;
};

function aMovimiento(f: FilaMovimiento): Movimiento {
    return {
        id: f.id,
        tipo: (f.tipo === TIPO_MOVIMIENTO.GASTO ? TIPO_MOVIMIENTO.GASTO : TIPO_MOVIMIENTO.INGRESO) as TipoMovimiento,
        fecha: f.fecha,
        descripcion: f.descripcion,
        montoCentavos: Number(f.montoCentavos),
        rubro: esRubro(f.rubro) ? f.rubro : RUBRO.OTROS,
        origen: esOrigen(f.origen) ? f.origen : ORIGEN.MANUAL,
        // Hace falta el par completo: una fila a medio llenar no es un vínculo.
        evento: esTipoEvento(f.eventoTipo) && f.eventoId
            ? { tipo: f.eventoTipo, id: f.eventoId, nombre: f.eventoNombre || "Evento sin nombre" }
            : null,
        registradoPor: {
            id: f.autorId,
            nombre: nombreDe(f.autorNombre, f.autorApellido, f.autorEmail),
            email: f.autorEmail,
        },
        creadoEn: f.creadoEn.toISOString(),
    };
}

/** Ingresos, gastos y saldo del período completo (sin el tope del listado). */
export async function obtenerTotales(filtros: Filtros = {}): Promise<Totales> {
    if (!(await esAdmin())) return { ingresos: 0, gastos: 0, saldo: 0 };

    const filas = await db
        .select({
            tipo: accountingEntries.type,
            total: sql<string>`sum(${accountingEntries.amountCents})`,
        })
        .from(accountingEntries)
        .where(condicionesDe(filtros))
        .groupBy(accountingEntries.type);

    const porTipo = (t: string) => Number(filas.find((f) => f.tipo === t)?.total ?? 0);
    const ingresos = porTipo(TIPO_MOVIMIENTO.INGRESO);
    const gastos = porTipo(TIPO_MOVIMIENTO.GASTO);
    return { ingresos, gastos, saldo: ingresos - gastos };
}

/**
 * Meses que tienen movimientos, del más nuevo al más viejo. Salen de la base y
 * no de un calendario fijo: no tiene sentido ofrecer meses vacíos.
 */
export async function obtenerMeses(): Promise<string[]> {
    if (!(await esAdmin())) return [];

    const filas = await db
        .select({ mes: sql<string>`distinct left(${accountingEntries.date}, 7)` })
        .from(accountingEntries)
        .orderBy(sql`1 desc`)
        .limit(120);

    return filas.map((f) => f.mes).filter(Boolean);
}

async function esAdmin() {
    const session = await getSession();
    return session?.role === "admin" || session?.role === "superadmin";
}

// ── Escritura ───────────────────────────────────────────────────────────────

export async function crearMovimiento(datos: DatosMovimiento): Promise<Resultado> {
    return ejecutar("crearMovimiento", async () => {
        const session = await requerirAdmin();
        const v = validar(datos);

        await db.insert(accountingEntries).values({
            id: crypto.randomUUID(),
            type: v.tipo,
            date: v.fecha,
            description: v.descripcion,
            amountCents: v.montoCentavos,
            category: v.rubro,
            origin: ORIGEN.MANUAL,
            eventType: v.evento?.tipo ?? null,
            eventId: v.evento?.id ?? null,
            eventName: v.evento?.nombre ?? null,
            createdByUserId: session.userId,
        });

        revalidatePath("/admin/contaduria", "layout");
    });
}

/**
 * Editar no cambia quién lo registró: la fila sigue siendo de quien la cargó,
 * que es justamente lo que se quiere poder auditar.
 */
/**
 * El asiento automático de inscripciones lo reescribe el sistema en cada clic
 * de "pagado", así que editarlo o borrarlo a mano no tendría efecto: el
 * siguiente clic lo pisaría. Se frena acá y no sólo en la pantalla, porque la
 * acción se puede llamar igual desde afuera.
 */
async function requerirManual(id: string) {
    const [fila] = await db
        .select({ origen: accountingEntries.origin })
        .from(accountingEntries)
        .where(eq(accountingEntries.id, id))
        .limit(1);

    if (!fila) throw new ErrorContaduria("El movimiento ya no existe.");
    if (esAutomatico(fila.origen)) {
        throw new ErrorContaduria(
            "Ese movimiento lo mantiene el sistema con los pagos marcados. Para ajustarlo, cargá un movimiento aparte."
        );
    }
}

export async function editarMovimiento(id: string, datos: DatosMovimiento): Promise<Resultado> {
    return ejecutar("editarMovimiento", async () => {
        await requerirAdmin();
        await requerirManual(id);
        const v = validar(datos);

        const resultado = await db
            .update(accountingEntries)
            .set({
                type: v.tipo,
                date: v.fecha,
                description: v.descripcion,
                amountCents: v.montoCentavos,
                category: v.rubro,
                // Se puede despegar un movimiento de su evento (o mudarlo a
                // otro) desde la misma edición: por eso van los tres nulos.
                eventType: v.evento?.tipo ?? null,
                eventId: v.evento?.id ?? null,
                eventName: v.evento?.nombre ?? null,
            })
            .where(eq(accountingEntries.id, id));

        if (filasAfectadas(resultado) === 0) throw new ErrorContaduria("El movimiento ya no existe.");

        revalidatePath("/admin/contaduria", "layout");
    });
}

export async function eliminarMovimiento(id: string): Promise<Resultado> {
    return ejecutar("eliminarMovimiento", async () => {
        await requerirAdmin();
        await requerirManual(id);

        const resultado = await db.delete(accountingEntries).where(eq(accountingEntries.id, id));
        if (filasAfectadas(resultado) === 0) throw new ErrorContaduria("El movimiento ya no existe.");

        revalidatePath("/admin/contaduria", "layout");
    });
}

// ── Eventos ─────────────────────────────────────────────────────────────────

/** Sólo los últimos N de cada tipo: el selector es una lista, no un archivo. */
const EVENTOS_POR_TIPO = 200;

/** "2026-08-31T00:00" / "2026-08-31" → "2026-08-31". Cualquier otra cosa → null. */
function soloFecha(valor: string | null | undefined): string | null {
    const recortado = (valor ?? "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(recortado) ? recortado : null;
}

/**
 * Todos los eventos que se pueden vincular a un movimiento, del más nuevo al
 * más viejo. Se consultan las tres tablas por separado y se unen en memoria:
 * son tres esquemas distintos y un UNION en SQL obligaría a castear columnas
 * que no significan lo mismo.
 */
export async function obtenerOpcionesDeEvento(): Promise<OpcionEvento[]> {
    if (!(await esAdmin())) return [];

    const [torneos, desafios, canchas] = await Promise.all([
        db.select({ id: tournaments.id, nombre: tournaments.name, fecha: tournaments.startDate })
            .from(tournaments).orderBy(desc(tournaments.startDate)).limit(EVENTOS_POR_TIPO),
        db.select({ id: challenges.id, nombre: challenges.name, fecha: challenges.startDate })
            .from(challenges).orderBy(desc(challenges.createdAt)).limit(EVENTOS_POR_TIPO),
        db.select({ id: openCourtEvents.id, nombre: openCourtEvents.name, fecha: openCourtEvents.date })
            .from(openCourtEvents).orderBy(desc(openCourtEvents.date)).limit(EVENTOS_POR_TIPO),
    ]);

    const armar = (tipo: TipoEvento) => (f: { id: string; nombre: string; fecha: string | null }): OpcionEvento => ({
        tipo,
        id: f.id,
        nombre: f.nombre || "Evento sin nombre",
        fecha: soloFecha(f.fecha),
    });

    return [
        ...torneos.map(armar(TIPO_EVENTO.TORNEO)),
        ...desafios.map(armar(TIPO_EVENTO.DESAFIO)),
        ...canchas.map(armar(TIPO_EVENTO.CANCHA_ABIERTA)),
    ].sort(porFechaDesc);
}
