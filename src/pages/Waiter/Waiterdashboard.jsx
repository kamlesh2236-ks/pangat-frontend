import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { IconTruck, IconBell, IconCheck, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import apiClient from "../../utils/api";
import {
    connectNotifications,
    onWaiterCalled,
    onCallResolved,
    onOrderReady,
    syncPendingCallCount,
    isSoundEnabled,
    enableSound as enableSoundGlobal,
} from "../../utils/notificationManager";
import "./Waiterdashboard.css";

const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    // Initialized straight from localStorage so the toggle reflects the real
    // state immediately, even on first mount after a page reload.
    const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());

    useEffect(() => {
        fetchAll();
        // Safety-net poll only — socket is the primary real-time channel.
        const interval = setInterval(fetchAll, 15000);
        return () => clearInterval(interval);
    }, []);

    // --- Real-time notifications (persistent singleton, survives navigation) ---

    useEffect(() => {
        // Idempotent: reuses the existing connection if one is already open
        // (e.g. it was opened from another page or an earlier mount).
        connectNotifications();

        const offCalled = onWaiterCalled((call) => {
            toast(`🔔 Table ${call.tableNumber} is calling you — ${call.waiterCallReason}`, { icon: "🔔" });
            fetchAll(); // resync calls/orders list from the server
        });

        const offResolved = onCallResolved(() => {
            fetchAll();
        });

        // Cook marked an order Ready — this is what should actually ring,
        // not new-order creation. Sound + toast both come from the socket
        // event now (not from the polling fallback below).
        const offReady = onOrderReady((order) => {
            toast.success(`🍽️ Order #${order.orderNumber} is Ready — Table ${order.tableNumber ?? "Counter"}`);
            fetchAll();
        });

        // NOTE: intentionally NOT disconnecting the socket here. The
        // connection is owned by the notificationManager singleton, not by
        // this component — so navigating away from this page keeps
        // notifications (sound + toast) flowing in the background. It only
        // unregisters this component's own listener callbacks.
        return () => {
            offCalled();
            offResolved();
            offReady();
        };
    }, []);

    const handleEnableSound = () => {
        enableSoundGlobal();
        setSoundEnabled(true);
    };

    // --- Data fetching -------------------------------------------------

    const fetchAll = async () => {
        try {
            const [ordersRes, callsRes] = await Promise.all([
                apiClient.get("/waiter/orders"),
                apiClient.get("/waiter/calls"),
            ]);

            const readyOrders = ordersRes.data.data.filter((o) => o.orderStatus === "Ready");
            // Note: the "order Ready" toast + sound now come from the
            // "orderReady" socket event (see effect above) — this poll only
            // keeps state in sync as a fallback, no toast fired here to
            // avoid double notifications when socket + poll land close together.

            const newCalls = callsRes.data.data;
            // Repeat-alert should keep ringing for BOTH unresolved calls
            // and unserved Ready orders — combine them for the count.
            syncPendingCallCount(newCalls.length + readyOrders.length);

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
            {/* Sound unlock — browsers need one tap before they allow audio.
                Once enabled it stays on (persisted in localStorage) across
                page navigation and reloads, until explicitly turned off. */}
            {!soundEnabled && (
                <button className="sound-unlock-btn" onClick={handleEnableSound}>
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