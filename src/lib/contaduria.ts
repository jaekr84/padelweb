// Piezas compartidas por el servidor y la pantalla de contaduría: tipos,
// parseo y formato de montos. Sin "use server" a propósito — son helpers
// sincrónicos que también corren en el cliente.

export const TIPO_MOVIMIENTO = {
    INGRESO: "ingreso",
    GASTO: "gasto",
} as const;

export type TipoMovimiento = (typeof TIPO_MOVIMIENTO)[keyof typeof TIPO_MOVIMIENTO];

export const TIPOS_MOVIMIENTO: TipoMovimiento[] = [TIPO_MOVIMIENTO.INGRESO, TIPO_MOVIMIENTO.GASTO];

export const esTipoMovimiento = (v: unknown): v is TipoMovimiento =>
    v === TIPO_MOVIMIENTO.INGRESO || v === TIPO_MOVIMIENTO.GASTO;

export type Movimiento = {
    id: string;
    tipo: TipoMovimiento;
    /** "YYYY-MM-DD" */
    fecha: string;
    descripcion: string;
    /** Siempre positivo. El tipo decide de qué lado suma. */
    montoCentavos: number;
    // El email va además del nombre porque dos admins se pueden llamar parecido
    // (o estar cargados con un nombre genérico) y la caja tiene que poder
    // auditarse sin dudas.
    registradoPor: { id: string; nombre: string; email: string | null };
    /** Rubro del movimiento. Las filas viejas llegan como "otros". */
    rubro: Rubro;
    /** Quién lo generó. Los automáticos no se editan ni se borran a mano. */
    origen: Origen;
    /** El evento que lo generó, o `null` si es un movimiento general de la caja. */
    evento: EventoRef | null;
    creadoEn: string;
};

export type Totales = { ingresos: number; gastos: number; saldo: number };

/** Un movimiento no puede ser mayor a esto. Frena el 0 de más al tipear. */
export const MONTO_MAXIMO_CENTAVOS = 100_000_000_000; // $1.000.000.000,00

/**
 * Cuántos movimientos trae el listado de un período. Los totales NO salen de esa
 * lista: se calculan con un SUM del servidor, así el saldo sigue siendo exacto
 * aunque el listado quede recortado.
 */
export const MOVIMIENTOS_POR_PERIODO = 300;

const formateadorPesos = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Centavos → "$ 12.345,67". Los negativos salen con el signo adelante. */
export const formatearMonto = (centavos: number) => formateadorPesos.format(centavos / 100);

/**
 * Texto tipeado por el admin → centavos.
 *
 * Acepta las formas con las que la gente escribe plata en Argentina: "1500",
 * "1.500,50", "1500,5", "$ 1.500". Devuelve `null` si no es un monto válido.
 *
 * La ambigüedad real es un punto solo ("1.500"): acá se resuelve por la cantidad
 * de dígitos que le siguen — tres son miles ("1.500" = mil quinientos), uno o
 * dos son decimales ("1.50" = uno con cincuenta).
 */
export function parsearMontoACentavos(texto: string): number | null {
    const limpio = (texto ?? "").replace(/[\s$]/g, "");
    if (!limpio || !/^\d[\d.,]*$/.test(limpio)) return null;

    const puntos = (limpio.match(/\./g) || []).length;
    const comas = (limpio.match(/,/g) || []).length;
    if (comas > 1) return null;

    let normalizado: string;
    if (comas === 1) {
        // Con coma, la coma manda: los puntos que haya son separadores de miles.
        normalizado = limpio.replace(/\./g, "").replace(",", ".");
    } else if (puntos === 1) {
        const [entero, resto] = limpio.split(".");
        normalizado = resto.length === 3 ? `${entero}${resto}` : `${entero}.${resto}`;
    } else {
        // Varios puntos sólo pueden ser miles: "1.234.567".
        normalizado = limpio.replace(/\./g, "");
    }

    const valor = Number(normalizado);
    if (!Number.isFinite(valor) || valor <= 0) return null;

    const centavos = Math.round(valor * 100);
    if (centavos <= 0 || centavos > MONTO_MAXIMO_CENTAVOS) return null;
    return centavos;
}

