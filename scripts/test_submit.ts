import { db } from "../src/db";
import { contactMessages } from "../src/db/schema";
import { randomUUID } from "node:crypto";

async function main() {
    console.log("Submitting test message...");
    try {
        await db.insert(contactMessages).values({
            id: randomUUID(),
            name: "Test Bot",
            email: "bot@test.com",
            subject: "Debug Test",
            message: "This is a test message from the AI",
            status: "pendiente",
            createdAt: new Date(),
        });
        console.log("Test message submitted successfully!");
    } catch (error) {
        console.error("Error submitting test message:", error);
    }
    process.exit(0);
}

main();
