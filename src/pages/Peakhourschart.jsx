import React, { useState, useEffect, useCallback } from 'react';
import { IconFlame, IconRefresh, IconTrendingUp, IconMoonStars } from '@tabler/icons-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { peakHoursAPI } from '../utils/api';
import './Peakhourschart.css';

const PERIODS = [
    { label: 'Today', days: 1 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
];

// "11a", "12p", "1p" — short axis labels
const formatHourShort = (h) => {
    const period = h >= 12 ? 'p' : 'a';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${period}`;
};

// Nice round Y-axis max (multiple of 8), so ticks land on 0/8/16/24/32
const niceMax = (max) => Math.max(Math.ceil((max || 1) / 8) * 8, 8);

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="peak-tooltip">
            <p className="peak-tooltip-time">{d.label}</p>
            <p className="peak-tooltip-orders">{d.orders} order{d.orders !== 1 ? 's' : ''}</p>
            {d.revenue > 0 && <p className="peak-tooltip-revenue">₹{d.revenue.toLocaleString()}</p>}
        </div>
    );
};

const ChartSkeleton = () => (
    <div className="peak-hours-skeleton">
        {Array.from({ length: 24 }).map((_, i) => (
            <div
                key={i}
                className="peak-skeleton-bar"
                style={{
                    height: `${18 + Math.abs(Math.sin(i / 2)) * 65}%`,
                    animationDelay: `${i * 30}ms`,
                }}
            />
        ))}
    </div>
);

const PeakHoursChart = ({ days: initialDays = 1 }) => {
    const [days, setDays] = useState(initialDays);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPeakHours = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            const res = await peakHoursAPI.get(days);
            if (res.data.success) setData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch peak hours:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [days]);

    useEffect(() => {
        fetchPeakHours();
    }, [fetchPeakHours]);

    const periodLabel = PERIODS.find((p) => p.days === days)?.label || `${days} Days`;

    return (
        <div className="peak-hours-card">
            <div className="peak-hours-header">
                <div>
                    <h2>Peak hours</h2>
                    <span className="peak-hours-subtitle">Orders per hour · {periodLabel.toLowerCase()}</span>
                </div>

                <div className="peak-hours-controls">
                    {data?.rushLabel && (
                        <span className="peak-rush-badge">
                            <IconFlame size={13} />
                            {data.rushLabel}
                        </span>
                    )}
                    <button
                        className="peak-refresh-btn"
                        onClick={() => fetchPeakHours(true)}
                        disabled={loading || refreshing}
                        aria-label="Refresh"
                    >
                        <IconRefresh size={15} className={refreshing ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            <div className="peak-period-toggle">
                {PERIODS.map((p) => (
                    <button
                        key={p.days}
                        className={`peak-period-btn ${days === p.days ? 'active' : ''}`}
                        onClick={() => setDays(p.days)}
                        disabled={loading}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <ChartSkeleton />
            ) : !data || data.totalOrders === 0 ? (
                <div className="peak-hours-empty">No order data yet for this period</div>
            ) : (
                <>
                    <div className="peak-stats-row">
                        <div className="peak-stat-chip">
                            <IconTrendingUp size={14} className="peak-stat-icon busiest" />
                            <div>
                                <span className="peak-stat-label">Busiest</span>
                                <span className="peak-stat-value">
                                    {data.busiestHour ? data.busiestHour.label : '—'}
                                </span>
                            </div>
                        </div>
                        <div className="peak-stat-chip">
                            <IconMoonStars size={14} className="peak-stat-icon quietest" />
                            <div>
                                <span className="peak-stat-label">Quietest (open)</span>
                                <span className="peak-stat-value">
                                    {data.quietestOpenHour ? data.quietestOpenHour.label : '—'}
                                </span>
                            </div>
                        </div>
                        <div className="peak-stat-chip">
                            <div>
                                <span className="peak-stat-label">Total orders</span>
                                <span className="peak-stat-value">{data.totalOrders}</span>
                            </div>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                            data={data.hourly}
                            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                            barCategoryGap="28%"
                        >
                            <CartesianGrid strokeDasharray="3 5" stroke="rgba(68, 65, 65, 0.12)" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                tickFormatter={formatHourShort}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                            />
                            <YAxis
                                domain={[0, niceMax(data.maxOrders)]}
                                ticks={[0, niceMax(data.maxOrders) / 4, niceMax(data.maxOrders) / 2, (niceMax(data.maxOrders) * 3) / 4, niceMax(data.maxOrders)]}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                                width={30}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                            <Bar
                                dataKey="orders"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={34}
                                isAnimationActive
                                animationDuration={700}
                                animationEasing="ease-out"
                            >
                                {data.hourly.map((h) => (
                                    <Cell
                                        key={h.hour}
                                        fill={
                                            h.orders >= data.maxOrders * 0.65 && h.orders > 0
                                                ? '#ff7a30'
                                                : '#6d5a94'
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="peak-legend">
                        <span className="peak-legend-item">
                            <span className="peak-legend-dot peak" /> Peak hour
                        </span>
                        <span className="peak-legend-item">
                            <span className="peak-legend-dot normal" /> Normal
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

export default PeakHoursChart;