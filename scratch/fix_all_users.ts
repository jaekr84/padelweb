
import { db } from '../src/db/index';
import { users, registrations } from '../src/db/schema';
import { eq, like, or } from 'drizzle-orm';

async function run() {
    console.log("Starting full fix for ALL combined manual players (including orphans)...");
    
    // 1. Find all users with combined names and @manual.test email
    const usersToFix = await db.select().from(users).where(
        and(
            like(users.email, "%@manual.test"),
            or(
                like(users.firstName, "%/%"),
                like(users.lastName, "%/%")
            )
        )
    );

    console.log(`Found ${usersToFix.length} users to fix.`);

    for (const user of usersToFix) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
        const parts = fullName.split("/").map(p => p.trim());

        if (parts.length < 2) {
            console.log(`Skipping ${fullName} - could not split correctly.`);
            continue;
        }

        const name1 = parts[0];
        const name2 = parts.slice(1).join(" / ");

        console.log(`Fixing User ${user.id}: "${fullName}" -> ["${name1}", "${name2}"]`);

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

        // Update Original User to Name 1
        const p1FirstName = name1.split(" ")[0];
        const p1LastName = name1.split(" ").slice(1).join(" ") || " ";
        
        await db.update(users)
            .set({ 
                firstName: p1FirstName, 
                lastName: p1LastName 
            })
            .where(eq(users.id, user.id));

        // Also check if there's any registration that escaped my previous pass
        // (This part is redundant if I already ran the other script, but let's be safe)
        const regs = await db.select().from(registrations).where(eq(registrations.userId, user.id));
        for (const reg of regs) {
            if (!reg.partnerUserId) {
                await db.update(registrations)
                    .set({ 
                        partnerUserId: p2Id,
                        partnerName: name2
                    })
                    .where(eq(registrations.id, reg.id));
                console.log(`Linked registration ${reg.id} to new partner.`);
            }
        }

        console.log(`Done fixing ${fullName}.`);
    }

    console.log("Full fix complete.");
}

// Need to define "and" because I missed it in the imports but used it in the code
import { and } from 'drizzle-orm';

run().catch(console.error);
