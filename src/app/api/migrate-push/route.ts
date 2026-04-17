import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
    try {
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
        return NextResponse.json({ ok: true, message: "push_subscriptions table created" });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
