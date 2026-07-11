import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconSearch,
    IconX,
    IconAlertTriangle,
    IconPackage,
    IconArrowUpRight,
    IconArrowDownRight,
    IconHistory,
    IconUpload,
    IconFileSpreadsheet,
    IconLoader2,
    IconBuildingWarehouse,
    IconCurrencyRupee,
    IconExclamationCircle,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { inventoryAPI } from '../../utils/api';
import './Inventory.css';

const CATEGORIES = [
    'Vegetables', 'Fruits', 'Dairy', 'Meat & Poultry', 'Seafood',
    'Grains & Flour', 'Spices & Condiments', 'Beverages', 'Bakery',
    'Frozen Items', 'Packaging', 'Cleaning & Supplies', 'Other',
];

const UNITS = ['kg', 'g', 'l', 'ml', 'piece', 'packet', 'dozen', 'box', 'bag'];

const STOCK_OUT_REASONS = ['Used in Kitchen', 'Damaged', 'Expired', 'Manual Correction', 'Other'];

const emptyForm = {
    name: '',
    category: 'Vegetables',
    unit: 'kg',
    currentStock: '',
    minStockLevel: '5',
    costPerUnit: '',
    supplierName: '',
    supplierContact: '',
    expiryDate: '',
    notes: '',
};

// ---------- Excel helpers ----------
const normalizeRow = (row) => {
    const normalized = {};
    Object.keys(row).forEach((key) => {
        normalized[key.toString().trim().toLowerCase()] = row[key];
    });
    return normalized;
};

const pick = (row, keys, fallback = '') => {
    for (const k of keys) {
        const val = row[k];
        if (val !== undefined && val !== null && val.toString().trim() !== '') {
            return val;
        }
    }
    return fallback;
};

// Category/Unit ko case-insensitive match karta hai; na mile toh fallback deta hai
const matchFromList = (value, list, fallback) => {
    if (!value) return fallback;
    const found = list.find((item) => item.toLowerCase() === value.toString().trim().toLowerCase());
    return found || fallback;
};

