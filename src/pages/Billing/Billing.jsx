import React, { useState, useEffect, useMemo } from 'react';
import {
  IconSearch,
  IconPlus,
  IconMinus,
  IconTrash,
  IconReceipt,
  IconUser,
  IconPhone,
  IconArmchair,
  IconWalk,
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconWallet,
  IconTag,
  IconPrinter,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { menuAPI, tablesAPI, ordersAPI } from '../../utils/api';
import BillPrint from '../Orders/BillPrint';
import './Billing.css';

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', icon: IconCash },
  { value: 'UPI', label: 'UPI', icon: IconDeviceMobile },
  { value: 'Card', label: 'Card', icon: IconCreditCard },
  { value: 'Wallet', label: 'Wallet', icon: IconWallet },
];

const Billing = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [cart, setCart] = useState([]); // [{ menuItemId, name, price, quantity, specialInstructions }]

  const [orderType, setOrderType] = useState('walkin'); // 'walkin' | 'table'
  const [selectedTableId, setSelectedTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Completed'); // 'Completed' | 'Pending'

  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const [generating, setGenerating] = useState(false);
  const [billOrder, setBillOrder] = useState(null);
  const [showBillPrint, setShowBillPrint] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [menuRes, tablesRes] = await Promise.all([
        menuAPI.getAll(),
        tablesAPI.getAll(),
      ]);

      if (menuRes.data.success) setMenuItems(menuRes.data.data);
      if (tablesRes.data.success) setTables(tablesRes.data.data);
    } catch (error) {
      toast.error('Failed to load menu / tables');
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  const handleBillReady = () => {
    requestAnimationFrame(() => {
      window.print();
    });
  };

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((item) => item.category));
    return ['All', ...Array.from(cats)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchTerm]);

  // ---------- Cart logic ----------
  const addToCart = (menuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItem._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItem._id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          specialInstructions: '',
        },
      ];
    });
  };

  const changeQty = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.menuItemId === menuItemId
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  );

  const discount = Number(discountAmount) || 0;
  const cartTotal = Math.max(cartSubtotal - discount, 0);

  const resetForm = () => {
    setCart([]);
    setOrderType('walkin');
    setSelectedTableId('');
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMethod('Cash');
    setPaymentStatus('Completed');
    setDiscountAmount('');
    setDiscountReason('');
  };

  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      toast.error('Cart Empty');
      return;
    }

    if (orderType === 'table' && !selectedTableId) {
      toast.error('Selecting the table is necessary.');
      return;
    }

    try {
      setGenerating(true);

      const payload = {
        orderType,
        tableId: orderType === 'table' ? selectedTableId : undefined,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
        })),
        paymentMethod,
        paymentStatus,
        discountAmount: discount,
        discountReason: discount > 0 ? discountReason.trim() : undefined,
      };

      const response = await ordersAPI.createCounterBill(payload);

      if (response.data.success) {
        toast.success('The bill has been generated.!');
        setBillOrder(response.data.data);
        setShowBillPrint(true);
        resetForm();
        // Table list refresh karo agar table free hui ho
        if (orderType === 'table') {
          const tablesRes = await tablesAPI.getAll();
          if (tablesRes.data.success) setTables(tablesRes.data.data);
        }
      } else {
        toast.error(response.data.message || 'The bill could not be generated');
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'The bill could not be generated';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="billing-page loading">
        <div className="spinner"></div>
        <p>Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="billing-page">
      {/* ===== LEFT: Menu ===== */}
      <div className="billing-menu-panel">
        <div className="billing-menu-header">
          <h1>
            <IconReceipt size={24} /> Counter Billing
          </h1>
          <div className="billing-search-box">
            <IconSearch size={18} />
            <input
              type="text"
              placeholder="Search menu item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="billing-category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`billing-cat-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="billing-menu-grid">
          {filteredItems.length === 0 ? (
            <div className="billing-empty">No items found</div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item._id}
                className="billing-menu-card"
                onClick={() => addToCart(item)}
              >
                <div className="billing-menu-card-img-wrap">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="billing-menu-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="billing-menu-card-img-placeholder"
                    style={{ display: item.image ? 'none' : 'flex' }}
                  >
                    <IconReceipt size={20} />
                  </div>
                </div>

                <div className="billing-menu-card-body">
                  <div className="billing-menu-card-top">
                    <span className="billing-menu-card-name">{item.name}</span>
                    <span className="billing-menu-card-price">₹{item.price}</span>
                  </div>
                  <span className="billing-menu-card-category">{item.category}</span>
                  <button className="billing-menu-card-add" tabIndex={-1}>
                    <IconPlus size={16} /> Add
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== RIGHT: Cart / Checkout ===== */}
      <div className="billing-cart-panel">
        <div className="billing-order-type">
          <button
            className={`billing-type-btn ${orderType === 'walkin' ? 'active' : ''}`}
            onClick={() => setOrderType('walkin')}
          >
            <IconWalk size={18} /> Walk-in
          </button>
          <button
            className={`billing-type-btn ${orderType === 'table' ? 'active' : ''}`}
            onClick={() => setOrderType('table')}
          >
            <IconArmchair size={18} /> Table
          </button>
        </div>

        {orderType === 'table' && (
          <select
            className="billing-select"
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
          >
            <option value="">Select Table</option>
            {tables.map((t) => (
              <option key={t._id} value={t._id}>
                Table {t.tableNumber} {t.status === 'Occupied' ? '(Occupied)' : ''}
              </option>
            ))}
          </select>
        )}

        <div className="billing-customer-fields">
          <div className="billing-input-group">
            <IconUser size={16} />
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="billing-input-group">
            <IconPhone size={16} />
            <input
              type="text"
              placeholder="Phone (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="billing-cart-items">
          {cart.length === 0 ? (
            <div className="billing-cart-empty">
             Select items from the menu — your cart will appear here
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.menuItemId} className="billing-cart-row">
                <div className="billing-cart-row-info">
                  <span className="billing-cart-row-name">{item.name}</span>
                  <span className="billing-cart-row-price">
                    ₹{item.price} × {item.quantity} = ₹
                    {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                <div className="billing-cart-row-actions">
                  <button onClick={() => changeQty(item.menuItemId, -1)}>
                    <IconMinus size={14} />
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => changeQty(item.menuItemId, 1)}>
                    <IconPlus size={14} />
                  </button>
                  <button
                    className="billing-cart-remove"
                    onClick={() => removeFromCart(item.menuItemId)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="billing-discount-row">
          <IconTag size={16} />
          <input
            type="number"
            min="0"
            placeholder="Discount ₹"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
          />
          {discount > 0 && (
            <input
              type="text"
              placeholder="Reason"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />
          )}
        </div>

        <div className="billing-summary">
          <div className="billing-summary-row">
            <span>Subtotal</span>
            <span>₹{cartSubtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="billing-summary-row discount">
              <span>Discount</span>
              <span>-₹{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="billing-summary-row total">
            <span>Total</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="billing-payment-methods">
          {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`billing-payment-btn ${paymentMethod === value ? 'active' : ''}`}
              onClick={() => setPaymentMethod(value)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="billing-payment-status">
          <label>
            <input
              type="radio"
              checked={paymentStatus === 'Completed'}
              onChange={() => setPaymentStatus('Completed')}
            />
            Paid now
          </label>
          <label>
            <input
              type="radio"
              checked={paymentStatus === 'Pending'}
              onChange={() => setPaymentStatus('Pending')}
            />
            Pay later
          </label>
        </div>

        <button
          className="billing-generate-btn"
          onClick={handleGenerateBill}
          disabled={generating || cart.length === 0}
        >
          <IconPrinter size={18} />
          {generating ? 'Generating...' : `Generate Bill · ₹${cartTotal.toFixed(2)}`}
        </button>
      </div>

      {showBillPrint && billOrder && (
        <BillPrint order={billOrder} onReady={handleBillReady} />
      )}
    </div>
  );
};

export default Billing;
