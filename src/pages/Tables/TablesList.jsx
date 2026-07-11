import React, { useState, useEffect, useRef } from 'react';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconDownload,
    IconQrcode,
    IconPrinter,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from "qrcode.react";
import { tablesAPI } from '../../utils/api';
import './Tables.css';

const TablesList = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [editingTableId, setEditingTableId] = useState(null);
    const qrRef = useRef();
    const [formData, setFormData] = useState({
        tableNumber: '',
        capacity: '',
        tableArea: 'Indoor',
    });

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            setLoading(true);
            const response = await tablesAPI.getAll();
            if (response.data.success) {
                const fetchedTables = response.data.data;
                setTables(fetchedTables);

                // ✅ FIX: Table-list endpoint sirf qrCode flag deta hai, asli
                // qrUrl nahi. Isliye jin tables ka QR pehle generate ho chuka
                // hai unke liye yahin silently real qrUrl backfill kar lo,
                // warna card grid ka QR galat/fake URL encode karta tha
                // (bina modal khole scan karne par wrong destination aati thi).
                const needsQrUrl = fetchedTables.filter((t) => t.qrCode && !t.qrUrl);
                if (needsQrUrl.length > 0) {
                    const results = await Promise.allSettled(
                        needsQrUrl.map((t) => tablesAPI.generateQR(t.tableNumber))
                    );

                    setTables((prev) =>
                        prev.map((t) => {
                            const idx = needsQrUrl.findIndex((nt) => nt._id === t._id);
                            if (idx === -1) return t;
                            const res = results[idx];
                            if (res.status !== 'fulfilled' || !res.value?.data?.success) return t;
                            const data = res.value.data.data;
                            return { ...t, qrCode: data.qrCode, qrUrl: data.qrUrl };
                        })
                    );
                }
            }
        } catch (error) {
            console.error('Error fetching tables:', error);
            toast.error('Failed to load tables');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAvailable = async (table) => {
        try {
            const response = await tablesAPI.updateStatus(table._id, { status: 'Available' });
            if (response.data.success) {
                toast.success('Table marked as Available');
                setTables(tables.map((t) => (t._id === table._id ? response.data.data : t)));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update table');
        }
    };

    const [showReserveModal, setShowReserveModal] = useState(false);
    const [reserveData, setReserveData] = useState({ reservedByName: '', reservedByPhone: '', reservedFor: '' });

    const handleOpenReserveModal = (table) => {
        setSelectedTable(table);
        setShowReserveModal(true);
    };

    const handleReserveTable = async (e) => {
        e.preventDefault();
        try {
            const response = await tablesAPI.updateStatus(selectedTable._id, {
                status: 'Reserved',
                ...reserveData,
            });
            if (response.data.success) {
                toast.success('Table reserved');
                setTables(tables.map((t) => (t._id === selectedTable._id ? response.data.data : t)));
                setShowReserveModal(false);
                setReserveData({ reservedByName: '', reservedByPhone: '', reservedFor: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reserve table');
        }
    };

    const handleAddTable = async (e) => {
        e.preventDefault();

        if (!formData.tableNumber || !formData.capacity) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            const response = await tablesAPI.create({
                tableNumber: parseInt(formData.tableNumber),
                capacity: parseInt(formData.capacity),
                tableArea: formData.tableArea,
            });

            if (response.data.success) {
                toast.success('Table added successfully');
                setTables([...tables, response.data.data]);
                setFormData({ tableNumber: '', capacity: '', tableArea: 'Indoor' });
                setShowAddModal(false);
            }
        } catch (error) {
            console.error('Error adding table:', error);
            toast.error(error.response?.data?.message || 'Failed to add table');
        }
    };

    const handleOpenEditModal = (table) => {
        setEditingTableId(table._id);
        setFormData({
            tableNumber: table.tableNumber.toString(),
            capacity: table.capacity.toString(),
            tableArea: table.tableArea,
        });
        setShowEditModal(true);
    };

    const handleUpdateTable = async (e) => {
        e.preventDefault();

        if (!formData.tableNumber || !formData.capacity) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            const response = await tablesAPI.update(editingTableId, {
                tableNumber: parseInt(formData.tableNumber),
                capacity: parseInt(formData.capacity),
                tableArea: formData.tableArea,
            });

            if (response.data.success) {
                toast.success('Table updated successfully');

                // Update tables list with new data
                setTables(
                    tables.map((t) =>
                        t._id === editingTableId ? response.data.data : t
                    )
                );

                // Reset form and close modal
                setFormData({ tableNumber: '', capacity: '', tableArea: 'Indoor' });
                setEditingTableId(null);
                setShowEditModal(false);
            }
        } catch (error) {
            console.error('Error updating table:', error);
            toast.error(error.response?.data?.message || 'Failed to update table');
        }
    };

    const handleDeleteTable = async (tableId) => {
        if (!window.confirm('Are you sure you want to delete this table?')) return;

        try {
            const response = await tablesAPI.delete(tableId);
            if (response.data.success) {
                toast.success('Table deleted');
                setTables(tables.filter((t) => t._id !== tableId));
            }
        } catch (error) {
            console.error('Error deleting table:', error);
            toast.error('Failed to delete table');
        }
    };

    // ✅ FIX: ab tables array bhi sync hota hai, sirf selectedTable nahi.
    // Pehle sirf selectedTable update hota tha, isliye card grid ka
    // table.qrCode / table.qrUrl kabhi update nahi hota tha aur
    // download/print buttons show hi nahi hote the card pe.
    const handleGenerateQR = async (table) => {
        try {
            const response = await tablesAPI.generateQR(table.tableNumber);
            if (response.data.success) {
                const updatedTable = {
                    ...table,
                    qrCode: response.data.data.qrCode,
                    qrUrl: response.data.data.qrUrl,
                };

                setSelectedTable(updatedTable);
                setTables((prev) =>
                    prev.map((t) => (t._id === table._id ? { ...t, ...updatedTable } : t))
                );
                setShowQRModal(true);
            }
        } catch (error) {
            console.error('Error generating QR:', error);
            toast.error('Failed to generate QR code');
        }
    };

    // ✅ DOWNLOAD QR - card grid wala (chhota QR, id = qr-<tableId>)
    const downloadQR = (tableId, tableNumber) => {
        const element = document.getElementById(`qr-${tableId}`);
        if (element) {
            // SVG ko canvas mein convert karo
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            const svgData = new XMLSerializer().serializeToString(element);
            const svg = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svg);

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `table-${tableNumber}-qr.png`;
                link.click();
                URL.revokeObjectURL(url);
                toast.success('QR code downloaded!');
            };

            img.onerror = () => {
                toast.error('Failed to download QR code');
                URL.revokeObjectURL(url);
            };

            img.src = url;
        } else {
            toast.error('QR code not found');
        }
    };

    // ✅ FIX: printQR ab idPrefix leta hai.
    // Card grid ka QR id = "qr-<id>", modal ka QR id = "qr-print-<id>".
    // Pehle ye function hamesha "qr-print-<id>" hi dhundhta tha, isliye
    // card pe (modal khole bina) Print button click karne par element
    // milta hi nahi tha -> "QR code not found" error.
    const printQR = (tableId, tableNumber, idPrefix = 'qr-print') => {
        const element = document.getElementById(`${idPrefix}-${tableId}`);
        if (!element) {
            toast.error('QR code not found');
            return;
        }

        const printWindow = window.open('', '', 'height=400,width=600');
        const svgData = new XMLSerializer().serializeToString(element);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print QR - Table ${tableNumber}</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                    }
                    h2 {
                        margin-bottom: 30px;
                        color: #333;
                    }
                    svg {
                        border: 2px solid #ddd;
                        padding: 20px;
                        background: white;
                        width: 260px;
                        height: 260px;
                    }
                    p {
                        margin-top: 20px;
                        font-size: 14px;
                        color: #666;
                        text-align: center;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <h2>Table ${tableNumber} - QR Code</h2>
                ${svgData}
                <p>Scan this code to view menu and place order</p>
            </body>
            </html>
        `);

        printWindow.document.close();

        // Print after a small delay to ensure content is rendered
        setTimeout(() => {
            printWindow.print();
            toast.success('Print dialog opened!');
        }, 250);
    };


    const downloadQRFromModal = (tableId, tableNumber) => {
        const element = document.getElementById(`qr-print-${tableId}`);
        if (element) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            const svgData = new XMLSerializer().serializeToString(element);
            const svg = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svg);

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `table-${tableNumber}-qr.png`;
                link.click();
                URL.revokeObjectURL(url);
                toast.success('QR code downloaded!');
            };

            img.onerror = () => {
                toast.error('Failed to download QR code');
                URL.revokeObjectURL(url);
            };

            img.src = url;
        }
    };

    const downloadBatchQR = async () => {
        try {
            const tableNumbers = tables.map((t) => t.tableNumber);
            const response = await tablesAPI.generateBatchQR(tableNumbers);
            if (response.data.success) {
                toast.success('QR codes generated. Download your batch file.');
                // Create a zip or PDF with all QR codes
            }
        } catch (error) {
            console.error('Error generating batch QR:', error);
            toast.error('Failed to generate batch QR codes');
        }
    };

    return (
        <div className="tables-container">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h1>Tables Management</h1>
                    <p>Manage your restaurant tables and generate QR codes</p>
                </div>
                <div className="header-buttons">
                    <button className="btn-primary" onClick={downloadBatchQR}>
                        <IconDownload size={18} /> Download All QR
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <IconPlus size={18} /> Add Table
                    </button>
                </div>
            </div>

            {/* Tables Grid */}
            {loading ? (
                <div className="loading-state">
                    <p>Loading tables...</p>
                </div>
            ) : tables.length === 0 ? (
                <div className="empty-state">
                    <IconQrcode size={48} />
                    <p>No tables added yet</p>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <IconPlus size={18} /> Add Your First Table
                    </button>
                </div>
            ) : (
                <div className="tables-grid">
                    {tables.map((table) => (
                        <div key={table._id} className="table-card">
                            <div className="table-card-header">
                                <h3>Table {table.tableNumber}</h3>
                                <span className={`status ${table.status?.toLowerCase()}`}>
                                    {table.status}
                                </span>
                            </div>

                            <div className="table-details">
                                <div className="detail">
                                    <span className="label">Area</span>
                                    <span className="value">{table.tableArea}</span>
                                </div>
                                <div className="detail">
                                    <span className="label">Capacity</span>
                                    <span className="value">{table.capacity} persons</span>
                                </div>
                            </div>

                            <div className="table-qr">
                                {table.qrCode ? (
                                    <QRCodeSVG
                                        id={`qr-${table._id}`}
                                        value={table.qrUrl || `table-${table._id}`}
                                        size={120}
                                        level="H"
                                        includeMargin={true}
                                    />
                                ) : (
                                    <div className="qr-placeholder">No QR</div>
                                )}
                            </div>

                            <div className="table-actions">

                                {table.status === 'Available' && (
                                    <button
                                        className="action-btn"
                                        onClick={() => handleOpenReserveModal(table)}
                                        title="Reserve Table"
                                    >
                                        Reserve
                                    </button>
                                )}

                                {(table.status === 'Reserved' || table.status === 'Occupied') && !table.currentOrderId && (
                                    <button
                                        className="action-btn"
                                        onClick={() => handleMarkAvailable(table)}
                                        title="Mark Available"
                                    >
                                        Free Table
                                    </button>
                                )}
                                <button
                                    className="action-btn qr-btn"
                                    onClick={() => handleGenerateQR(table)}
                                    title="Generate QR"
                                >
                                    <IconQrcode size={18} />
                                </button>
                                {table.qrCode && (
                                    <>
                                        <button
                                            className="action-btn download-btn"
                                            onClick={() => downloadQR(table._id, table.tableNumber)}
                                            title="Download QR"
                                        >
                                            <IconDownload size={18} />
                                        </button>
                                        <button
                                            className="action-btn print-btn"
                                            onClick={() => printQR(table._id, table.tableNumber, 'qr')}
                                            title="Print QR"
                                        >
                                            <IconPrinter size={18} />
                                        </button>
                                    </>
                                )}
                                <button
                                    className="action-btn edit-btn"
                                    title="Edit Table"
                                    onClick={() => handleOpenEditModal(table)}
                                >
                                    <IconEdit size={18} />
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteTable(table._id)}
                                    title="Delete Table"
                                >
                                    <IconTrash size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Table Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Table</h2>
                            <button
                                className="close-btn"
                                onClick={() => setShowAddModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddTable} className='add-form'>
                            <div className="Tableform-group">
                                <label>Table Number *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.tableNumber}
                                    onChange={(e) =>
                                        setFormData({ ...formData, tableNumber: e.target.value })
                                    }
                                    placeholder="e.g., 1, 2, 3..."
                                    required
                                />
                            </div>

                            <div className="Tableform-group">
                                <label>Capacity (Persons) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={formData.capacity}
                                    onChange={(e) =>
                                        setFormData({ ...formData, capacity: e.target.value })
                                    }
                                    placeholder="e.g., 2, 4, 6..."
                                    required
                                />
                            </div>

                            <div className="Tableform-group">
                                <label>Table Area</label>
                                <select
                                    value={formData.tableArea}
                                    onChange={(e) =>
                                        setFormData({ ...formData, tableArea: e.target.value })
                                    }
                                >
                                    <option value="Indoor">Indoor</option>
                                    <option value="Outdoor">Outdoor</option>
                                    <option value="Terrace">Terrace</option>
                                    <option value="Private">Private</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Add Table
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Table Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Table</h2>
                            <button
                                className="close-btn"
                                onClick={() => setShowEditModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTable} className='add-form'>
                            <div className="Tableform-group">
                                <label>Table Number *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.tableNumber}
                                    onChange={(e) =>
                                        setFormData({ ...formData, tableNumber: e.target.value })
                                    }
                                    placeholder="e.g., 1, 2, 3..."
                                    required
                                />
                            </div>

                            <div className="Tableform-group">
                                <label>Capacity (Persons) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={formData.capacity}
                                    onChange={(e) =>
                                        setFormData({ ...formData, capacity: e.target.value })
                                    }
                                    placeholder="e.g., 2, 4, 6..."
                                    required
                                />
                            </div>

                            <div className="Tableform-group">
                                <label>Table Area</label>
                                <select
                                    value={formData.tableArea}
                                    onChange={(e) =>
                                        setFormData({ ...formData, tableArea: e.target.value })
                                    }
                                >
                                    <option value="Indoor">Indoor</option>
                                    <option value="Outdoor">Outdoor</option>
                                    <option value="Terrace">Terrace</option>
                                    <option value="Private">Private</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Update Table
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showReserveModal && selectedTable && (
                <div className="modal-overlay" onClick={() => setShowReserveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reserve Table {selectedTable.tableNumber}</h2>
                            <button className="close-btn" onClick={() => setShowReserveModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleReserveTable} className="add-form">
                            <div className="Tableform-group">
                                <label>Customer Name</label>
                                <input
                                    type="text"
                                    value={reserveData.reservedByName}
                                    onChange={(e) => setReserveData({ ...reserveData, reservedByName: e.target.value })}
                                    placeholder="e.g., Rahul Sharma"
                                />
                            </div>
                            <div className="Tableform-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    value={reserveData.reservedByPhone}
                                    onChange={(e) => setReserveData({ ...reserveData, reservedByPhone: e.target.value })}
                                    placeholder="e.g., 9876543210"
                                />
                            </div>
                            <div className="Tableform-group">
                                <label>Reservation Time</label>
                                <input
                                    type="datetime-local"
                                    value={reserveData.reservedFor}
                                    onChange={(e) => setReserveData({ ...reserveData, reservedFor: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowReserveModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">Reserve</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Display Modal */}
            {showQRModal && selectedTable && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Table {selectedTable.tableNumber} - QR Code</h2>
                            <button
                                className="close-btn"
                                onClick={() => setShowQRModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="qr-display">
                            <div className="qr-code-box">
                                <QRCodeSVG
                                    id={`qr-print-${selectedTable._id}`}
                                    ref={qrRef}
                                    value={selectedTable.qrUrl}
                                    size={300}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <p className="qr-instructions">
                                Print this QR code and place it on Table {selectedTable.tableNumber}.
                                <br />
                                Customers can scan to view the menu and place orders.
                            </p>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowQRModal(false)}
                            >
                                Close
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => printQR(selectedTable._id, selectedTable.tableNumber, 'qr-print')}
                            >
                                <IconPrinter size={18} /> Print
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => downloadQRFromModal(selectedTable._id, selectedTable.tableNumber)}
                            >
                                <IconDownload size={18} /> Download QR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TablesList;