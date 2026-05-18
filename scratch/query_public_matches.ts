import { db } from "../src/db";
import { publicMatches } from "../src/db/schema";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    try {
        console.log("Fetching all public matches from DB...");
        const matches = await db.select().from(publicMatches);
        console.log(`Total public matches: ${matches.length}`);
        
        if (matches.length > 0) {
            console.log("\nMatches detail:");
            console.table(matches.map(m => ({
                id: m.id,
                creatorId: m.creatorId,
                date: m.date,
                time: m.time,
                city: m.city,
                category: m.category,
                status: m.status,
                totalSlots: m.totalSlots
            })));
        } else {
            console.log("No public matches found in the database.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error executing query:", err);
        process.exit(1);
    }
}

main();
