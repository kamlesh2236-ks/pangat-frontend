import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { menuAPI, tablesAPI, ordersAPI, profileAPI } from '../../utils/api';
import BillPrint from '../Orders/BillPrint';
import './Billing.css';

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', icon: IconCash },
  { value: 'UPI', label: 'UPI', icon: IconDeviceMobile },
  // { value: 'Card', label: 'Card', icon: IconCreditCard },
  // { value: 'Wallet', label: 'Wallet', icon: IconWallet },
];

const ITEMS_PER_PAGE = 6;
const SKELETON_CARDS = Array.from({ length: 6 });

const Billing = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);

  // Menu and tables are independent — the page shell should never wait for both.
  // Menu is what the user actually needs first (they're here to bill items), so
  // it gets its own loading flag and renders as soon as it's back, regardless of
  // how long the tables call takes.
  const [menuLoading, setMenuLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(true);

  // 👇 GST settings — fetched once from the restaurant's profile.
  // These only control what the cashier SEES as a live preview here;
  // the actual, authoritative tax amount is calculated server-side
  // inside createCounterBill (using the same restaurant record), so a
  // stale/cached value here can never under- or over-charge the customer.
  const [gstSettings, setGstSettings] = useState({ enabled: false, percentage: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const catRefs = useRef({});
  const [currentPage, setCurrentPage] = useState(1);

  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('walkin');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Completed');

  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const [generating, setGenerating] = useState(false);
  const [billOrder, setBillOrder] = useState(null);
  const [showBillPrint, setShowBillPrint] = useState(false);

  const fetchMenu = async () => {
    try {
      setMenuLoading(true);
      const menuRes = await menuAPI.getAll();
      if (menuRes.data.success) setMenuItems(menuRes.data.data);
    } catch (error) {
      toast.error('Failed to load menu');
      console.error(error);
    } finally {
      setMenuLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      setTablesLoading(true);
      const tablesRes = await tablesAPI.getAll();
      if (tablesRes.data.success) setTables(tablesRes.data.data);
    } catch (error) {
      toast.error('Failed to load tables');
      console.error(error);
    } finally {
      setTablesLoading(false);
    }
  };

  // 👇 Restaurant's GST toggle + percentage, set on the Profile page.
  const fetchGstSettings = async () => {
    try {
      const res = await profileAPI.getProfile();
      if (res.data.success) {
        const data = res.data.data;
        setGstSettings({
          enabled: Boolean(data.gstEnabled),
          percentage: Number(data.gstPercentage) || 0,
        });
      }
    } catch (error) {
      // Silent fail — billing should still work without GST preview
      console.error('Failed to load GST settings:', error);
    }
  };

  useEffect(() => {
    // Fired together but tracked independently — whichever comes back first
    // updates its own section without waiting for the other.
    fetchMenu();
    fetchTables();
    fetchGstSettings();
  }, []);

  useEffect(() => {
    const el = catRefs.current[activeCategory];
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeCategory]);

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

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

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

  // 👇 GST is applied on (subtotal - discount), not on raw subtotal —
  // matches standard billing practice of taxing the discounted amount.
  const taxableAmount = Math.max(cartSubtotal - discount, 0);
  const gstAmount = gstSettings.enabled
    ? Math.round(taxableAmount * (gstSettings.percentage / 100) * 100) / 100
    : 0;

  const cartTotal = Math.round((taxableAmount + gstAmount) * 100) / 100;

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
        // Note: GST is NOT sent from the client — the backend recalculates
        // it itself from the restaurant's saved gstEnabled/gstPercentage,
        // so a tampered request body can never change the tax charged.
      };

      const response = await ordersAPI.createCounterBill(payload);

      if (response.data.success) {
        toast.success('The bill has been generated.!');
        setBillOrder(response.data.data);
        setShowBillPrint(true);
        resetForm();
        // Table list refresh karo agar table free hui ho
        if (orderType === 'table') {
          fetchTables();
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

  // The page shell (search bar, category tabs, cart panel) always renders immediately.
  // Only the menu grid and the table dropdown show their own inline loading states.

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
              disabled={menuLoading}
            />
          </div>
        </div>

        {!menuLoading && (
          <div className="billing-category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                ref={(el) => (catRefs.current[cat] = el)}
                className={`billing-cat-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="billing-menu-grid">
          {menuLoading ? (
            SKELETON_CARDS.map((_, i) => (
              <div key={i} className="billing-menu-card billing-menu-card-skeleton">
                <div className="billing-menu-card-img-wrap skeleton-block" />
                <div className="billing-menu-card-body">
                  <div className="skeleton-line" style={{ width: '70%' }} />
                  <div className="skeleton-line" style={{ width: '40%' }} />
                </div>
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="billing-empty">No items found</div>
          ) : (
            paginatedItems.map((item) => (
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

        {/* ===== Pagination (menu panel ke andar, grid ke turant baad) ===== */}
        {!menuLoading && filteredItems.length > ITEMS_PER_PAGE && (
          <div className="billing-pagination">
            <button
              className="billing-pagination-btn"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
            >
              <IconChevronLeft size={16} />
            </button>

            <span className="billing-pagination-info">
              Page {safePage} of {totalPages}
            </span>

            <button
              className="billing-pagination-btn"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        )}
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
            disabled={tablesLoading}
          >
            <option value="">
              {tablesLoading ? 'Loading tables...' : 'Select Table'}
            </option>
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
          {gstSettings.enabled && (
            <div className="billing-summary-row">
              <span>GST ({gstSettings.percentage}%)</span>
              <span>+₹{gstAmount.toFixed(2)}</span>
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
              onClick={() => {
                setPaymentMethod(value);
                setPaymentStatus(value === 'UPI' ? 'Pending' : 'Completed');
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <button
          className="billing-generate-btn"
          onClick={handleGenerateBill}
          disabled={generating || menuLoading || cart.length === 0}
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