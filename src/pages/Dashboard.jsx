import React, { useState, useEffect, useContext } from 'react';
import {
    IconShoppingCart,
    IconTrendingUp,
    IconUsers,
    IconClock,
    IconCircleCheck,
    IconCircleX,
    IconChefHat,
    IconCurrencyRupee,
    IconArrowUpRight,
    IconArrowDownRight,
    IconRefresh,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { AuthContext } from '../context/AuthContext';
import { dashboardAPI, ordersAPI, tablesAPI } from '../utils/api';
import LiveActivityTicker from './Liveactivityticker';
import PeakHoursChart from './Peakhourschart';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    // ---- Date range (defaults to today) ----
    const todayStr = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        completedToday: 0,
        cancelledToday: 0,
        totalTables: 0,
        activeTables: 0,
    });

    const [growth, setGrowth] = useState({
        revenue: 0,
        orders: 0,
        completed: 0,
        cancelled: 0,
    });

    const [orders, setOrders] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [tables, setTables] = useState([]);

    useEffect(() => {
        fetchDashboardData();
        fetchChartData();
    }, [startDate, endDate]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const statsResponse = await dashboardAPI.getStats({ startDate, endDate });
            if (statsResponse.data.success) {
                const d = statsResponse.data.data;

                setStats({
                    totalOrders: d.orders?.total ?? 0,
                    totalRevenue: d.revenue?.total ?? 0,
                    todayRevenue: d.revenue?.today ?? 0,
                    pendingOrders: d.orders?.pending ?? 0,
                    completedToday: d.orders?.completedToday ?? 0,
                    cancelledToday: d.orders?.cancelledToday ?? 0,
                    totalTables: d.tables?.total ?? 0,
                    activeTables: d.tables?.active ?? 0,
                });

                setGrowth({
                    revenue: d.revenue?.growth ?? 0,
                    orders: d.orders?.growth ?? 0,
                    completed: d.orders?.completedGrowth ?? 0,
                    cancelled: d.orders?.cancelledGrowth ?? 0,
                });
            }

            const ordersResponse = await ordersAPI.getAll({ limit: 5, sort: '-createdAt' });
            if (ordersResponse.data.success) {
                setOrders(ordersResponse.data.data);
            }

            const tableRes = await tablesAPI.getAll();
            if (tableRes.data.success) {
                setTables(tableRes.data.data);
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

    const successRate = stats.totalOrders > 0
        ? Number(((stats.completedToday / stats.totalOrders) * 100).toFixed(1))
        : 0;

    const GrowthCard = ({ icon: Icon, label, value, iconColor }) => {
        const isPositive = value >= 0;
        return (
            <div className="growth-card">

                <div className="growth-card-text">
                    <p className="growth-label">{label}</p>
                    <span className={`growth-value ${isPositive ? 'up' : 'down'}`}>
                        {isPositive ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
                        {isPositive ? '+' : ''}{value}%
                    </span>
                </div>
                <div className="growth-icon" style={{ color: iconColor, background: `${iconColor}1a` }}>
                    <Icon size={24} />
                </div>
            </div>
        );
    };

    const GradientStatCard = ({ icon: Icon, label, value, subtitle, growthValue, progress, variant }) => {
        const isPositive = growthValue >= 0;
        return (
            <div className={`gradient-stat-card ${variant}`}>
                <div className="gradient-stat-top">
                    <div className="gradient-stat-icon">
                        <Icon size={26} />
                    </div>
                    <span className={`gradient-stat-badge ${isPositive ? 'up' : 'down'}`}>
                        {isPositive ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
                        {isPositive ? '+' : ''}{growthValue}%
                    </span>
                </div>
                <p className="gradient-stat-label">{label}</p>
                <h3 className="gradient-stat-value">{value}</h3>
                <p className="gradient-stat-subtitle">{subtitle}</p>
                <div className="gradient-stat-progress">
                    <div
                        className="gradient-stat-progress-fill"
                        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                    />
                </div>
            </div>
        );
    };

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
                <div className="head-text">
                    <h1>Control Room</h1>
                    <p>Welcome back, {user?.name}!</p>
                </div>

                <div className="header-right">
                    <div className="date-range-picker">
                        <input
                            type="date"
                            value={startDate}
                            max={endDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span style={{color:"var(--text-primary)"}}>-</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
                        <IconRefresh size={17} stroke={2} className={loading ? 'icon-spin' : ''} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>
            <LiveActivityTicker />
            {/* Growth Summary Row */}
            <div className="growth-summary-grid">
                <GrowthCard icon={IconCurrencyRupee} label="Revenue Growth" value={growth.revenue} iconColor="#10b981" />
                <GrowthCard icon={IconShoppingCart} label="Orders Growth" value={growth.orders} iconColor="#3b82f6" />
                <GrowthCard icon={IconCircleCheck} label="Completed Growth" value={growth.completed} iconColor="#7c3aed" />
                <GrowthCard icon={IconCircleX} label="Cancelled Growth" value={growth.cancelled} iconColor="#ef4444" />
            </div>

            {/* Main Gradient Stats */}
            <div className="gradient-stats-grid">
                <GradientStatCard
                    icon={IconCurrencyRupee}
                    label="TOTAL REVENUE"
                    value={`₹${stats.totalRevenue}`}
                    subtitle="Total revenue generated"
                    growthValue={growth.revenue}
                    progress={stats.totalRevenue > 0 ? Math.max(Math.abs(growth.revenue), 60) : 0}
                    variant="green"
                />
                <GradientStatCard
                    icon={IconShoppingCart}
                    label="TOTAL ORDERS"
                    value={stats.totalOrders}
                    subtitle="All orders processed"
                    growthValue={growth.orders}
                    progress={stats.totalOrders > 0 ? Math.max(Math.abs(growth.orders), 60) : 0}
                    variant="blue"
                />
                <GradientStatCard
                    icon={IconCircleCheck}
                    label="COMPLETED ORDERS"
                    value={stats.completedToday}
                    subtitle="Successfully delivered"
                    growthValue={growth.completed}
                    progress={stats.completedToday > 0 ? Math.max(Math.abs(growth.completed), 60) : 0}
                    variant="purple"
                />
                <GradientStatCard
                    icon={IconTrendingUp}
                    label="SUCCESS RATE"
                    value={`${successRate}%`}
                    subtitle="Order completion rate"
                    growthValue={growth.completed}
                    progress={successRate}
                    variant="orange"
                />
            </div>

            {/* Revenue & Orders Chart */}
            <div className="charts-grid">
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
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-card)',
                                        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                                    }}
                                    formatter={(value, name, props) => props.dataKey === 'revenue' ? [`₹${value}`, 'Revenue'] : [value, 'Orders']}
                                />
                                <Legend wrapperStyle={{ fontSize: 13 }} />
                                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={28} />
                                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#ff6b35" strokeWidth={3} dot={{ r: 4, fill: '#ff6b35' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <PeakHoursChart days={30} />
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                    <a href="/orders" className="dashboardaction-btn gradient-stat-card orange">
                        <div className="icon"><IconShoppingCart size={20} /></div>
                        <div className="dashboardaction-btn-text">
                            <span>View Orders</span>
                            <p>Ordes queue & history</p>
                        </div>
                    </a>
                    <a href="/tables" className="dashboardaction-btn gradient-stat-card blue">
                        <div className="icon"><IconChefHat size={20} /></div>
                        <div className="dashboardaction-btn-text">
                            <span>Manage Tables</span>
                            <p>Seating and reservations</p>
                        </div>
                    </a>
                    <a href="/menu" className="dashboardaction-btn gradient-stat-card purple">
                        <div className="icon"><IconTrendingUp size={20} /></div>
                        <div className="dashboardaction-btn-text">
                            <span>Manage Menu</span>
                            <p>Dishes, price, stocks</p>
                        </div>
                    </a>
                    <a href="/reports" className="dashboardaction-btn gradient-stat-card green">
                        <div className="icon"><IconUsers size={20} /></div>
                        <div className="dashboardaction-btn-text">
                            <span>View Reports</span>
                            <p>Sales & staff insights</p>
                        </div>
                    </a>
                </div>
            </div>

            {/* Table floor */}
            <div className="table-map">
                <div className="table-map-header">
                    <h3>Table Floor</h3>
                </div>

                <div className="table-floor">
                    {loading ? (
                        <div className="loading-state">
                            <p>Loading tables...</p>
                        </div>
                    ) : (
                        tables.map((t) => (
                            <div
                                className={`table-status ${t.status?.toLowerCase().replace(' ', '-')}`}
                                key={t._id}
                            >
                                <h2>T{t.tableNumber}</h2>
                                <p>{t.capacity} seats</p>
                                <span className="table-badge">{t.status}</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="table-avl">
                    <div className="table-check">
                        <div className="table-avlstatusColor"></div>
                        <div className="table-statusName">
                            <h4>Available</h4>
                        </div>
                    </div>
                    <div className="table-check">
                        <div className="table-busystatusColor"></div>
                        <div className="table-statusName">
                            <h4>Busy</h4>
                        </div>
                    </div>
                    <div className="table-check">
                        <div className="table-nbstatusColor"></div>
                        <div className="table-statusName">
                            <h4>Needs Bill</h4>
                        </div>
                    </div>
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
                    <div className="dashorders-table">
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
                            <tbody className="dashboard-tbody">
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