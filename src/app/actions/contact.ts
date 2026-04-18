"use server";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

export async function submitContactForm(formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
}) {
    try {
        if (!formData.name || !formData.email || !formData.message) {
            throw new Error("Por favor completa los campos obligatorios.");
        }

        const id = randomUUID();

        await db.insert(contactMessages).values({
            id,
            name: formData.name,
            email: formData.email,
            subject: formData.subject || "Consulta sin asunto",
            message: formData.message,
            status: "pendiente",
            createdAt: new Date(),
        });

        revalidatePath("/admin/requests");
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting contact form:", error);
        return { success: false, error: error.message || "Error al enviar el mensaje. Reintenta pronto." };
    }
}
