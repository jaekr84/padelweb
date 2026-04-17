// ACAP Padel - Service Worker for Push Notifications
// Handles background push events and notification clicks

self.addEventListener("push", (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: "Nuevo mensaje", body: event.data.text(), url: "/mensajes" };
    }

    const options = {
        body: data.body || "Tenés un mensaje nuevo",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        vibrate: [200, 100, 200],
        tag: data.conversationId || "message",   // groups notifications by conversation
        renotify: true,
        data: { url: data.url || "/mensajes" },
        actions: [
            { action: "open", title: "Ver mensaje" },
            { action: "dismiss", title: "Ignorar" },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "ACAP · Nuevo Mensaje", options)
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    if (event.action === "dismiss") return;

    const url = event.notification.data?.url || "/mensajes";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                // If the app is already open, focus it and navigate
                for (const client of clientList) {
                    if ("focus" in client) {
                        client.focus();
                        client.navigate(url);
                        return;
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) return clients.openWindow(url);
            })
    );
});
