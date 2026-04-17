import { db } from "@/db";
import { openCourtEvents, clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const events = await db.select().from(openCourtEvents);
        
        for (const event of events) {
            if (!event.creatorId) {
                // Find the club owner to use as default creator
                const [club] = await db
                    .select()
                    .from(clubs)
                    .where(eq(clubs.id, event.clubId))
                    .limit(1);
                
                if (club) {
                    await db
                        .update(openCourtEvents)
                        .set({ creatorId: club.ownerId })
                        .where(eq(openCourtEvents.id, event.id));
                    console.log(`Updated event ${event.id} with creator ${club.ownerId}`);
                }
            }
        }
        
        return NextResponse.json({ success: true, message: "Migration completed" });
    } catch (error) {
        console.error("Migration error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
