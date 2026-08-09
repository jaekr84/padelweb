// Generación automática de la cola de un desafío.
//
// El admin dice cuántos partidos quiere por pareja y esto devuelve los cruces
// ya ordenados, listos para anotar. No toca la base: es una función pura, así
// que la UI puede mostrar el resultado antes de confirmar y los casos se
// prueban en /dev/desafio.
//
// El parámetro es "partidos por pareja", no "vueltas de todos contra todos":
// con 12 parejas, 2 por pareja son 12 partidos, mientras que un round-robin
// doble serían 132. Para una jornada con canchas contadas, lo primero es lo
// único que cierra.
//
// Cuatro criterios, en orden de importancia:
//   1. no repetir cruces que ya se jugaron en el desafío
//   2. compensar el desbalance previo: primero los que menos jugaron
//   3. enfrentar categorías cercanas
//   4. que nadie juegue dos partidos seguidos
//
// Los tres primeros deciden QUIÉN juega contra quién; el cuarto, en qué ORDEN
// entran a la cola.

export type ParejaParaCola = {
    id: string;
    /** Orden de categoría de la pareja. `null` si no se pudo determinar. */
    ordenCategoria: number | null;
    /** Partidos que ya jugó en este desafío. */
    jugados: number;
};

export type CruceGenerado = { parejaA: string; parejaB: string };

export type ResultadoGeneracion = {
    partidos: CruceGenerado[];
    /** Lo que el admin tiene que saber antes de confirmar. */
    avisos: string[];
};

/** Clave de un cruce, independiente de quién figure primero. */
export const claveCruce = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Pesos. La repetición pesa un orden de magnitud más que todo lo demás: antes
// de repetir un cruce conviene casi cualquier otra cosa.
const PESO_REPETIR = 1000;
const PESO_CATEGORIA = 60;
const PESO_LE_FALTA = 25;
const PESO_YA_JUGO = 5;

/**
 * Reparte los cruces. Devuelve los partidos en el orden en que conviene
 * anotarlos en la cola.
 */
export function generarCruces(args: {
    parejas: readonly ParejaParaCola[];
    partidosPorPareja: number;
    /** Cuántas veces se enfrentó cada par, por `claveCruce`. */
    historial?: ReadonlyMap<string, number>;
}): ResultadoGeneracion {
    const { parejas, partidosPorPareja } = args;
    const avisos: string[] = [];

    if (partidosPorPareja < 1) {
        return { partidos: [], avisos: ["Poné al menos un partido por pareja."] };
    }
    if (parejas.length < 2) {
        return { partidos: [], avisos: ["Hacen falta al menos dos parejas armadas."] };
    }

    const cruzados = new Map<string, number>(args.historial ?? []);
    const pendientes = new Map(parejas.map((p) => [p.id, partidosPorPareja]));
    const jugados = new Map(parejas.map((p) => [p.id, p.jugados]));
    const partidos: CruceGenerado[] = [];
    let repetidos = 0;

    const difCategoria = (a: ParejaParaCola, b: ParejaParaCola) =>
        a.ordenCategoria == null || b.ordenCategoria == null
            ? 0
            : Math.abs(a.ordenCategoria - b.ordenCategoria);

    while (true) {
        const activas = parejas.filter((p) => (pendientes.get(p.id) ?? 0) > 0);
        if (activas.length < 2) break;

        // Arranca por la que más partidos necesita; a igualdad, la que menos
        // jugó en todo el desafío. El id desempata para que sea determinista.
        const [a] = [...activas].sort(
            (x, y) =>
                (pendientes.get(y.id)! - pendientes.get(x.id)!) ||
                (jugados.get(x.id)! - jugados.get(y.id)!) ||
                x.id.localeCompare(y.id)
        );

        let elegida: ParejaParaCola | null = null;
        let mejorCosto = Infinity;
        for (const b of activas) {
            if (b.id === a.id) continue;
            const costo =
                (cruzados.get(claveCruce(a.id, b.id)) ?? 0) * PESO_REPETIR +
                difCategoria(a, b) * PESO_CATEGORIA -
                (pendientes.get(b.id) ?? 0) * PESO_LE_FALTA +
                (jugados.get(b.id) ?? 0) * PESO_YA_JUGO;

            if (costo < mejorCosto) {
                mejorCosto = costo;
                elegida = b;
            }
        }
        if (!elegida) break;

        const clave = claveCruce(a.id, elegida.id);
        if ((cruzados.get(clave) ?? 0) > 0) repetidos++;

        partidos.push({ parejaA: a.id, parejaB: elegida.id });
        cruzados.set(clave, (cruzados.get(clave) ?? 0) + 1);
        pendientes.set(a.id, pendientes.get(a.id)! - 1);
        pendientes.set(elegida.id, pendientes.get(elegida.id)! - 1);
        jugados.set(a.id, jugados.get(a.id)! + 1);
        jugados.set(elegida.id, jugados.get(elegida.id)! + 1);
    }

    const cortas = [...pendientes.values()].filter((n) => n > 0).length;
    if (cortas > 0) {
        avisos.push(
            cortas === 1
                ? "Una pareja queda con un partido menos: no hay con quién completarla."
                : `${cortas} parejas quedan con menos partidos: no alcanzan los rivales para completarlas.`
        );
    }
    if (repetidos > 0) {
        avisos.push(
            repetidos === 1
                ? "Un cruce se repite: ya se habían enfrentado."
                : `${repetidos} cruces se repiten: no alcanzaban los rivales sin repetir.`
        );
    }

    return { partidos: espaciar(partidos), avisos };
}

/**
 * Reordena para que ninguna pareja juegue dos partidos seguidos.
 *
 * Va eligiendo el primer partido que no comparta pareja con el anterior; si no
 * hay ninguno (le queda por jugar sólo a esa pareja), acepta el choque en vez
 * de trabarse.
 */
export function espaciar(partidos: readonly CruceGenerado[]): CruceGenerado[] {
    const restantes = [...partidos];
    const orden: CruceGenerado[] = [];
    let ultimas: string[] = [];

    while (restantes.length > 0) {
        let i = restantes.findIndex(
            (m) => !ultimas.includes(m.parejaA) && !ultimas.includes(m.parejaB)
        );
        if (i < 0) i = 0;

        const [m] = restantes.splice(i, 1);
        orden.push(m);
        ultimas = [m.parejaA, m.parejaB];
    }

    return orden;
}
