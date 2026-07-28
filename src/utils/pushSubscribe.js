import apiClient from "./api";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

export const subscribeToPush = async (subscribeRoute) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("[push] this browser doesn't support push notifications");
        return false;
    }
    if (!VAPID_PUBLIC_KEY) {
        console.error("[push] VITE_VAPID_PUBLIC_KEY is undefined — check .env and restart the dev server");
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("[push] notification permission denied");
            return false;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        }

        await apiClient.post(subscribeRoute, { subscription });
        console.log("[push] subscribed and saved to backend");
        return true;
    } catch (err) {
        console.error("[push] subscription failed:", err.message);
        return false;
    }
};