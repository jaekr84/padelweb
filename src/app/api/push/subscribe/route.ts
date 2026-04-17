import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

// POST /api/push/subscribe — save a push subscription
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const sub = await req.json();
    const { endpoint, keys } = sub;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    // Upsert: if endpoint already exists for this user, skip
    const existing = await db
        .select({ id: pushSubscriptions.id })
        .from(pushSubscriptions)
        .where(and(
            eq(pushSubscriptions.userId, session.userId),
            eq(pushSubscriptions.endpoint, endpoint)
        ))
        .limit(1);

    if (existing.length === 0) {
        await db.insert(pushSubscriptions).values({
            id: crypto.randomUUID(),
            userId: session.userId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
        });
    }

    return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe — remove a push subscription
export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Endpoint requerido" }, { status: 400 });

    await db.delete(pushSubscriptions).where(and(
        eq(pushSubscriptions.userId, session.userId),
        eq(pushSubscriptions.endpoint, endpoint)
    ));

    return NextResponse.json({ ok: true });
}
