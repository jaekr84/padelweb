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
// El desafío admite un conjunto de categorías (`challenge_categories`) y la
// membresía es estricta: se inscribe quien tiene una de ellas, ni más ni menos.
// Si el admin quiere que los C jueguen en un desafío de B, marca B y C.
// "Jugar para arriba" ya no es implícito: sobrevive sólo como etiqueta, para
// mostrar quién está anotado por debajo de la categoría más alta del conjunto.

export type MotivoRechazoCategoria = "sin_categoria" | "fuera_de_categoria";

export type ChequeoCategoria =
    | { ok: true }
    | { ok: false; motivo: MotivoRechazoCategoria; error: string };

export type CategoriaRef = {
    /** Nombre visible: "C", "B", "A", "A+" */
    nombre: string;
    /** `categories.categoryOrder`: mayor = mejor categoría */
    orden: number;
};

/** Nombres de las categorías admitidas, de la más baja a la más alta: "C, B". */
export const nombrarCategorias = (categorias: readonly CategoriaRef[]) =>
    [...categorias].sort((a, b) => a.orden - b.orden).map((c) => c.nombre).join(", ");

/**
 * ¿Este jugador puede inscribirse a este desafío?
 *
 * Membresía estricta contra el conjunto de categorías admitidas: ni para arriba
 * ni para abajo. El admin decide el conjunto al crear o editar el desafío, y
 * puede saltear el chequeo inscribiendo por excepción.
 */
export function chequearCategoria(args: {
    jugador: CategoriaRef | null;
    /** Las categorías admitidas por el desafío. */
    desafio: readonly CategoriaRef[];
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

    // Un desafío sin categorías no admite a nadie: es un dato incompleto, no un
    // permiso amplio. La UI de edición obliga a elegir al menos una.
    if (!desafio.some((c) => c.orden === jugador.orden)) {
        return {
            ok: false,
            motivo: "fuera_de_categoria",
            error: desafio.length === 0
                ? "El desafío no tiene categorías habilitadas. Editalo antes de inscribir gente."
                : `Este desafío es para ${nombrarCategorias(desafio)} y el jugador es ${jugador.nombre}.`,
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

/**
 * ¿El jugador está anotado por debajo de la categoría más alta del desafío?
 * Sólo sirve para etiquetar en la UI: la elegibilidad ya la resolvió
 * `chequearCategoria`.
 */
export const juegaParaArriba = (jugador: CategoriaRef | null, desafio: readonly CategoriaRef[]) =>
    !!jugador && desafio.length > 0 && jugador.orden < Math.max(...desafio.map((c) => c.orden));

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