/**
 * Formatea el monto mientras se tipea: mete el separador de miles y deja la
 * coma para los centavos ("4000000" → "4.000.000", "1500,5" → "1.500,5").
 *
 * Los puntos que escriba el usuario se ignoran a propósito: los de miles los
 * pone esta función sola, así que si además contaran como decimales, "4.000"
 * sería ambiguo mientras se escribe. La coma es el único separador decimal.
 */
export function formatearMontoTipeado(texto: string): string {
    const limpio = (texto ?? "").replace(/[^\d,]/g, "");
    if (!limpio) return "";

    const [entero = "", ...resto] = limpio.split(",");
    // Una sola coma y como mucho dos decimales, sin importar cuánto se tipee.
    const decimales = resto.join("").slice(0, 2);

    const conMiles = entero
        .replace(/^0+(?=\d)/, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // La coma se conserva aunque todavía no haya decimales: si no, no se podría
    // escribir "1.500," para seguir con los centavos.
    return limpio.includes(",") ? `${conMiles},${decimales}` : conMiles;
}

/** ¿Es una fecha "YYYY-MM-DD" que existe en el calendario? */
export function esFechaValida(fecha: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const [a, m, d] = fecha.split("-").map(Number);
    if (m < 1 || m > 12 || d < 1) return false;
    const fin = new Date(Date.UTC(a, m, 0)).getUTCDate();
    return d <= fin && a >= 2000 && a <= 2100;
}

/** Hoy en "YYYY-MM-DD", hora local (la fecha contable es el día del usuario). */
export function hoyISO(): string {
    const ahora = new Date();
    const dosDigitos = (n: number) => String(n).padStart(2, "0");
    return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

/** "2026-08-31" → "31/08/2026", sin pasar por Date (evita el corrimiento de zona). */
export function formatearFecha(fecha: string): string {
    const [a, m, d] = fecha.split("-");
    return a && m && d ? `${d}/${m}/${a}` : fecha;
}

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-08" → "Agosto 2026". */
export function etiquetaDeMes(clave: string): string {
    const [a, m] = clave.split("-");
    const mes = MESES[Number(m) - 1];
    return mes ? `${mes} ${a}` : clave;
}

// ── Rubros ──────────────────────────────────────────────────────────────────
//
// La descripción es libre y sirve para leer un movimiento; el rubro es cerrado
// y sirve para sumarlos por concepto ("cuánto se pagó en premios este año").
// Son dos cosas distintas y por eso conviven.

export const RUBRO = {
    INSCRIPCIONES: "inscripciones",
    SPONSORS: "sponsors",
    BAR: "bar",
    VENTA: "venta",
    PREMIOS_DINERO: "premios_dinero",
    PREMIOS_ESPECIE: "premios_especie",
    CANCHAS: "canchas",
    INSUMOS: "insumos",
    PERSONAL: "personal",
    COMIDA: "comida",
    DIFUSION: "difusion",
    // Vale para los dos tipos, y es el default de la columna: los movimientos
    // cargados antes de que existieran los rubros caen acá sin migrarse.
    OTROS: "otros",
} as const;

export type Rubro = (typeof RUBRO)[keyof typeof RUBRO];

const ETIQUETAS_RUBRO: Record<Rubro, string> = {
    [RUBRO.INSCRIPCIONES]: "Inscripciones",
    [RUBRO.SPONSORS]: "Sponsors",
    [RUBRO.BAR]: "Bar / cantina",
    [RUBRO.VENTA]: "Venta / merchandising",
    [RUBRO.PREMIOS_DINERO]: "Premios en dinero",
    [RUBRO.PREMIOS_ESPECIE]: "Premios en especie",
    [RUBRO.CANCHAS]: "Alquiler de canchas",
    [RUBRO.INSUMOS]: "Pelotas e insumos",
    [RUBRO.PERSONAL]: "Arbitraje / personal",
    [RUBRO.COMIDA]: "Comida y bebida",
    [RUBRO.DIFUSION]: "Difusión / publicidad",
    [RUBRO.OTROS]: "Otros",
};

/** Qué rubros ofrece cada tipo. "Otros" está en los dos. */
export const RUBROS_POR_TIPO: Record<TipoMovimiento, Rubro[]> = {
    [TIPO_MOVIMIENTO.INGRESO]: [
        RUBRO.INSCRIPCIONES, RUBRO.SPONSORS, RUBRO.BAR, RUBRO.VENTA, RUBRO.OTROS,
    ],
    [TIPO_MOVIMIENTO.GASTO]: [
        RUBRO.PREMIOS_DINERO, RUBRO.PREMIOS_ESPECIE, RUBRO.CANCHAS, RUBRO.INSUMOS,
        RUBRO.PERSONAL, RUBRO.COMIDA, RUBRO.DIFUSION, RUBRO.OTROS,
    ],
};

export const esRubro = (v: unknown): v is Rubro =>
    typeof v === "string" && Object.prototype.hasOwnProperty.call(ETIQUETAS_RUBRO, v);

/** ¿Ese rubro corresponde a ese tipo? Un ingreso no puede ser "premios". */
export const rubroValido = (tipo: TipoMovimiento, rubro: Rubro) => RUBROS_POR_TIPO[tipo].includes(rubro);

/**
 * Rubro guardado → etiqueta. Tolera basura (un rubro viejo, un tipo que se
 * sacó del catálogo) devolviendo "Otros" en vez de romper la pantalla.
 */
export const etiquetaDeRubro = (rubro: string) =>
    esRubro(rubro) ? ETIQUETAS_RUBRO[rubro] : ETIQUETAS_RUBRO[RUBRO.OTROS];

// ── Eventos ─────────────────────────────────────────────────────────────────

export const TIPO_EVENTO = {
    TORNEO: "torneo",
    DESAFIO: "desafio",
    CANCHA_ABIERTA: "cancha_abierta",
} as const;

export type TipoEvento = (typeof TIPO_EVENTO)[keyof typeof TIPO_EVENTO];

export const TIPOS_EVENTO: TipoEvento[] = [
    TIPO_EVENTO.TORNEO, TIPO_EVENTO.DESAFIO, TIPO_EVENTO.CANCHA_ABIERTA,
];

export const esTipoEvento = (v: unknown): v is TipoEvento =>
    v === TIPO_EVENTO.TORNEO || v === TIPO_EVENTO.DESAFIO || v === TIPO_EVENTO.CANCHA_ABIERTA;

const ETIQUETAS_EVENTO: Record<TipoEvento, string> = {
    [TIPO_EVENTO.TORNEO]: "Torneo",
    [TIPO_EVENTO.DESAFIO]: "Desafío",
    [TIPO_EVENTO.CANCHA_ABIERTA]: "Cancha abierta",
};

export const etiquetaDeTipoEvento = (tipo: string) =>
    esTipoEvento(tipo) ? ETIQUETAS_EVENTO[tipo] : "Evento";

/**
 * El evento al que pertenece un movimiento. `nombre` es el snapshot guardado en
 * la fila, no el nombre actual del torneo: si el torneo se borró, sigue habiendo
 * algo que mostrar.
 */
export type EventoRef = { tipo: TipoEvento; id: string; nombre: string };

/** Un evento elegible en el selector del formulario. */
export type OpcionEvento = EventoRef & { fecha: string | null };

export const rutaDeEvento = (tipo: TipoEvento, id: string) =>
    `/admin/contaduria/eventos/${tipo}/${encodeURIComponent(id)}`;

/**
 * Resultado de un evento. `resultado` puede ser negativo: un torneo que dejó
 * plata en la cancha es justamente lo que esta pantalla tiene que mostrar.
 */
export type ResumenEvento = EventoRef & {
    fecha: string | null;
    ingresos: number;
    gastos: number;
    resultado: number;
    movimientos: number;
};

/**
 * Cuánto *debería* haber entrado por inscripciones, según lo que ya sabe el
 * evento. No es un asiento: es el número que se compara contra lo cargado.
 *
 * `base` dice de dónde sale el conteo, y cambia según el evento: los torneos
 * tienen pagos marcados uno por uno, el desafío sólo tiene inscriptos. Se
 * muestra en pantalla para que nadie tenga que adivinar el criterio.
 */
export type EsperadoInscripciones = {
    /**
     * Precio de referencia en centavos (el general cuando hay dos). Es para
     * mostrar: el esperado NO sale de multiplicar por esto.
     */
    feeCentavos: number;
    /** Cuántas personas pagaron. */
    unidades: number;
    /**
     * Lo que corresponde cobrar, ya sumado jugador por jugador. Los torneos
     * tienen precio de socio y precio general, así que el total depende de
     * quién pagó cada uno y no de un precio único por la cantidad.
     */
    esperadoCentavos: number;
    /** Ya cargado en la caja con rubro "inscripciones" para este evento. */
    cargadoCentavos: number;
    /** Ej: "24 pagos marcados", "18 inscriptos". */
    base: string;
};

// ── Filtros de la pantalla ──────────────────────────────────────────────────
//
// Viven acá y no en `actions.ts` porque un archivo "use server" sólo admite
// exports async, y estos los usan el cliente (para armar la URL) y el servidor
// (para leerla) por igual.

/** Valor del filtro de evento que pide sólo los movimientos sin evento. */
export const SIN_EVENTO = "sin-evento";

/** Clave estable de un evento para URLs y selects. */
export const claveDeEvento = (tipo: TipoEvento, id: string) => `${tipo}:${id}`;

/** "torneo:abc-123" → `{ tipo, id }`. Los ids son UUID, así que no traen ":". */
export function parsearClaveEvento(clave: string): { tipo: TipoEvento; id: string } | null {
    const corte = (clave ?? "").indexOf(":");
    if (corte <= 0) return null;
    const tipo = clave.slice(0, corte);
    const id = clave.slice(corte + 1);
    return esTipoEvento(tipo) && id ? { tipo, id } : null;
}

/**
 * Ordena eventos del más nuevo al más viejo. Los que no tienen fecha van al
 * final: no se puede afirmar que sean recientes.
 */
export function porFechaDesc(a: { fecha: string | null }, b: { fecha: string | null }) {
    if (a.fecha === b.fecha) return 0;
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return a.fecha < b.fecha ? 1 : -1;
}

// ── Origen del movimiento ───────────────────────────────────────────────────

export const ORIGEN = {
    /** Lo cargó una persona. Se edita y se borra como siempre. */
    MANUAL: "manual",
    /**
     * Lo mantiene el sistema a partir de los pagos marcados del evento. Se
     * reescribe en cada clic de "pagado", así que editarlo a mano no tendría
     * efecto: el siguiente clic lo pisaría. Los ajustes (descuentos,
     * cortesías, el que pagó de más) van como movimientos manuales aparte.
     */
    AUTO_INSCRIPCIONES: "auto_inscripciones",
    /**
     * Lo generó el reparto de premios. A diferencia del de inscripciones, SÍ se
     * edita y se borra a mano: nada lo reescribe por atrás, sólo se reemplaza
     * cuando el admin vuelve a apretar "generar" (y ahí se avisa).
     */
    PREMIOS: "premios",
} as const;

export type Origen = (typeof ORIGEN)[keyof typeof ORIGEN];

export const esOrigen = (v: unknown): v is Origen =>
    v === ORIGEN.MANUAL || v === ORIGEN.AUTO_INSCRIPCIONES || v === ORIGEN.PREMIOS;

/** Un movimiento del sistema no se toca a mano. */
export const esAutomatico = (origen: string) => origen === ORIGEN.AUTO_INSCRIPCIONES;

/**
 * Eventos cuyos pagos se marcan jugador por jugador y por lo tanto mantienen el
 * asiento de inscripciones solos. Los tres lo hacen: los torneos por
 * `paid_player_ids`, la cancha abierta y el desafío por el `has_paid` de su
 * inscripción. Se deja la función (y no una constante) porque es el lugar donde
 * habría que volver si algún evento nuevo no marcara pagos por jugador.
 */
export const llevaInscripcionesAutomaticas = (_tipo: TipoEvento) => true;

// ── Aviso de caja desactualizada ────────────────────────────────────────────

/**
 * El panel de la caja se consulta a sí mismo, así que no se entera de un pago
 * marcado en otra parte de la pantalla. Quien lo marca avisa por acá.
 *
 * Se avisa DESPUÉS de que el servidor confirmó el guardado, no cuando cambia el
 * estado local: el asiento se recalcula en el servidor, y preguntar antes
 * devolvería el monto viejo y el panel quedaría siempre un clic atrás.
 */
export const EVENTO_CAJA_DESACTUALIZADA = "contaduria:caja-desactualizada";

export function avisarCajaDesactualizada() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(EVENTO_CAJA_DESACTUALIZADA));
}

