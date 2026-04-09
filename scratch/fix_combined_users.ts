
import { db } from '../src/db/index';
import { users, registrations } from '../src/db/schema';
import { eq, like, and, or, isNull } from 'drizzle-orm';

async function run() {
    console.log("Starting fix for combined manual players...");
    
    // 1. Find all registrations where the main user has a combined name
    const registrationsToFix = await db.select({
        registration: registrations,
        user: users
    })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .where(
        and(
            like(users.email, "%@manual.test"),
            or(
                like(users.firstName, "%/%"),
                like(users.lastName, "%/%")
            ),
            isNull(registrations.partnerUserId) // Only fix if partner is missing
        )
    );

    console.log(`Found ${registrationsToFix.length} registrations to fix.`);

    for (const { registration, user } of registrationsToFix) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
        const parts = fullName.split("/").map(p => p.trim());

        if (parts.length < 2) {
            console.log(`Skipping ${fullName} - could not split correctly.`);
            continue;
        }

        const name1 = parts[0];
        const name2 = parts.slice(1).join(" / "); // In case there are more slashes

        console.log(`Fixing registration ${registration.id}: "${fullName}" -> ["${name1}", "${name2}"]`);

        // Create new user for Name 2
        const p2Id = `manual_${crypto.randomUUID()}`;
        const p2FirstName = name2.split(" ")[0];
        const p2LastName = name2.split(" ").slice(1).join(" ") || " ";

        await db.insert(users).values({
            id: p2Id,
            email: `${p2Id}@manual.test`,
            firstName: p2FirstName,
            lastName: p2LastName,
            role: "jugador",
            category: user.category || "D",
            gender: user.gender || "masculino",
            isActive: true
        });

        // Update Name 1 user
        const p1FirstName = name1.split(" ")[0];
        const p1LastName = name1.split(" ").slice(1).join(" ") || " ";
        
        await db.update(users)
            .set({ 
                firstName: p1FirstName, 
                lastName: p1LastName 
            })
            .where(eq(users.id, user.id));

        // Update registration
        await db.update(registrations)
            .set({ 
                partnerUserId: p2Id,
                partnerName: name2
            })
            .where(eq(registrations.id, registration.id));

        console.log(`Done fixing ${fullName}.`);
    }

    console.log("Fix complete.");
}

run().catch(console.error);
