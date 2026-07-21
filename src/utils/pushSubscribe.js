import apiClient from "./api";

// ⚠️ Must match the VAPID_PUBLIC_KEY you set on the backend. Put it in your
// admin-frontend .env as VITE_VAPID_PUBLIC_KEY and restart the dev server.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Push subscription keys must be sent as base64url — browsers hand you a
// standard base64 string via applicationServerKey, this converts it.
const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

/**
 * Call this from the same tap as "Enable Call Sound" — it needs a user
 * gesture the same way audio unlock does. Route (`/waiter/push-subscribe`
 * vs `/kitchen/push-subscribe`) picks which staff role this device is for.
 */
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