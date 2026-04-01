
import { db } from "../src/db";
import { users } from "../src/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
    const email = "jugador@demo.com";
    const password = "demo";
    
    // Check if user already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existing) {
        console.log("User already exists. Updating password and role...");
        const passwordHash = await bcrypt.hash(password, 10);
        await db.update(users)
            .set({ passwordHash, role: "jugador" })
            .where(eq(users.email, email));
        console.log("User updated successfully!");
    } else {
        console.log("Creating new demo player...");
        const passwordHash = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();
        
        await db.insert(users).values({
            id,
            email,
            passwordHash,
            role: "jugador",
            firstName: "Jugador",
            lastName: "Demo",
            category: "D",
            gender: "masculino",
            points: 0,
            isActive: true
        });
        console.log("User created successfully!");
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
