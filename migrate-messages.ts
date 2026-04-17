import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("Creating conversations table...");
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS \`conversations\` (
            \`id\` varchar(36) NOT NULL,
            \`user1_id\` varchar(256) NOT NULL,
            \`user2_id\` varchar(256) NOT NULL,
            \`last_message\` text,
            \`last_message_at\` timestamp DEFAULT (now()),
            \`created_at\` timestamp NOT NULL DEFAULT (now()),
            PRIMARY KEY (\`id\`),
            INDEX \`conversations_user1_idx\` (\`user1_id\`),
            INDEX \`conversations_user2_idx\` (\`user2_id\`)
        )
    `);
    console.log("✅ conversations created");

    console.log("Creating messages table...");
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS \`messages\` (
            \`id\` varchar(36) NOT NULL,
            \`conversation_id\` varchar(36) NOT NULL,
            \`sender_id\` varchar(256) NOT NULL,
            \`content\` text NOT NULL,
            \`is_read\` boolean DEFAULT false,
            \`created_at\` timestamp NOT NULL DEFAULT (now()),
            PRIMARY KEY (\`id\`),
            INDEX \`messages_conversation_idx\` (\`conversation_id\`),
            INDEX \`messages_sender_idx\` (\`sender_id\`)
        )
    `);
    console.log("✅ messages created");

    console.log("Done!");
    process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
