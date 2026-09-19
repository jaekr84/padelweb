// Lecturas y escrituras de contaduría que cruzan con las tablas de eventos.
//
// Vive en `lib` y no en un `actions.ts` porque lo llaman las acciones de los
// otros módulos (el toggle de pagado del fixture, el de cancha abierta) y un
// archivo "use server" sólo puede exportar funciones async pensadas para el
// cliente. Acá no hay nada que el cliente llame directo.

import { db } from "@/db";
import {
    accountingEntries, challengeRegistrations, challenges, openCourtEvents,
    openCourtRegistrations, tournamentGroups, tournaments, users,
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
    /**
     * Precio de referencia en centavos (el general cuando hay dos). Es para
     * mostrar: el total NO se calcula multiplicando por esto.
     */
    feeCentavos: number;
    /** Cuántas personas pagaron. */
    unidades: number;
    /**
     * Lo recaudado por inscripciones, ya sumado jugador por jugador. Va
     * calculado y no como `fee × unidades` porque los torneos tienen dos
     * precios (socio y general) y el total depende de quién pagó cada uno.
     */
    esperadoCentavos: number;
    /** Ej: "24 pagos · 14 socios + 10 invitados". El criterio, a la vista. */
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
                feeSocio: tournaments.memberRegistrationFee,
                pagos: tournaments.paidPlayerIds,
            })
            .from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!t) return null;

        const general = (t.fee ?? 0) * 100;
        // Sin precio de socio cargado, hay un solo precio para todos.
        const socio = t.feeSocio == null ? general : t.feeSocio * 100;

        const { pagadores } = await pagosDeTorneo(id, t.pagos);
        const socios = pagadores.filter((p) => p.esSocio).length;
        const invitados = pagadores.length - socios;

        return {
            nombre: t.nombre,
            fecha: soloFecha(t.fecha),
            feeCentavos: general,
            unidades: pagadores.length,
            esperadoCentavos: socios * socio + invitados * general,
            base: baseDeTorneo(pagadores.length, socios, invitados, socio !== general),
        };
    }

    if (tipo === TIPO_EVENTO.DESAFIO) {
        const [d] = await db
            .select({ nombre: challenges.name, fecha: challenges.startDate, fee: challenges.registrationFee })
            .from(challenges).where(eq(challenges.id, id)).limit(1);
        if (!d) return null;

        // Los pagos marcados, igual que en los otros dos eventos. Antes esto
        // contaba inscriptos, que era una estimación de lo que se iba a cobrar
        // y no de lo cobrado.
        const [c] = await db
            .select({ cantidad: count() })
            .from(challengeRegistrations)
            .where(and(
                eq(challengeRegistrations.challengeId, id),
                ne(challengeRegistrations.status, "baja"),
                eq(challengeRegistrations.hasPaid, true),
            ));
        const pagos = Number(c?.cantidad ?? 0);
        const fee = (d.fee ?? 0) * 100;
        return {
            nombre: d.nombre,
            fecha: soloFecha(d.fecha),
            feeCentavos: fee,
            unidades: pagos,
            esperadoCentavos: fee * pagos,
            base: pagos + (pagos === 1 ? " pago marcado" : " pagos marcados"),
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
    const fee = (e.fee ?? 0) * 100;
    return {
        nombre: e.nombre,
        fecha: soloFecha(e.fecha),
        feeCentavos: fee,
        unidades: pagos,
        esperadoCentavos: fee * pagos,
        base: pagos + (pagos === 1 ? " pago marcado" : " pagos marcados"),
    };
}

/** "24 pagos · 14 socios + 10 invitados", o sólo los pagos si hay un precio. */
function baseDeTorneo(total: number, socios: number, invitados: number, dosPrecios: boolean): string {
    const pagos = total + (total === 1 ? " pago marcado" : " pagos marcados");
    if (!dosPrecios || total === 0) return pagos;

    const partes: string[] = [];
    if (socios) partes.push(`${socios} ${socios === 1 ? "socio" : "socios"}`);
    if (invitados) partes.push(`${invitados} ${invitados === 1 ? "invitado" : "invitados"}`);
    return `${pagos} · ${partes.join(" + ")}`;
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

        // Ya viene sumado jugador por jugador: en torneos el socio y el
        // invitado pagan distinto, así que multiplicar por un precio único
        // daría un número que no es el que se cobró.
        const total = evento.esperadoCentavos;

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

export type Pagador = {
    id: string;
    nombre: string;
    /**
     * Tiene cuenta en la app, así que le corresponde el precio de socio. Un
     * invitado —cargado a mano, con o sin fila en `users`— paga el general.
     */
    esSocio: boolean;
};

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
        const { pagadores } = await pagosDeTorneo(id);
        return pagadores;
    }

    if (tipo === TIPO_EVENTO.CANCHA_ABIERTA) {
        const filas = await db
            .select({
                id: openCourtRegistrations.id,
                usuarioId: openCourtRegistrations.userId,
                invitado: openCourtRegistrations.guestName,
                nombre: users.firstName,
                apellido: users.lastName,
                email: users.email,
                esInvitado: users.isGuest,
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
                esSocio: Boolean(f.usuarioId) && !f.esInvitado,
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }

    const filas = await db
        .select({
            id: challengeRegistrations.id,
            nombre: users.firstName,
            apellido: users.lastName,
            email: users.email,
            esInvitado: users.isGuest,
        })
        .from(challengeRegistrations)
        // Inner join: en el desafío todo inscripto es una fila de `users`,
        // incluidos los invitados sin cuenta (van con `is_guest`).
        .innerJoin(users, eq(users.id, challengeRegistrations.userId))
        .where(and(
            eq(challengeRegistrations.challengeId, id),
            ne(challengeRegistrations.status, "baja"),
            eq(challengeRegistrations.hasPaid, true),
        ));

    return filas
        .map((f) => ({
            id: f.id,
            nombre: nombreDe(f.nombre, f.apellido, f.email),
            esSocio: !f.esInvitado,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// ── Pagos de un torneo ──────────────────────────────────────────────────────
//
// `paid_player_ids` no guarda ids de usuario: guarda claves de la planilla del
// fixture, en tres formatos según cómo se armó el torneo.
//
//   "<entrada>"      individual → esa persona
//                    parejas    → LAS DOS personas de la pareja (formato viejo:
//                                 el id pelado significa "ambos tildados")
//   "<entrada>_0/_1" round robin por integrante (useTournamentLogic)
//   "<entrada>::1/2" americano por integrante (attendance-utils)
//
// Contar las claves a secas subcuenta las parejas con clave plana, y ninguna
// clave matchea `users.id`, así que los nombres tampoco salen de ahí: salen de
// `tournament_groups.players`, que además tiene a los invitados sin cuenta.

/** Una entrada de la planilla: un jugador o una pareja. */
type EntradaGrupo = {
    id?: string;
    name?: string;
    player1?: string;
    player2?: string;
    /**
     * Id del jugador (o del primer integrante de la pareja). Es un id de
     * `users` cuando tiene cuenta, o `manual_<uuid>` cuando lo cargó un admin
     * a mano y no existe en ningún lado.
     */
    userId?: string | null;
    partnerUserId?: string | null;
};

/** Todas las entradas del torneo, indexadas por su id. */
async function entradasDelTorneo(tournamentId: string): Promise<Map<string, EntradaGrupo>> {
    const grupos = await db
        .select({ players: tournamentGroups.players })
        .from(tournamentGroups)
        .where(eq(tournamentGroups.tournamentId, tournamentId));

    const mapa = new Map<string, EntradaGrupo>();
    for (const g of grupos) {
        let lista: unknown = g.players;
        if (typeof lista === "string") {
            try { lista = JSON.parse(lista); } catch { continue; }
        }
        if (!Array.isArray(lista)) continue;

        for (const entrada of lista as EntradaGrupo[]) {
            if (entrada?.id) mapa.set(entrada.id, entrada);
        }
    }
    return mapa;
}

/** "abc_1" → entrada "abc", integrante 1. "abc" → sin integrante. */
function partirClave(clave: string): { entrada: string; integrante: 0 | 1 | null } {
    // El americano numera 1 y 2; el round robin, 0 y 1. Se normaliza a 0/1.
    const americano = clave.match(/^(.+)::([12])$/);
    if (americano) return { entrada: americano[1], integrante: (Number(americano[2]) - 1) as 0 | 1 };

    const robin = clave.match(/^(.+)_([01])$/);
    if (robin) return { entrada: robin[1], integrante: Number(robin[2]) as 0 | 1 };

    return { entrada: clave, integrante: null };
}

/**
 * Quiénes pagaron en un torneo, ya resueltos a nombres.
 *
 * `pagadores.length` es la cantidad de personas que pagaron, que es lo que se
 * multiplica por el precio. No coincide con la cantidad de claves: una clave
 * plana en un torneo de parejas son dos personas.
 */
export async function pagosDeTorneo(
    tournamentId: string,
    /** Se puede pasar ya leído para no consultar el torneo dos veces. */
    pagosCrudos?: unknown,
): Promise<{ pagadores: Pagador[] }> {
    let crudo = pagosCrudos;
    if (crudo === undefined) {
        const [t] = await db
            .select({ pagos: tournaments.paidPlayerIds })
            .from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
        crudo = t?.pagos;
    }

    const claves = idsPagados(crudo);
    if (claves.length === 0) return { pagadores: [] };

    const entradas = await entradasDelTorneo(tournamentId);

    // Primero se arma la lista con el id de usuario en crudo; recién después se
    // resuelve quién tiene cuenta, en una sola consulta.
    type Parcial = { id: string; nombre: string; usuarioId: string | null };
    const parciales: Parcial[] = [];

    for (const clave of claves) {
        const { entrada: idEntrada, integrante } = partirClave(clave);
        const entrada = entradas.get(idEntrada);

        // La entrada ya no está en la planilla (se borró un jugador y quedó la
        // clave). Se cuenta como una sola persona: cobrar de más por una fila
        // fantasma sería peor que quedarse corto.
        if (!entrada) {
            parciales.push({ id: clave, nombre: "Jugador no identificado", usuarioId: null });
            continue;
        }

        const esPareja = Boolean(entrada.player2 || entrada.partnerUserId);

        if (integrante === null) {
            if (esPareja) {
                // Formato viejo: el id pelado quiere decir que pagaron los dos.
                parciales.push({ id: `${clave}_0`, nombre: entrada.player1 || entrada.name || "Jugador", usuarioId: entrada.userId ?? null });
                parciales.push({ id: `${clave}_1`, nombre: entrada.player2 || "Jugador", usuarioId: entrada.partnerUserId ?? null });
            } else {
                parciales.push({ id: clave, nombre: entrada.name || "Jugador", usuarioId: entrada.userId ?? null });
            }
            continue;
        }

        parciales.push({
            id: clave,
            nombre: integrante === 0
                ? entrada.player1 || entrada.name || "Jugador"
                : entrada.player2 || entrada.name || "Jugador",
            usuarioId: (integrante === 0 ? entrada.userId : entrada.partnerUserId) ?? null,
        });
    }

    const conCuenta = await idsConCuenta(parciales.map((p) => p.usuarioId));

    const pagadores = parciales.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        esSocio: Boolean(p.usuarioId && conCuenta.has(p.usuarioId)),
    }));

    pagadores.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return { pagadores };
}

/**
 * De una lista de ids de la planilla, cuáles corresponden a un jugador con
 * cuenta de verdad — que es quien paga el precio de socio.
 *
 * Hay dos formas de ser invitado y las dos quedan afuera: el jugador cargado a
 * mano en el fixture, que ni siquiera tiene fila en `users` y viaja con el
 * prefijo `manual_`, y el invitado del sistema de Desafío, que sí tiene fila
 * pero marcada con `is_guest`.
 */
async function idsConCuenta(ids: (string | null)[]): Promise<Set<string>> {
    const reales = [...new Set(
        ids.filter((id): id is string => Boolean(id) && !id!.startsWith("manual_"))
    )];
    if (reales.length === 0) return new Set();

    const filas = await db
        .select({ id: users.id, esInvitado: users.isGuest })
        .from(users)
        .where(inArray(users.id, reales));

    return new Set(filas.filter((f) => !f.esInvitado).map((f) => f.id));
}
