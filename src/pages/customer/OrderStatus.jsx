import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { IconCheck, IconClock, IconChefHat, IconTruck, IconHome } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { customerAPI } from '../../utils/api';
import './OrderStatus.css';

const OrderStatus = () => {
    const { orderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Get qrId from query params or location state
    const searchParams = new URLSearchParams(location.search);
    const qrId = searchParams.get('qr') || location.state?.qrId;

    useEffect(() => {
        if (!orderId || !qrId) {
            toast.error('Invalid order information');
            console.error('Missing orderId or qrId');
            return;
        }

        fetchOrderStatus();

        // Poll for order updates every 3 seconds
        const interval = setInterval(fetchOrderStatus, 3000);
        setRefreshInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [orderId, qrId]);

    const fetchOrderStatus = async () => {
        try {
            if (!orderId || !qrId) {
                console.error('Missing orderId or qrId');
                return;
            }

            console.log('🔄 Fetching order status...');

            const response = await customerAPI.getOrderStatus(orderId, qrId);

            console.log('✅ Order status:', response.data);

            if (response.data.success) {
                setOrder(response.data.data);
            }
        } catch (error) {
            console.error('❌ Error fetching order status:', error);

            const errorMsg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to fetch order status';

            // Only show error once, don't spam toast
            if (error.response?.status !== 404) {
                // toast.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status, color) => {
        switch (status) {
            case "Placed":
                return <IconCheck size={24} color={color} />;
            case "Confirmed":
                return <IconClock size={24} color={color} />;
            case "Preparing":
                return <IconChefHat size={24} color={color} />;
            case "Ready":
                return <IconTruck size={24} color={color} />;
            case "Served":
                return <IconHome size={24} color={color} />;
            default:
                return <IconCheck size={24} color={color} />;
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Placed':
                return '#ff6b35';
            case 'Confirmed':
                return '#ff914d';
            case 'Preparing':
                return '#ff914d';
            case 'Ready':
                return '#4CAF50';
            case 'Served':
                return '#2196F3';
            default:
                return '#999';
        }
    };

    if (loading) {
        return (
            <div className="order-status loading-state">
                <div className="spinner"></div>
                <p>Loading order status...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="order-status error-state">
                <p>Order not found</p>
                <button onClick={() => navigate('/')}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="order-status">
            {/* Header */}
            <div className="status-header">
                <h1>Order Status</h1>
                <p className="order-number">#{order.orderNumber}</p>
            </div>

            {/* Status Timeline */}
            <div className="status-timeline">
                <div className={`timeline-item ${['Placed', 'Confirmed', 'Preparing', 'Ready', 'Served'].includes(order.orderStatus) ? 'active' : ''}`}>
                    <div className="timeline-icon" style={{ backgroundColor: '#ff6b35' }}>
                        <IconCheck size={20} color="white" />
                    </div>
                    <div className="timeline-label">
                        <h3>Order Placed</h3>
                        <p>{new Date(order.placedAt).toLocaleTimeString()}</p>
                    </div>
                </div>

                <div className={`timeline-item ${['Confirmed', 'Preparing', 'Ready', 'Served'].includes(order.orderStatus) ? 'active' : ''}`}>
                    <div className="timeline-icon" style={{ backgroundColor: order.confirmedAt ? '#ff914d' : '#ddd' }}>
                        <IconCheck size={20} color="white" />
                    </div>
                    <div className="timeline-label">
                        <h3>Confirmed</h3>
                        <p>{order.confirmedAt ? new Date(order.confirmedAt).toLocaleTimeString() : 'Pending...'}</p>
                    </div>
                </div>

                <div className={`timeline-item ${['Preparing', 'Ready', 'Served'].includes(order.orderStatus) ? 'active' : ''}`}>
                    <div className="timeline-icon" style={{ backgroundColor: order.preparationStartedAt ? '#ff914d' : '#ddd' }}>
                        <IconChefHat size={20} color="white" />
                    </div>
                    <div className="timeline-label">
                        <h3>Preparing</h3>
                        <p>{order.preparationStartedAt ? new Date(order.preparationStartedAt).toLocaleTimeString() : 'Pending...'}</p>
                    </div>
                </div>

                <div className={`timeline-item ${['Ready', 'Served'].includes(order.orderStatus) ? 'active' : ''}`}>
                    <div className="timeline-icon" style={{ backgroundColor: order.readyAt ? '#4CAF50' : '#ddd' }}>
                        <IconTruck size={20} color="white" />
                    </div>
                    <div className="timeline-label">
                        <h3>Ready</h3>
                        <p>{order.readyAt ? new Date(order.readyAt).toLocaleTimeString() : 'Pending...'}</p>
                    </div>
                </div>

                <div className={`timeline-item ${order.orderStatus === 'Served' ? 'active' : ''}`}>
                    <div className="timeline-icon" style={{ backgroundColor: order.servedAt ? '#2196F3' : '#ddd' }}>
                        <IconHome size={20} color="white" />
                    </div>
                    <div className="timeline-label">
                        <h3>Served</h3>
                        <p>{order.servedAt ? new Date(order.servedAt).toLocaleTimeString() : 'Pending...'}</p>
                    </div>
                </div>
            </div>

            {/* Order Details */}
            <div className="order-details">
                <h2>Order Details</h2>

                <div className="detail-section">
                    <h3>Items</h3>
                    <div className="items-list">
                        {order.items?.map((item, index) => (
                            <div key={index} className="order-item">
                                <div className="item-info">
                                    <p className="item-name">{item.itemName}</p>
                                    <p className="item-price">₹{item.price}</p>
                                </div>
                                <div className="item-quantity">
                                    x{item.quantity}
                                </div>
                                <div className="item-subtotal">
                                    ₹{item.subtotal}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Bill Summary</h3>
                    <div className="bill-summary">
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>₹{order.subtotal}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>₹{order.totalAmount}</span>
                        </div>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Payment Info</h3>
                    <div className="info-row">
                        <span>Method:</span>
                        <strong>{order.paymentMethod}</strong>
                    </div>
                    <div className="info-row">
                        <span>Status:</span>
                        <strong style={{ color: order.paymentStatus === 'Completed' ? '#4CAF50' : '#ff6b35' }}>
                            {order.paymentStatus}
                        </strong>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Table Info</h3>
                    <div className="info-row">
                        <span>Table Number:</span>
                        <strong>{order.tableNumber}</strong>
                    </div>
                    <div className="info-row">
                        <span>Customer Name:</span>
                        <strong>{order.customerName}</strong>
                    </div>
                </div>
            </div>

            {/* Current Status */}
            <div className="current-status">
                <div
                    className="status-badges"
                    style={{
                        borderColor: getStatusColor(order.orderStatus),
                        color: getStatusColor(order.orderStatus)
                    }}
                >
                    {getStatusIcon(order.orderStatus, getStatusColor(order.orderStatus))}
                    <span>{order.orderStatus}</span>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="action-buttons">
                <button className="btn-refresh" onClick={fetchOrderStatus}>
                    🔄 Refresh Status
                </button>
            </div>
        </div>
    );
};

export default OrderStatus;