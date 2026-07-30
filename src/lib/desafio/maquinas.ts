// Máquinas de estado del módulo Desafío (§4 de docs/desafio-specs.md).
//
// Son funciones puras: no tocan la base. Las server actions las consultan antes
// de escribir, así la regla de "a dónde puede ir cada estado" vive en un solo
// lugar y se puede ejercitar sin DB.

import {
    ESTADO_COLA, ESTADO_DESAFIO, ESTADO_INSCRIPCION, ESTADO_PARTIDO,
    type EstadoCola, type EstadoDesafio, type EstadoInscripcion, type EstadoPartido,
} from "./estados";

export type Transicion<E extends string> = { de: E; a: E };

/** Resultado de validar un cambio de estado. */
export type ChequeoTransicion = { ok: true } | { ok: false; error: string };

const permitido = <E extends string>(mapa: Record<E, readonly E[]>, de: E, a: E) =>
    (mapa[de] ?? []).includes(a);

// ── Partido ─────────────────────────────────────────────────────────────────
//
// EN_CURSO ──(jugador carga)──► RESULTADO_CARGADO ──(admin confirma)──► CONFIRMADO
//                                      │
//                                      └──(admin rechaza)──► RECHAZADO ──► EN_CURSO
// EN_CURSO ──(admin cancela)──► CANCELADO
//
// RECHAZADO admite volver a cargar el resultado directamente: la transacción
// "cargar resultado" de la spec acepta partidos en EN_CURSO o RECHAZADO.

export const TRANSICIONES_PARTIDO: Record<EstadoPartido, readonly EstadoPartido[]> = {
    [ESTADO_PARTIDO.EN_CURSO]: [ESTADO_PARTIDO.RESULTADO_CARGADO, ESTADO_PARTIDO.CANCELADO],
    [ESTADO_PARTIDO.RESULTADO_CARGADO]: [ESTADO_PARTIDO.CONFIRMADO, ESTADO_PARTIDO.RECHAZADO],
    [ESTADO_PARTIDO.RECHAZADO]: [ESTADO_PARTIDO.EN_CURSO, ESTADO_PARTIDO.RESULTADO_CARGADO, ESTADO_PARTIDO.CANCELADO],
    [ESTADO_PARTIDO.CONFIRMADO]: [],
    [ESTADO_PARTIDO.CANCELADO]: [],
};

export function chequearTransicionPartido(de: EstadoPartido, a: EstadoPartido): ChequeoTransicion {
    if (de === a) return { ok: false, error: "El partido ya está en ese estado." };
    if (!permitido(TRANSICIONES_PARTIDO, de, a)) {
        return { ok: false, error: `Un partido "${de}" no puede pasar a "${a}".` };
    }
    return { ok: true };
}

/** Quién puede cargar el resultado: sólo los 4 que jugaron (o un admin). */
export function puedeCargarResultado(args: {
    estado: EstadoPartido;
    userId: string;
    jugadores: readonly string[];
    esAdmin?: boolean;
}): ChequeoTransicion {
    const { estado, userId, jugadores, esAdmin } = args;
    if (estado !== ESTADO_PARTIDO.EN_CURSO && estado !== ESTADO_PARTIDO.RECHAZADO) {
        return { ok: false, error: "Este partido no admite carga de resultado." };
    }
    if (!esAdmin && !jugadores.includes(userId)) {
        return { ok: false, error: "Solo los jugadores del partido pueden cargar el resultado." };
    }
    return { ok: true };
}

// ── Inscripción ─────────────────────────────────────────────────────────────
//
// DISPONIBLE ⇄ EMPAREJADO ⇄ JUGANDO
//
// Vuelve a EMPAREJADO cuando el partido pasa a RESULTADO_CARGADO, no cuando lo
// confirma el admin: así la pareja puede volver a jugar sin esperar.
// BAJA es salida desde cualquier estado que no sea JUGANDO.

export const TRANSICIONES_INSCRIPCION: Record<EstadoInscripcion, readonly EstadoInscripcion[]> = {
    [ESTADO_INSCRIPCION.DISPONIBLE]: [ESTADO_INSCRIPCION.EMPAREJADO, ESTADO_INSCRIPCION.BAJA],
    [ESTADO_INSCRIPCION.EMPAREJADO]: [ESTADO_INSCRIPCION.DISPONIBLE, ESTADO_INSCRIPCION.JUGANDO, ESTADO_INSCRIPCION.BAJA],
    // Desde JUGANDO no se puede dar de baja: primero hay que resolver el partido.
    [ESTADO_INSCRIPCION.JUGANDO]: [ESTADO_INSCRIPCION.EMPAREJADO, ESTADO_INSCRIPCION.DISPONIBLE],
    [ESTADO_INSCRIPCION.BAJA]: [ESTADO_INSCRIPCION.DISPONIBLE],
};

