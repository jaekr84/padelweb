import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const res = await db.execute(sql`DESCRIBE group_matches`);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

main();
