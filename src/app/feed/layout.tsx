"use client";

import styles from "./layout.module.css";
import { ReactNode } from "react";
import Sidebar from "./Sidebar";

// FeedLayout is a pure client wrapper. Role is read from the
// __padel_role cookie (set server-side) inside Sidebar.
export default function FeedLayout({ children }: { children: ReactNode }) {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
