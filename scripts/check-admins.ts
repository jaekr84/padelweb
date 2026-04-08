
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { inArray } from "drizzle-orm";

async function main() {
    const emails = ["demo1@demo.com", "demo2@demo.com", "demo3@demo.com", "demo4@demo.com"];
    const results = await db.select().from(users).where(inArray(users.email, emails));
    
    console.log(`Found ${results.length} admin users:`);
    results.forEach(u => {
        console.log(`- ${u.email}: role=${u.role}, name=${u.firstName} ${u.lastName}`);
    });
    
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
