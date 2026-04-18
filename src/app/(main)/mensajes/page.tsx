import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { getConversations } from "./actions";
import MensajesClient from "./MensajesClient";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";

interface PageProps {
    searchParams: Promise<{ conv?: string }>;
}

export default async function MensajesPage({ searchParams }: PageProps) {
    const session = await getSession();
    if (!session?.userId) redirect("/login");

    const sp = await searchParams;
    const conversations = await getConversations();
    const initialConvId = sp.conv ?? conversations[0]?.id ?? undefined;

    return (
        <>
            <MensajesClient
                currentUserId={session.userId}
                initialConvId={initialConvId}
            />
            <PushNotificationPrompt />
        </>
    );
}
