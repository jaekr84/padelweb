import { ReactNode } from "react";
import Sidebar from "./feed/Sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 w-full max-w-full overflow-hidden flex flex-col pt-[64px] pb-[80px] md:pt-0 md:pb-0 relative">
                {children}
            </main>
        </div>
    );
}
