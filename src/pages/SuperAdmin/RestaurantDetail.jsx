import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../utils/api';
import './SuperAdmin.css';

const RestaurantDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [orders, setOrders] = useState([]);
    const [activity, setActivity] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);

    useEffect(() => {
        fetchOverview();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'orders') fetchOrders();
        if (activeTab === 'activity') fetchActivity();
    }, [activeTab]);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const res = await superAdminAPI.getRestaurantOverview(id);
            setOverview(res.data.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load restaurant data');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        setTabLoading(true);
        try {
            const res = await superAdminAPI.getRestaurantOrders(id, { limit: 50 });
            setOrders(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load orders');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchActivity = async () => {
        setTabLoading(true);
        try {
            const res = await superAdminAPI.getRestaurantActivity(id, { limit: 50 });
            setActivity(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load activity');
        } finally {
            setTabLoading(false);
        }
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

    const formatDate = (date) =>
        date ? new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

    if (loading) {
        return (
            <div className="sa-container">
                <div className="sa-loading">Loading restaurant...</div>
            </div>
        );
    }

    if (!overview) {
        return (
            <div className="sa-container">
                <div className="sa-empty">Restaurant not found</div>
            </div>
        );
    }

    const { restaurant, totalOrders, totalRevenue, activeStaff, statusBreakdown, recentOrders } = overview;

    return (
        <div className="sa-container">
            <div className="sa-header">
                <div>
                    <button className="sa-back-btn" onClick={() => navigate('/super-admin/dashboard')}>← Back to all restaurants</button>
                    <h1>{restaurant.name}</h1>
                    <p>{restaurant.email} • {restaurant.city}, {restaurant.state}</p>
                </div>
                <span className={`sa-status-badge ${restaurant.isActive ? 'sa-active' : 'sa-inactive'}`}>
                    {restaurant.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="sa-stats-grid">
                <div className="sa-stat-card">
                    <span className="sa-stat-label">Total Orders</span>
                    <span className="sa-stat-value">{totalOrders}</span>
                </div>
                <div className="sa-stat-card sa-highlight">
                    <span className="sa-stat-label">Total Revenue</span>
                    <span className="sa-stat-value">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="sa-stat-card">
                    <span className="sa-stat-label">Active Staff</span>
                    <span className="sa-stat-value">{activeStaff}</span>
                </div>
                <div className="sa-stat-card">
                    <span className="sa-stat-label">Plan</span>
                    <span className="sa-stat-value sa-plan-text">{restaurant.subscriptionPlan}</span>
                </div>
            </div>

            {statusBreakdown && (
                <div className="sa-status-breakdown">
                    {Object.entries(statusBreakdown).map(([status, count]) => (
                        <div key={status} className="sa-status-chip">
                            <span>{status}</span>
                            <strong>{count}</strong>
                        </div>
                    ))}
                </div>
            )}

            <div className="sa-tabs">
                <button className={activeTab === 'overview' ? 'sa-tab-active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={activeTab === 'orders' ? 'sa-tab-active' : ''} onClick={() => setActiveTab('orders')}>All Orders</button>
                <button className={activeTab === 'activity' ? 'sa-tab-active' : ''} onClick={() => setActiveTab('activity')}>Activity</button>
            </div>

            {activeTab === 'overview' && (
                <div className="sa-table-wrapper">
                    <h3 className="sa-section-title">Recent Orders</h3>
                    <table className="sa-table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders?.map((o) => (
                                <tr key={o._id}>
                                    <td>{o.orderNumber}</td>
                                    <td>{o.customerName}</td>
                                    <td>{formatCurrency(o.totalAmount)}</td>
                                    <td><span className="sa-plan-badge">{o.orderStatus}</span></td>
                                    <td>{o.paymentStatus}</td>
                                    <td>{formatDate(o.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="sa-table-wrapper">
                    {tabLoading ? (
                        <div className="sa-loading">Loading orders...</div>
                    ) : (
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                    <th>Source</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr><td colSpan="7" className="sa-empty">No orders found</td></tr>
                                ) : (
                                    orders.map((o) => (
                                        <tr key={o._id}>
                                            <td>{o.orderNumber}</td>
                                            <td>{o.customerName}</td>
                                            <td>{formatCurrency(o.totalAmount)}</td>
                                            <td><span className="sa-plan-badge">{o.orderStatus}</span></td>
                                            <td>{o.paymentStatus}</td>
                                            <td>{o.source}</td>
                                            <td>{formatDate(o.createdAt)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="sa-table-wrapper">
                    {tabLoading ? (
                        <div className="sa-loading">Loading activity...</div>
                    ) : (
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Title</th>
                                    <th>Detail</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activity.length === 0 ? (
                                    <tr><td colSpan="6" className="sa-empty">No activity found</td></tr>
                                ) : (
                                    activity.map((a) => (
                                        <tr key={a.id}>
                                            <td><span className="sa-plan-badge">{a.category}</span></td>
                                            <td>{a.title}</td>
                                            <td>{a.subtitle}</td>
                                            <td>{formatCurrency(a.amount)}</td>
                                            <td>{a.status}</td>
                                            <td>{formatDate(a.date)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default RestaurantDetail;