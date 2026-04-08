
import { db } from "../src/db";
import { users } from "../src/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
    const password = "demo";
    const passwordHash = await bcrypt.hash(password, 10);
    
    const admins = [
        { email: "demo1@demo.com", firstName: "Admin", lastName: "Demo 1" },
        { email: "demo2@demo.com", firstName: "Admin", lastName: "Demo 2" },
        { email: "demo3@demo.com", firstName: "Admin", lastName: "Demo 3" },
        { email: "demo4@demo.com", firstName: "Admin", lastName: "Demo 4" },
    ];

    console.log("Starting superadmin seeding...");

    for (const admin of admins) {
        // Check if user already exists
        const [existing] = await db.select().from(users).where(eq(users.email, admin.email)).limit(1);
        
        if (existing) {
            console.log(`User ${admin.email} already exists. Updating password and role to superadmin...`);
            await db.update(users)
                .set({ passwordHash, role: "superadmin" })
                .where(eq(users.email, admin.email));
            console.log(`User ${admin.email} updated successfully!`);
        } else {
            console.log(`Creating new superadmin: ${admin.email}...`);
            const id = crypto.randomUUID();
            
            await db.insert(users).values({
                id,
                email: admin.email,
                passwordHash,
                role: "superadmin",
                firstName: admin.firstName,
                lastName: admin.lastName,
                isActive: true
            });
            console.log(`User ${admin.email} created successfully!`);
        }
    }
    
    console.log("Superadmin seeding completed.");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
