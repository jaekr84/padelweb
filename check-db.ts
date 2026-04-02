import { db } from "./src/db";
import { categoriesTable, users } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    try {
        const cats = await db.select().from(categoriesTable);
        console.log("CATEGORIES IN DB:");
        console.table(cats);

        const players = await db.select().from(users).where(eq(users.category, "D"));
        console.log("\nSome players in Category D:");
        console.table(players.slice(0, 5).map(p => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            points: p.points,
            category: p.category
        })));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
