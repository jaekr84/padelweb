import { db } from "./src/db";
import { users } from "./src/db/schema";
import { inArray } from "drizzle-orm";

async function checkUsers() {
    const allUsers = await db.select({
        id: users.id,
        email: users.email,
        gender: users.gender,
        role: users.role
    })
    .from(users)
    .where(inArray(users.role, ["jugador", "profe"]));

    console.log("Users found:", allUsers.length);
    allUsers.forEach(u => {
        console.log(`ID: ${u.id}, Email: ${u.email}, Gender: '${u.gender}', Role: ${u.role}`);
    });
    process.exit(0);
}

checkUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
