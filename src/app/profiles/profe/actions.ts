"use server";

import { db } from "@/db";
import { instructorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateProfeProfile(data: {
    name: string;
    bio: string;
    location: string;
    level: string;
    experience: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    workingZones: string[];
    specialities: string[];
    availability?: any;
    pricing?: any;
}) {
    const user = await currentUser();
    if (!user) throw new Error("No autorizado");

    await db
        .update(instructorProfiles)
        .set({
            name: data.name,
            bio: data.bio,
            location: data.location,
            level: data.level,
            experience: data.experience,
            phone: data.phone,
            whatsapp: data.whatsapp,
            instagram: data.instagram,
            workingZones: data.workingZones,
            specialities: data.specialities,
            availability: data.availability,
            pricing: data.pricing,
        })
        .where(eq(instructorProfiles.userId, user.id));

    revalidatePath("/profiles/profe");
    return { ok: true };
}
