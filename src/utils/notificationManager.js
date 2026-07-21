import { io } from "socket.io-client";

// ⚠️ Confirm this matches your .env variable name (check apiClient.js for
// whichever VITE_ var it reads). If this logs undefined, that's your bug.
const RAW_API_URL = import.meta.env.VITE_API_URL;
if (!RAW_API_URL) {
    console.error("[notifications] VITE_API_URL is undefined — check .env and restart the dev server.");
}
const SOCKET_URL = (RAW_API_URL || "").replace(/\/api\/?$/, "");

const SOUND_PREF_KEY = "scanserve_sound_enabled";
const RING_SOUND_URL = "/sounds/notification-ring.mp3";

let socket = null;
let ringAudio = null;
let audioUnlocked = false;
let repeatIntervalId = null;
let pendingCallCount = 0;

const listeners = {
    waiterCalled: new Set(),
    callResolved: new Set(),
    orderReady: new Set(),
};

export const isSoundEnabled = () => localStorage.getItem(SOUND_PREF_KEY) === "true";


export const isAudioReady = () => audioUnlocked;

const getRingAudio = () => {
    if (!ringAudio) {
        ringAudio = new Audio(RING_SOUND_URL);
        ringAudio.volume = 1.0;
    }
    return ringAudio;
};

export const enableSound = () => {
    const audio = getRingAudio();

    audio.play()
        .then(() => {
            audioUnlocked = true;
            console.log("[notifications] audio unlocked");
        })
        .catch((err) => {
            audioUnlocked = false;
            console.warn("[notifications] could not unlock audio:", err.message);
        });

    localStorage.setItem(SOUND_PREF_KEY, "true");
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
    }
    console.log("[notifications] sound enabled");
};

export const disableSound = () => {
    localStorage.setItem(SOUND_PREF_KEY, "false");
    stopRepeatingAlert();
    console.log("[notifications] sound disabled");
};

export const playBeep = () => {
    if (!isSoundEnabled()) return;

    const audio = getRingAudio();
    audio.currentTime = 0;
    audio.play()
        .then(() => {
            audioUnlocked = true;
        })
        .catch((err) => {
            // Most common cause on mobile: tab was backgrounded and the
            // browser is refusing autoplay again until the next real tap.
            audioUnlocked = false;
            console.warn("[notifications] sound is 'on' but playback was blocked — tap 'Enable Sound' again:", err.message);
        });
};

if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && isSoundEnabled() && !audioUnlocked) {
            const audio = getRingAudio();
            const prevVolume = audio.volume;
            audio.volume = 0;
            audio.play()
                .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = prevVolume;
                    audioUnlocked = true;
                    console.log("[notifications] audio re-unlocked after tab became visible");
                })
                .catch(() => {
                    audio.volume = prevVolume;
                });
        }
    });
}

const startRepeatingAlert = () => {
    if (repeatIntervalId) return;
    repeatIntervalId = setInterval(() => {
        if (pendingCallCount > 0 && isSoundEnabled()) {
            playBeep();
        } else {
            stopRepeatingAlert();
        }
    }, 2500); // shorter gap = feels like continuous ringing, not a periodic ping
};

const stopRepeatingAlert = () => {
    if (repeatIntervalId) {
        clearInterval(repeatIntervalId);
        repeatIntervalId = null;
    }
};


export const connectNotifications = () => {
    if (socket) {
        if (!socket.connected) socket.connect();
        return socket;
    }

    // Matches the exact key apiClient.js reads in its request interceptor.
    const token = localStorage.getItem("adminToken");
    console.log("[notifications] connecting with token present:", !!token, "url:", SOCKET_URL);

    socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"], // allow polling fallback in case websocket is blocked somewhere
        auth: { token },
    });

    socket.on("connect", () => console.log("[notifications] ✅ connected:", socket.id));
    socket.on("disconnect", (reason) => console.log("[notifications] ❌ disconnected:", reason));
    socket.on("connect_error", (err) => console.error("[notifications] ⚠️ connect error:", err.message));

    socket.on("waiterCalled", (call) => {
        console.log("[notifications] 🔔 waiterCalled event received:", call);
        pendingCallCount += 1;
        listeners.waiterCalled.forEach((cb) => cb(call));
        if (isSoundEnabled()) {
            playBeep();
            startRepeatingAlert();
        }
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Table is calling!", {
                body: `Table ${call.tableNumber} — ${call.waiterCallReason}`,
            });
        }
    });

    socket.on("callResolved", (data) => {
        console.log("[notifications] callResolved event received:", data);
        pendingCallCount = Math.max(0, pendingCallCount - 1);
        listeners.callResolved.forEach((cb) => cb(data));
    });

    // Cook marked an order Ready — this is the "go serve it" alert, separate
    // from a customer's Call Waiter button.
    socket.on("orderReady", (order) => {
        console.log("[notifications] 🍽️ orderReady event received:", order);
        pendingCallCount += 1;
        listeners.orderReady.forEach((cb) => cb(order));
        if (isSoundEnabled()) {
            playBeep();
            startRepeatingAlert();
        }
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Order ready to serve!", {
                body: `Order #${order.orderNumber} — Table ${order.tableNumber ?? "Counter"}`,
            });
        }
    });

    return socket;
};

export const onWaiterCalled = (cb) => {
    listeners.waiterCalled.add(cb);
    return () => listeners.waiterCalled.delete(cb);
};

export const onCallResolved = (cb) => {
    listeners.callResolved.add(cb);
    return () => listeners.callResolved.delete(cb);
};

export const onOrderReady = (cb) => {
    listeners.orderReady.add(cb);
    return () => listeners.orderReady.delete(cb);
};

// Call this after every fetchAll() with the combined count of pending
// waiter calls + unserved Ready orders (the two things the repeat-alert
// should keep ringing for), so it stops correctly even if an event was
// missed or resolved from another device/tab.
export const syncPendingCallCount = (count) => {
    pendingCallCount = count;
    if (count === 0) stopRepeatingAlert();
};