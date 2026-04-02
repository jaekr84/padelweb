"use server";

import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
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
