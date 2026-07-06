import React, { useEffect, useRef, useState } from 'react';
import { restaurantAPI } from '../../utils/api';
import './Billprint.css';

// Fallback values used only if the API call fails (so printing never breaks)
const FALLBACK_RESTAURANT = {
  name: 'RESTAURANT',
  addressLine: '',
  phone: '',
  upiId: '',
};

const buildUpiLink = ({ upiId, name, amount, orderNumber }) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount,
    cu: 'INR',
    tn: `Bill ${orderNumber || ''}`.trim(),
  });
  return `upi://pay?${params.toString()}`;
};

const BillPrint = ({ order, onReady }) => {
  const firedRef = useRef(false);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  const fireReady = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReady?.();
  };

  const resolveRestaurantId = () => {
    if (order?.restaurantId) return order.restaurantId;
    try {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
      return adminUser?._id || adminUser?.id || adminUser?.restaurantId || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchRestaurant = async () => {
      const restaurantId = resolveRestaurantId();

      if (!restaurantId) {
        if (isMounted) {
          setRestaurant(FALLBACK_RESTAURANT);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await restaurantAPI.getPublicInfo(restaurantId);
        const data = res?.data?.data || res?.data;
        if (isMounted) {
          setRestaurant({
            name: data?.name || FALLBACK_RESTAURANT.name,
            addressLine: data?.addressLine || FALLBACK_RESTAURANT.addressLine,
            phone: data?.phone || FALLBACK_RESTAURANT.phone,
            upiId: data?.upiId || FALLBACK_RESTAURANT.upiId,
          });
        }
      } catch (err) {
        console.error('Failed to fetch restaurant info for bill:', err);
        if (isMounted) {
          setRestaurant(FALLBACK_RESTAURANT);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRestaurant();
    return () => {
      isMounted = false;
    };
  }, [order]);

  const isPaid = (order?.paymentStatus || '').toLowerCase() === 'completed';
  const hasUpi = Boolean(restaurant?.upiId);

  const upiLink = restaurant
    ? buildUpiLink({
      upiId: restaurant.upiId,
      name: restaurant.name,
      amount: order?.totalAmount,
      orderNumber: order?.orderNumber,
    })
    : '';

  const qrSrc = upiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      upiLink
    )}`
    : '';


  useEffect(() => {
    if (!order || loading) return;
    if (isPaid || !hasUpi) {
      fireReady();
    }

    const fallback = setTimeout(fireReady, 2000);
    return () => clearTimeout(fallback);

  }, [order, loading, isPaid, hasUpi]);


  if (!order) return null;

  if (loading || !restaurant) {
    return (
      <div className="bill-print-root">
        <div className="bill-paper bill-loading">
          <p>Loading bill...</p>
        </div>
      </div>
    );
  }

  const placedDate = order.placedAt ? new Date(order.placedAt) : new Date();
  const dateStr = placedDate.toLocaleDateString('en-GB').replace(/\//g, '/');
  const timeStr = placedDate
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();

  // Counter billing me walk-in orders ka tableNumber nahi hota (null) —
  // is case me "Table No" row ki jagah "Walk-in Order" dikhayenge.
  const isWalkIn = order.tableNumber === null || order.tableNumber === undefined;

  return (
    <div className="bill-print-root">
      <div className="bill-paper">
        <div className="bill-header">
          <h1>{restaurant.name}</h1>
          {restaurant.addressLine && <p>{restaurant.addressLine}</p>}
          {restaurant.phone && <p>Ph: {restaurant.phone}</p>}
        </div>

        <div className="bill-title">
          <h2>TAX INVOICE</h2>
          <p>Bill No: #{order.billNumber || order.orderNumber}</p>
        </div>

        <div className="bill-divider" />

        <div className="bill-row">
          <span>Order Date:</span>
          <span>{dateStr}</span>
        </div>
        <div className="bill-row">
          <span>Order Time:</span>
          <span>{timeStr}</span>
        </div>
        <div className="bill-row">
          <span>{isWalkIn ? 'Order Type:' : 'Table No:'}</span>
          <span>{isWalkIn ? 'Walk-in / Counter' : order.tableNumber}</span>
        </div>

        <div className="bill-divider" />

        <div className="bill-row">
          <span>Customer:</span>
          <span>{order.customerName || (isWalkIn ? 'Walk-in Customer' : `Table_${order.tableNumber}`)}</span>
        </div>
        <div className="bill-row">
          <span>Mobile:</span>
          <span>{order.customerPhone || '-'}</span>
        </div>

        <div className="bill-divider" />

        <div className="bill-items-header">
          <span className="col-item">ITEM</span>
          <span className="col-qty">QTY</span>
          <span className="col-price">PRICE</span>
          <span className="col-total">TOTAL</span>
        </div>
        {order.items?.map((item, idx) => (
          <div className="bill-item-block" key={idx}>
            <div className="bill-items-row">
              <span className="col-item">{item.itemName}</span>
              <span className="col-qty">{item.quantity}</span>
              <span className="col-price">{item.price}</span>
              <span className="col-total">{item.subtotal}</span>
            </div>

            {/* ✅ Combo ke andar kaunse items hain, bill pe bhi dikhega */}
            {item.isCombo && item.comboItems?.length > 0 && (
              <div className="bill-combo-row">
                <span className="bill-combo-label">↳ Includes:</span>
                <span className="bill-combo-list">
                  {item.comboItems
                    .map((ci) => `${ci.quantity}x ${ci.itemName}`)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}

        <div className="bill-divider" />

        {order.discountAmount > 0 && (
          <>
            <div className="bill-row">
              <span>Subtotal:</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="bill-row">
              <span>Discount{order.discountReason ? ` (${order.discountReason})` : ''}:</span>
              <span>-₹{order.discountAmount}</span>
            </div>
            <div className="bill-divider" />
          </>
        )}

        <div className="bill-total-row">
          <span>TOTAL AMOUNT:</span>
          <span>₹{order.totalAmount}</span>
        </div>

        {!isPaid && hasUpi && (
          <div className="bill-qr-box">
            <div className="bill-qr-title">
              <span>&#9635; SCAN &amp; PAY</span>
            </div>
            <img
              className="bill-qr-img"
              src={qrSrc}
              alt="Scan to pay via UPI"
              onLoad={fireReady}
              onError={fireReady}
            />
            <div className="bill-qr-amount">₹{Number(order.totalAmount).toFixed(2)}</div>
            <div className="bill-qr-upi">&#127968; {restaurant.upiId}</div>
            <div className="bill-qr-hint">Scan QR code with any upi app</div>
            <div className="bill-pay-btn">&#128241; Pay ₹{order.totalAmount} via UPI</div>
            <div className="bill-qr-apps">Google pay | phonepe | paytm | bhim</div>
          </div>
        )}

        <div className="bill-status-row">
          {(order.paymentStatus || 'PENDING').toUpperCase()} | {(order.paymentMethod || 'CASH').toUpperCase()}
        </div>

        <div className="bill-footer">
          <p>&#127881; THANK YOU! &#127881;</p>
          <p>Visit Again</p>
          <p className="bill-footer-note">- Computer Generated Bill -</p>
        </div>
      </div>
    </div>
  );
};

export default BillPrint;