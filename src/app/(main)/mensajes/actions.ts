"use server";

import { db } from "@/db";
import { conversations, messages, users, pushSubscriptions } from "@/db/schema";
import { eq, or, and, desc, not, sql, like } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { cache } from "react";

export const getConversations = cache(async () => {
    const session = await getSession();
    if (!session?.userId) return [];

    const myId = session.userId;

    const results = await db
        .select({
            id: conversations.id,
            user1Id: conversations.user1Id,
            user2Id: conversations.user2Id,
            lastMessage: conversations.lastMessage,
            lastMessageAt: conversations.lastMessageAt,
            otherUser: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                imageUrl: users.imageUrl,
                category: users.category
            },
            unreadCount: sql<number>`(SELECT COUNT(*) FROM ${messages} WHERE ${messages.conversationId} = ${conversations.id} AND ${messages.isRead} = 0 AND ${messages.senderId} != ${myId})`
        })
        .from(conversations)
        .leftJoin(users, sql`${users.id} = CASE WHEN ${conversations.user1Id} = ${myId} THEN ${conversations.user2Id} ELSE ${conversations.user1Id} END`)
        .where(or(eq(conversations.user1Id, myId), eq(conversations.user2Id, myId)))
        .orderBy(desc(conversations.lastMessageAt));

    return results.map(r => ({
        ...r,
        unreadCount: Number(r.unreadCount || 0)
    }));
});

export const getMessages = cache(async (conversationId: string) => {
    const session = await getSession();
    if (!session?.userId) return [];

    const conv = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!conv[0]) return [];

    const myId = session.userId;
    if (conv[0].user1Id !== myId && conv[0].user2Id !== myId) return [];

    const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

    return msgs;
});

export async function sendMessage(conversationId: string, content: string, imageUrl?: string | null) {
    const session = await getSession();
    if (!session?.userId) throw new Error("No autorizado");

    const conv = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!conv[0]) throw new Error("Conversación no encontrada");

    const myId = session.userId;
    if (conv[0].user1Id !== myId && conv[0].user2Id !== myId) throw new Error("No tenés permiso");

    const msgId = crypto.randomUUID();
    await db.insert(messages).values({
        id: msgId,
        conversationId,
        senderId: myId,
        content: content.trim(),
        imageUrl: imageUrl || null,
        isRead: false,
    });

    await db.update(conversations)
        .set({ lastMessage: content.trim(), lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));

    // ── Push Notification to recipient ────────────────────────────────────
    try {
        const recipientId = conv[0].user1Id === myId ? conv[0].user2Id : conv[0].user1Id;

        // Get sender name
        const [sender] = await db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, myId))
            .limit(1);
        const senderName = sender ? `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim() : "Alguien";

        // Get recipient push subscriptions
        const subs = await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, recipientId));

        if (subs.length > 0) {
            const webpush = (await import("web-push")).default;
            webpush.setVapidDetails(
                process.env.VAPID_SUBJECT!,
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
                process.env.VAPID_PRIVATE_KEY!
            );

            const payload = JSON.stringify({
                title: `${senderName}`,
                body: content.trim().slice(0, 100),
                url: `/mensajes?conv=${conversationId}`,
                conversationId,
            });

            await Promise.allSettled(
                subs.map(sub =>
                    webpush.sendNotification(
                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                        payload
                    ).catch(async (err) => {
                        // 410 Gone = subscription expired, remove it
                        if (err.statusCode === 410) {
                            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                        }
                    })
                )
            );
        }
    } catch (e) {
        // Push failures are non-fatal
        console.error("Push notification error:", e);
    }

    revalidatePath("/mensajes");
    return { ok: true, messageId: msgId };
}

export async function startConversation(otherUserId: string): Promise<{ conversationId: string }> {
    const session = await getSession();
    if (!session?.userId) throw new Error("No autorizado");

    const myId = session.userId;
    if (myId === otherUserId) throw new Error("No podés iniciar una conversación con vos mismo");

    // Check if conversation already exists (in any direction)
    const existing = await db.select().from(conversations).where(
        or(
            and(eq(conversations.user1Id, myId), eq(conversations.user2Id, otherUserId)),
            and(eq(conversations.user1Id, otherUserId), eq(conversations.user2Id, myId))
        )
    ).limit(1);

    if (existing[0]) return { conversationId: existing[0].id };

    const newId = crypto.randomUUID();
    await db.insert(conversations).values({
        id: newId,
        user1Id: myId,
        user2Id: otherUserId,
        lastMessage: null,
        lastMessageAt: new Date(),
    });

    revalidatePath("/mensajes");
    return { conversationId: newId };
}

export async function markAsRead(conversationId: string) {
    const session = await getSession();
    if (!session?.userId) return;

    const myId = session.userId;
    await db.update(messages)
        .set({ isRead: true })
        .where(and(
            eq(messages.conversationId, conversationId),
            not(eq(messages.senderId, myId)),
            eq(messages.isRead, false)
        ));
    // No revalidatePath here — client manages state reactively
}

export const getUnreadCount = cache(async (): Promise<number> => {
    const session = await getSession();
    if (!session?.userId) return 0;

    const myId = session.userId;

    // Direct count of unread messages where recipient (me) is part of the conversation
    const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(and(
            or(eq(conversations.user1Id, myId), eq(conversations.user2Id, myId)),
            eq(messages.isRead, false),
            not(eq(messages.senderId, myId))
        ));

    return Number(result[0]?.count || 0);
});

export async function searchUsers(query: string, clubId?: string | null) {
    const session = await getSession();
    if (!session?.userId || query.trim().length < 2) return [];

    const myId = session.userId;
    const q = `%${query.trim()}%`;

    const whereConditions = [
        sql`${users.id} != ${myId}`,
        sql`${users.role} NOT LIKE '%manual%'`,
        or(
            like(users.firstName, q),
            like(users.lastName, q),
            like(users.email, q)
        )
    ];

    if (clubId) {
        whereConditions.push(eq(users.clubId, clubId));
    }

    const results = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            imageUrl: users.imageUrl,
            category: users.category,
            email: users.email,
        })
        .from(users)
        .where(and(...whereConditions))
        .limit(10);

    return results;
}
