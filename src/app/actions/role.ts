"use server";

import { cookies } from "next/headers";

export async function switchActiveRole(role: string) {
    const cookieStore = await cookies();
    cookieStore.set("active_role", role, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
}
