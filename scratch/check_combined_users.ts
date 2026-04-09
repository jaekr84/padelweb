
import { db } from '../src/db/index';
import { users, registrations, tournaments } from '../src/db/schema';
import { eq, like, and, or } from 'drizzle-orm';

async function run() {
    console.log("Searching for manual players with combined names...");
    
    const combinedUsers = await db.select().from(users).where(
        and(
            like(users.email, "%@manual.test"),
            or(
                like(users.firstName, "%/%"),
                like(users.lastName, "%/%")
            )
        )
    );

    console.log(`Found ${combinedUsers.length} users with combined names.`);

    for (const user of combinedUsers) {
        const regs = await db.select({
            registrationId: registrations.id,
            tournamentId: registrations.tournamentId,
            tournamentName: tournaments.name,
            partnerUserId: registrations.partnerUserId
        })
        .from(registrations)
        .leftJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
        .where(eq(registrations.userId, user.id));

        console.log(`\nUser: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
        console.log(`Registrations: ${regs.length}`);
        for (const reg of regs) {
            console.log(` - Tournament: ${reg.tournamentName} (ID: ${reg.tournamentId})`);
            console.log(` - Registration ID: ${reg.registrationId}`);
            console.log(` - Partner User ID: ${reg.partnerUserId}`);
        }
    }
}

run().catch(console.error);
