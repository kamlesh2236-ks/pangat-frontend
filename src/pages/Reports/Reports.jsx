import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    IconReportAnalytics,
    IconCurrencyRupee,
    IconShoppingCart,
    IconReceipt,
    IconBan,
    IconDownload,
    IconTrophy,
    IconCreditCard,
    IconQrcode,
    IconCategory,
    IconBuildingWarehouse,
    IconUsers,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { reportsAPI, inventoryAPI, staffAPI } from '../../utils/api';
import './Reports.css';

const PRESETS = [
    { key: 'today', label: 'Today' },
    { key: '7days', label: 'Last 7 Days' },
    { key: '30days', label: 'Last 30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'custom', label: 'Custom' },
];

const toDateStr = (d) => d.toISOString().substring(0, 10);

const getPresetRange = (preset) => {
    const today = new Date();
    const end = new Date(today);
    let start = new Date(today);

    switch (preset) {
        case 'today':
            break;
        case '7days':
            start.setDate(start.getDate() - 6);
            break;
        case '30days':
            start.setDate(start.getDate() - 29);
            break;
        case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'lastMonth': {
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            return { start: toDateStr(start), end: toDateStr(lastMonthEnd) };
        }
        default:
            break;
    }
    return { start: toDateStr(start), end: toDateStr(end) };
};

const currentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const Reports = () => {
    const [preset, setPreset] = useState('30days');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [report, setReport] = useState(null);
    const [inventoryStats, setInventoryStats] = useState(null);
    const [staffPayroll, setStaffPayroll] = useState(null);
    const [loading, setLoading] = useState(true);

    const activeRange = useMemo(() => {
        if (preset === 'custom') {
            return { start: customStart, end: customEnd };
        }
        return getPresetRange(preset);
    }, [preset, customStart, customEnd]);

    const fetchReport = useCallback(async () => {
        if (preset === 'custom' && (!customStart || !customEnd)) return;

        try {
            setLoading(true);
            const [reportRes, invRes, payrollRes] = await Promise.all([
                reportsAPI.getFull(activeRange.start, activeRange.end),
                inventoryAPI.getStats(),
                staffAPI.getPayrollSummary(currentMonthStr()),
            ]);
            if (reportRes.data.success) setReport(reportRes.data.data);
            if (invRes.data.success) setInventoryStats(invRes.data.data);
            if (payrollRes.data.success) setStaffPayroll(payrollRes.data.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRange.start, activeRange.end]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const downloadCSV = () => {
        if (!report) return;

        let csv = 'Sales Report\n';
        csv += `Date Range,${activeRange.start} to ${activeRange.end}\n\n`;
        csv += 'OVERVIEW\n';
        csv += `Total Revenue,Rs ${report.overview.totalRevenue}\n`;
        csv += `Total Orders,${report.overview.totalOrders}\n`;
        csv += `Avg Order Value,Rs ${report.overview.avgOrderValue}\n`;
        csv += `Cancelled Orders,${report.overview.cancelledOrders}\n\n`;

        csv += 'DAILY TREND\nDate,Revenue,Orders\n';
        report.dailyTrend.forEach((d) => {
            csv += `${d.date},${d.revenue},${d.orders}\n`;
        });

        csv += '\nTOP SELLING ITEMS\nItem,Quantity,Revenue\n';
        report.topItems.forEach((i) => {
            csv += `${i.itemName},${i.quantity},${i.revenue}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${activeRange.start}-to-${activeRange.end}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded');
    };

    const maxDailyRevenue = useMemo(() => {
        if (!report?.dailyTrend?.length) return 1;
        return Math.max(...report.dailyTrend.map((d) => d.revenue), 1);
    }, [report]);

    const maxTopItemQty = useMemo(() => {
        if (!report?.topItems?.length) return 1;
        return Math.max(...report.topItems.map((i) => i.quantity), 1);
    }, [report]);

    const renderBreakdownList = (list, valueKey) => {
        if (!list || list.length === 0) return <p className="reports-empty-text">Koi data nahi hai</p>;
        const max = Math.max(...list.map((i) => i[valueKey]), 1);
        return (
            <div className="reports-breakdown-list">
                {list.map((item, idx) => {
                    const label = item.method || item.source || item.category;
                    return (
                        <div key={idx} className="reports-breakdown-row">
                            <div className="reports-breakdown-label">
                                <span>{label}</span>
                            </div>
                            <div className="reports-breakdown-bar-wrap">
                                <div
                                    className="reports-breakdown-bar"
                                    style={{ width: `${(item[valueKey] / max) * 100}%` }}
                                />
                            </div>
                            <span className="reports-breakdown-value">
                                {valueKey === 'amount' || valueKey === 'revenue' ? `₹${item[valueKey].toFixed(0)}` : item[valueKey]}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading && !report) {
        return (
            <div className="reports-page loading">
                <div className="spinner"></div>
                <p>Loading reports...</p>
            </div>
        );
    }

    return (
        <div className="reports-page">
            <div className="section-header">
                <div>
                    <h1><IconReportAnalytics size={24} /> Reports</h1>
                    <p>Poore restaurant ka performance ek jagah</p>
                </div>
                <button className="btn-primary" onClick={downloadCSV} disabled={!report}>
                    <IconDownload size={18} /> Export CSV
                </button>
            </div>

            {/* ===== Date Range Presets ===== */}
            <div className="reports-presets">
                {PRESETS.map((p) => (
                    <button
                        key={p.key}
                        className={preset === p.key ? 'active' : ''}
                        onClick={() => setPreset(p.key)}
                    >
                        {p.label}
                    </button>
                ))}
                {preset === 'custom' && (
                    <div className="reports-custom-dates">
                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                        <span>to</span>
                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                    </div>
                )}
            </div>

            {report && (
                <>
                    {/* ===== Overview Cards ===== */}
                    <div className="reports-stats-grid">
                        <div className="reports-stat-card">
                            <div className="reports-stat-icon"><IconCurrencyRupee size={20} /></div>
                            <div>
                                <div className="reports-stat-value">₹{report.overview.totalRevenue.toLocaleString()}</div>
                                <div className="reports-stat-label">Total Revenue</div>
                            </div>
                        </div>
                        <div className="reports-stat-card">
                            <div className="reports-stat-icon"><IconShoppingCart size={20} /></div>
                            <div>
                                <div className="reports-stat-value">{report.overview.totalOrders}</div>
                                <div className="reports-stat-label">Total Orders</div>
                            </div>
                        </div>
                        <div className="reports-stat-card">
                            <div className="reports-stat-icon"><IconReceipt size={20} /></div>
                            <div>
                                <div className="reports-stat-value">₹{report.overview.avgOrderValue.toLocaleString()}</div>
                                <div className="reports-stat-label">Avg Order Value</div>
                            </div>
                        </div>
                        <div className="reports-stat-card danger">
                            <div className="reports-stat-icon"><IconBan size={20} /></div>
                            <div>
                                <div className="reports-stat-value">{report.overview.cancelledOrders}</div>
                                <div className="reports-stat-label">Cancelled Orders</div>
                            </div>
                        </div>
                    </div>

                    {/* ===== Revenue Trend Chart ===== */}
                    <div className="reports-card">
                        <h3>Revenue Trend</h3>
                        {report.dailyTrend.length === 0 ? (
                            <p className="reports-empty-text">Is period me koi order nahi hai</p>
                        ) : (
                            <div className="reports-bar-chart">
                                {report.dailyTrend.map((d) => (
                                    <div key={d.date} className="reports-bar-col" title={`${d.date}: ₹${d.revenue.toFixed(0)} (${d.orders} orders)`}>
                                        <div
                                            className="reports-bar-fill"
                                            style={{ height: `${(d.revenue / maxDailyRevenue) * 100}%` }}
                                        />
                                        <span className="reports-bar-label">
                                            {new Date(d.date).getDate()}/{new Date(d.date).getMonth() + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="reports-grid-2">
                        {/* ===== Top Selling Items ===== */}
                        <div className="reports-card">
                            <h3><IconTrophy size={18} /> Top Selling Items</h3>
                            {report.topItems.length === 0 ? (
                                <p className="reports-empty-text">Koi data nahi hai</p>
                            ) : (
                                <div className="reports-top-items">
                                    {report.topItems.map((item, idx) => (
                                        <div key={idx} className="reports-top-item-row">
                                            <span className="reports-top-item-rank">#{idx + 1}</span>
                                            <div className="reports-top-item-info">
                                                <span className="reports-top-item-name">{item.itemName}</span>
                                                <div className="reports-top-item-bar-wrap">
                                                    <div
                                                        className="reports-top-item-bar"
                                                        style={{ width: `${(item.quantity / maxTopItemQty) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="reports-top-item-stats">
                                                <span>{item.quantity} sold</span>
                                                <span>₹{item.revenue.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ===== Category-wise Sales ===== */}
                        <div className="reports-card">
                            <h3><IconCategory size={18} /> Category-wise Sales</h3>
                            {renderBreakdownList(report.categoryBreakdown, 'revenue')}
                        </div>
                    </div>

                    <div className="reports-grid-2">
                        {/* ===== Payment Method Breakdown ===== */}
                        <div className="reports-card">
                            <h3><IconCreditCard size={18} /> Payment Methods</h3>
                            {renderBreakdownList(report.paymentBreakdown, 'amount')}
                        </div>

                        {/* ===== Order Source Breakdown ===== */}
                        <div className="reports-card">
                            <h3><IconQrcode size={18} /> Order Source</h3>
                            {renderBreakdownList(report.sourceBreakdown, 'amount')}
                        </div>
                    </div>

                    {/* ===== Inventory + Staff Snapshot ===== */}
                    <div className="reports-grid-2">
                        {inventoryStats && (
                            <div className="reports-card">
                                <h3><IconBuildingWarehouse size={18} /> Inventory Snapshot</h3>
                                <div className="reports-snapshot-grid">
                                    <div>
                                        <span className="reports-snapshot-value">{inventoryStats.totalItems}</span>
                                        <span className="reports-snapshot-label">Total Items</span>
                                    </div>
                                    <div>
                                        <span className="reports-snapshot-value warning">{inventoryStats.lowStockCount}</span>
                                        <span className="reports-snapshot-label">Low Stock</span>
                                    </div>
                                    <div>
                                        <span className="reports-snapshot-value">₹{inventoryStats.totalValue.toLocaleString()}</span>
                                        <span className="reports-snapshot-label">Total Value</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {staffPayroll && (
                            <div className="reports-card">
                                <h3><IconUsers size={18} /> Staff Payroll (This Month)</h3>
                                <div className="reports-snapshot-grid">
                                    <div>
                                        <span className="reports-snapshot-value">{staffPayroll.totals.staffCount}</span>
                                        <span className="reports-snapshot-label">Active Staff</span>
                                    </div>
                                    <div>
                                        <span className="reports-snapshot-value">₹{staffPayroll.totals.totalPayable.toLocaleString()}</span>
                                        <span className="reports-snapshot-label">Payable</span>
                                    </div>
                                    <div>
                                        <span className="reports-snapshot-value warning">₹{staffPayroll.totals.totalDue.toLocaleString()}</span>
                                        <span className="reports-snapshot-label">Due</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Reports;