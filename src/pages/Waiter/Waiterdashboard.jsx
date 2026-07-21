import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { IconTruck, IconBell, IconCheck, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import apiClient from "../../utils/api";
import { getSocket, disconnectSocket } from "../../utils/socket";
import "./Waiterdashboard.css";

const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(false);

    const prevReadyIdsRef = useRef(new Set());
    const prevCallIdsRef = useRef(new Set());

    const audioCtxRef = useRef(null);
    const repeatIntervalRef = useRef(null);
    const callsRef = useRef([]); // always-fresh copy for interval closure
    // fetchAll runs inside a setInterval set up once on mount, so it closes
    // over whatever `soundEnabled` was at that time (always false). A ref
    // always reads the latest value regardless of closures — use this
    // instead of the state variable inside fetchAll/playBeep triggers.
    const soundEnabledRef = useRef(false);

    useEffect(() => {
        fetchAll();
        // Socket.io is now the primary real-time channel (see effect below);
        // this poll is just a safety net in case a socket event is missed
        // (reconnect gap, dropped packet, etc.) — slowed down since it's
        // no longer the main notification path.
        const interval = setInterval(fetchAll, 15000);
        return () => {
            clearInterval(interval);
            if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
        };
    }, []);

    // --- Real-time socket events ---------------------------------------

    useEffect(() => {
        const socket = getSocket();
        socket.connect();

        socket.on("connect", () => console.log("🔌 Waiter socket connected"));
        socket.on("connect_error", (err) => console.error("Socket connect error:", err.message));

        socket.on("waiterCalled", (call) => {
            toast(`🔔 Table ${call.tableNumber} is calling you — ${call.waiterCallReason}`, { icon: "🔔" });
            if (soundEnabledRef.current) {
                playBeep();
                startRepeatingAlert();
            }
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification("Table is calling!", {
                    body: `Table ${call.tableNumber} — ${call.waiterCallReason}`,
                });
            }
            fetchAll(); // sync the calls/orders list from the server
        });

        socket.on("callResolved", () => {
            fetchAll();
        });

        return () => {
            socket.off("connect");
            socket.off("connect_error");
            socket.off("waiterCalled");
            socket.off("callResolved");
            disconnectSocket();
        };
    }, []);

    // --- Sound setup -------------------------------------------------

    // Browsers block audio until the user has interacted with the page once.
    // This unlocks (and resumes) the AudioContext on tap.
    const enableSound = () => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtxRef.current.state === "suspended") {
                audioCtxRef.current.resume();
            }
            setSoundEnabled(true);
            soundEnabledRef.current = true;

            // Ask for OS-level notification permission in the same tap —
            // works while the browser is open (even backgrounded), not on
            // a locked screen with the browser fully closed.
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission();
            }

            // tiny confirmation beep so the waiter knows it worked
            playBeep();
        } catch (err) {
            console.error("Could not enable sound:", err);
        }
    };

    // Plays a short double-beep. Pure Web Audio API — no mp3 asset needed.
    const playBeep = () => {
        const ctx = audioCtxRef.current;
        if (!ctx || ctx.state === "suspended") return;

        const beepAt = (startOffset) => {
            // Two stacked oscillators (fundamental + octave) sound louder/punchier
            // than a single sine tone at the same gain, without clipping.
            [880, 1760].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "square"; // square wave is much more attention-grabbing than sine
                osc.frequency.value = freq;
                const peak = idx === 0 ? 0.9 : 0.4; // fundamental louder than the harmonic
                gain.gain.setValueAtTime(0.0001, ctx.currentTime + startOffset);
                gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + startOffset + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + startOffset);
                osc.stop(ctx.currentTime + startOffset + 0.37);
            });
        };
        // Three beeps instead of two — harder to miss
        beepAt(0);
        beepAt(0.4);
        beepAt(0.8);
    };

    // Starts repeating the beep every 6s so a busy waiter notices,
    // stops automatically once there are no pending calls left.
    const startRepeatingAlert = () => {
        if (repeatIntervalRef.current) return; // already running
        repeatIntervalRef.current = setInterval(() => {
            if (callsRef.current.length > 0) {
                playBeep();
            } else {
                clearInterval(repeatIntervalRef.current);
                repeatIntervalRef.current = null;
            }
        }, 6000);
    };

    // --- Data fetching -------------------------------------------------

    const fetchAll = async () => {
        try {
            const [ordersRes, callsRes] = await Promise.all([
                apiClient.get("/waiter/orders"),
                apiClient.get("/waiter/calls"),
            ]);

            const readyOrders = ordersRes.data.data.filter((o) => o.orderStatus === "Ready");
            const newReadyIds = new Set(readyOrders.map((o) => o._id));
            const freshlyReady = readyOrders.filter((o) => !prevReadyIdsRef.current.has(o._id));
            if (prevReadyIdsRef.current.size > 0 && freshlyReady.length > 0) {
                freshlyReady.forEach((o) =>
                    toast.success(`🍽️ Order #${o.orderNumber} is Ready — Table ${o.tableNumber ?? "Counter"}`)
                );
            }
            prevReadyIdsRef.current = newReadyIds;

            // Note: toast + sound for NEW calls are triggered by the
            // "waiterCalled" socket event (see effect above), not here —
            // this poll only keeps `calls`/`orders` state in sync as a
            // fallback. We still track ids so nothing double-fires if a
            // socket event and a poll cycle land close together.
            const newCalls = callsRes.data.data;
            const newCallIds = new Set(newCalls.map((c) => c._id));
            prevCallIdsRef.current = newCallIds;

            callsRef.current = newCalls;
            setOrders(ordersRes.data.data);
            setCalls(newCalls);
        } catch (error) {
            console.error("Waiter fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleServe = async (orderId) => {
        try {
            await apiClient.patch(`/waiter/orders/${orderId}/serve`);
            toast.success("Marked as Served");
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update");
        }
    };

    const handleResolveCall = async (orderId) => {
        try {
            await apiClient.patch(`/waiter/calls/${orderId}/resolve`);
            toast.success("Call resolved");
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to resolve");
        }
    };

    if (loading) return <div className="waiter-loading">Loading waiter dashboard...</div>;

    const readyOrders = orders.filter((o) => o.orderStatus === "Ready");
    const recentlyServed = orders.filter((o) => o.orderStatus === "Served");

    return (
        <div className="waiter-dashboard">
            {/* Sound unlock — browsers need one tap before they allow audio */}
            {!soundEnabled && (
                <button className="sound-unlock-btn" onClick={enableSound}>
                    <IconVolumeOff size={18} /> Enable Call Sound
                </button>
            )}
            {soundEnabled && (
                <div className="sound-status">
                    <IconVolume size={16} /> Call sound is on
                </div>
            )}

            {calls.length > 0 && (
                <div className="waiter-calls-section">
                    <h2><IconBell size={20} /> Table Calling ({calls.length})</h2>
                    <div className="calls-grid">
                        {calls.map((call) => (
                            <div key={call._id} className="call-card">
                                <div className="call-table">Table {call.tableNumber}</div>
                                <div className="call-reason">{call.waiterCallReason}</div>
                                <div className="call-time">
                                    {new Date(call.waiterCallRequestedAt).toLocaleTimeString()}
                                </div>
                                <button className="resolve-btn" onClick={() => handleResolveCall(call._id)}>
                                    <IconCheck size={16} /> Resolved
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h1><IconTruck size={22} /> Ready to Serve ({readyOrders.length})</h1>

            {readyOrders.length === 0 ? (
                <p className="waiter-empty">No orders ready right now</p>
            ) : (
                <div className="waiter-grid">
                    {readyOrders.map((order) => (
                        <div key={order._id} className="waiter-card">
                            <div className="waiter-card-header">
                                <span className="order-number">#{order.orderNumber}</span>
                                <span className="table-tag">
                                    {order.tableNumber ? `Table ${order.tableNumber}` : "Counter"}
                                </span>
                            </div>
                            <ul className="waiter-items">
                                {order.items.map((item, i) => (
                                    <li key={i}>
                                        <span className="qty">x{item.quantity}</span> {item.itemName}
                                    </li>
                                ))}
                            </ul>
                            <button className="serve-btn" onClick={() => handleServe(order._id)}>
                                <IconCheck size={18} /> Mark Served
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {recentlyServed.length > 0 && (
                <>
                    <h2 className="served-heading">Recently Served</h2>
                    <div className="served-list">
                        {recentlyServed.map((o) => (
                            <div key={o._id} className="served-row">
                                <span>#{o.orderNumber}</span>
                                <span>Table {o.tableNumber ?? "Counter"}</span>
                                <span>{new Date(o.servedAt).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default WaiterDashboard;