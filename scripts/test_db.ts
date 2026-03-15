import { db } from "../src/db";
import { users } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function test() {
    console.log("Checking DB connection...");
    try {
        const result = await db.select({ count: sql`count(*)` }).from(users);
        console.log("Connection successful! User count:", result);
    } catch (e) {
        console.error("Connection failed:", e);
    }
    process.exit(0);
}
test();
