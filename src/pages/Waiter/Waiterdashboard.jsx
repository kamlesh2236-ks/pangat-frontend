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
    const [servedHistory, setServedHistory] = useState([]);
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

    // Real served-order history, independent of the active-orders poll above.
    useEffect(() => {
        fetchServedHistory();
        const interval = setInterval(fetchServedHistory, 60000);
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

    const fetchServedHistory = async () => {
        try {
            const res = await apiClient.get("/waiter/served-history?days=3");
            setServedHistory(res.data.data);
        } catch (error) {
            console.error("Served history fetch error:", error);
        }
    };

    const handleServe = async (orderId) => {
        try {
            await apiClient.patch(`/waiter/orders/${orderId}/serve`);
            toast.success("Marked as Served");
            fetchAll();
            fetchServedHistory();
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

    const getServeHistoryStats = () => {
        const groups = {};
        servedHistory.forEach((o) => {
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
    const { todayCount, yesterdayCount, earlier } = getServeHistoryStats();
    const recentlyServed = servedHistory.slice(0, 20);

    return (
        <div className="waiter-dashboard">
            <div className="section-header">
                <h1><IconTruck size={22} /> Ready to Serve ({readyOrders.length})</h1>
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
            </div>

            {/* Serve History Card — now backed by real /waiter/served-history data */}
            <div className="serve-history-card">
                <div className="serve-history-stats">
                    <div className="serve-stat-box today">
                        <span className="stat-count">{todayCount}</span>
                        <span className="stat-label">Today Served</span>
                    </div>
                    <div className="serve-stat-box">
                        <span className="stat-count">{yesterdayCount}</span>
                        <span className="stat-label">Yesterday Served</span>
                    </div>
                    {earlier[0] && (
                        <div className="serve-stat-box">
                            <span className="stat-count">{earlier[0][1]}</span>
                            <span className="stat-label">{formatHistoryLabel(earlier[0][0])}</span>
                        </div>
                    )}
                </div>
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
                    <h2 className="served-heading"><IconHistory size={18} /> Recently Served</h2>
                    <div className="served-list">
                        {recentlyServed.map((o) => (
                            <div key={o._id} className="served-row">
                                <span>#{o.orderNumber}</span>
                                <span>Table {o.tableNumber ?? "Counter"}</span>
                                <span>{new Date(o.servedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
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