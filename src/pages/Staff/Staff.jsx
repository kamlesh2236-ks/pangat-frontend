import React, { useState, useEffect, useCallback } from 'react';
import {
    IconUsers,
    IconPlus,
    IconEdit,
    IconTrash,
    IconX,
    IconCheck,
    IconCalendarStats,
    IconCoin,
    IconReceipt2,
    IconWallet,
    IconChevronRight,
    IconKey,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { staffAPI } from '../../utils/api';
import './Staff.css';

const ROLES = ['Manager', 'Chef', 'Cook', 'Waiter', 'Cashier', 'Cleaner', 'Delivery', 'Security', 'Other'];
const STAFF_PER_PAGE = 8;

const ATTENDANCE_OPTIONS = [
    { value: 'Present', label: 'P', full: 'Present' },
    { value: 'Absent', label: 'A', full: 'Absent' },
    { value: 'Half Day', label: 'H', full: 'Half Day' },
    { value: 'Paid Leave', label: 'L', full: 'Paid Leave' },
];

const emptyForm = {
    name: '', role: 'Waiter', phone: '', email: '',
    joiningDate: '', salaryType: 'Monthly', monthlySalary: '', dailyWage: '', notes: '',
};

const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const Staff = () => {
    const [staffList, setStaffList] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState([]);
    const [payroll, setPayroll] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth());
    const [currentPage, setCurrentPage] = useState(1);

    // Split loading state: staff list is month-independent and should render as soon as it
    // arrives. Payroll/attendance depend on selectedMonth and are usually the slower call
    // (per-staff attendance aggregation on the backend), so they get their own flag and
    // never block the staff table from showing.
    const [loading, setLoading] = useState(true);
    const [payrollLoading, setPayrollLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [detailStaff, setDetailStaff] = useState(null);
    const [detailTab, setDetailTab] = useState('salary');
    const [detailSalary, setDetailSalary] = useState(null);
    const [detailAttendance, setDetailAttendance] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [txnForm, setTxnForm] = useState({ type: 'Payment', amount: '', notes: '' });
    const [addingTxn, setAddingTxn] = useState(false);

    // markingId tracks which staff row's attendance button is currently being updated,
    // so we can show a tiny inline spinner on just that button instead of reloading the page
    const [markingId, setMarkingId] = useState(null);

    // Login credentials modal state
    const [credStaff, setCredStaff] = useState(null);
    const [credForm, setCredForm] = useState({ email: '', password: '' });
    const [savingCred, setSavingCred] = useState(false);

    // ---------- Fetchers (decoupled) ----------
    // Staff list — month independent, only needs to reload on add/edit/delete/credentials.
    const fetchStaff = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const staffRes = await staffAPI.getAll();
            if (staffRes.data.success) setStaffList(staffRes.data.data);
        } catch (error) {
            console.error('Error fetching staff list:', error);
            toast.error('Failed to load staff list');
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    // Today's attendance + payroll summary — month dependent, and the slower of the two
    // fetches. Kept separate so it never blocks the staff table from rendering.
    const fetchMonthData = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setPayrollLoading(true);
            const [todayRes, payrollRes] = await Promise.all([
                staffAPI.getTodayAttendance(),
                staffAPI.getPayrollSummary(selectedMonth),
            ]);
            if (todayRes.data.success) setTodayAttendance(todayRes.data.data);
            if (payrollRes.data.success) setPayroll(payrollRes.data.data);
        } catch (error) {
            console.error('Error fetching payroll/attendance data:', error);
            toast.error('Failed to load payroll data');
        } finally {
            if (showLoader) setPayrollLoading(false);
        }
    }, [selectedMonth]);

    // Convenience wrapper for places that used to call the old combined fetchAll()
    const refreshEverything = useCallback((showLoader = true) => {
        fetchStaff(showLoader);
        fetchMonthData(showLoader);
    }, [fetchStaff, fetchMonthData]);

    useEffect(() => {
        fetchStaff(true);
    }, [fetchStaff]);

    useEffect(() => {
        fetchMonthData(true);
    }, [fetchMonthData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedMonth]);

    // ---------- Attendance ----------
    const handleMarkAttendance = async (staffId, status) => {
        try {
            setMarkingId(`${staffId}-${status}`);
            const response = await staffAPI.markAttendance(staffId, { status });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchMonthData(false);
            }
        } catch (error) {
            toast.error('Failed to mark attendance');
        } finally {
            setMarkingId(null);
        }
    };

    // ---------- Add/Edit Staff ----------
    const resetForm = () => {
        setFormData(emptyForm);
        setSelectedStaff(null);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: formData.name.trim(),
                role: formData.role,
                phone: formData.phone,
                email: formData.email,
                joiningDate: formData.joiningDate || undefined,
                salaryType: formData.salaryType,
                monthlySalary: Number(formData.monthlySalary) || 0,
                dailyWage: Number(formData.dailyWage) || 0,
                notes: formData.notes,
            };

            const response = showEditModal
                ? await staffAPI.update(selectedStaff._id, payload)
                : await staffAPI.create(payload);

            if (response.data.success) {
                toast.success(showEditModal ? 'Staff updated' : 'Staff added');
                closeModal();
                fetchStaff(true);
                fetchMonthData(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save staff');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (staff) => {
        setSelectedStaff(staff);
        setFormData({
            name: staff.name,
            role: staff.role,
            phone: staff.phone || '',
            email: staff.email || '',
            joiningDate: staff.joiningDate ? staff.joiningDate.substring(0, 10) : '',
            salaryType: staff.salaryType,
            monthlySalary: staff.monthlySalary?.toString() || '',
            dailyWage: staff.dailyWage?.toString() || '',
            notes: staff.notes || '',
        });
        setShowEditModal(true);
    };

    const handleDelete = async (staffId) => {
        if (!window.confirm('Is staff member ko permanently delete karna hai? Attendance/salary history bhi delete ho jaayegi.')) return;
        try {
            const response = await staffAPI.delete(staffId);
            if (response.data.success) {
                toast.success('Staff deleted');
                fetchStaff(true);
                fetchMonthData(false);
            }
        } catch (error) {
            toast.error('Failed to delete staff');
        }
    };

    // ---------- Detail Modal ----------
    const openDetail = async (staff) => {
        setDetailStaff(staff);
        setDetailTab('salary');
        setDetailLoading(true);
        try {
            const [salaryRes, attendanceRes] = await Promise.all([
                staffAPI.getSalary(staff._id, selectedMonth),
                staffAPI.getAttendanceHistory(staff._id, selectedMonth),
            ]);
            if (salaryRes.data.success) setDetailSalary(salaryRes.data.data);
            if (attendanceRes.data.success) setDetailAttendance(attendanceRes.data.data);
        } catch (error) {
            toast.error('Failed to load staff details');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetailStaff(null);
        setDetailSalary(null);
        setDetailAttendance([]);
        setTxnForm({ type: 'Payment', amount: '', notes: '' });
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!txnForm.amount || Number(txnForm.amount) <= 0) {
            toast.error('Valid amount daalo');
            return;
        }

        try {
            setAddingTxn(true);
            const response = await staffAPI.addSalaryTransaction(detailStaff._id, {
                month: selectedMonth,
                type: txnForm.type,
                amount: Number(txnForm.amount),
                notes: txnForm.notes,
            });
            if (response.data.success) {
                toast.success(response.data.message);
                setTxnForm({ type: 'Payment', amount: '', notes: '' });
                const salaryRes = await staffAPI.getSalary(detailStaff._id, selectedMonth);
                if (salaryRes.data.success) setDetailSalary(salaryRes.data.data);
                fetchMonthData(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add transaction');
        } finally {
            setAddingTxn(false);
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (!window.confirm('Ye transaction delete karna hai?')) return;
        try {
            await staffAPI.deleteSalaryTransaction(transactionId);
            toast.success('Transaction deleted');
            const salaryRes = await staffAPI.getSalary(detailStaff._id, selectedMonth);
            if (salaryRes.data.success) setDetailSalary(salaryRes.data.data);
            fetchMonthData(false);
        } catch (error) {
            toast.error('Failed to delete transaction');
        }
    };

    const getStaffDue = (staffId) => {
        if (!payroll) return null;
        const entry = payroll.payroll.find((p) => p.staff._id === staffId);
        return entry ? entry.salary.dueAmount : null;
    };

    // Look up today's attendance status for a given staff member (used to highlight the active button)
    const getTodayStatus = (staffId) => {
        const row = todayAttendance.find((r) => r.staff._id === staffId);
        return row?.attendance?.status || null;
    };

    // ---------- Login Credentials ----------
    const openCredentials = (staff) => {
        setCredStaff(staff);
        setCredForm({ email: staff.email || '', password: '' });
    };

    const closeCredentials = () => {
        setCredStaff(null);
        setCredForm({ email: '', password: '' });
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        let pass = '';
        for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
        setCredForm((prev) => ({ ...prev, password: pass }));
    };

    const handleSaveCredentials = async (e) => {
        e.preventDefault();
        if (!credForm.email.trim()) {
            toast.error('Email is required');
            return;
        }
        if (!credForm.password || credForm.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        try {
            setSavingCred(true);
            const response = await staffAPI.setCredentials(credStaff._id, {
                email: credForm.email.trim(),
                password: credForm.password,
            });
            if (response.data.success) {
                toast.success('Login credentials set. Staff ko email/password note karke de dein.');
                closeCredentials();
                fetchStaff(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to set credentials');
        } finally {
            setSavingCred(false);
        }
    };

    const handleRevokeCredentials = async (staff) => {
        if (!window.confirm(`${staff.name} ka login access hata dein?`)) return;
        try {
            await staffAPI.revokeCredentials(staff._id);
            toast.success('Login access revoked');
            closeCredentials();
            fetchStaff(false);
        } catch (error) {
            toast.error('Failed to revoke access');
        }
    };

    // ===== Pagination =====
    const totalPages = Math.max(1, Math.ceil(staffList.length / STAFF_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedStaff = staffList.slice(
        (safePage - 1) * STAFF_PER_PAGE,
        safePage * STAFF_PER_PAGE
    );

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Only the staff-list fetch blocks the whole page now. Payroll/attendance load
    // in the background and show their own inline loading state below.
    if (loading) {
        return (
            <div className="staff-page loading">
                <div className="spinner"></div>
                <p>Loading staff...</p>
            </div>
        );
    }

    return (
        <div className="staff-page">
            <div className="section-header">
                <div>
                    <h1><IconUsers size={24} /> Staff Management</h1>
                    <p>Mark attendance, and track salary and deductions</p>
                </div>
                <div className="staff-header-actions">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="staff-month-picker"
                    />
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <IconPlus size={18} /> Add Staff
                    </button>
                </div>
            </div>

            {/* ===== Payroll Stats ===== */}
            {payrollLoading ? (
                <div className="staff-stats-grid">
                    {[0, 1, 2, 3].map((i) => (
                        <div className="staff-stat-card" key={i}>
                            <div className="staff-stat-icon"><IconCoin size={20} /></div>
                            <div>
                                <div className="staff-stat-value">…</div>
                                <div className="staff-stat-label">Loading</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : payroll && (
                <div className="staff-stats-grid">
                    <div className="staff-stat-card">
                        <div className="staff-stat-icon"><IconUsers size={20} /></div>
                        <div>
                            <div className="staff-stat-value">{payroll.totals.staffCount}</div>
                            <div className="staff-stat-label">Active Staff</div>
                        </div>
                    </div>
                    <div className="staff-stat-card">
                        <div className="staff-stat-icon"><IconCoin size={20} /></div>
                        <div>
                            <div className="staff-stat-value">₹{payroll.totals.totalPayable.toLocaleString()}</div>
                            <div className="staff-stat-label">This Month Payable</div>
                        </div>
                    </div>
                    <div className="staff-stat-card ok">
                        <div className="staff-stat-icon"><IconCheck size={20} /></div>
                        <div>
                            <div className="staff-stat-value">₹{payroll.totals.totalPaid.toLocaleString()}</div>
                            <div className="staff-stat-label">Paid So Far</div>
                        </div>
                    </div>
                    <div className="staff-stat-card warning">
                        <div className="staff-stat-icon"><IconWallet size={20} /></div>
                        <div>
                            <div className="staff-stat-value">₹{payroll.totals.totalDue.toLocaleString()}</div>
                            <div className="staff-stat-label">Total Due</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Staff Table ===== */}
            <div className="staff-table-wrapper">
                <table className="staff-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Salary Type</th>
                            <th>Amount</th>
                            <th>This Month Due</th>
                            <th>Attendance / Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedStaff.map((staff) => {
                            const due = payrollLoading ? null : getStaffDue(staff._id);
                            const currentStatus = getTodayStatus(staff._id);
                            return (
                                <tr key={staff._id} className={!staff.isActive ? 'inactive-row' : ''}>
                                    <td>
                                        <p className="staff-name">{staff.name}</p>
                                        {!staff.isActive && <span className="staff-inactive-badge">Inactive</span>}
                                    </td>
                                    <td><span className="staff-role-badge">{staff.role}</span></td>
                                    <td>{staff.salaryType}</td>
                                    <td>
                                        ₹{staff.salaryType === 'Monthly' ? staff.monthlySalary : staff.dailyWage}
                                        {staff.salaryType === 'Daily' ? '/day' : '/mo'}
                                    </td>
                                    <td>
                                        {payrollLoading ? (
                                            <span className="staff-due-badge">…</span>
                                        ) : due !== null ? (
                                            <span className={`staff-due-badge ${due > 0 ? 'pending' : 'clear'}`}>
                                                ₹{due.toLocaleString()}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="staff-row-actions">
                                        <div className="staff-row-attendance-grid">
                                            {ATTENDANCE_OPTIONS.map((opt) => {
                                                const isActive = currentStatus === opt.value;
                                                const isMarking = markingId === `${staff._id}-${opt.value}`;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        className={`staff-attendance-btn-sm ${opt.value.toLowerCase().replace(' ', '-')} ${isActive ? 'active' : ''}`}
                                                        title={opt.full}
                                                        disabled={isMarking}
                                                        onClick={() => handleMarkAttendance(staff._id, opt.value)}
                                                    >
                                                        {isMarking ? '…' : opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="staff-row-action-buttons">
                                            <button onClick={() => openCredentials(staff)} title={staff.hasLoginAccess ? 'Manage Login' : 'Create Login'}>
                                                <IconKey size={16} className={staff.hasLoginAccess ? 'text-success' : ''} />
                                            </button>
                                            <button onClick={() => openDetail(staff)} title="View Details">
                                                <IconChevronRight size={16} />
                                            </button>
                                            <button onClick={() => handleEditClick(staff)} title="Edit">
                                                <IconEdit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(staff._id)} title="Delete" className="danger">
                                                <IconTrash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== Staff Table Pagination ===== */}
            {totalPages > 1 && (
                <div className="staff-pagination">
                    <span className="staff-pagination-info">
                        Showing <strong>{(safePage - 1) * STAFF_PER_PAGE + 1}</strong>–
                        <strong>{Math.min(safePage * STAFF_PER_PAGE, staffList.length)}</strong> of{' '}
                        <strong>{staffList.length}</strong> staff
                    </span>

                    <div className="staff-pagination-controls">
                        <button
                            className="staff-pagination-btn"
                            onClick={() => goToPage(safePage - 1)}
                            disabled={safePage === 1}
                        >
                            <IconChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>

                        <div className="staff-pagination-pages">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    className={`staff-pagination-page ${p === safePage ? 'active' : ''}`}
                                    onClick={() => goToPage(p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            className="staff-pagination-btn"
                            onClick={() => goToPage(safePage + 1)}
                            disabled={safePage === totalPages}
                        >
                            <IconChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ===== Add/Edit Staff Modal ===== */}
            {(showAddModal || showEditModal) && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{showEditModal ? 'Edit Staff' : 'Add New Staff'}</h2>
                            <button className="close-btn" onClick={closeModal}><IconX size={22} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="staff-form">
                            <div className="form-row">
                                <div className="Staff-form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="Staff-form-group">
                                    <label>Role *</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="Staff-form-group">
                                    <label>Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="Staff-form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="Staff-form-group">
                                <label>Joining Date</label>
                                <input
                                    type="date"
                                    value={formData.joiningDate}
                                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                />
                            </div>

                            <div className="Staff-form-group">
                                <label>Salary Type</label>
                                <div className="staff-radio-row">
                                    <label className="staff-radio">
                                        <input
                                            type="radio"
                                            checked={formData.salaryType === 'Monthly'}
                                            onChange={() => setFormData({ ...formData, salaryType: 'Monthly' })}
                                        />
                                        Fixed Monthly
                                    </label>
                                    <label className="staff-radio">
                                        <input
                                            type="radio"
                                            checked={formData.salaryType === 'Daily'}
                                            onChange={() => setFormData({ ...formData, salaryType: 'Daily' })}
                                        />
                                        Daily Wage
                                    </label>
                                </div>
                            </div>

                            {formData.salaryType === 'Monthly' ? (
                                <div className="Staff-form-group">
                                    <label>Monthly Salary (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.monthlySalary}
                                        onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div className="Staff-form-group">
                                    <label>Daily Wage (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.dailyWage}
                                        onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })}
                                    />
                                </div>
                            )}

                            {showEditModal && (
                                <div className="Staff-form-group checkbox">
                                    <input
                                        type="checkbox"
                                        id="staffActive"
                                        checked={formData.isActive !== false}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="staffActive">Active</label>
                                </div>
                            )}

                            <div className="Staff-form-group">
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
                                    {saving ? 'Saving...' : showEditModal ? 'Update Staff' : 'Add Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== Staff Detail Modal ===== */}
            {detailStaff && (
                <div className="modal-overlay" onClick={closeDetail}>
                    <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{detailStaff.name} <span className="staff-detail-role">({detailStaff.role})</span></h2>
                            <button className="close-btn" onClick={closeDetail}><IconX size={22} /></button>
                        </div>

                        <div className="staff-detail-tabs">
                            <button
                                className={detailTab === 'salary' ? 'active' : ''}
                                onClick={() => setDetailTab('salary')}
                            >
                                <IconReceipt2 size={16} /> Salary
                            </button>
                            <button
                                className={detailTab === 'attendance' ? 'active' : ''}
                                onClick={() => setDetailTab('attendance')}
                            >
                                <IconCalendarStats size={16} /> Attendance
                            </button>
                        </div>

                        <div className="staff-detail-body">
                            {detailLoading ? (
                                <p className="staff-empty-text">Loading...</p>
                            ) : detailTab === 'salary' && detailSalary ? (
                                <>
                                    <div className="staff-salary-summary">
                                        <div className="staff-salary-row">
                                            <span>Base Salary ({detailSalary.salaryType})</span>
                                            <span>₹{detailSalary.baseSalary}</span>
                                        </div>
                                        {detailSalary.salaryType === 'Daily' && (
                                            <div className="staff-salary-attendance-note">
                                                Present: {detailSalary.attendanceSummary.presentDays} · Half Day: {detailSalary.attendanceSummary.halfDays} ·
                                                Paid Leave: {detailSalary.attendanceSummary.paidLeaves} · Absent: {detailSalary.attendanceSummary.absentDays}
                                                {' '}→ {detailSalary.attendanceSummary.effectiveDays} paid days
                                            </div>
                                        )}
                                        {detailSalary.bonus > 0 && (
                                            <div className="staff-salary-row plus">
                                                <span>+ Bonus</span><span>₹{detailSalary.bonus}</span>
                                            </div>
                                        )}
                                        {detailSalary.deductions > 0 && (
                                            <div className="staff-salary-row minus">
                                                <span>- Deductions</span><span>₹{detailSalary.deductions}</span>
                                            </div>
                                        )}
                                        <div className="staff-salary-row net">
                                            <span>Net Payable</span><span>₹{detailSalary.netPayable}</span>
                                        </div>
                                        <div className="staff-salary-row">
                                            <span>Advances Given</span><span>₹{detailSalary.advances}</span>
                                        </div>
                                        <div className="staff-salary-row">
                                            <span>Payments Made</span><span>₹{detailSalary.payments}</span>
                                        </div>
                                        <div className="staff-salary-row due">
                                            <span>Amount Due</span><span>₹{detailSalary.dueAmount}</span>
                                        </div>
                                    </div>

                                    <form onSubmit={handleAddTransaction} className="staff-txn-form">
                                        <h4>Add Transaction</h4>
                                        <div className="form-row">
                                            <select
                                                value={txnForm.type}
                                                onChange={(e) => setTxnForm({ ...txnForm, type: e.target.value })}
                                            >
                                                <option value="Payment">Payment (paid to staff)</option>
                                                <option value="Advance">Advance</option>
                                                <option value="Bonus">Bonus</option>
                                                <option value="Deduction">Deduction</option>
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Amount ₹"
                                                min="0"
                                                value={txnForm.amount}
                                                onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Notes (optional)"
                                            value={txnForm.notes}
                                            onChange={(e) => setTxnForm({ ...txnForm, notes: e.target.value })}
                                        />
                                        <button type="submit" className="btn-primary" disabled={addingTxn}>
                                            {addingTxn ? 'Adding...' : 'Add Transaction'}
                                        </button>
                                    </form>

                                    <div className="staff-txn-list">
                                        {detailSalary.transactions.map((t) => (
                                            <div key={t._id} className="staff-txn-row">
                                                <span className={`staff-txn-type ${t.type.toLowerCase()}`}>{t.type}</span>
                                                <span className="staff-txn-amount">₹{t.amount}</span>
                                                <span className="staff-txn-notes">{t.notes}</span>
                                                <button onClick={() => handleDeleteTransaction(t._id)}>
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : detailTab === 'attendance' ? (
                                <div className="staff-attendance-history">
                                    {detailAttendance.length === 0 ? (
                                        <p className="staff-empty-text">There is no record for this month</p>
                                    ) : (
                                        detailAttendance.map((a) => (
                                            <div key={a._id} className="staff-attendance-history-row">
                                                <span>{new Date(a.date).toLocaleDateString('en-GB')}</span>
                                                <span className={`staff-attendance-status ${a.status.toLowerCase().replace(' ', '-')}`}>
                                                    {a.status}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Login Credentials Modal ===== */}
            {credStaff && (
                <div className="modal-overlay" onClick={closeCredentials}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Login Access — {credStaff.name}</h2>
                            <button className="close-btn" onClick={closeCredentials}><IconX size={22} /></button>
                        </div>

                        <form onSubmit={handleSaveCredentials} className="staff-form">
                            <div className="Staff-form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    value={credForm.email}
                                    onChange={(e) => setCredForm({ ...credForm, email: e.target.value })}
                                    placeholder="staff@example.com"
                                    required
                                />
                            </div>

                            <div className="Staff-form-group">
                                <label>Password *</label>
                                <div className="form-row">
                                    <input
                                        type="text"
                                        value={credForm.password}
                                        onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                    />
                                    <button type="button" className="btn-secondary" onClick={generatePassword}>
                                        Generate
                                    </button>
                                </div>
                                <p className="staff-empty-text">
                                    Ye password sirf ab dikhega, dobara nahi milega — save karte hi staff ko note karke de dein.
                                </p>
                            </div>

                            <div className="modal-actions">
                                {credStaff.hasLoginAccess && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => handleRevokeCredentials(credStaff)}
                                    >
                                        Revoke Access
                                    </button>
                                )}
                                <button type="submit" className="btn-primary" disabled={savingCred}>
                                    {savingCred ? 'Saving...' : credStaff.hasLoginAccess ? 'Update Credentials' : 'Create Login'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Staff;