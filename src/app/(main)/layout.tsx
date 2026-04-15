import { ReactNode } from "react";
import Sidebar from "./feed/Sidebar";
import SponsorSidebar from "./feed/SponsorSidebar";
import { getSession } from "@/lib/auth-server";

export default async function MainLayout({ children }: { children: ReactNode }) {
    const session = await getSession();
    
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground transition-colors duration-300">
            {session && (
                <Sidebar 
                    key={`sidebar-${session.userId}-${session.role}`} 
                    initialUser={session} 
                />
            )}
            <main className={`flex-1 w-full max-w-full overflow-hidden flex flex-col ${session ? "pt-[64px] pb-[80px] md:pt-0 md:pb-0" : "pt-0 pb-0"} relative`}>
                {children}
            </main>
            {session && <SponsorSidebar />}
        </div>
    );
}