// ── Reparto de premios ──────────────────────────────────────────────────────
//
// Los porcentajes viajan en PUNTOS BÁSICOS: centésimas de punto porcentual, en
// enteros. 40 % = 4000, 33,33 % = 3333. Se evita la coma flotante en todo el
// camino porque el reparto termina en centavos y un 0,1 + 0,2 mal sumado se
// convierte en un peso que no cierra contra la caja.

/** 100 % expresado en puntos básicos. */
export const PUNTOS_BASICOS_TOTALES = 10_000;

/** Como mucho tantos puestos: más que eso no es un podio, es una lista. */
export const MAX_PUESTOS = 20;

export type PuestoPremio = {
    /** "1er puesto", "Campeón", lo que el admin escriba. */
    rotulo: string;
    /** Porción del pool, en puntos básicos. */
    puntosBasicos: number;
};

export type ConfigPremios = {
    /** Qué parte de lo recaudado va a premios, en puntos básicos. */
    poolPuntosBasicos: number;
    puestos: PuestoPremio[];
    /** Ingresos del evento cuando se generó por última vez. 0 si nunca se generó. */
    baseCentavos: number;
};

/** Puntos básicos → "40", "33,33". Sin ceros de relleno. */
export function formatearPorcentaje(puntosBasicos: number): string {
    const valor = puntosBasicos / 100;
    return Number.isInteger(valor)
        ? String(valor)
        : valor.toFixed(2).replace(/0$/, "").replace(".", ",");
}

