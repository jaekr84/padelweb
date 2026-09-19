// Lecturas y escrituras de contaduría que cruzan con las tablas de eventos.
//
// Vive en `lib` y no en un `actions.ts` porque lo llaman las acciones de los
// otros módulos (el toggle de pagado del fixture, el de cancha abierta) y un
// archivo "use server" sólo puede exportar funciones async pensadas para el
// cliente. Acá no hay nada que el cliente llame directo.

import { db } from "@/db";
import {
    accountingEntries, challengeRegistrations, challenges, openCourtEvents,
    openCourtRegistrations, tournaments, users,
} from "@/db/schema";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import {
    ORIGEN, RUBRO, TIPO_EVENTO, TIPO_MOVIMIENTO, hoyISO, llevaInscripcionesAutomaticas,
    type TipoEvento,
} from "@/lib/contaduria";

/** "2026-08-31T00:00" → "2026-08-31". Cualquier otra cosa → null. */
export function soloFecha(valor: string | null | undefined): string | null {
    const recortado = (valor ?? "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(recortado) ? recortado : null;
}

export type DatosEvento = {
    nombre: string;
    fecha: string | null;
    /** Precio de inscripción en centavos. 0 si el evento es gratis. */
    feeCentavos: number;
    /** Cuántas veces se cobra ese precio. */
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
export async function leerEvento(tipo: TipoEvento, id: string): Promise<DatosEvento | null> {
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

        const pagos = idsPagados(t.pagos).length;
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

/**
 * `paid_player_ids` es un JSON de ids de jugador.
 *
 * Llega como array o como string según el driver: el MariaDB de Hostinger
 * devuelve las columnas `json` sin parsear, y por eso el resto del fixture ya
 * tiene su propio `ensureParsed`. Chequear sólo `Array.isArray` daría siempre
 * cero pagos.
 *
 * Se deduplica porque la lista se reescribe entera en cada guardado y un id
 * repetido cobraría dos veces.
 */
export function idsPagados(json: unknown): string[] {
    let valor = json;

    if (typeof valor === "string") {
        try {
            valor = JSON.parse(valor);
        } catch {
            return [];
        }
    }

    if (!Array.isArray(valor)) return [];
    return [...new Set(valor.filter((v): v is string => typeof v === "string" && v.length > 0))];
}

// ── Sincronización del asiento de inscripciones ─────────────────────────────

/**
 * Deja el asiento automático de inscripciones del evento igual a lo que dicen
 * los pagos marcados: `pagos × precio`.
 *
 * Se recalcula en vez de acumularse porque el pago no se guarda como un hecho
 * ("Fulano pagó") sino como la lista entera de vuelta: sumar en cada guardado
 * duplicaría, y desmarcar a alguien no restaría nada.
 *
 * No lanza nunca. La corre el toggle de pagado, y marcar un pago no puede
 * fallar porque la caja tuvo un problema — el pago es el hecho, la caja es su
 * reflejo.
 */
export async function sincronizarInscripciones(
    tipo: TipoEvento,
    eventoId: string,
    userId: string,
): Promise<void> {
    try {
        if (!llevaInscripcionesAutomaticas(tipo)) return;

        const evento = await leerEvento(tipo, eventoId);
        if (!evento) return;

        const total = evento.feeCentavos * evento.unidades;

        const [existente] = await db
            .select({ id: accountingEntries.id })
            .from(accountingEntries)
            .where(and(
                eq(accountingEntries.eventType, tipo),
                eq(accountingEntries.eventId, eventoId),
                eq(accountingEntries.origin, ORIGEN.AUTO_INSCRIPCIONES),
            ))
            .limit(1);

        // Nadie pagó (o se desmarcaron todos): el asiento se borra en vez de
        // quedar en cero, así no ensucia el listado con una fila sin plata.
        if (total <= 0) {
            if (existente) {
                await db.delete(accountingEntries).where(eq(accountingEntries.id, existente.id));
            }
            return;
        }

        // La fecha contable es la del evento, no la del clic: el ingreso
        // pertenece al día que se jugó.
        const fecha = evento.fecha ?? hoyISO();
        const descripcion = "INSCRIPCIONES";

        if (existente) {
            // `createdByUserId` no se toca: la fila sigue siendo de quien la
            // originó, igual que en la edición manual.
            await db.update(accountingEntries)
                .set({
                    amountCents: total,
                    date: fecha,
                    description: descripcion,
                    eventName: evento.nombre,
                })
                .where(eq(accountingEntries.id, existente.id));
            return;
        }

        await db.insert(accountingEntries).values({
            id: crypto.randomUUID(),
            type: TIPO_MOVIMIENTO.INGRESO,
            date: fecha,
            description: descripcion,
            amountCents: total,
            category: RUBRO.INSCRIPCIONES,
            origin: ORIGEN.AUTO_INSCRIPCIONES,
            eventType: tipo,
            eventId: eventoId,
            eventName: evento.nombre,
            createdByUserId: userId,
        });
    } catch (error) {
        // A propósito silencioso para quien llama: el pago ya se guardó.
        console.error("[sincronizarInscripciones]", tipo, eventoId, error);
    }
}

// ── Quiénes pagaron ─────────────────────────────────────────────────────────

export type Pagador = { id: string; nombre: string };

const nombreDe = (nombre: string | null, apellido: string | null, email: string | null) => {
    const completo = [nombre, apellido].filter(Boolean).join(" ").trim();
    return completo || email || "Jugador eliminado";
};

/**
 * Los jugadores marcados como pagados ahora mismo: el detalle que hay detrás
 * del monto del asiento automático.
 *
 * Es el estado actual, no un historial: si a alguien se lo desmarca, deja de
 * estar acá, igual que deja de estar en el monto.
 */
export async function obtenerPagadores(tipo: TipoEvento, id: string): Promise<Pagador[]> {
    if (tipo === TIPO_EVENTO.TORNEO) {
        const [t] = await db
            .select({ pagos: tournaments.paidPlayerIds })
            .from(tournaments).where(eq(tournaments.id, id)).limit(1);

        const ids = idsPagados(t?.pagos);
        if (ids.length === 0) return [];

        const filas = await db
            .select({
                id: users.id, nombre: users.firstName, apellido: users.lastName, email: users.email,
            })
            .from(users).where(inArray(users.id, ids));

        // Se ordenan por nombre acá y no en SQL: la lista es chica y así el
        // orden no depende de la colación de la tabla.
        const porId = new Map(filas.map((f) => [f.id, nombreDe(f.nombre, f.apellido, f.email)]));
        return ids
            .map((idJugador) => ({ id: idJugador, nombre: porId.get(idJugador) ?? "Jugador eliminado" }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }

    if (tipo === TIPO_EVENTO.CANCHA_ABIERTA) {
        const filas = await db
            .select({
                id: openCourtRegistrations.id,
                invitado: openCourtRegistrations.guestName,
                nombre: users.firstName,
                apellido: users.lastName,
                email: users.email,
            })
            .from(openCourtRegistrations)
            // Left join: los invitados no tienen fila en `users` y se llaman
            // por el nombre que quedó en la inscripción.
            .leftJoin(users, eq(users.id, openCourtRegistrations.userId))
            .where(and(eq(openCourtRegistrations.eventId, id), eq(openCourtRegistrations.hasPaid, true)));

        return filas
            .map((f) => ({
                id: f.id,
                nombre: f.invitado?.trim() || nombreDe(f.nombre, f.apellido, f.email),
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }

    // El desafío no marca pagos por jugador: no hay nada que listar.
    return [];
}
