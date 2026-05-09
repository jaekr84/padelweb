import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Adding status to group_matches...");
        await db.execute(sql`ALTER TABLE group_matches ADD COLUMN status VARCHAR(50) DEFAULT 'pending'`);
        console.log("Adding status to bracket_matches...");
        await db.execute(sql`ALTER TABLE bracket_matches ADD COLUMN status VARCHAR(50) DEFAULT 'pending'`);
        console.log("Done!");
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

main();
