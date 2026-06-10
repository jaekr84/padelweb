import "dotenv/config";
import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Adding approval_status column to users...");
        await db.execute(sql`
            ALTER TABLE users ADD COLUMN approval_status varchar(20) NOT NULL DEFAULT 'approved'
        `);
        console.log("Done!");
        process.exit(0);
    } catch (err: any) {
        if (err?.errno === 1060 || /Duplicate column/i.test(err?.message || "")) {
            console.log("Column already exists, nothing to do.");
            process.exit(0);
        }
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

main();
