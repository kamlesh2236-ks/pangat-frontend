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
};

export const isSoundEnabled = () => localStorage.getItem(SOUND_PREF_KEY) === "true";

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
    if (!audioCtx || audioCtx.state === "suspended") {
        console.warn("[notifications] sound is 'on' but AudioContext isn't unlocked — tap Enable Sound once.");
        return;
    }
    const ctx = audioCtx;
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

    // ⚠️ Confirm this is the exact key your login flow stores the JWT under.
    const token = localStorage.getItem("token");
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

// Call this after every fetchAll() with the real /waiter/calls count, so
// the repeat-alert correctly stops even if a call was resolved from
// another device/tab while this one was muted or missed the event.
export const syncPendingCallCount = (count) => {
    pendingCallCount = count;
    if (count === 0) stopRepeatingAlert();
};