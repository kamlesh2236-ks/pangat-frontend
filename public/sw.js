self.addEventListener("push", (event) => {
    let data = { title: "New notification", body: "" };
    try {
        data = event.data.json();
    } catch (e) {
    }

    const options = {
        body: data.body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
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