import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { IconTruck, IconBell, IconCheck, IconVolume, IconVolumeOff, IconHistory } from "@tabler/icons-react";
import apiClient from "../../utils/api";
import { subscribeToPush } from "../../utils/pushSubscribe";
import {
    connectNotifications,
    onWaiterCalled,
    onCallResolved,
    onOrderReady,
    syncPendingCallCount,
    isSoundEnabled,
    isAudioReady,
    enableSound as enableSoundGlobal,
} from "../../utils/notificationManager";
import "./Waiterdashboard.css";

const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());
    const [audioLive, setAudioLive] = useState(isAudioReady());

    useEffect(() => {
        const recheck = () => setAudioLive(isAudioReady());
        document.addEventListener("visibilitychange", recheck);
        const poll = setInterval(recheck, 5000);
        return () => {
            document.removeEventListener("visibilitychange", recheck);
            clearInterval(poll);
        };
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        connectNotifications();

        const offCalled = onWaiterCalled((call) => {
            toast(`🔔 Table ${call.tableNumber} is calling you — ${call.waiterCallReason}`, { icon: "🔔" });
            fetchAll();
        });

        const offResolved = onCallResolved(() => {
            fetchAll();
        });

        const offReady = onOrderReady((order) => {
            toast.success(`🍽️ Order #${order.orderNumber} is Ready — Table ${order.tableNumber ?? "Counter"}`);
            fetchAll();
        });

        return () => {
            offCalled();
            offResolved();
            offReady();
        };
    }, []);

    const handleEnableSound = () => {
        enableSoundGlobal();
        setSoundEnabled(true);
        setAudioLive(true);
        subscribeToPush("/waiter/push-subscribe");
    };

    const fetchAll = async () => {
        try {
            const [ordersRes, callsRes] = await Promise.all([
                apiClient.get("/waiter/orders"),
                apiClient.get("/waiter/calls"),
            ]);

            const readyOrders = ordersRes.data.data.filter((o) => o.orderStatus === "Ready");
            const newCalls = callsRes.data.data;
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

    // --- Serve History (Today / Yesterday / Earlier) -------------------
    // Built from whatever "Served" orders are currently loaded in state.
    // Note: this only reflects orders the /waiter/orders endpoint returns
    // (usually recent ones) — for a full multi-day history the backend
    // would ideally expose a dedicated stats endpoint, but this gives an
    // accurate breakdown of everything currently in memory.
    const getServeHistory = () => {
        const servedOrders = orders.filter((o) => o.orderStatus === "Served" && o.servedAt);

        const groups = {};
        servedOrders.forEach((o) => {
            const key = new Date(o.servedAt).toDateString();
            groups[key] = (groups[key] || 0) + 1;
        });

        const todayKey = new Date().toDateString();
        const yesterdayKey = new Date(Date.now() - 86400000).toDateString();

        const todayCount = groups[todayKey] || 0;
        const yesterdayCount = groups[yesterdayKey] || 0;

        const earlier = Object.entries(groups)
            .filter(([key]) => key !== todayKey && key !== yesterdayKey)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]));

        return { todayCount, yesterdayCount, earlier };
    };

    const formatHistoryLabel = (dateStr) =>
        new Date(dateStr).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });

    if (loading) return <div className="waiter-loading">Loading waiter dashboard...</div>;

    const readyOrders = orders.filter((o) => o.orderStatus === "Ready");
    const recentlyServed = orders.filter((o) => o.orderStatus === "Served");
    const { todayCount, yesterdayCount, earlier } = getServeHistory();

    return (
        <div className="waiter-dashboard">
            {!soundEnabled && (
                <button className="sound-unlock-btn sound-unlock-btn--off" onClick={handleEnableSound}>
                    <IconVolumeOff size={18} /> <span>Enable Call Sound</span>
                </button>
            )}
            {soundEnabled && !audioLive && (
                <button className="sound-unlock-btn sound-unlock-btn--paused" onClick={handleEnableSound}>
                    <IconVolumeOff size={18} /> <span>Sound paused — tap to resume</span>
                </button>
            )}
            {soundEnabled && audioLive && (
                <div className="sound-status">
                    <IconVolume size={16} /> <span>Call sound is on</span>
                </div>
            )}

            {/* Serve History Card */}
            <div className="serve-history-card">
                <div className="serve-history-header">
                    <IconHistory size={20} /> Serve History
                </div>

                <div className="serve-history-stats">
                    <div className="serve-stat-box today">
                        <span className="stat-count">{todayCount}</span>
                        <span className="stat-label">Today</span>
                    </div>
                    <div className="serve-stat-box">
                        <span className="stat-count">{yesterdayCount}</span>
                        <span className="stat-label">Yesterday</span>
                    </div>
                </div>

                {earlier.length > 0 ? (
                    <div className="serve-history-list">
                        {earlier.map(([dateKey, count]) => (
                            <div key={dateKey} className="serve-history-row">
                                <span>{formatHistoryLabel(dateKey)}</span>
                                <span className="day-count">{count} served</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="serve-history-empty">No earlier records loaded yet</div>
                )}
            </div>

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