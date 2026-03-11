import { db } from "./src/db";
import { users } from "./src/db/schema";
import { eq, inArray } from "drizzle-orm";

async function fixGenders() {
    const allUsers = await db.select({
        id: users.id,
        email: users.email,
    })
    .from(users)
    .where(inArray(users.role, ["jugador", "profe"]));

    console.log(`Found ${allUsers.length} players/instructors to update.`);

    for (let i = 0; i < allUsers.length; i++) {
        const user = allUsers[i];
        const gender = i % 2 === 0 ? "masculino" : "femenino";
        
        await db.update(users)
            .set({ gender })
            .where(eq(users.id, user.id));
        
        console.log(`Updated ${user.email} to ${gender}`);
    }

    console.log("All genders updated successfully.");
    process.exit(0);
}

fixGenders().catch(err => {
    console.error(err);
    process.exit(1);
});
