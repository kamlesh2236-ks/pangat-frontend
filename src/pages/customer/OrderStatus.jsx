import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { IconCheck, IconClock, IconChefHat, IconTruck, IconHome, IconStarFilled } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { customerAPI } from '../../utils/api';
import CallWaiterButton from '../Callwaiterbutton';
import BottomNav from './BottomNav';

import './OrderStatus.css';

const OrderStatus = () => {
    const { orderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(null);

    // ---- Rating state ----
    const [overallRating, setOverallRating] = useState(0);
    const [overallHoverRating, setOverallHoverRating] = useState(0);
    const [overallReview, setOverallReview] = useState('');
    const [itemRatings, setItemRatings] = useState({}); // { itemId: rating }
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

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
                if (response.data.data.reviewedAt) {
                    setRatingSubmitted(true);
                }

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

    const setItemRating = (itemId, value) => {
        setItemRatings(prev => ({ ...prev, [itemId]: value }));
    };

    const handleSubmitRating = async () => {
        const itemRatingsArray = Object.entries(itemRatings)
            .filter(([, value]) => value > 0)
            .map(([itemId, rating]) => ({ itemId, rating }));

        if (overallRating === 0 && itemRatingsArray.length === 0) {
            toast.error('Please give at least one rating before submitting');
            return;
        }

        setRatingSubmitting(true);
        try {
            const response = await customerAPI.submitRating(orderId, {
                qrId,
                overallRating: overallRating || undefined,
                overallReview: overallReview.trim() || undefined,
                itemRatings: itemRatingsArray,
            });

            if (response.data.success) {
                toast.success('Thanks for your feedback! 🙏');
                setRatingSubmitted(true);
            }
        } catch (error) {
            console.error('❌ Error submitting rating:', error);
            const errorMsg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Failed to submit rating';
            toast.error(errorMsg);
        } finally {
            setRatingSubmitting(false);
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
        <div className="order-status has-bottom-nav">
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

            {/* ✅ Call Waiter — order place hone ke baad customer kabhi bhi bula sakta hai */}
            <CallWaiterButton
                orderId={order._id}
                qrId={qrId}
                alreadyCalled={order.waiterCallRequested && !order.waiterCallResolved}
            />

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
                        {order.taxAmount > 0 && (
                            <div className="summary-row">
                                <span>GST</span>
                                <span>+₹{order.taxAmount}</span>
                            </div>
                        )}
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

            {/* Rating — dikhta hai jab order Served ho chuka ho */}
            {order.orderStatus === 'Served' && (
                <div className="rating-card">
                    {ratingSubmitted ? (
                        <div className="rating-thanks">
                            <IconStarFilled size={22} />
                            <p>Thanks for rating your order!</p>
                        </div>
                    ) : (
                        <>
                            <h2>Kaisa laga aapka order?</h2>

                            <div className="rating-overall">
                                <span className="rating-overall-label">Overall Experience</span>
                                <div className="rating-stars">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            type="button"
                                            key={star}
                                            className="rating-star-btn"
                                            onMouseEnter={() => setOverallHoverRating(star)}
                                            onMouseLeave={() => setOverallHoverRating(0)}
                                            onClick={() => setOverallRating(star)}
                                            aria-label={`Rate ${star} star`}
                                        >
                                            <IconStarFilled
                                                size={26}
                                                className={(overallHoverRating || overallRating) >= star ? 'star-filled' : 'star-empty'}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                className="rating-review-input"
                                placeholder="Kuch likhna chahenge? (optional)"
                                value={overallReview}
                                onChange={(e) => setOverallReview(e.target.value)}
                                rows={2}
                            />

                            {order.items?.length > 0 && (
                                <div className="rating-items">
                                    <span className="rating-items-label">Rate individual dishes</span>
                                    {order.items.map((item, idx) => {
                                        const itemId = item.itemId || item._id || idx;
                                        return (
                                            <div key={itemId} className="rating-item-row">
                                                <span className="rating-item-name">{item.itemName}</span>
                                                <div className="rating-stars rating-stars-sm">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <button
                                                            type="button"
                                                            key={star}
                                                            className="rating-star-btn"
                                                            onClick={() => setItemRating(itemId, star)}
                                                            aria-label={`Rate ${item.itemName} ${star} star`}
                                                        >
                                                            <IconStarFilled
                                                                size={18}
                                                                className={(itemRatings[itemId] || 0) >= star ? 'star-filled' : 'star-empty'}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <button
                                className="btn-submit-rating"
                                onClick={handleSubmitRating}
                                disabled={ratingSubmitting}
                            >
                                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                            </button>
                        </>
                    )}
                </div>
            )}

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

            <BottomNav />
        </div>
    );
};

export default OrderStatus;