import React, { useState, useEffect, useCallback } from 'react';
import { IconFlame } from '@tabler/icons-react';
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

// "11a", "12p", "1p" — matches the reference design's short axis labels
const formatHourShort = (h) => {
    const period = h >= 12 ? 'p' : 'a';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${period}`;
};

// Nice round Y-axis max (multiple of 8), so ticks land on 0/8/16/24/32 like the reference
const niceMax = (max) => Math.max(Math.ceil((max || 1) / 8) * 8, 8);

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="peak-tooltip">
            <p className="peak-tooltip-time">{d.label}</p>
            <p className="peak-tooltip-orders">{d.orders} order{d.orders !== 1 ? 's' : ''}</p>
        </div>
    );
};

const PeakHoursChart = ({ days = 1 }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchPeakHours = useCallback(async () => {
        try {
            setLoading(true);
            const res = await peakHoursAPI.get(days);
            if (res.data.success) setData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch peak hours:', err);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchPeakHours();
    }, [fetchPeakHours]);

    if (loading) {
        return (
            <div className="peak-hours-card">
                <div className="loading-state"><p>Loading peak hours...</p></div>
            </div>
        );
    }

    if (!data || data.totalOrders === 0) {
        return (
            <div className="peak-hours-card">
                <div className="peak-hours-header">
                    <div>
                        <h2>Peak hours</h2>
                        <span className="peak-hours-subtitle">Orders per hour today</span>
                    </div>
                </div>
                <div className="peak-hours-empty">No order data yet</div>
            </div>
        );
    }

    const { hourly, maxOrders, rushLabel } = data;
    const threshold = maxOrders * 0.65;
    const yMax = niceMax(maxOrders);
    const ticks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax];

    return (
        <div className="peak-hours-card">
            <div className="peak-hours-header">
                <div>
                    <h2>Peak hours</h2>
                    <span className="peak-hours-subtitle">Orders per hour today</span>
                </div>
                {rushLabel && (
                    <span className="peak-rush-badge">
                        <IconFlame size={13} />
                        {rushLabel}
                    </span>
                )}
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 5" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        tickFormatter={formatHourShort}
                        tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                    />
                    <YAxis
                        domain={[0, yMax]}
                        ticks={ticks}
                        tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="orders" radius={[4, 4, 0, 0]} maxBarSize={34}>
                        {hourly.map((h) => (
                            <Cell key={h.hour} fill={h.orders >= threshold && h.orders > 0 ? '#ff7a30' : '#6d5a94'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PeakHoursChart;