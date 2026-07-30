// Estados del módulo Desafío.
//
// Se declaran como objetos `as const` en vez de enums de TypeScript porque los
// valores viajan tal cual a columnas `varchar` (el schema del proyecto no usa
// enums de MySQL). El tipo se deriva del objeto, así agregar un estado nuevo
// rompe la compilación en todos los `switch` que lo tengan que contemplar.

export const ESTADO_DESAFIO = {
    BORRADOR: "borrador",
    ABIERTO: "abierto",
    CERRADO: "cerrado",
} as const;
export type EstadoDesafio = (typeof ESTADO_DESAFIO)[keyof typeof ESTADO_DESAFIO];

export const ESTADO_INSCRIPCION = {
    DISPONIBLE: "disponible",
    EMPAREJADO: "emparejado",
    JUGANDO: "jugando",
    BAJA: "baja",
} as const;
export type EstadoInscripcion = (typeof ESTADO_INSCRIPCION)[keyof typeof ESTADO_INSCRIPCION];

export const ESTADO_CANCHA = {
    LIBRE: "libre",
    OCUPADA: "ocupada",
    INHABILITADA: "inhabilitada",
} as const;
export type EstadoCancha = (typeof ESTADO_CANCHA)[keyof typeof ESTADO_CANCHA];

export const ESTADO_PARTIDO = {
    EN_CURSO: "en_curso",
    RESULTADO_CARGADO: "resultado_cargado",
    CONFIRMADO: "confirmado",
    RECHAZADO: "rechazado",
    CANCELADO: "cancelado",
} as const;
export type EstadoPartido = (typeof ESTADO_PARTIDO)[keyof typeof ESTADO_PARTIDO];

export const ESTADO_COLA = {
    ESPERANDO: "esperando",
    ASIGNADA: "asignada",
    CANCELADA: "cancelada",
} as const;
export type EstadoCola = (typeof ESTADO_COLA)[keyof typeof ESTADO_COLA];

export const TIPO_PUNTAJE = {
    PARTICIPACION: "participacion",
    VICTORIA: "victoria",
    DERROTA: "derrota",
} as const;
export type TipoPuntaje = (typeof TIPO_PUNTAJE)[keyof typeof TIPO_PUNTAJE];

export const LADO = {
    DRIVE: "drive",
    REVES: "reves",
    AMBOS: "ambos",
} as const;
export type Lado = (typeof LADO)[keyof typeof LADO];

/**
 * Normaliza el lado que viene de `users.side`, que es texto libre y puede estar
 * vacío, con acento o en mayúsculas. Sin dato asumimos "ambos": es el comodín
 * y no bloquea el armado de parejas.
 */
export function normalizarLado(valor?: string | null): Lado {
    const v = (valor || "").trim().toLowerCase();
    if (v === "drive") return LADO.DRIVE;
    if (v === "reves" || v === "revés") return LADO.REVES;
    return LADO.AMBOS;
}

export const ETIQUETA_LADO: Record<Lado, string> = {
    [LADO.DRIVE]: "Drive",
    [LADO.REVES]: "Revés",
    [LADO.AMBOS]: "Ambos",
};

export const ETIQUETA_ESTADO_PARTIDO: Record<EstadoPartido, string> = {
    [ESTADO_PARTIDO.EN_CURSO]: "En curso",
    [ESTADO_PARTIDO.RESULTADO_CARGADO]: "Esperando confirmación",
    [ESTADO_PARTIDO.CONFIRMADO]: "Confirmado",
    [ESTADO_PARTIDO.RECHAZADO]: "Rechazado",
    [ESTADO_PARTIDO.CANCELADO]: "Cancelado",
};

export const ETIQUETA_ESTADO_DESAFIO: Record<EstadoDesafio, string> = {
    [ESTADO_DESAFIO.BORRADOR]: "Borrador",
    [ESTADO_DESAFIO.ABIERTO]: "Abierto",
    [ESTADO_DESAFIO.CERRADO]: "Cerrado",
};

/** El partido ya no admite cambios: no vuelve a ningún estado editable. */
export const esEstadoFinalDePartido = (estado: EstadoPartido) =>
    estado === ESTADO_PARTIDO.CONFIRMADO || estado === ESTADO_PARTIDO.CANCELADO;

/** Estados que bloquean el cierre del desafío (§5 "Cerrar desafío" de la spec). */
export const bloqueaCierre = (estado: EstadoPartido) =>
    estado === ESTADO_PARTIDO.EN_CURSO || estado === ESTADO_PARTIDO.RESULTADO_CARGADO;

/** Un partido ocupa la cancha sólo mientras se está jugando. */
export const ocupaCancha = (estado: EstadoPartido) => estado === ESTADO_PARTIDO.EN_CURSO;
