import React, { useState, useEffect, useCallback } from 'react';
import {
    IconSearch,
    IconArrowsExchange,
    IconTruckDelivery,
    IconWallet,
    IconReceipt2,
    IconArrowDownRight,
    IconArrowUpRight,
    IconClock,
    IconRefresh,
    IconFilterOff,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { transactionsAPI } from '../../utils/api';
import './Transactions.css';

const TABS = [
    { key: '', label: 'All', icon: IconArrowsExchange },
    { key: 'Inventory', label: 'Inventory', icon: IconTruckDelivery },
    { key: 'Salary', label: 'Salary', icon: IconWallet },
    { key: 'Payment', label: 'Payments', icon: IconReceipt2 },
];

const CATEGORY_STYLES = {
    Inventory: { color: '#667eea', bg: 'rgba(102,126,234,0.12)' },
    Salary: { color: '#ff6b35', bg: 'rgba(255,107,53,0.12)' },
    Payment: { color: '#22a06b', bg: 'rgba(34,160,107,0.12)' },
};

// Payment status  colors
const STATUS_STYLES = {
    Completed: { color: '#22a06b', bg: 'rgba(34,160,107,0.12)' },
    Pending: { color: '#e0a83a', bg: 'rgba(224,168,58,0.14)' },
    Failed: { color: '#e05656', bg: 'rgba(224,86,86,0.12)' },
    Refunded: { color: '#667eea', bg: 'rgba(102,126,234,0.12)' },
};


const getRowStyle = (t) =>
    t.category === 'Payment' && STATUS_STYLES[t.status]
        ? STATUS_STYLES[t.status]
        : CATEGORY_STYLES[t.category];

const OUTFLOW_STATUSES = ['Stock Out', 'Wastage', 'Advance', 'Payment', 'Deduction'];

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const Transactions = () => {
    const [activeTab, setActiveTab] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [total, setTotal] = useState(0);
    const LIMIT = 20;

    const fetchSummary = useCallback(async () => {
        try {
            const res = await transactionsAPI.getSummary();
            if (res.data.success) setSummary(res.data.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    }, []);

    const fetchTransactions = useCallback(
        async (skip = 0, append = false) => {
            try {
                append ? setLoadingMore(true) : setLoading(true);
                const res = await transactionsAPI.getAll({
                    type: activeTab || undefined,
                    search: searchTerm.trim() || undefined,
                    limit: LIMIT,
                    skip,
                });
                if (res.data.success) {
                    setTransactions((prev) =>
                        append ? [...prev, ...res.data.data] : res.data.data
                    );
                    setTotal(res.data.pagination.total);
                }
            } catch (error) {
                toast.error('Failed to load transactions');
                console.error(error);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [activeTab, searchTerm]
    );

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchTransactions(0, false);
        }, searchTerm ? 350 : 0);
        return () => clearTimeout(debounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, searchTerm]);

    const handleLoadMore = () => {
        fetchTransactions(transactions.length, true);
    };

    const handleRefresh = () => {
        fetchSummary();
        fetchTransactions(0, false);
    };

    const clearFilters = () => {
        setActiveTab('');
        setSearchTerm('');
    };

    const isOutflow = (t) => OUTFLOW_STATUSES.includes(t.status) && t.category !== 'Payment'
        ? true
        : t.category === 'Inventory'
            ? ['Stock Out', 'Wastage'].includes(t.status)
            : t.category === 'Salary';

    return (
        <div className="txn-page">
            <div className="txn-header">
                <div>
                    <h1><IconArrowsExchange size={24} /> Transactions</h1>
                    <p>All money & stock movement across your restaurant, in one place</p>
                </div>
                <button className="txn-refresh-btn" onClick={handleRefresh}>
                    <IconRefresh size={16} /> Refresh
                </button>
            </div>

            {/* ===== Summary Cards ===== */}
            <div className="txn-summary-grid">
                <div className="txn-summary-card">
                    <div className="txn-summary-icon in">
                        <IconArrowDownRight size={20} />
                    </div>
                    <div>
                        <span className="txn-summary-label">Stock Purchased</span>
                        <span className="txn-summary-value">
                            ₹{(summary?.inventoryIn || 0).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>

                <div className="txn-summary-card">
                    <div className="txn-summary-icon out">
                        <IconArrowUpRight size={20} />
                    </div>
                    <div>
                        <span className="txn-summary-label">Stock Used / Wasted</span>
                        <span className="txn-summary-value">
                            ₹{(summary?.inventoryOut || 0).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>

                <div className="txn-summary-card">
                    <div className="txn-summary-icon salary">
                        <IconWallet size={20} />
                    </div>
                    <div>
                        <span className="txn-summary-label">Salary Paid</span>
                        <span className="txn-summary-value">
                            ₹{(summary?.salaryPaid || 0).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>

                <div className="txn-summary-card">
                    <div className="txn-summary-icon payment">
                        <IconReceipt2 size={20} />
                    </div>
                    <div>
                        <span className="txn-summary-label">Payments Received</span>
                        <span className="txn-summary-value">
                            ₹{(summary?.paymentsReceived || 0).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
            </div>

            {/* ===== Filters ===== */}
            <div className="txn-controls">
                <div className="txn-tabs">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            className={`txn-tab ${activeTab === key ? 'active' : ''}`}
                            onClick={() => setActiveTab(key)}
                        >
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>

                <div className="txn-search-box">
                    <IconSearch size={17} />
                    <input
                        type="text"
                        placeholder="Search by name, order no..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {(activeTab || searchTerm) && (
                    <button className="txn-clear-btn" onClick={clearFilters}>
                        <IconFilterOff size={15} /> Clear
                    </button>
                )}
            </div>

            {/* ===== List ===== */}
            <div className="txn-list-wrap">
                {loading ? (
                    <div className="txn-state">
                        <div className="txn-spinner" />
                        <p>Loading transactions...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="txn-state">
                        <IconClock size={32} stroke={1.3} />
                        <p>No transactions found</p>
                    </div>
                ) : (
                    <>
                        <div className="txn-list">
                            {transactions.map((t) => {
                                const style = getRowStyle(t);
                                const outflow = isOutflow(t);
                                return (
                                    <div key={`${t.category}-${t.id}`} className="txn-row">
                                        <div
                                            className="txn-row-badge"
                                            style={{ color: style.color, background: style.bg }}
                                        >
                                            {t.category === 'Inventory' && <IconTruckDelivery size={18} />}
                                            {t.category === 'Salary' && <IconWallet size={18} />}
                                            {t.category === 'Payment' && <IconReceipt2 size={18} />}
                                        </div>

                                        <div className="txn-row-main">
                                            <div className="txn-row-top">
                                                <span className="txn-row-title">{t.title}</span>
                                                <span
                                                    className={`txn-row-amount ${outflow ? 'out' : 'in'}`}
                                                >
                                                    {outflow ? '−' : '+'}₹{Number(t.amount).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <div className="txn-row-bottom">
                                                <span className="txn-row-subtitle">{t.subtitle}</span>
                                                <span className="txn-row-date">{formatDate(t.date)}</span>
                                            </div>
                                        </div>

                                        <span
                                            className="txn-row-status"
                                            style={{ color: style.color, borderColor: style.color }}
                                        >
                                            {t.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {transactions.length < total && (
                            <button
                                className="txn-load-more-btn"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading...' : `Load more (${total - transactions.length} left)`}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Transactions;