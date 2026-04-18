import { db } from "../src/db";
import { contactMessages } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function main() {
    console.log("Checking contact_messages...");
    try {
        const messages = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
        console.log(`Found ${messages.length} messages:`);
        console.log(JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error("Error checking messages:", error);
    }
    process.exit(0);
}

main();
