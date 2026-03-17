import { db } from "../db";
import { users } from "../db/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as dotenv from "dotenv";
import path from "path";
import { eq } from "drizzle-orm";

// Load .env from the root directory
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function createSuperAdmin() {
    const email = "dev@jae.com";
    const password = "devjae";
    const role = "superadmin";

    console.log(`Checking if user ${email} exists...`);

    const existingUsers = await db.select().from(users).where(eq(users.email, email));

    if (existingUsers.length > 0) {
        console.log("User already exists. Updating role to superadmin...");
        await db.update(users)
            .set({ role: "superadmin" })
            .where(eq(users.email, email));
        console.log("User updated successfully.");
    } else {
        console.log("Creating new superadmin user...");
        const passwordHash = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();

        await db.insert(users).values({
            id,
            email,
            passwordHash,
            role,
            firstName: "Dev",
            lastName: "Jae",
            isActive: true,
        });
        console.log(`User created successfully with ID: ${id}`);
    }

    process.exit(0);
}

createSuperAdmin().catch((err) => {
    console.error("Error creating superadmin:", err);
    process.exit(1);
});
