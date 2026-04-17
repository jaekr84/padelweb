import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("Creating push_subscriptions table...");
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
            \`id\` varchar(36) NOT NULL,
            \`user_id\` varchar(256) NOT NULL,
            \`endpoint\` text NOT NULL,
            \`p256dh\` text NOT NULL,
            \`auth\` text NOT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT (now()),
            PRIMARY KEY (\`id\`),
            INDEX \`push_subscriptions_user_idx\` (\`user_id\`)
        )
    `);
    console.log("✅ push_subscriptions created");
    process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
