import { db } from "./src/db";
import { users } from "./src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createDemoAdmin() {
    const email = "demo@demo";
    const password = "demo";
    const role = "superadmin";

    console.log(`Configurando superadmin: ${email}...`);

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existing.length > 0) {
            console.log("Actualizando usuario existente...");
            await db.update(users)
                .set({
                    passwordHash,
                    role,
                })
                .where(eq(users.email, email));
        } else {
            console.log("Creando nuevo usuario superadmin...");
            await db.insert(users).values({
                id: `user_${Date.now()}`,
                email: email,
                passwordHash,
                role,
                firstName: "Demo",
                lastName: "Admin"
            });
        }

        console.log("¡Configuración de superadmin demo@demo completa!");
        process.exit(0);
    } catch (error) {
        console.error("Error al configurar superadmin:", error);
        process.exit(1);
    }
}

createDemoAdmin();
