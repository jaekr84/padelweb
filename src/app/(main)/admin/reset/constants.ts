// Constantes compartidas entre la UI y las server actions del reset.
// Van en un archivo aparte porque un módulo "use server" solo puede
// exportar funciones async.

export type ResetScope =
    | "users"
    | "tournaments"
    | "openCourt"
    | "matches"
    | "clubs"
    | "social"
    | "all";

/** Frase exacta que el superadmin debe escribir para habilitar cada reset. */
export const RESET_CONFIRMATIONS: Record<ResetScope, string> = {
    users: "RESETEAR USUARIOS",
    tournaments: "RESETEAR TORNEOS",
    openCourt: "RESETEAR CANCHA ABIERTA",
    matches: "RESETEAR PARTIDOS",
    clubs: "RESETEAR CLUBES",
    social: "RESETEAR CONTENIDO",
    all: "BORRAR TODO",
};

export interface ResetCounts {
    users: number;
    protectedUsers: number;
    tournaments: number;
    tournamentRegistrations: number;
    openCourtEvents: number;
    openCourtRegistrations: number;
    matches: number;
    matchRegistrations: number;
    clubs: number;
    posts: number;
    marketplaceItems: number;
    conversations: number;
    messages: number;
}
