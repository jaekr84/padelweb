"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

type State = "idle" | "granted" | "denied" | "unsupported";

export default function PushNotificationPrompt() {
    const [state, setState] = useState<State>("idle");
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            setState("unsupported");
            return;
        }
        const perm = Notification.permission;
        if (perm === "granted") setState("granted");
        else if (perm === "denied") setState("denied");

        // Register service worker
        navigator.serviceWorker.register("/sw.js").catch(console.error);
    }, []);

    const handleEnable = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setState("denied");
                return;
            }

            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
            });

            setState("granted");
        } catch (e) {
            console.error("Push subscribe error:", e);
        } finally {
            setLoading(false);
        }
    };

    // Don't render if unsupported, already granted, denied, or dismissed
    if (state === "unsupported" || state === "granted" || state === "denied" || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-azul-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-5 h-5 text-azul-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">Activar notificaciones</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Recibí alertas cuando alguien te envíe un mensaje, aunque la app esté cerrada.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <button
                            onClick={handleEnable}
                            disabled={loading}
                            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-azul-primary transition-all disabled:opacity-50"
                        >
                            {loading ? "Activando..." : "Activar"}
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className="px-4 py-1.5 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
