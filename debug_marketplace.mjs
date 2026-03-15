import { db } from "./src/db/index.ts";
import { marketplaceItems } from "./src/db/schema.ts";
import { count } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    try {
        console.log("Checking DB connection...");
        const result = await db.select({ value: count() }).from(marketplaceItems);
        console.log("Total items:", result[0].value);
        
        const all = await db.select().from(marketplaceItems).limit(20);
        console.log("Items found:", all.length);
        all.forEach(item => {
            console.log(`- ID: ${item.id}, Title: ${item.title}, Status: ${item.status}`);
        });
    } catch (e) {
        console.error("Query failed:", e);
    }
    process.exit(0);
}

main();
