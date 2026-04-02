import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Adding system_settings table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS system_settings (
                \`id\` varchar(256) PRIMARY KEY,
                \`key\` varchar(256) NOT NULL UNIQUE,
                \`value\` text,
                \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        console.log("Seeding default settings...");
        // Use IGNORE or check existance to avoid crash on rerun
        await db.execute(sql`
            INSERT IGNORE INTO system_settings (\`id\`, \`key\`, \`value\`) 
            VALUES (UUID(), 'promotion_mode', 'auto')
        `);

        console.log("Done!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

main();
