import { ReactNode } from "react";
import Sidebar from "./feed/Sidebar";
import SponsorSidebar from "./feed/SponsorSidebar";
import FloatingChat from "@/components/chat/FloatingChat";
import { getSession } from "@/lib/auth-server";
import { getSidebarUser } from "@/app/login/actions";
import { getSponsors } from "@/app/actions/sponsors";

export default async function MainLayout({ children }: { children: ReactNode }) {
    const session = await getSession();
    
    // Fetch user and sponsors in parallel on the server
    const [fullUser, allSponsors] = await Promise.all([
        session ? getSidebarUser() : Promise.resolve(null),
        session ? getSponsors() : Promise.resolve([])
    ]);
    
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground transition-colors duration-300">
            {fullUser && (
                <Sidebar 
                    key={`sidebar-${fullUser.role}`} 
                    initialUser={fullUser} 
                />
            )}
            <main className={`flex-1 w-full max-w-full overflow-hidden flex flex-col ${session ? "pt-[64px] pb-[80px] md:pt-0 md:pb-0" : "pt-0 pb-0"} relative`}>
                {children}
            </main>
            {fullUser && (
                <SponsorSidebar 
                    initialSponsors={allSponsors} 
                    userRole={fullUser.role} 
                />
            )}
            {session && <FloatingChat currentUserId={session.userId} />}
            
            {/* Portal for floating chat and global overlays */}
            <div id="chat-portal" />
        </div>
    );
}
