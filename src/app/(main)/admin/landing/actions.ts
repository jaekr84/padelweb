"use server";

import { revalidatePath } from "next/cache";
import { checkSuperadmin } from "@/lib/auth";
import { isLandingVariant, setLandingVariant } from "@/lib/landing";

export async function updateLandingVariant(variant: string) {
    if (!(await checkSuperadmin())) {
        return { error: "No autorizado" };
    }
    if (!isLandingVariant(variant)) {
        return { error: "Landing desconocida" };
    }

    await setLandingVariant(variant);
    revalidatePath("/");
    revalidatePath("/admin/landing");
    return { success: true };
}
