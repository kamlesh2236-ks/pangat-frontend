import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconSearch,
  IconFilter,
  IconRefresh,
  IconCheck,
  IconChecks,
  IconClock,
  IconChefHat,
  IconTruck,
  IconX,
  IconPrinter,
  IconClipboardList,
  IconVolume,
  IconPhone,
  IconMail,
  IconUsers,
  IconReceipt,
  IconMapPin,
  IconChevronLeft,
  IconChevronRight,
  IconCreditCard,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../utils/api';
import { playNewOrderSound, unlockAudio } from '../../utils/notificationSound';
import BillPrint from './BillPrint';
import './AdminOrders.css';

const POLL_INTERVAL_MS = 15000;
const ORDERS_PER_PAGE = 10;
const formatDateIN = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('en-GB'); // en-GB => dd/mm/yyyy
  const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [billOrder, setBillOrder] = useState(null);
  const [showBillPrint, setShowBillPrint] = useState(false);

  const knownOrderIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    fetchOrders();

    const unlock = () => {
      unlockAudio();
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);

    const intervalId = setInterval(fetchOrders, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('click', unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll + close on Escape while modal is open
  useEffect(() => {
    if (!showModal) return;

    document.body.style.overflow = 'hidden';
    const handleKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [showModal]);

  // Reset to page 1 whenever search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPayment]);

  const fetchOrders = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) {
        setLoading(true);
      }

      const response = await ordersAPI.getAll();

      if (response.data.success) {
        const fetchedOrders = response.data.data;
        const currentIds = new Set(fetchedOrders.map((o) => o._id));

        if (!isFirstLoadRef.current) {
          const newOrders = fetchedOrders.filter(
            (o) => !knownOrderIdsRef.current.has(o._id)
          );

          if (newOrders.length > 0) {
            playNewOrderSound();
            newOrders.forEach((o) => {
              toast.success(`🔔 New order #${o.orderNumber} received!`, {
                duration: 5000,
              });
            });
          }
        }

        knownOrderIdsRef.current = currentIds;
        isFirstLoadRef.current = false;

        setOrders(fetchedOrders);

        if (showModal && selectedOrder) {
          const updated = fetchedOrders.find((o) => o._id === selectedOrder._id);
          if (updated) setSelectedOrder(updated);
        }
      } else {
        toast.error(response.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch orders';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, selectedOrder]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || order.orderStatus === filterStatus;
    const matchesPayment = filterPayment === 'all' || order.paymentStatus === filterPayment;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * ORDERS_PER_PAGE,
    safePage * ORDERS_PER_PAGE
  );

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    // scroll orders list into view smoothly on page change
    document.querySelector('.orders-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Placed': '#ff6b35',
      'Confirmed': '#ff914d',
      'Preparing': '#ff914d',
      'Ready': '#4CAF50',
      'Served': '#2196F3',
      'Completed': '#4CAF50',
      'Cancelled': '#f44336',
    };
    return colors[status] || '#999';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Placed':
        return <IconCheck size={16} />;
      case 'Confirmed':
        return <IconChecks size={16} />;
      case 'Preparing':
        return <IconChefHat size={16} />;
      case 'Ready':
        return <IconTruck size={16} />;
      case 'Served':
        return <IconCheck size={16} />;
      default:
        return <IconChecks size={16} />;
    }
  };

  const openModal = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedOrder(null), 200);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await ordersAPI.updateStatus(orderId, newStatus);

      if (response.data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        setSelectedOrder(response.data.data);
        fetchOrders();
      }
    } catch (error) {
      toast.error('Failed to update order status');
      console.error(error);
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      const response = await ordersAPI.updatePaymentStatus(orderId, paymentStatus);

      if (response.data.success) {
        toast.success('Payment status updated');
        setSelectedOrder(response.data.data);
        fetchOrders();
      } else {
        toast.error(response.data.message || 'Failed to update payment status');
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update payment status';
      toast.error(errorMsg);
    }
  };

  const handlePrint = (order) => {
    setShowModal(false);
    setBillOrder(order);
    setShowBillPrint(true);
  };

  const handleBillReady = () => {
    requestAnimationFrame(() => {
      window.print();
    });
  };

  useEffect(() => {
    if (showBillPrint && billOrder) {
      const handleAfterPrint = () => {
        setShowBillPrint(false);
        setBillOrder(null);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      return () => window.removeEventListener('afterprint', handleAfterPrint);
    }
  }, [showBillPrint, billOrder]);

  if (loading) {
    return (
      <div className="admin-orders loading">
        <div className="spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      {/* Header */}
      <div className="orders-header">
        <div className="header-top">
          <h1>Orders Management</h1>
          <div className="header-actions">
            <button className="orderbtn-refresh" onClick={fetchOrders}>
              <IconRefresh size={20} /> Refresh
            </button>
          </div>
        </div>

        <div className="orders-stats-grid">
          <div className="orders-stat-card">
            <div className="orders-stat-value">{orders.length}</div>
            <div className="orders-stat-label">Total Orders</div>
          </div>
          <div className="orders-stat-card">
            <div className="orders-stat-value">{orders.filter(o => o.orderStatus === 'Placed').length}</div>
            <div className="orders-stat-label">New Orders</div>
          </div>
          <div className="orders-stat-card">
            <div className="orders-stat-value">₹{orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}</div>
            <div className="orders-stat-label">Total Revenue</div>
          </div>
          <div className="orders-stat-card">
            <div className="orders-stat-value">{orders.filter(o => o.paymentStatus === 'Pending').length}</div>
            <div className="orders-stat-label">Pending Payments</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <IconSearch size={20} />
          <input
            type="text"
            placeholder="Search by order#, customer name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <div className="filter-group">
            <label>Order Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Placed">Placed</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready</option>
              <option value="Served">Served</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Payment Status:</label>
            <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
              <option value="all">All Payments</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="orders-list">
          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <p>No orders found</p>
            </div>
          ) : (
            <>
              <div className="orders-table">
                {paginatedOrders.map((order) => (
                  <div
                    key={order._id}
                    className="order-card"
                    onClick={() => openModal(order)}
                  >
                    <div className="order-card-header">
                      <div className="order-number-section">
                        <h3>#{order.orderNumber}</h3>
                        <span className="table-badge">Table {order.tableNumber}</span>
                      </div>
                      <div className="order-time">
                        {new Date(order.placedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>

                    <div className="order-card-body">
                      <div className="order-info">
                        <p className="customer-name">{order.customerName}</p>
                        <p className="customer-phone">{order.customerPhone || 'No phone'}</p>
                      </div>

                      <div className="order-items-preview">
                        {order.items?.slice(0, 2).map((item, idx) => (
                          <span key={idx} className="item-badge">
                            {item.quantity}x {item.itemName}
                          </span>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="item-badge more">+{order.items.length - 2} more</span>
                        )}
                      </div>
                    </div>

                    <div className="order-card-footer">
                      <div className="amount-section">
                        <span className="amount">₹{order.totalAmount}</span>
                        <span className={`payment-badge ${order.paymentStatus.toLowerCase()}`}>
                          {order.paymentStatus}
                        </span>
                      </div>

                      <div className="status-section">
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(order.orderStatus) }}
                        >
                          {getStatusIcon(order.orderStatus)}
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ===== Pagination ===== */}
              {totalPages > 1 && (
                <div className="orders-pagination">
                  <span className="orders-pagination-info">
                    Showing <strong>{(safePage - 1) * ORDERS_PER_PAGE + 1}</strong>–
                    <strong>{Math.min(safePage * ORDERS_PER_PAGE, filteredOrders.length)}</strong> of{' '}
                    <strong>{filteredOrders.length}</strong> orders
                  </span>

                  <div className="orders-pagination-controls">
                    <button
                      className="orders-pagination-btn"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                    >
                      <IconChevronLeft size={16} />
                    </button>

                    <div className="orders-pagination-pages">
                      {getPageNumbers()[0] > 1 && (
                        <>
                          <button className="orders-pagination-page" onClick={() => goToPage(1)}>1</button>
                          {getPageNumbers()[0] > 2 && <span className="orders-pagination-dots">…</span>}
                        </>
                      )}

                      {getPageNumbers().map((p) => (
                        <button
                          key={p}
                          className={`orders-pagination-page ${p === safePage ? 'active' : ''}`}
                          onClick={() => goToPage(p)}
                        >
                          {p}
                        </button>
                      ))}

                      {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                        <>
                          {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                            <span className="orders-pagination-dots">…</span>
                          )}
                          <button className="orders-pagination-page" onClick={() => goToPage(totalPages)}>
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      className="orders-pagination-btn"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                    >
                      <IconChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== Order Detail Modal ===== */}
      {selectedOrder && (
        <div
          className={`order-modal-overlay ${showModal ? 'open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={`order-modal ${showModal ? 'open' : ''}`}>
            <div
              className="order-modal-header"
              style={{ '--status-color': getStatusColor(selectedOrder.orderStatus) }}
            >
              <div className="order-modal-header-left">
                <div className="order-modal-icon">
                  <IconReceipt size={22} />
                </div>
                <div>
                  <h2>Order #{selectedOrder.orderNumber}</h2>
                  <div className="order-modal-subline">
                    <span className="order-modal-table">
                      <IconMapPin size={14} /> Table {selectedOrder.tableNumber}
                    </span>
                    <span className="order-modal-time">
                      {formatDateIN(selectedOrder.placedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="order-modal-header-right">
                <span
                  className="order-modal-status-pill"
                  style={{ backgroundColor: getStatusColor(selectedOrder.orderStatus) }}
                >
                  {getStatusIcon(selectedOrder.orderStatus)}
                  {selectedOrder.orderStatus}
                </span>
                <button className="order-modal-close" onClick={closeModal} aria-label="Close">
                  <IconX size={20} />
                </button>
              </div>
            </div>

            <div className="order-modal-body">
              <div className="order-modal-grid">
                <div className="order-modal-card">
                  <span className="order-modal-card-label">
                    <IconUsers size={14} /> Customer
                  </span>
                  <p className="order-modal-card-main">{selectedOrder.customerName}</p>
                  <div className="order-modal-card-sub">
                    <span><IconPhone size={13} /> {selectedOrder.customerPhone || '—'}</span>
                    <span><IconMail size={13} /> {selectedOrder.customerEmail || '—'}</span>
                  </div>
                </div>

                <div className="order-modal-card">
                  <span className="order-modal-card-label">
                    <IconUsers size={14} /> Guest Count
                  </span>
                  <p className="order-modal-card-main">{selectedOrder.guestCount || 1}</p>
                </div>
              </div>

              <div className="order-modal-section">
                <h4 className="order-modal-section-title">
                  <IconToolsKitchen2 size={14} /> Items Ordered
                </h4>
                <div className="order-modal-items">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="order-modal-item-row">
                      <div className="order-modal-item-qty">{item.quantity}×</div>
                      <div className="order-modal-item-info">
                        <p className="order-modal-item-name">
                          {item.itemName}
                          {item.isCombo && <span className="order-modal-combo-tag">COMBO</span>}
                        </p>

                        {item.isCombo && item.comboItems?.length > 0 && (
                          <div className="order-modal-combo-items">
                            {item.comboItems.map((ci, ciIdx) => (
                              <span key={ciIdx} className="order-modal-combo-chip">
                                {ci.quantity}× {ci.itemName}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.specialInstructions && (
                          <p className="order-modal-item-note">{item.specialInstructions}</p>
                        )}
                      </div>
                      <div className="order-modal-item-price">₹{item.price}</div>
                      <div className="order-modal-item-total">₹{item.subtotal}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-modal-section">
                <h4 className="order-modal-section-title">
                  <IconReceipt size={14} /> Billing Summary
                </h4>
                <div className="order-modal-billing">
                  <div className="order-modal-billing-row">
                    <span>Subtotal</span>
                    <span>₹{selectedOrder.subtotal}</span>
                  </div>
                  {/* <div className="order-modal-billing-row">
                    <span>Tax (5%)</span>
                    <span>₹{selectedOrder.taxAmount}</span>
                  </div> */}
                  {selectedOrder.discountAmount > 0 && (
                    <div className="order-modal-billing-row discount">
                      <span>Discount</span>
                      <span>-₹{selectedOrder.discountAmount}</span>
                    </div>
                  )}
                  <div className="order-modal-billing-row total">
                    <span>Total Amount</span>
                    <span>₹{selectedOrder.totalAmount}</span>
                  </div>
                </div>
              </div>

              <div className="order-modal-grid">
                <div className="order-modal-section">
                  <h4 className="order-modal-section-title">
                    <IconClipboardList size={14} /> Order Status
                  </h4>
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => updateOrderStatus(selectedOrder._id, e.target.value)}
                    className="order-modal-select"
                  >
                    <option value="Placed">Placed</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready">Ready</option>
                    <option value="Served">Served</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="order-modal-section">
                  <h4 className="order-modal-section-title">
                    <IconCreditCard size={14} /> Payment
                  </h4>
                  <p className="order-modal-payment-method">{selectedOrder.paymentMethod}</p>
                  <select
                    value={selectedOrder.paymentStatus}
                    onChange={(e) => updatePaymentStatus(selectedOrder._id, e.target.value)}
                    className={`order-modal-select payment ${selectedOrder.paymentStatus.toLowerCase()}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {selectedOrder.specialRequests && (
                <div className="order-modal-section">
                  <h4 className="order-modal-section-title">Special Requests</h4>
                  <p className="order-modal-special-note">{selectedOrder.specialRequests}</p>
                </div>
              )}
            </div>

            <div className="order-modal-footer">
              <button className="order-modal-btn secondary" onClick={closeModal}>
                Close
              </button>
              <button className="order-modal-btn primary" onClick={() => handlePrint(selectedOrder)}>
                <IconPrinter size={18} /> Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {showBillPrint && billOrder && (
        <BillPrint order={billOrder} onReady={handleBillReady} />
      )}
    </div>
  );
};

export default AdminOrders;