export function chequearTransicionInscripcion(de: EstadoInscripcion, a: EstadoInscripcion): ChequeoTransicion {
    if (de === a) return { ok: true }; // idempotente: no es un error
    if (!permitido(TRANSICIONES_INSCRIPCION, de, a)) {
        if (de === ESTADO_INSCRIPCION.JUGANDO && a === ESTADO_INSCRIPCION.BAJA) {
            return { ok: false, error: "El jugador está jugando: cerrá el partido antes de darlo de baja." };
        }
        return { ok: false, error: `Una inscripción "${de}" no puede pasar a "${a}".` };
    }
    return { ok: true };
}

// ── Desafío ─────────────────────────────────────────────────────────────────
//
// BORRADOR ──► ABIERTO ⇄ CERRADO

export const TRANSICIONES_DESAFIO: Record<EstadoDesafio, readonly EstadoDesafio[]> = {
    [ESTADO_DESAFIO.BORRADOR]: [ESTADO_DESAFIO.ABIERTO],
    [ESTADO_DESAFIO.ABIERTO]: [ESTADO_DESAFIO.CERRADO],
    // Reabrir un desafío cerrado, para corregir resultados.
    [ESTADO_DESAFIO.CERRADO]: [ESTADO_DESAFIO.ABIERTO],
};

export function chequearTransicionDesafio(de: EstadoDesafio, a: EstadoDesafio): ChequeoTransicion {
    if (de === a) return { ok: false, error: "El desafío ya está en ese estado." };
    if (!permitido(TRANSICIONES_DESAFIO, de, a)) {
        if (de === ESTADO_DESAFIO.CERRADO && a === ESTADO_DESAFIO.BORRADOR) {
            return { ok: false, error: "Un desafío cerrado no vuelve a borrador." };
        }
        return { ok: false, error: `Un desafío "${de}" no puede pasar a "${a}".` };
    }
    return { ok: true };
}

/** La categoría sólo se edita en borrador o mientras no haya nadie inscripto. */
export const puedeEditarCategoria = (estado: EstadoDesafio, inscriptos: number) =>
    estado === ESTADO_DESAFIO.BORRADOR || inscriptos === 0;

/**
 * Cierre: se bloquea si hay partidos sin resolver. Los RESULTADO_CARGADO
 * bloquean igual que los EN_CURSO — si no, el desafío cerraría con puntos que
 * nunca entraron al ranking.
 */
export function chequearCierre(partidos: readonly { id: string; estado: EstadoPartido }[]): ChequeoTransicion {
    const pendientes = partidos.filter((p) => p.estado === ESTADO_PARTIDO.EN_CURSO || p.estado === ESTADO_PARTIDO.RESULTADO_CARGADO);
    if (pendientes.length === 0) return { ok: true };

    const enCurso = pendientes.filter((p) => p.estado === ESTADO_PARTIDO.EN_CURSO).length;
    const aConfirmar = pendientes.length - enCurso;
    const partes = [
        enCurso > 0 ? `${enCurso} sin terminar` : null,
        aConfirmar > 0 ? `${aConfirmar} esperando confirmación` : null,
    ].filter(Boolean);

    return { ok: false, error: `No se puede cerrar: hay ${pendientes.length} partidos pendientes (${partes.join(" y ")}).` };
}

// ── Cola ────────────────────────────────────────────────────────────────────

export const TRANSICIONES_COLA: Record<EstadoCola, readonly EstadoCola[]> = {
    [ESTADO_COLA.ESPERANDO]: [ESTADO_COLA.ASIGNADA, ESTADO_COLA.CANCELADA],
    [ESTADO_COLA.ASIGNADA]: [],
    [ESTADO_COLA.CANCELADA]: [],
};

export function chequearTransicionCola(de: EstadoCola, a: EstadoCola): ChequeoTransicion {
    if (!permitido(TRANSICIONES_COLA, de, a)) {
        return { ok: false, error: `Una entrada de cola "${de}" no puede pasar a "${a}".` };
    }
    return { ok: true };
}

/**
 * Recalcula las posiciones dejándolas consecutivas desde 1, respetando el
 * orden recibido. Se usa al sacar a alguien de la cola o al reordenarla a mano.
 */
export function recomputarPosiciones<T extends { id: string }>(enOrden: readonly T[]): { id: string; position: number }[] {
    return enOrden.map((e, i) => ({ id: e.id, position: i + 1 }));
}
