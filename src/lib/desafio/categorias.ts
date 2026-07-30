// Elegibilidad por categoría (§5 "Inscribir jugador" de docs/desafio-specs.md).
//
// ⚠️ Ojo con el sentido del orden. La spec dice "orden menor = categoría más
// alta", pero la tabla `categories` de este proyecto va al revés:
//
//     orden 1 → C    (0-999 pts)      ← la más baja
//     orden 2 → B    (1000-1999)
//     orden 3 → A    (2000-2999)
//     orden 4 → A+   (3000-3999)      ← la más alta
//
// Acá **orden mayor = categoría mejor**, porque acompaña los rangos de puntos.
// Se decidió no renumerar la tabla (la usan torneos, ranking y promociones) y
// dar vuelta el comparador sólo acá.
//
// "Jugar para arriba" queda entonces: ordenJugador <= ordenDesafio.

export type MotivoRechazoCategoria = "sin_categoria" | "categoria_superior";

export type ChequeoCategoria =
    | { ok: true }
    | { ok: false; motivo: MotivoRechazoCategoria; error: string };

export type CategoriaRef = {
    /** Nombre visible: "C", "B", "A", "A+" */
    nombre: string;
    /** `categories.categoryOrder`: mayor = mejor categoría */
    orden: number;
};

/**
 * ¿Este jugador puede inscribirse a este desafío?
 *
 * Se permite jugar en la categoría propia o en una superior; nunca por debajo,
 * para que un A+ no baje a llenarse de puntos en un desafío de C.
 */
export function chequearCategoria(args: {
    jugador: CategoriaRef | null;
    desafio: CategoriaRef;
    /** El admin puede inscribir salteando la validación. */
    esExcepcion?: boolean;
}): ChequeoCategoria {
    const { jugador, desafio, esExcepcion } = args;

    if (esExcepcion) return { ok: true };

    if (!jugador) {
        return {
            ok: false,
            motivo: "sin_categoria",
            error: "El jugador no tiene categoría asignada. Cargala en su perfil o inscribilo como excepción.",
        };
    }

    if (jugador.orden > desafio.orden) {
        return {
            ok: false,
            motivo: "categoria_superior",
            error: `Este desafío es de categoría ${desafio.nombre} y el jugador es ${jugador.nombre}: no puede jugar en una categoría inferior a la suya.`,
        };
    }

    return { ok: true };
}

/** Las categorías en las que un jugador podría anotarse, de la suya para arriba. */
export function categoriasHabilitadas(
    jugador: CategoriaRef | null,
    todas: readonly CategoriaRef[]
): CategoriaRef[] {
    if (!jugador) return [];
    return todas.filter((c) => jugador.orden <= c.orden).sort((a, b) => a.orden - b.orden);
}

/** ¿El jugador está jugando por encima de su categoría? Sirve para etiquetar en la UI. */
export const juegaParaArriba = (jugador: CategoriaRef | null, desafio: CategoriaRef) =>
    !!jugador && jugador.orden < desafio.orden;

/**
 * Resuelve una categoría por nombre. `users.category` es texto libre, así que
 * la comparación va sin distinguir mayúsculas ni espacios, y puede no encontrar
 * nada (hay usuarios con valores viejos, tipo "5ta").
 */
export function buscarCategoria(
    nombre: string | null | undefined,
    todas: readonly CategoriaRef[]
): CategoriaRef | null {
    const buscado = (nombre || "").trim().toLowerCase();
    if (!buscado) return null;
    return todas.find((c) => c.nombre.trim().toLowerCase() === buscado) ?? null;
}
