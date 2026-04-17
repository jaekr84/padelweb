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

    const convs = await db
        .select()
        .from(conversations)
        .where(or(eq(conversations.user1Id, myId), eq(conversations.user2Id, myId)))
        .orderBy(desc(conversations.lastMessageAt));

    if (convs.length === 0) return [];

    const otherUserIds = convs.map(c => c.user1Id === myId ? c.user2Id : c.user1Id);
    const otherUsers = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, imageUrl: users.imageUrl, category: users.category })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(otherUserIds.map(id => sql`${id}`), sql`, `)})`);

    const userMap = new Map(otherUsers.map(u => [u.id, u]));

    // Count unread per conversation
    const unreadCounts = await Promise.all(convs.map(async c => {
        const [{ count }] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(messages)
            .where(and(
                eq(messages.conversationId, c.id),
                eq(messages.isRead, false),
                not(eq(messages.senderId, myId))
            ));
        return { conversationId: c.id, count: Number(count) };
    }));

    const unreadMap = new Map(unreadCounts.map(u => [u.conversationId, u.count]));

    return convs.map(c => {
        const otherId = c.user1Id === myId ? c.user2Id : c.user1Id;
        const other = userMap.get(otherId);
        return {
            ...c,
            otherUser: other ?? null,
            unreadCount: unreadMap.get(c.id) ?? 0,
        };
    });
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

export async function sendMessage(conversationId: string, content: string) {
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

    // First get the conversations I'm part of
    const myConvs = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(or(eq(conversations.user1Id, myId), eq(conversations.user2Id, myId)));

    if (myConvs.length === 0) return 0;

    const convIds = myConvs.map(c => c.id);

    const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(messages)
        .where(and(
            sql`${messages.conversationId} IN (${sql.join(convIds.map(id => sql`${id}`), sql`, `)})`,
            eq(messages.isRead, false),
            not(eq(messages.senderId, myId))
        ));

    return Number(count);
});

export async function searchUsers(query: string) {
    const session = await getSession();
    if (!session?.userId || query.trim().length < 2) return [];

    const myId = session.userId;
    const q = `%${query.trim()}%`;

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
        .where(
            and(
                sql`${users.id} != ${myId}`,
                sql`${users.role} NOT LIKE '%manual%'`,
                or(
                    like(users.firstName, q),
                    like(users.lastName, q),
                    like(users.email, q)
                )
            )
        )
        .limit(10);

    return results;
}
