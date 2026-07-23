import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { IconClock, IconChefHat, IconCheck, IconFlame, IconHistory } from "@tabler/icons-react";
import apiClient from "../../utils/api";
import "./Kitchendashboard.css";

// Kitchen ka apna transition button — status ke hisaab se next action decide karta hai
const NEXT_ACTION = {
    Placed: { label: "Accept Order", next: "Confirmed", icon: <IconCheck size={18} /> },
    Confirmed: { label: "Start Preparing", next: "Preparing", icon: <IconChefHat size={18} /> },
    Preparing: { label: "Mark Ready", next: "Ready", icon: <IconCheck size={18} /> },
};

const KitchenDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [readyHistory, setReadyHistory] = useState([]);
    const prevOrderIdsRef = useRef(new Set());

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 4000); // 4s poll — kitchen ke liye kaafi tez
        return () => clearInterval(interval);
    }, []);

    // Real, server-wide 3-day "Ready" history — independent of device/browser
    useEffect(() => {
        fetchReadyHistory();
        const interval = setInterval(fetchReadyHistory, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await apiClient.get("/kitchen/orders");
            const newOrders = res.data.data;

            // Naya order aaya to sound/toast alert
            const newIds = new Set(newOrders.map((o) => o._id));
            const prevIds = prevOrderIdsRef.current;
            const freshlyArrived = newOrders.filter(
                (o) => o.orderStatus === "Placed" && !prevIds.has(o._id)
            );
            if (prevIds.size > 0 && freshlyArrived.length > 0) {
                freshlyArrived.forEach((o) =>
                    toast.success(`New order #${o.orderNumber} — Table ${o.tableNumber ?? "Counter"}`)
                );
            }
            prevOrderIdsRef.current = newIds;

            setOrders(newOrders);
        } catch (error) {
            console.error("Kitchen fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadyHistory = async () => {
        try {
            const res = await apiClient.get("/kitchen/ready-history?days=3");
            setReadyHistory(res.data.data);
        } catch (error) {
            console.error("Ready history fetch error:", error);
        }
    };

    const handleAdvance = async (order) => {
        const action = NEXT_ACTION[order.orderStatus];
        if (!action) return;

        try {
            await apiClient.patch(`/kitchen/orders/${order._id}/status`, {
                status: action.next,
            });
            toast.success(`Order #${order.orderNumber} → ${action.next}`);

            // Order kitchen se Ready ho gaya — history ko turant refresh kar do
            if (action.next === "Ready") {
                fetchReadyHistory();
            }

            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.message || "Status update failed");
        }
    };

    // --- Derive Today / Yesterday / Day-before-yesterday counts --------
    const getHistorySummary = () => {
        const groups = {};
        readyHistory.forEach((o) => {
            const key = new Date(o.readyAt).toDateString();
            groups[key] = (groups[key] || 0) + 1;
        });

        const todayKey = new Date().toDateString();
        const yesterdayKey = new Date(Date.now() - 86400000).toDateString();
        const dayBeforeKey = new Date(Date.now() - 2 * 86400000).toDateString();

        return {
            today: groups[todayKey] || 0,
            yesterday: groups[yesterdayKey] || 0,
            dayBefore: groups[dayBeforeKey] || 0,
            dayBeforeLabel: new Date(dayBeforeKey).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
            }),
        };
    };

    if (loading) return <div className="kitchen-loading">Loading kitchen queue...</div>;

    const { today, yesterday, dayBefore, dayBeforeLabel } = getHistorySummary();

    return (
        <div className="kitchen-dashboard">
            <div className="section-header">
                <h1><IconChefHat size={22} /> Kitchen Queue</h1>
            </div>

            {/* 3-day Ready History Card — now backed by real /kitchen/ready-history data */}
            <div className="kitchen-history-card">
                <div className="kitchen-history-stats">
                    <div className="kitchen-stat-box today">
                        <span className="stat-count">{today}</span>
                        <span className="stat-label">Today</span>
                    </div>
                    <div className="kitchen-stat-box">
                        <span className="stat-count">{yesterday}</span>
                        <span className="stat-label">Yesterday</span>
                    </div>
                    <div className="kitchen-stat-box">
                        <span className="stat-count">{dayBefore}</span>
                        <span className="stat-label">{dayBeforeLabel}</span>
                    </div>
                </div>
            </div>

            {
                orders.length === 0 ? (
                    <p className="kitchen-empty">No pending orders</p>
                ) : (
                    <div className="kitchen-grid">
                        {orders.map((order) => {
                            const action = NEXT_ACTION[order.orderStatus];
                            return (
                                <div key={order._id} className={`kitchen-card status-${order.orderStatus.toLowerCase()}`}>
                                    <div className="kitchen-card-header">
                                        <span className="order-number">#{order.orderNumber}</span>
                                        <span className="table-tag">
                                            {order.tableNumber ? `Table ${order.tableNumber}` : "Counter"}
                                        </span>
                                    </div>

                                    <div className="kitchen-card-status">
                                        <IconClock size={16} />
                                        <span>{order.orderStatus}</span>
                                    </div>

                                    <ul className="kitchen-items">
                                        {order.items.map((item, i) => (
                                            <li key={i}>
                                                <span className="qty">x{item.quantity}</span> {item.itemName}
                                                {item.specialInstructions && (
                                                    <div className="special-note">Note: {item.specialInstructions}</div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>

                                    {order.cookingInstructions && (
                                        <div className="cooking-note">📝 {order.cookingInstructions}</div>
                                    )}

                                    {action && (
                                        <button className="kitchen-action-btn" onClick={() => handleAdvance(order)}>
                                            {action.icon}
                                            {action.label}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {readyHistory.length > 0 && (
                <>
                    <h2 className="ready-heading"><IconHistory size={18} /> Recently Marked Ready</h2>
                    <div className="ready-list">
                        {readyHistory.slice(0, 20).map((o) => (
                            <div key={o._id} className="ready-row">
                                <span>#{o.orderNumber}</span>
                                <span>Table {o.tableNumber ?? "Counter"}</span>
                                <span>{new Date(o.readyAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                <span>{new Date(o.readyAt).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div >
    );
};

export default KitchenDashboard;