import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
    // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400,
        })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err)
        return new Response('Error occured', {
            status: 400,
        })
    }

    const { id } = evt.data
    const eventType = evt.type

    if (eventType === 'user.created') {
        // Insert user into DB
        const { id, email_addresses, first_name, last_name, public_metadata } = evt.data as any
        const email = email_addresses?.[0]?.email_address || ''

        // Check if role exists in public_metadata, if not set 'jugador'
        const role = (public_metadata?.role as string) || 'jugador'
        const name = first_name ? `${first_name} ${last_name || ''}`.trim() : email.split('@')[0]

        try {
            await db.insert(users).values({
                id: id!,
                email: email,
                name: name,
                role: role,
            }).onConflictDoUpdate({
                target: users.id,
                set: {
                    email: email,
                    name: name,
                    role: role
                }
            });
        } catch (e) {
            console.error("Error inserting user from webhook:", e)
        }
    }

    if (eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name, public_metadata } = evt.data as any
        const email = email_addresses?.[0]?.email_address || ''
        const role = (public_metadata?.role as string) || 'jugador'
        const name = first_name ? `${first_name} ${last_name || ''}`.trim() : email.split('@')[0]

        try {
            await db.update(users).set({
                email,
                name,
                role
            }).where(eq(users.id, id!))
        } catch (e) {
            console.error("Error updating user from webhook:", e)
        }
    }

    if (eventType === 'user.deleted') {
        const { id } = evt.data
        try {
            // We try to delete the user.
            // It will fail if they have related rows (tournaments, posts, etc) due to foreign keys constraint,
            // which prevents deleting actual active players by mistake.
            await db.delete(users).where(eq(users.id, id!))
        } catch (e) {
            console.error("Error deleting user from webhook (likely foreign key constraint):", e)
        }
    }

    return new Response('', { status: 200 })
}
