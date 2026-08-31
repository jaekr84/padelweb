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
