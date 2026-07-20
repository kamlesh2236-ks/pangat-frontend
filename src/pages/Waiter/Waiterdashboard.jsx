import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { IconTruck, IconBell, IconCheck } from "@tabler/icons-react";
import apiClient from "../../utils/api";
import "./Waiterdashboard.css";

const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);

    const prevReadyIdsRef = useRef(new Set());
    const prevCallIdsRef = useRef(new Set());

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 4000);
        return () => clearInterval(interval);
    }, []);

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

            const newCalls = callsRes.data.data;
            const newCallIds = new Set(newCalls.map((c) => c._id));
            const freshlyCalled = newCalls.filter((c) => !prevCallIdsRef.current.has(c._id));
            if (prevCallIdsRef.current.size > 0 && freshlyCalled.length > 0) {
                freshlyCalled.forEach((c) =>
                    toast(`🔔 Table ${c.tableNumber} is calling you — ${c.waiterCallReason}`, { icon: "🔔" })
                );
            }
            prevCallIdsRef.current = newCallIds;

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