/**
 * Texto tipeado → puntos básicos. Acepta coma o punto decimal ("33,33").
 * Devuelve `null` si no es un porcentaje entre 0 y 100.
 */
export function parsearPorcentaje(texto: string): number | null {
    const limpio = (texto ?? "").replace(/\s|%/g, "").replace(",", ".");
    if (!limpio || !/^\d*\.?\d*$/.test(limpio)) return null;

    const valor = Number(limpio);
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) return null;

    return Math.round(valor * 100);
}

export type PremioCalculado = PuestoPremio & { montoCentavos: number };

/**
 * Reparte el pool entre los puestos según sus porcentajes.
 *
 * El resto de la división entera se le suma al primer puesto, así la suma de
 * los premios es EXACTAMENTE el pool: si cada monto se redondeara por su lado,
 * faltarían o sobrarían centavos y el gasto no cerraría contra lo recaudado.
 *
 * La misma función la usan la vista previa y la generación, para que lo que se
 * ve en pantalla sea lo que termina en la caja.
 */
export function repartirPremios(poolCentavos: number, puestos: PuestoPremio[]): PremioCalculado[] {
    if (poolCentavos <= 0 || puestos.length === 0) {
        return puestos.map((p) => ({ ...p, montoCentavos: 0 }));
    }

    const repartidos = puestos.map((p) => ({
        ...p,
        montoCentavos: Math.floor((poolCentavos * p.puntosBasicos) / PUNTOS_BASICOS_TOTALES),
    }));

    // Sólo se compensa cuando los porcentajes cubren el 100 %: si el admin
    // repartió el 90 %, ese 10 % queda sin asignar a propósito y no hay que
    // regalárselo al primero.
    const suman100 = puestos.reduce((t, p) => t + p.puntosBasicos, 0) === PUNTOS_BASICOS_TOTALES;
    if (suman100) {
        const asignado = repartidos.reduce((t, p) => t + p.montoCentavos, 0);
        repartidos[0].montoCentavos += poolCentavos - asignado;
    }

    return repartidos;
}

/** El pool: la parte de lo recaudado destinada a premios. */
export const calcularPool = (ingresosCentavos: number, poolPuntosBasicos: number) =>
    Math.floor((Math.max(0, ingresosCentavos) * poolPuntosBasicos) / PUNTOS_BASICOS_TOTALES);

/** Los puestos que se ofrecen al abrir por primera vez. */
export const PUESTOS_POR_DEFECTO: PuestoPremio[] = [
    { rotulo: "1er puesto", puntosBasicos: 5000 },
    { rotulo: "2do puesto", puntosBasicos: 3000 },
    { rotulo: "3er puesto", puntosBasicos: 2000 },
];

/** Rótulo sugerido para el puesto que se agrega. */
export function rotuloDePuesto(indice: number): string {
    const ordinales = [
        "1er", "2do", "3er", "4to", "5to", "6to", "7mo", "8vo", "9no", "10mo",
        "11vo", "12vo", "13vo", "14vo", "15to", "16to", "17mo", "18vo", "19no", "20mo",
    ];
    return `${ordinales[indice] ?? indice + 1} puesto`;
}
