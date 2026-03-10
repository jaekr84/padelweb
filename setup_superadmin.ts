import dotenv from "dotenv";
dotenv.config();

import { db } from "./src/db";
import { users } from "./src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function setupSuperadmin() {
    const email = "ljckr84@gmail.com";
    const password = "demo";
    const role = "superadmin";

    console.log(`Setting up superadmin: ${email}...`);

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existing.length > 0) {
            console.log("Updating existing user...");
            await db.update(users)
                .set({
                    passwordHash,
                    role,
                })
                .where(eq(users.email, email));
        } else {
            console.log("Creating new superadmin user...");
            await db.insert(users).values({
                id: email,
                email: email,
                passwordHash,
                role,
                firstName: "Super",
                lastName: "Admin"
            });
        }

        console.log("Superadmin setup complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error setting up superadmin:", error);
        process.exit(1);
    }
}

setupSuperadmin();
