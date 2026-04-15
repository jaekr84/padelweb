import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creating sponsors table...");
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS sponsors (
                id varchar(36) PRIMARY KEY,
                name varchar(255) NOT NULL,
                image_url text NOT NULL,
                link text,
                is_active boolean DEFAULT true,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Table 'sponsors' created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

main();
