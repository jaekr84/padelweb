"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import styles from "./live.module.css";

export default function LiveRefresher() {
    const router = useRouter();
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [loading, setLoading] = useState(false);

    const handleRefresh = useCallback(async () => {
        setLoading(true);
        router.refresh();
        // Give Next.js a moment to revalidate before marking done
        setTimeout(() => {
            setLastUpdated(new Date());
            setLoading(false);
        }, 800);
    }, [router]);

    const formatted = lastUpdated.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const formattedDate = lastUpdated.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    return (
        <div className={styles.refreshFooter}>
            <span className={styles.refreshMeta}>
                🕐 Última actualización: <strong>{formattedDate} {formatted}</strong>
            </span>
            <button
                className={styles.refreshBtn}
                onClick={handleRefresh}
                disabled={loading}
            >
                {loading ? "⏳ Actualizando..." : "🔄 Actualizar"}
            </button>
        </div>
    );
}
