import React, { useState, useEffect, useContext } from 'react';
import {
    IconShoppingCart,
    IconTrendingUp,
    IconUsers,
    IconClock,
    IconCheck,
    IconAlertCircle,
    IconChefHat,
    IconToolsKitchen2,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import {
    ResponsiveContainer,
    ComposedChart,
    AreaChart,
    Area,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { AuthContext } from '../context/AuthContext';
import { dashboardAPI, ordersAPI } from '../utils/api';
import { IconRefresh } from '@tabler/icons-react';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        completedToday: 0,
        totalTables: 0,
        activeTables: 0,
    });
    const [orders, setOrders] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        fetchChartData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch stats
            const statsResponse = await dashboardAPI.getStats();
            if (statsResponse.data.success) {
                const d = statsResponse.data.data;
                // Backend returns a nested shape: { orders: {...}, revenue: {...}, tables: {...}, menu: {...} }
                setStats({
                    totalOrders: d.orders?.total ?? 0,
                    totalRevenue: d.revenue?.total ?? 0,
                    todayRevenue: d.revenue?.today ?? 0,
                    pendingOrders: d.orders?.pending ?? 0,
                    completedToday: d.orders?.completedToday ?? 0,
                    totalTables: d.tables?.total ?? 0,
                    activeTables: d.tables?.active ?? 0,
                });
            }

            // Fetch recent orders
            const ordersResponse = await ordersAPI.getAll({ limit: 5, sort: '-createdAt' });
            if (ordersResponse.data.success) {
                setOrders(ordersResponse.data.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fetchChartData = async () => {
        try {
            setChartLoading(true);
            const res = await dashboardAPI.getWeeklyStats();
            if (res.data.success) {
                const daily = res.data.data.daily || {};
                const formatted = Object.entries(daily).map(([date, val]) => ({
                    date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                    orders: val.orders,
                    revenue: val.revenue,
                }));
                setChartData(formatted);
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
        } finally {
            setChartLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchDashboardData();
        fetchChartData();
    };

    const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
        <div className={`stat-card ${color}`}>
            <div className="stat-icon">
                <Icon size={28} />
            </div>
            <div className="stat-content">
                <p className="stat-title">{title}</p>
                <h3 className="stat-value">{value}</h3>
                {subtitle && <p className="stat-subtitle">{subtitle}</p>}
            </div>
        </div>
    );

    const OrderRow = ({ order }) => (
        <tr className={`order-row status-${order.orderStatus?.toLowerCase()}`}>
            <td className="order-number">#{order.orderNumber}</td>
            <td className="table-number">Table {order.tableNumber}</td>
            <td className="customer-name">{order.customerName}</td>
            <td className="order-amount">₹{order.totalAmount}</td>
            <td className="order-payment">
                <span className={`badge payment-${order.paymentStatus?.toLowerCase()}`}>
                    {order.paymentStatus}
                </span>
            </td>
            <td className="order-status">
                <span className={`badge status-${order.orderStatus?.toLowerCase()}`}>
                    {order.orderStatus}
                </span>
            </td>
            <td className="order-time">
                {new Date(order.placedAt).toLocaleTimeString()}
            </td>
        </tr>
    );

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className='head-text'>
                    <h1>Dashboard</h1>
                    <p>Welcome back, {user?.name}!</p>
                </div>
                <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
                    <IconRefresh size={17} stroke={2} /> {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    icon={IconShoppingCart}
                    title="Total Orders"
                    value={stats.totalOrders}
                    subtitle="All time"
                    color="orange"
                />
                <StatCard
                    icon={IconTrendingUp}
                    title="Today Revenue"
                    value={`₹${stats.todayRevenue}`}
                    subtitle={`₹${stats.totalRevenue} all time`}
                    color="green"
                />
                <StatCard
                    icon={IconAlertCircle}
                    title="Pending Orders"
                    value={stats.pendingOrders}
                    subtitle="Waiting preparation"
                    color="red"
                />
                <StatCard
                    icon={IconCheck}
                    title="Completed Today"
                    value={stats.completedToday}
                    subtitle="Successfully served"
                    color="blue"
                />
                <StatCard
                    icon={IconToolsKitchen2}
                    title="Total Tables"
                    value={stats.totalTables}
                    subtitle={`${stats.activeTables} currently occupied`}
                    color="purple"
                />
            </div>

            {/* Revenue & Orders Chart */}
            <div className="chart-section">
                <div className="chart-section-header">
                    <h2>Weekly Performance</h2>
                    <span className="chart-subtitle">Orders & Revenue — last 7 days</span>
                </div>

                {chartLoading ? (
                    <div className="loading-state">
                        <p>Loading chart...</p>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="empty-state">
                        <IconTrendingUp size={40} />
                        <p>No data yet</p>
                        <span>Chart will populate once orders come in</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                                formatter={(value, name, props) => props.dataKey === 'revenue' ? [`₹${value}`, 'Revenue'] : [value, 'Orders']}
                            />
                            <Legend wrapperStyle={{ fontSize: 13 }} />
                            <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={28} />
                            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#ff6b35" strokeWidth={3} dot={{ r: 4, fill: '#ff6b35' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Payment / Revenue Trend Chart */}
            <div className="chart-section">
                <div className="chart-section-header">
                    <h2>Payment Trend</h2>
                    <span className="chart-subtitle">Daily income — peaks show high payment days</span>
                </div>

                {chartLoading ? (
                    <div className="loading-state">
                        <p>Loading chart...</p>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="empty-state">
                        <IconTrendingUp size={40} />
                        <p>No payment data yet</p>
                        <span>Chart will populate once payments come in</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="paymentGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                                formatter={(value) => [`₹${value}`, 'Payment']}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                name="Payment"
                                stroke="#10b981"
                                strokeWidth={3}
                                fill="url(#paymentGradient)"
                                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                    <a href="/orders" className="action-btn">
                        <IconShoppingCart size={20} />
                        <span>View Orders</span>
                    </a>
                    <a href="/tables" className="action-btn">
                        <IconChefHat size={20} />
                        <span>Manage Tables</span>
                    </a>
                    <a href="/menu" className="action-btn">
                        <IconTrendingUp size={20} />
                        <span>Manage Menu</span>
                    </a>
                    <a href="/reports" className="action-btn">
                        <IconUsers size={20} />
                        <span>View Reports</span>
                    </a>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="recent-orders">
                <div className="chart-section-header">
                    <h2>Recent Orders</h2>
                    <a href="/orders" className="view-all">View All →</a>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <p>Loading orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="empty-state">
                        <IconShoppingCart size={48} />
                        <p>No orders yet</p>
                        <span>Orders will appear here once customers place them</span>
                    </div>
                ) : (
                    <div className="orders-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Table</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Payment</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody className='dashboard-tbody'>
                                {orders.map((order) => (
                                    <OrderRow key={order._id} order={order} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Boxes */}
            <div className="info-boxes">
                <div className="info-box">
                    <IconClock size={24} />
                    <div>
                        <h3>Peak Hours</h3>
                        <p>12:00 PM - 2:00 PM, 7:00 PM - 9:00 PM</p>
                    </div>
                </div>

                <div className="info-box">
                    <IconChefHat size={24} />
                    <div>
                        <h3>Active Orders</h3>
                        <p>{stats.pendingOrders} orders being prepared</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;