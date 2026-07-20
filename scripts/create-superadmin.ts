/**
 * Crea (o actualiza) una cuenta superadmin oculta.
 *
 * La contraseña NUNCA se escribe en el repositorio: se pasa por variable de
 * entorno al ejecutar, así no queda versionada en git ni en el historial del
 * archivo. Se guarda hasheada con bcrypt, igual que el registro normal.
 *
 * Uso:
 *   SUPERADMIN_EMAIL="alguien@dominio.com" SUPERADMIN_PASSWORD='...' npx tsx scripts/create-superadmin.ts
 *
 * Para que la cuenta quede oculta en ranking, gestión de usuarios, listados de
 * inscripción y a salvo de los resets, su email debe estar en
 * HIDDEN_USER_EMAILS (src/lib/hidden-users.ts). El script avisa si falta.
 */
// Cargar .env ANTES de importar la db: src/db/index.ts lee DATABASE_URL al
// importarse y, sin esto, cae al fallback localhost y da ECONNREFUSED.
import "dotenv/config";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { HIDDEN_USER_EMAILS } from "../src/lib/hidden-users";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
    const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD;
    const firstName = process.env.SUPERADMIN_FIRSTNAME || "Super";
    const lastName = process.env.SUPERADMIN_LASTNAME || "Admin";

    if (!email || !password) {
        console.error(
            "Faltan variables. Ejecutá:\n" +
            "  SUPERADMIN_EMAIL=\"tu@email.com\" SUPERADMIN_PASSWORD='tu-clave' npx tsx scripts/create-superadmin.ts"
        );
        process.exit(1);
    }

    if (password.length < 8) {
        console.error("La contraseña debe tener al menos 8 caracteres.");
        process.exit(1);
    }

    if (!(HIDDEN_USER_EMAILS as readonly string[]).includes(email)) {
        console.warn(
            `\n⚠  ${email} NO está en HIDDEN_USER_EMAILS (src/lib/hidden-users.ts).\n` +
            "   La cuenta se va a crear, pero aparecerá en ranking y listados.\n"
        );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing) {
        // sessionVersion +1 cierra las sesiones abiertas con la clave anterior.
        await db.update(users)
            .set({
                passwordHash,
                role: "superadmin",
                isActive: true,
                approvalStatus: "approved",
                sessionVersion: (existing.sessionVersion ?? 0) + 1,
            })
            .where(eq(users.email, email));
        console.log(`✓ ${email} ya existía: actualizado a superadmin con la nueva contraseña.`);
    } else {
        await db.insert(users).values({
            id: crypto.randomUUID(),
            email,
            passwordHash,
            role: "superadmin",
            firstName,
            lastName,
            isActive: true,
            approvalStatus: "approved",
            sessionVersion: 0,
        });
        console.log(`✓ ${email} creado como superadmin.`);
    }

    const [check] = await db
        .select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    console.log("  Verificación:", check);

    process.exit(0);
}

main().catch((e) => {
    console.error("Error:", e);
    process.exit(1);
});
