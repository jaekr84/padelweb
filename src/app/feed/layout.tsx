"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";

// FeedLayout is a pure client wrapper. Role is read from the
// __padel_role cookie (set server-side) inside Sidebar.
export default function FeedLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-background text-foreground">
            <Sidebar />

            {/* 
              pt-16 creates room for the mobile top header
              pb-20 creates room for the mobile bottom tab bar (using pb-[calc(env(safe-area-inset-bottom)+80px)] is a good practice too)
              md:pt-0 md:pb-0 resets for desktop where Sidebar handles space natively
            */}
            <main className="flex-1 w-full max-w-full overflow-hidden flex flex-col pt-[64px] pb-[80px] md:pt-0 md:pb-0 relative">
                {children}
            </main>
        </div>
    );
}
