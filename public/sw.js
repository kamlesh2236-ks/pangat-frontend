self.addEventListener("push", (event) => {
    let data = { title: "New notification", body: "" };
    try {
        data = event.data.json();
    } catch (e) {
        // fall back to defaults above if payload isn't JSON
    }

    const options = {
        body: data.body,
        icon: "/icon-192.png", // ⚠️ point this at an actual icon you have in /public, or remove
        badge: "/icon-192.png",
        vibrate: [200, 100, 200, 100, 200], // Android: buzzes even on silent mode
        requireInteraction: true, // stays on screen until dismissed, doesn't auto-hide in a few seconds
        tag: "scanserve-alert",
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// Tapping the notification focuses/opens the waiter dashboard
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes("/waiter") && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow("/waiter");
            }
        })
    );
});