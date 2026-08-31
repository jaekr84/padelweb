"use server";

// Contaduría: alta, edición y borrado de movimientos, más las lecturas que
// alimentan la pantalla (listado del período, totales y meses disponibles).

import { db } from "@/db";
import { accountingEntries, users } from "@/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import {
    MONTO_MAXIMO_CENTAVOS, MOVIMIENTOS_POR_PERIODO, TIPO_MOVIMIENTO, esFechaValida, esTipoMovimiento,
    type Movimiento, type TipoMovimiento, type Totales,
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
};

/** Período = un mes "YYYY-MM", o "todos". */
export type Periodo = string;

const TODOS = "todos";

/** Filtro por mes sin funciones sobre la columna, para que el índice de `date` sirva. */
function filtroDePeriodo(periodo: Periodo) {
    if (!periodo || periodo === TODOS || !/^\d{4}-\d{2}$/.test(periodo)) return undefined;
    return and(gte(accountingEntries.date, `${periodo}-01`), lte(accountingEntries.date, `${periodo}-31`));
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

    return { tipo: datos.tipo, fecha: datos.fecha, descripcion, montoCentavos: monto };
}

// ── Lectura ─────────────────────────────────────────────────────────────────

export async function obtenerMovimientos(periodo: Periodo = TODOS): Promise<Movimiento[]> {
    if (!(await esAdmin())) return [];

    const filas = await db
        .select({
            id: accountingEntries.id,
            tipo: accountingEntries.type,
            fecha: accountingEntries.date,
            descripcion: accountingEntries.description,
            montoCentavos: accountingEntries.amountCents,
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
        .where(filtroDePeriodo(periodo))
        .orderBy(desc(accountingEntries.date), desc(accountingEntries.createdAt))
        .limit(MOVIMIENTOS_POR_PERIODO);

    return filas.map((f) => ({
        id: f.id,
        tipo: (f.tipo === TIPO_MOVIMIENTO.GASTO ? TIPO_MOVIMIENTO.GASTO : TIPO_MOVIMIENTO.INGRESO) as TipoMovimiento,
        fecha: f.fecha,
        descripcion: f.descripcion,
        montoCentavos: Number(f.montoCentavos),
        registradoPor: {
            id: f.autorId,
            nombre: nombreDe(f.autorNombre, f.autorApellido, f.autorEmail),
            email: f.autorEmail,
        },
        creadoEn: f.creadoEn.toISOString(),
    }));
}

/** Ingresos, gastos y saldo del período completo (sin el tope del listado). */
export async function obtenerTotales(periodo: Periodo = TODOS): Promise<Totales> {
    if (!(await esAdmin())) return { ingresos: 0, gastos: 0, saldo: 0 };

    const filas = await db
        .select({
            tipo: accountingEntries.type,
            total: sql<string>`sum(${accountingEntries.amountCents})`,
        })
        .from(accountingEntries)
        .where(filtroDePeriodo(periodo))
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
            createdByUserId: session.userId,
        });

        revalidatePath("/admin/contaduria");
    });
}

/**
 * Editar no cambia quién lo registró: la fila sigue siendo de quien la cargó,
 * que es justamente lo que se quiere poder auditar.
 */
export async function editarMovimiento(id: string, datos: DatosMovimiento): Promise<Resultado> {
    return ejecutar("editarMovimiento", async () => {
        await requerirAdmin();
        const v = validar(datos);

        const resultado = await db
            .update(accountingEntries)
            .set({
                type: v.tipo,
                date: v.fecha,
                description: v.descripcion,
                amountCents: v.montoCentavos,
            })
            .where(eq(accountingEntries.id, id));

        if (filasAfectadas(resultado) === 0) throw new ErrorContaduria("El movimiento ya no existe.");

        revalidatePath("/admin/contaduria");
    });
}

export async function eliminarMovimiento(id: string): Promise<Resultado> {
    return ejecutar("eliminarMovimiento", async () => {
        await requerirAdmin();

        const resultado = await db.delete(accountingEntries).where(eq(accountingEntries.id, id));
        if (filasAfectadas(resultado) === 0) throw new ErrorContaduria("El movimiento ya no existe.");

        revalidatePath("/admin/contaduria");
    });
}
