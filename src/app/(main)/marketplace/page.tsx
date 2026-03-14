
import MarketplaceClient from "./MarketplaceClient";
import { getMarketplaceItems } from "./actions";
import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
    title: "Marketplace | ACAP",
    description: "Compra y vende equipamiento de padel entre jugadores.",
};

export default async function MarketplacePage() {
    const session = await getSession() as { userId: string } | null;
    const items = await getMarketplaceItems();
    
    let dbUser = null;
    if (session?.userId) {
        const usersRes = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        dbUser = usersRes[0] || null;
    }

    return (
        <MarketplaceClient 
            initialItems={items as any} 
            session={{ ...session, user: dbUser } as any} 
        />
    );
}
