import { io } from "socket.io-client";

// Reuses the same base URL your apiClient already points to, minus the /api suffix.
// ⚠️ If this stays undefined, check your .env — confirm the exact variable
// name your apiClient.js uses (VITE_API_URL vs something else) and match it here.
const RAW_API_URL = import.meta.env.VITE_API_URL;

if (!RAW_API_URL) {
    console.error(
        "socket.js: VITE_API_URL is undefined. Check your .env file and restart the dev server " +
        "(Vite only reads .env at startup, not on hot-reload)."
    );
}

const SOCKET_URL = (RAW_API_URL || "").replace(/\/api\/?$/, "");

let socket = null;

export const getSocket = () => {
    if (!socket) {
        // ⚠️ CHECK THIS: use whatever localStorage/sessionStorage key your
        // login flow actually stores the JWT under (apiClient's request
        // interceptor reads it from somewhere — match that key here).
        const token = localStorage.getItem("token");

        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ["websocket"],
            auth: { token },
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};