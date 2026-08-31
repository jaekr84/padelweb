// Los grupos vuelven de la base en el orden en que se insertaron (y cada guardado
// los borra y reinserta), así que sin esto aparecen mezclados: "Grupo D", "Grupo A"...
// `numeric` para que "Grupo A2" quede antes de "Grupo A10".
const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

export function compareGroupNames(a: string, b: string): number {
    return collator.compare(a || "", b || "");
}

/** Devuelve una copia ordenada alfabéticamente por nombre. */
export function sortGroupsByName<T extends { name: string }>(groups: T[]): T[] {
    return [...groups].sort((a, b) => compareGroupNames(a.name, b.name));
}