const Inventory = () => {
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [stockModal, setStockModal] = useState(null); // { item, mode: 'in' | 'out' }
    const [stockForm, setStockForm] = useState({
        quantity: '',
        costPerUnit: '',
        reason: '',
        notes: '',
        isWastage: false,
    });
    const [stockSaving, setStockSaving] = useState(false);

    const [historyItem, setHistoryItem] = useState(null);
    const [historyTransactions, setHistoryTransactions] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    // 👇 Excel import ke liye
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [itemsRes, statsRes] = await Promise.all([
                inventoryAPI.getAll(),
                inventoryAPI.getStats(),
            ]);
            if (itemsRes.data.success) setItems(itemsRes.data.data);
            if (statsRes.data.success) setStats(statsRes.data.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
            const matchesLowStock = !lowStockOnly || item.currentStock <= item.minStockLevel;
            return matchesSearch && matchesCategory && matchesLowStock;
        });
    }, [items, searchTerm, filterCategory, lowStockOnly]);

    const resetForm = () => {
        setFormData(emptyForm);
        setSelectedItem(null);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Item name is required');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: formData.name.trim(),
                category: formData.category,
                unit: formData.unit,
                minStockLevel: Number(formData.minStockLevel) || 5,
                costPerUnit: Number(formData.costPerUnit) || 0,
                supplierName: formData.supplierName,
                supplierContact: formData.supplierContact,
                expiryDate: formData.expiryDate || null,
                notes: formData.notes,
            };

            let response;
            if (showEditModal) {
                response = await inventoryAPI.update(selectedItem._id, payload);
            } else {
                payload.currentStock = Number(formData.currentStock) || 0;
                response = await inventoryAPI.create(payload);
            }

            if (response.data.success) {
                toast.success(showEditModal ? 'Item updated' : 'Item added to inventory');
                closeModal();
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save item');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            unit: item.unit,
            currentStock: item.currentStock.toString(),
            minStockLevel: item.minStockLevel.toString(),
            costPerUnit: item.costPerUnit.toString(),
            supplierName: item.supplierName || '',
            supplierContact: item.supplierContact || '',
            expiryDate: item.expiryDate ? item.expiryDate.substring(0, 10) : '',
            notes: item.notes || '',
        });
        setShowEditModal(true);
    };

    const handleDelete = async (itemId) => {
        if (!window.confirm('Is item ko permanently delete karna hai?')) return;
        try {
            const response = await inventoryAPI.delete(itemId);
            if (response.data.success) {
                toast.success('Item deleted');
                setItems(items.filter((i) => i._id !== itemId));
            }
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    // ---------- Stock In / Out ----------
    const openStockModal = (item, mode) => {
        setStockModal({ item, mode });
        setStockForm({
            quantity: '',
            costPerUnit: mode === 'in' ? item.costPerUnit.toString() : '',
            reason: mode === 'in' ? 'Purchase' : 'Used in Kitchen',
            notes: '',
            isWastage: false,
        });
    };

    const closeStockModal = () => {
        setStockModal(null);
        setStockForm({ quantity: '', costPerUnit: '', reason: '', notes: '', isWastage: false });
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();

        if (!stockForm.quantity || Number(stockForm.quantity) <= 0) {
            toast.error('Valid quantity daalo');
            return;
        }

        try {
            setStockSaving(true);
            const { item, mode } = stockModal;

            let response;
            if (mode === 'in') {
                response = await inventoryAPI.stockIn(item._id, {
                    quantity: Number(stockForm.quantity),
                    costPerUnit: stockForm.costPerUnit ? Number(stockForm.costPerUnit) : undefined,
                    reason: stockForm.reason,
                    notes: stockForm.notes,
                });
            } else {
                response = await inventoryAPI.stockOut(item._id, {
                    quantity: Number(stockForm.quantity),
                    reason: stockForm.reason,
                    notes: stockForm.notes,
                    isWastage: stockForm.reason === 'Damaged' || stockForm.reason === 'Expired',
                });
            }

            if (response.data.success) {
                toast.success(response.data.message);
                closeStockModal();
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update stock');
        } finally {
            setStockSaving(false);
        }
    };

    // ---------- History ----------
    const openHistory = async (item) => {
        setHistoryItem(item);
        setHistoryLoading(true);
        try {
            const response = await inventoryAPI.getItemTransactions(item._id);
            if (response.data.success) setHistoryTransactions(response.data.data);
        } catch (error) {
            toast.error('Failed to load history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const getStockStatus = (item) => {
        if (item.currentStock <= 0) return 'out';
        if (item.currentStock <= item.minStockLevel) return 'low';
        return 'ok';
    };

    if (loading) {
        return (
            <div className="inventory-page loading">
                <div className="spinner"></div>
                <p>Loading inventory...</p>
            </div>
        );
    }

    // 👇 Excel se ek saath bahut saare inventory items import karna
    const handleExcelFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (rows.length === 0) {
                toast.error('Excel file me koi data nahi mila');
                return;
            }

            let successCount = 0;
            let failCount = 0;
            const failedRows = [];
            const addedItems = [];

            for (let i = 0; i < rows.length; i++) {
                const row = normalizeRow(rows[i]);

                const name = pick(row, ['item name', 'name']);
                const stockRaw = pick(row, ['starting stock', 'current stock', 'stock']);

                // Name zaroori hai; stock number honi chahiye (0 bhi valid hai)
                if (!name || (stockRaw !== '' && isNaN(parseFloat(stockRaw)))) {
                    failCount++;
                    failedRows.push(i + 2);
                    console.warn(`Row ${i + 2} skipped`, { rawRow: rows[i], normalizedRow: row });
                    continue;
                }

                const minStockRaw = pick(row, ['min stock level', 'minstocklevel', 'min stock'], '5');
                const costRaw = pick(row, ['cost per unit', 'costperunit', 'cost']);
                const categoryRaw = pick(row, ['category']);
                const unitRaw = pick(row, ['unit']);
                const expiryRaw = pick(row, ['expiry date', 'expirydate']);

                const data = {
                    name: name.toString().trim(),
                    category: matchFromList(categoryRaw, CATEGORIES, 'Other'),
                    unit: matchFromList(unitRaw, UNITS, 'piece'),
                    currentStock: stockRaw !== '' ? Math.max(0, parseFloat(stockRaw) || 0) : 0,
                    minStockLevel: Math.max(0, parseFloat(minStockRaw) || 5),
                    costPerUnit: costRaw !== '' ? Math.max(0, parseFloat(costRaw) || 0) : 0,
                    supplierName: pick(row, ['supplier name', 'suppliername']).toString(),
                    supplierContact: pick(row, ['supplier contact', 'suppliercontact']).toString(),
                    expiryDate: expiryRaw ? expiryRaw.toString() : null,
                    notes: pick(row, ['notes']).toString(),
                };

                try {
                    const response = await inventoryAPI.create(data);
                    if (response.data.success) {
                        successCount++;
                        addedItems.push(response.data.data);
                    } else {
                        failCount++;
                        failedRows.push(i + 2);
                    }
                } catch (err) {
                    failCount++;
                    failedRows.push(i + 2);
                    console.error(`Row ${i + 2} API error:`, err.response?.data || err.message);
                }
            }

            if (addedItems.length > 0) {
                fetchData(); // stats bhi refresh ho jayein, isliye items ko manually merge karne ke bajaye poora refetch
            }

            if (successCount > 0) {
                toast.success(`${successCount} item(s) inventory me import ho gaye`);
            }
            if (failCount > 0) {
                toast.error(`${failCount} row(s) skip ho gaye (row: ${failedRows.join(', ')})`);
            }
        } catch (error) {
            console.error('Error importing excel:', error);
            toast.error('Excel file read nahi ho payi. Format check karke dobara try karo.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 👇 Sample template download
    const downloadInventoryTemplate = () => {
        const sampleData = [
            {
                'Item Name': 'Basmati Rice',
                'Category': 'Grains & Flour',
                'Unit': 'kg',
                'Starting Stock': 50,
                'Min Stock Level': 10,
                'Cost Per Unit': 85,
                'Supplier Name': 'ABC Traders',
                'Supplier Contact': '9876543210',
                'Expiry Date': '',
                'Notes': '',
            },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory Items');
        XLSX.writeFile(wb, 'inventory_items_template.xlsx');
    };

    return (
        <div className="inventory-page">
            <div className="section-header">
                <div>
                    <h1><IconBuildingWarehouse size={24} /> Inventory Management</h1>
                    <p>Track raw materials and stock; log restocking and usage</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" type="button" onClick={downloadInventoryTemplate}>
                        <IconFileSpreadsheet size={18} /> Sample Template
                    </button>
                    <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                    >
                        {importing ? <IconLoader2 size={18} /> : <IconUpload size={18} />}
                        {importing ? 'Importing...' : 'Import Excel'}
                    </button>
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        ref={fileInputRef}
                        onChange={handleExcelFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <IconPlus size={18} /> Add New Item
                    </button>
                </div>
            </div>

            {/* ===== Stats Cards ===== */}
            {stats && (
                <div className="inventory-stats-grid">
                    <div className="inventory-stat-card">
                        <div className="inventory-stat-icon"><IconPackage size={20} /></div>
                        <div>
                            <div className="inventory-stat-value">{stats.totalItems}</div>
                            <div className="inventory-stat-label">Total Items</div>
                        </div>
                    </div>
                    <div className="inventory-stat-card warning">
                        <div className="inventory-stat-icon"><IconAlertTriangle size={20} /></div>
                        <div>
                            <div className="inventory-stat-value">{stats.lowStockCount}</div>
                            <div className="inventory-stat-label">Low Stock</div>
                        </div>
                    </div>
                    <div className="inventory-stat-card danger">
                        <div className="inventory-stat-icon"><IconExclamationCircle size={20} /></div>
                        <div>
                            <div className="inventory-stat-value">{stats.outOfStockCount}</div>
                            <div className="inventory-stat-label">Out of Stock</div>
                        </div>
                    </div>
                    <div className="inventory-stat-card">
                        <div className="inventory-stat-icon"><IconCurrencyRupee size={20} /></div>
                        <div>
                            <div className="inventory-stat-value">₹{stats.totalValue.toLocaleString()}</div>
                            <div className="inventory-stat-label">Total Inventory Value</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Low Stock Banner ===== */}
            {stats?.lowStockCount > 0 && (
                <div className="inventory-low-stock-banner">
                    <IconAlertTriangle size={18} />
                    <span>
                        <strong>{stats.lowStockCount} items</strong> reorder level se neeche hain —{' '}
                        {stats.lowStockItems.slice(0, 4).map((i) => i.name).join(', ')}
                        {stats.lowStockCount > 4 ? ' aur baaki...' : ''}
                    </span>
                </div>
            )}

            {/* ===== Controls ===== */}
            <div className="inventory-controls">
                <div className="search-box">
                    <IconSearch size={20} />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="All">All Categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <label className="inventory-low-toggle">
                    <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(e) => setLowStockOnly(e.target.checked)}
                    />
                    Low stock only
                </label>
            </div>

            {/* ===== Table ===== */}
            {filteredItems.length === 0 ? (
                <div className="empty-state">
                    <IconPackage size={40} />
                    <p>Not Found any inventory items</p>
                </div>
            ) : (
                <div className="inventory-table-wrapper">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Category</th>
                                <th>Stock</th>
                                <th>Cost/Unit</th>
                                <th>Total Value</th>
                                <th>Supplier</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => {
                                const status = getStockStatus(item);
                                return (
                                    <tr key={item._id}>
                                        <td>
                                            <p className="inventory-item-name">{item.name}</p>
                                            {item.expiryDate && (
                                                <p className="inventory-item-expiry">
                                                    Exp: {new Date(item.expiryDate).toLocaleDateString('en-GB')}
                                                </p>
                                            )}
                                        </td>
                                        <td><span className="inventory-category-badge">{item.category}</span></td>
                                        <td>
                                            <div className={`inventory-stock-pill ${status}`}>
                                                {item.currentStock} {item.unit}
                                            </div>
                                            <p className="inventory-min-level">Min: {item.minStockLevel} {item.unit}</p>
                                        </td>
                                        <td>₹{item.costPerUnit}</td>
                                        <td className="inventory-total-value">₹{(item.currentStock * item.costPerUnit).toFixed(2)}</td>
                                        <td>{item.supplierName || '—'}</td>
                                        <td className="inventory-actions">
                                            <button onClick={() => openStockModal(item, 'in')} title="Stock In" className="stock-in-btn">
                                                <IconArrowUpRight size={16} />
                                            </button>
                                            <button onClick={() => openStockModal(item, 'out')} title="Stock Out" className="stock-out-btn">
                                                <IconArrowDownRight size={16} />
                                            </button>
                                            <button onClick={() => openHistory(item)} title="History">
                                                <IconHistory size={16} />
                                            </button>
                                            <button onClick={() => handleEditClick(item)} title="Edit">
                                                <IconEdit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item._id)} title="Delete" className="danger">
                                                <IconTrash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ===== Add/Edit Modal ===== */}
            {(showAddModal || showEditModal) && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{showEditModal ? 'Edit Item' : 'Add Inventory Item'}</h2>
                            <button className="close-btn" onClick={closeModal}><IconX size={22} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="inventory-form">
                            <div className="Inventoryform-group">
                                <label>Item Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Basmati Rice"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="Inventoryform-group">
                                    <label>Category *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="Inventoryform-group">
                                    <label>Unit *</label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                {!showEditModal && (
                                    <div className="Inventoryform-group">
                                        <label>Starting Stock</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.currentStock}
                                            onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                )}
                                <div className="Inventoryform-group">
                                    <label>Min Stock Level (reorder alert)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.minStockLevel}
                                        onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                                    />
                                </div>
                                <div className="Inventoryform-group">
                                    <label>Cost per Unit (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.costPerUnit}
                                        onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                                    />
                                </div>
                            </div>

                            {showEditModal && (
                                <p className="inventory-stock-note">
                                    Current stock ({selectedItem?.currentStock} {selectedItem?.unit}) yaha edit nahi ho sakta —
                                    Stock In/Out buttons use karo taaki har change track ho sake.
                                </p>
                            )}

                            <div className="form-row">
                                <div className="Inventoryform-group">
                                    <label>Supplier Name</label>
                                    <input
                                        type="text"
                                        value={formData.supplierName}
                                        onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                                    />
                                </div>
                                <div className="Inventoryform-group">
                                    <label>Supplier Contact</label>
                                    <input
                                        type="text"
                                        value={formData.supplierContact}
                                        onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="Inventoryform-group">
                                <label>Expiry Date (optional)</label>
                                <input
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                />
                            </div>

                            <div className="Inventoryform-group">
                                <label>Notes</label>
                                <textarea
                                    rows="2"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : showEditModal ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== Stock In / Out Modal ===== */}
            {stockModal && (
                <div className="modal-overlay" onClick={closeStockModal}>
                    <div className="Inventory-modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {stockModal.mode === 'in' ? 'Stock In' : 'Stock Out'} — {stockModal.item.name}
                            </h2>
                            <button className="close-btn" onClick={closeStockModal}><IconX size={22} /></button>
                        </div>

                        <form onSubmit={handleStockSubmit} className="inventory-form">
                            <p className="inventory-current-stock">
                                Current: <strong>{stockModal.item.currentStock} {stockModal.item.unit}</strong>
                            </p>

                            <div className="Inventoryform-group">
                                <label>Quantity ({stockModal.item.unit}) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={stockForm.quantity}
                                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            {stockModal.mode === 'in' ? (
                                <div className="Inventoryform-group">
                                    <label>Cost per Unit (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={stockForm.costPerUnit}
                                        onChange={(e) => setStockForm({ ...stockForm, costPerUnit: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div className="Inventoryform-group">
                                    <label>Reason</label>
                                    <select
                                        value={stockForm.reason}
                                        onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                                    >
                                        {STOCK_OUT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="Inventoryform-group">
                                <label>Notes (optional)</label>
                                <input
                                    type="text"
                                    value={stockForm.notes}
                                    onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={closeStockModal}>Cancel</button>
                                <button
                                    type="submit"
                                    className={stockModal.mode === 'in' ? 'btn-primary' : 'btn-danger'}
                                    disabled={stockSaving}
                                >
                                    {stockSaving ? 'Saving...' : stockModal.mode === 'in' ? 'Add Stock' : 'Remove Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== History Modal ===== */}
            {historyItem && (
                <div className="modal-overlay" onClick={() => setHistoryItem(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>History — {historyItem.name}</h2>
                            <button className="close-btn" onClick={() => setHistoryItem(null)}><IconX size={22} /></button>
                        </div>

                        <div className="inventory-history-list">
                            {historyLoading ? (
                                <p className="inventory-history-empty">Loading...</p>
                            ) : historyTransactions.length === 0 ? (
                                <p className="inventory-history-empty">Not Found any transactions</p>
                            ) : (
                                historyTransactions.map((t) => (
                                    <div key={t._id} className="inventory-history-row">
                                        <div className={`inventory-history-type ${t.type === 'Stock In' ? 'in' : 'out'}`}>
                                            {t.type === 'Stock In' ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
                                            {t.type}
                                        </div>
                                        <div className="inventory-history-details">
                                            <p>{t.quantity} {t.unit} — {t.reason}</p>
                                            <p className="inventory-history-meta">
                                                {new Date(t.createdAt).toLocaleString()} · Stock after: {t.stockAfter} {t.unit}
                                            </p>
                                        </div>
                                        {t.totalCost > 0 && <span className="inventory-history-cost">₹{t.totalCost}</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;