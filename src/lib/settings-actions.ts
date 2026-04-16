"use server";

import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPromotionMode() {
    try {
        const [setting] = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, "promotion_mode"))
            .limit(1);
        
        return (setting?.value as "auto" | "manual") || "auto";
    } catch (err) {
        console.error("Error fetching promotion mode:", err);
        return "auto";
    }
}

export async function updatePromotionMode(mode: "auto" | "manual") {
    try {
        // Find if it exists to preserve ID or just use upsert logic if supported
        const [existing] = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, "promotion_mode"))
            .limit(1);

        if (existing) {
            await db.update(systemSettings)
                .set({ value: mode })
                .where(eq(systemSettings.key, "promotion_mode"));
        } else {
            await db.insert(systemSettings)
                .values({
                    id: crypto.randomUUID(),
                    key: "promotion_mode",
                    value: mode
                });
        }
        
        revalidatePath("/admin/promotions");
        return { ok: true };
    } catch (err) {
        console.error("Error updating promotion mode:", err);
        return { ok: false, error: String(err) };
    }
}
export async function getTournamentPointsConfig() {
    try {
        const [setting] = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, "tournament_points_config"))
            .limit(1);
        
        if (setting?.value) {
            return JSON.parse(setting.value);
        }
        
        // Default values
        return {
            winner: 1000,
            finalist: 600,
            semi: 360,
            quarter: 180,
            octavos: 90,
            groupMatchWin: 40,
            participation: 20
        };
    } catch (err) {
        console.error("Error fetching points config:", err);
        return {
            winner: 1000,
            finalist: 600,
            semi: 360,
            quarter: 180,
            octavos: 90,
            groupMatchWin: 40,
            participation: 20
        };
    }
}

export async function updateTournamentPointsConfig(config: any) {
    try {
        const [existing] = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, "tournament_points_config"))
            .limit(1);

        const valueStr = JSON.stringify(config);

        if (existing) {
            await db.update(systemSettings)
                .set({ value: valueStr })
                .where(eq(systemSettings.key, "tournament_points_config"));
        } else {
            await db.insert(systemSettings)
                .values({
                    id: crypto.randomUUID(),
                    key: "tournament_points_config",
                    value: valueStr
                });
        }
        
        revalidatePath("/admin/puntosTorneo");
        return { ok: true };
    } catch (err) {
        console.error("Error updating points config:", err);
        return { ok: false, error: String(err) };
    }
}

export async function getClubTournamentLimits() {
    try {
        const settings = await db
            .select()
            .from(systemSettings)
            .where(sql`${systemSettings.key} IN ('club_open_limit', 'club_closed_limit')`);
        
        const openLimit = settings.find(s => s.key === 'club_open_limit')?.value || "3";
        const closedLimit = settings.find(s => s.key === 'club_closed_limit')?.value || "3";

        return {
            openLimit: parseInt(openLimit),
            closedLimit: parseInt(closedLimit)
        };
    } catch (err) {
        console.error("Error fetching limits:", err);
        return { openLimit: 3, closedLimit: 3 };
    }
}

export async function updateClubTournamentLimits(limits: { openLimit: number; closedLimit: number }) {
    try {
        const updateLimit = async (key: string, value: string) => {
            const [existing] = await db
                .select()
                .from(systemSettings)
                .where(eq(systemSettings.key, key))
                .limit(1);

            if (existing) {
                await db.update(systemSettings).set({ value }).where(eq(systemSettings.key, key));
            } else {
                await db.insert(systemSettings).values({ id: crypto.randomUUID(), key, value });
            }
        };

        await updateLimit('club_open_limit', String(limits.openLimit));
        await updateLimit('club_closed_limit', String(limits.closedLimit));

        revalidatePath("/admin/puntosTorneo");
        return { ok: true };
    } catch (err) {
        console.error("Error updating limits:", err);
        return { ok: false, error: String(err) };
    }
}
