import { db } from "@/db";
import { systemSettings, users, tournaments, clubs } from "@/db/schema";
import { sql, eq, and, ne, gte, desc, asc } from "drizzle-orm";
import { getSponsors } from "@/app/actions/sponsors";

/**
 * Landings públicas disponibles. El superadmin elige cuál se muestra en "/"
 * desde /admin/landing; la elección vive en `system_settings` (clave
 * `landing_variant`), así que no requiere migración.
 *
 * Para sumar una landing nueva: agregarla acá y en `LANDING_COMPONENTS`
 * (src/app/landings.tsx). Todas reciben los mismos datos (`LandingData`).
 *
 * Como `registration-mode.ts`, vive fuera de un archivo "use server": la
 * escritura sólo se expone detrás de `checkSuperadmin` en admin/landing/actions.ts.
 */
export const LANDING_VARIANTS = [
    {
        id: "remate",
        name: "Remate",
        description: "Deportiva y realista: video de remates nocturnos, la pelota rompe el vidrio, colores celeste, blanco, rojo y azul, scroll horizontal y ranking en vivo.",
    },
    {
        id: "telemetria",
        name: "Telemetría",
        description: "Futurista de ciencia deportiva: cancha 3D en wireframe con jugadas en cámara lenta, mapa térmico interactivo, tipografía que se inclina con el scroll y ranking en barras LED.",
    },
    {
        id: "clasica",
        name: "Clásica",
        description: "La landing original: logo con reflejo, bento de módulos y feed de actividad.",
    },
] as const;

export type LandingVariant = (typeof LANDING_VARIANTS)[number]["id"];

export const DEFAULT_LANDING: LandingVariant = "remate";
export const LANDING_VARIANT_KEY = "landing_variant";

export const isLandingVariant = (v: unknown): v is LandingVariant =>
    LANDING_VARIANTS.some((l) => l.id === v);

export async function getLandingVariant(): Promise<LandingVariant> {
    try {
        const [setting] = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, LANDING_VARIANT_KEY))
            .limit(1);
        return isLandingVariant(setting?.value) ? setting.value : DEFAULT_LANDING;
    } catch (err) {
        console.error("Error fetching landing variant:", err);
        return DEFAULT_LANDING;
    }
}

export async function setLandingVariant(variant: LandingVariant) {
    const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, LANDING_VARIANT_KEY))
        .limit(1);

    if (existing) {
        await db.update(systemSettings).set({ value: variant }).where(eq(systemSettings.key, LANDING_VARIANT_KEY));
    } else {
        await db.insert(systemSettings).values({ id: crypto.randomUUID(), key: LANDING_VARIANT_KEY, value: variant });
    }
}

// ── Datos que reciben todas las landings ──

export type UpcomingTournament = {
    id: string;
    name: string;
    startDate: string | null;
    location: string | null;
    type: string;
    imageUrl: string | null;
    clubName: string | null;
};

export type TopPlayer = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    points: number | null;
    category: string | null;
    imageUrl: string | null;
};

export type LandingSponsor = { id: string; name: string; imageUrl: string; link: string | null };

export type LandingData = {
    tournamentCount: number;
    playerCount: number;
    clubCount: number;
    sponsors: LandingSponsor[];
    upcoming: UpcomingTournament[];
    topPlayers: TopPlayer[];
};

export async function getLandingData(): Promise<LandingData> {
    const data: LandingData = { tournamentCount: 0, playerCount: 0, clubCount: 0, sponsors: [], upcoming: [], topPlayers: [] };

    try {
        const [{ count: tCount }] = await db.select({ count: sql<number>`count(*)` }).from(tournaments);
        const [{ count: pCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "jugador"));
        const [{ count: cCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "club"));
        data.tournamentCount = tCount;
        data.playerCount = pCount;
        data.clubCount = cCount;
        data.sponsors = JSON.parse(JSON.stringify(await getSponsors()));

        const today = new Date().toISOString().slice(0, 10);
        data.upcoming = await db
            .select({
                id: tournaments.id,
                name: tournaments.name,
                startDate: tournaments.startDate,
                location: tournaments.location,
                type: tournaments.type,
                imageUrl: tournaments.imageUrl,
                clubName: clubs.name,
            })
            .from(tournaments)
            .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
            .where(and(ne(tournaments.status, "draft"), gte(tournaments.startDate, today)))
            .orderBy(asc(tournaments.startDate))
            .limit(4);

        data.topPlayers = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                points: users.points,
                category: users.category,
                imageUrl: users.imageUrl,
            })
            .from(users)
            .where(and(eq(users.role, "jugador"), eq(users.isGuest, false), gte(users.points, 1)))
            .orderBy(desc(users.points))
            .limit(5);
    } catch (e) {
        console.error("Error fetching landing stats:", e);
    }

    return data;
}
