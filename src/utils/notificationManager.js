import { io } from "socket.io-client";

// ⚠️ Confirm this matches your .env variable name (check apiClient.js for
// whichever VITE_ var it reads). If this logs undefined, that's your bug.
const RAW_API_URL = import.meta.env.VITE_API_URL;
if (!RAW_API_URL) {
    console.error("[notifications] VITE_API_URL is undefined — check .env and restart the dev server.");
}
const SOCKET_URL = (RAW_API_URL || "").replace(/\/api\/?$/, "");

const SOUND_PREF_KEY = "scanserve_sound_enabled";

// Module-level state — NOT React state. This survives component
// unmount/remount and route navigation because it's just JS living in
// memory for as long as the tab is open, not tied to any component's
// lifecycle. It only resets on a full page reload/tab close.
let socket = null;
let audioCtx = null;
let repeatIntervalId = null;
let pendingCallCount = 0;

const listeners = {
    waiterCalled: new Set(),
    callResolved: new Set(),
    orderReady: new Set(),
};

export const isSoundEnabled = () => localStorage.getItem(SOUND_PREF_KEY) === "true";

// Distinct from isSoundEnabled(): that reflects the user's saved preference,
// this reflects whether the AudioContext is actually alive right now. On
// mobile these can disagree — preference stays "true" in localStorage but
// the context itself gets dropped when the tab is backgrounded/reloaded by
// the OS. UI should use this to prompt a re-tap instead of failing silently.
export const isAudioReady = () => !!audioCtx && audioCtx.state === "running";

const ensureAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
};

export const enableSound = () => {
    ensureAudioContext();
    localStorage.setItem(SOUND_PREF_KEY, "true");
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
    }
    console.log("[notifications] sound enabled");
    playBeep(); // confirmation beep
};

export const disableSound = () => {
    localStorage.setItem(SOUND_PREF_KEY, "false");
    stopRepeatingAlert();
    console.log("[notifications] sound disabled");
};

export const playBeep = () => {
    if (!isSoundEnabled()) return;

    if (!audioCtx) {
        console.warn("[notifications] sound is 'on' but no AudioContext exists yet — mobile likely dropped it after backgrounding. Tap 'Enable Sound' again.");
        return;
    }

    if (audioCtx.state === "suspended") {
        // Mobile browsers suspend AudioContext aggressively when the tab is
        // backgrounded/screen-locked. Try to resume it right here instead of
        // just giving up — this recovers most cases where the tab regained
        // focus a moment before the event arrived.
        audioCtx.resume().then(() => {
            if (audioCtx.state === "running") emitBeep(audioCtx);
        }).catch((err) => {
            console.warn("[notifications] could not auto-resume AudioContext:", err.message);
        });
        return;
    }

    emitBeep(audioCtx);
};

const emitBeep = (ctx) => {
    const beepAt = (startOffset) => {
        [880, 1760].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.value = freq;
            const peak = idx === 0 ? 0.9 : 0.4;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + startOffset);
            gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + startOffset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + startOffset);
            osc.stop(ctx.currentTime + startOffset + 0.37);
        });
    };
    beepAt(0);
    beepAt(0.4);
    beepAt(0.8);
};

// Mobile browsers suspend audio/throttle timers when a tab is backgrounded
// (app switched, screen locked) and only resume normal behaviour once it's
// foregrounded again. Proactively try to wake the AudioContext back up the
// instant the waiter returns to the tab, rather than waiting for the next
// beep attempt to discover it's dead.
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().then(() => {
                console.log("[notifications] AudioContext resumed after tab became visible");
            }).catch(() => { });
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
    }, 6000);
};

const stopRepeatingAlert = () => {
    if (repeatIntervalId) {
        clearInterval(repeatIntervalId);
        repeatIntervalId = null;
    }
};

// Idempotent — safe to call from every dashboard's mount. Because socket
// lives at module scope, calling this from Waiter AND Kitchen dashboards
// just reuses the same connection instead of creating duplicates.
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