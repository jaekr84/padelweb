
import MarketplaceClient from "./MarketplaceClient";
import { getMarketplaceItems } from "./actions";
import { getSession } from "@/lib/auth-server";

export const metadata = {
    title: "Marketplace | ACAP",
    description: "Compra y vende equipamiento de padel entre jugadores.",
};

export default async function MarketplacePage() {
    const items = await getMarketplaceItems();
    const session = await getSession();

    return (
        <MarketplaceClient initialItems={items as any} session={session as any} />
    );
}
