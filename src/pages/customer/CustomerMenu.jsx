import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    IconShoppingCart, IconMinus, IconPlus, IconX,
    IconLeaf, IconReceipt2, IconUser, IconPhone,
    IconShoppingBagCheck, IconMoodEmpty, IconChevronUp, IconMail, IconCash, IconCreditCard,
    IconChevronRight, IconArrowLeft
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { customerAPI } from '../../utils/api';
import './CustomerMenu.css';


const CustomerMenu = () => {
    const { restaurantId, tableNumber } = useParams();
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState([]);
    const [banners, setBanners] = useState([]);
    const [activeBanner, setActiveBanner] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [orderPlacing, setOrderPlacing] = useState(false);
    const [restaurantInfo, setRestaurantInfo] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [tableNotFound, setTableNotFound] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' -> items review, 'details' -> customer info + place order

    const bannerTimerRef = useRef(null);

    useEffect(() => {
        if (!restaurantId || !tableNumber) {
            toast.error('Invalid QR code');
            navigate('/');
            return;
        }
        fetchMenuItems();
    }, [restaurantId, tableNumber]);

    // ---------- Keep menu/banners fresh without a manual page refresh ----------
    // 1) Poll every 30s in the background (no loading spinner, no error toast)
    // 2) Refetch immediately when the customer's phone screen/tab becomes active
    //    again (they may have had it locked/backgrounded for a while)
    useEffect(() => {
        if (!restaurantId || !tableNumber || tableNotFound) return;

        const pollInterval = setInterval(() => {
            fetchMenuItems(true);
        }, 30000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchMenuItems(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [restaurantId, tableNumber, tableNotFound]);

    // ---------- Banner auto-advance ----------
    useEffect(() => {
        if (banners.length <= 1) return;

        bannerTimerRef.current = setInterval(() => {
            setActiveBanner((prev) => (prev + 1) % banners.length);
        }, 4000);

        return () => clearInterval(bannerTimerRef.current);
    }, [banners]);

    const fetchMenuItems = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            setTableNotFound(false);
            const qrId = restaurantId.startsWith('restaurant_')
                ? restaurantId
                : `restaurant_${restaurantId}`;

            const response = await customerAPI.getMenu(qrId, tableNumber);

            if (response.data.success) {
                setMenuItems(response.data.data.items || []);
                setRestaurantInfo(response.data.data.restaurant || null);
            }

            // Banners aa jayein toh accha, na aayein toh menu load hone se rokna nahi hai —
            // isliye alag try/catch mein, silently fail karta hai.
            fetchBanners(qrId);
        } catch (error) {
            console.error('Error fetching menu:', error);

            // ✅ Table not found ko alag handle karo
            if (error.response?.status === 404 &&
                error.response?.data?.message?.toLowerCase().includes('table')) {
                setTableNotFound(true);
                return;
            }

            // Background refresh fail ho jaye toh customer ko error dikhane ki zaroorat nahi —
            // unka existing menu already screen pe hai.
            if (!isSilent) {
                const errorMsg =
                    error.response?.data?.message ||
                    error.response?.data?.error ||
                    error.message ||
                    'Failed to load menu. Please try again.';

                toast.error(errorMsg);
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    const fetchBanners = async (qrId) => {
        try {
            const response = await customerAPI.getBanners(qrId);
            if (response.data.success) {
                setBanners(response.data.data || []);
            }
        } catch (error) {
            // Banners optional hain — menu ka experience block nahi hona chahiye
            console.error('Error fetching banners:', error);
        }
    };

    // ---------- Banner click → scroll to linked category ----------
    const handleBannerClick = (banner) => {
        if (!banner.linkedCategory) return;

        const target = document.getElementById(`category-${banner.linkedCategory}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const goToBanner = (index) => {
        setActiveBanner(index);
        // restart the auto-advance timer so it doesn't jump right after a manual click
        clearInterval(bannerTimerRef.current);
        if (banners.length > 1) {
            bannerTimerRef.current = setInterval(() => {
                setActiveBanner((prev) => (prev + 1) % banners.length);
            }, 4000);
        }
    };

    // ... rest of the component remains same
    const addToCart = (item) => {
        const existingItem = cart.find(c => c._id === item._id);

        if (existingItem) {
            setCart(cart.map(c =>
                c._id === item._id
                    ? { ...c, quantity: c.quantity + 1 }
                    : c
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
        toast.success(`${item.name} added to cart`);
    };

    const updateQuantity = (itemId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(itemId);
            return;
        }
        setCart(cart.map(c =>
            c._id === itemId ? { ...c, quantity } : c
        ));
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter(c => c._id !== itemId));
        toast.success('Item removed from cart');
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const getCartItemCount = () => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    };

    // Cart ko hamesha 'items review' step se khulna chahiye, chahe pehle kabhi
    // 'details' step pe chhoda ho
    const openCart = () => {
        setCheckoutStep('cart');
        setShowCart(true);
    };

    const goToDetailsStep = () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }
        setCheckoutStep('details');
    };

    const goBackToCartStep = () => {
        setCheckoutStep('cart');
    };

    const placeOrder = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        if (!customerName.trim()) {
            toast.error('Please enter your name to place the order');
            return;
        }

        setOrderPlacing(true);
        try {
            const qrId = restaurantId;

            const orderData = {
                qrId,
                tableNumber: parseInt(tableNumber),
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim() || undefined,
                customerEmail: customerEmail.trim() || undefined,
                items: cart.map(item => ({
                    itemId: item._id,
                    quantity: item.quantity,
                    specialInstructions: item.notes || '',
                })),
                paymentMethod,
            };

            console.log('📤 Placing order:', orderData);

            const response = await customerAPI.placeOrder(orderData);

            if (response.data.success) {
                toast.success('Order placed successfully! 🎉');
                setCart([]);
                setShowCart(false);

                setTimeout(() => {
                    navigate(`/order-status/${response.data.data.orderId}?qr=${qrId}`, {
                        state: { orderId: response.data.data.orderId, qrId }
                    });
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Error placing order:', error);
            const errorMsg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Failed to place order';
            toast.error(errorMsg);
        } finally {
            setOrderPlacing(false);
        }
    };

    if (loading) {
        return (
            <div className="customer-menu loading-state">
                <div className="skeleton-header" />
                <div className="skeleton-grid">
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
                </div>
            </div>
        );
    }

    if (tableNotFound) {
        return (
            <div className="customer-menu empty-menu" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <IconMoodEmpty size={56} stroke={1.5} />
                <h2>Table Not Found</h2>
                <p>Table {tableNumber} doesn't exist for this restaurant. Please scan a valid QR code.</p>
            </div>
        );
    }

    // Group menu items by category so banner clicks can jump to a section.
    // Items without a category fall into "Other".
    const groupedMenu = menuItems.reduce((groups, item) => {
        const key = item.category || 'Other';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
    }, {});
    const categoryNames = Object.keys(groupedMenu);
    const hasCategories = categoryNames.length > 1 || (categoryNames.length === 1 && categoryNames[0] !== 'Other');

    return (
        <div className="customer-menu">
            <div className="menu-header">
                <div className="header-content">
                    <div className="restaurant-identity">
                        {restaurantInfo?.logo ? (
                            <img
                                src={restaurantInfo.logo}
                                alt={restaurantInfo.name}
                                className="restaurant-logo"
                            />
                        ) : (
                            <div className="restaurant-logo-fallback">
                                {(restaurantInfo?.name || 'R').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="restaurant-text">
                            <h1>{restaurantInfo?.name || 'Restaurant Menu'}</h1>
                            <div className="header-meta">
                                <span className="table-info">Table {tableNumber}</span>
                                {restaurantInfo?.cuisine?.length > 0 && (
                                    <span className="cuisine-tag">
                                        {restaurantInfo.cuisine.slice(0, 2).join(' · ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="cart-button" onClick={() => (showCart ? setShowCart(false) : openCart())}>
                        <IconShoppingCart size={22} stroke={2} />
                        {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
                    </button>
                </div>
            </div>

            {/* ===== Offer Banner Slider ===== */}
            {banners.length > 0 && (
                <div className="offer-banner-slider">
                    <div
                        className="offer-banner-track"
                        style={{ transform: `translateX(-${activeBanner * 100}%)` }}
                    >
                        {banners.map((banner) => (
                            <div
                                key={banner._id}
                                className={`offer-banner-slide ${banner.linkedCategory ? 'clickable' : ''}`}
                                onClick={() => handleBannerClick(banner)}
                            >
                                <img src={banner.image} alt={banner.title || 'Offer'} />
                                {banner.title && (
                                    <div className="offer-banner-caption">{banner.title}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {banners.length > 1 && (
                        <div className="offer-banner-dots">
                            {banners.map((_, i) => (
                                <button
                                    key={i}
                                    className={`offer-banner-dot ${i === activeBanner ? 'active' : ''}`}
                                    onClick={() => goToBanner(i)}
                                    aria-label={`Go to banner ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className={`menu-content ${showCart ? 'cart-open' : ''}`}>
                <div className="menu-section">
                    {menuItems.length === 0 ? (
                        <div className="empty-menu">
                            <IconMoodEmpty size={48} stroke={1.5} />
                            <p>No items available at the moment</p>
                        </div>
                    ) : (
                        categoryNames.map((category) => (
                            <div key={category} className="menu-category-block">
                                {hasCategories && (
                                    <h2 id={`category-${category}`} className="menu-category-heading">
                                        {category}
                                    </h2>
                                )}
                                <div className="menu-grid">
                                    {groupedMenu[category].map((item, idx) => (
                                        <div
                                            key={item._id}
                                            className="menu-item"
                                            style={{ animationDelay: `${idx * 0.05}s` }}
                                        >
                                            {item.image && (
                                                <div className="item-image">
                                                    <img src={item.image} alt={item.name} loading="lazy" />
                                                </div>
                                            )}
                                            <div className="item-content">
                                                <div className="item-header">
                                                    <h3>{item.name}</h3>
                                                    {item.tags?.includes('Veg') && (
                                                        <span className="veg-badge">
                                                            <IconLeaf size={14} stroke={2.5} />
                                                        </span>
                                                    )}
                                                </div>
                                                {item.description && <p className="item-desc">{item.description}</p>}
                                                {item.isCombo && item.comboItems?.length > 0 && (
                                                    <div className="combo-items-preview">
                                                        {item.comboItems.map((ci, i) => (
                                                            <span key={i} className="combo-item-chip">
                                                                {ci.quantity}× {ci.itemName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="item-footer">
                                                    <span className="price">
                                                        {item.isCombo && item.originalTotalPrice > item.price && (
                                                            <span className="price-original">₹{item.originalTotalPrice}</span>
                                                        )}
                                                        ₹{item.price}
                                                    </span>
                                                    <button className="add-btn" onClick={() => addToCart(item)}>
                                                        <IconPlus size={16} stroke={2.5} /> Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Backdrop for mobile cart */}
                {showCart && <div className="cart-backdrop" onClick={() => setShowCart(false)} />}

                <div className={`cart-sidebar ${showCart ? 'open' : ''}`}>
                    <div className="cart-drag-handle" onClick={() => setShowCart(false)}>
                        <IconChevronUp size={20} />
                    </div>
                    <div className="cart-header">
                        <h2>
                            {checkoutStep === 'details' && (
                                <button
                                    type="button"
                                    className="cart-back-btn"
                                    onClick={goBackToCartStep}
                                    aria-label="Back to cart items"
                                >
                                    <IconArrowLeft size={18} stroke={2.5} />
                                </button>
                            )}
                            <IconReceipt2 size={20} />
                            {checkoutStep === 'details' ? 'Your Details' : 'Your Cart'}
                        </h2>
                        <button className="close-cart" onClick={() => setShowCart(false)}>
                            <IconX size={20} />
                        </button>
                    </div>

                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <IconShoppingCart size={40} stroke={1.5} />
                            <p>Your cart is empty</p>
                        </div>
                    ) : checkoutStep === 'cart' ? (
                        <>
                            <div className="cart-scrollable-body">
                                <div className="cart-items">
                                    {cart.map(item => (
                                        <div key={item._id} className="cart-item">
                                            <div className="item-info">
                                                <h4>{item.name}</h4>
                                                <p>₹{item.price}</p>
                                            </div>
                                            <div className="quantity-control">
                                                <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                                                    <IconMinus size={14} />
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                                                    <IconPlus size={14} />
                                                </button>
                                            </div>
                                            <div className="item-total">₹{item.price * item.quantity}</div>
                                            <button className="remove-btn" onClick={() => removeFromCart(item._id)}>
                                                <IconX size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="cart-summary">
                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>₹{calculateTotal()}</span>
                                </div>
                                <div className="summary-row">
                                    <span>GST (5%)</span>
                                    <span>₹{(calculateTotal() * 0.05).toFixed(2)}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>Total</span>
                                    <span>₹{(calculateTotal() * 1.05).toFixed(2)}</span>
                                </div>
                                <button className="btn-place-order" onClick={goToDetailsStep}>
                                    Continue <IconChevronRight size={18} stroke={2.5} />
                                </button>
                            </div>
                        </>
                    ) : (
                        /* ===== STEP 2: naam/phone/email + payment + Place Order ===== */
                        <>
                            <div className="cart-scrollable-body">
                                <div className="customer-details">
                                    <div className="input-with-icon">
                                        <IconUser size={16} />
                                        <input
                                            type="text"
                                            placeholder="Your name *"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="customer-input"
                                        />
                                    </div>
                                    <div className="input-with-icon">
                                        <IconPhone size={16} />
                                        <input
                                            type="tel"
                                            placeholder="Phone number (optional)"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="customer-input"
                                        />
                                    </div>
                                    <div className="input-with-icon">
                                        <IconMail size={16} />
                                        <input
                                            type="email"
                                            placeholder="Email (optional)"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            className="customer-input"
                                        />
                                    </div>

                                    {/*  Payment Method */}
                                    <div className="payment-method-group">
                                        <span className="payment-label">Payment Method</span>
                                        <div className="payment-options">
                                            <button
                                                type="button"
                                                className={`payment-option ${paymentMethod === 'Cash' ? 'active' : ''}`}
                                                onClick={() => setPaymentMethod('Cash')}
                                            >
                                                <IconCash size={17} />
                                                Cash
                                            </button>
                                            <button
                                                type="button"
                                                className={`payment-option ${paymentMethod === 'Online' ? 'active' : ''}`}
                                                onClick={() => setPaymentMethod('Online')}
                                            >
                                                <IconCreditCard size={17} />
                                                Online
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="cart-summary">
                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>₹{calculateTotal()}</span>
                                </div>
                                <div className="summary-row">
                                    <span>GST (5%)</span>
                                    <span>₹{(calculateTotal() * 0.05).toFixed(2)}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>Total</span>
                                    <span>₹{(calculateTotal() * 1.05).toFixed(2)}</span>
                                </div>
                                <button className="btn-place-order" onClick={placeOrder} disabled={orderPlacing}>
                                    {orderPlacing ? (
                                        <span className="btn-loading">Placing Order...</span>
                                    ) : (
                                        <><IconShoppingBagCheck size={18} /> Place Order</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Floating "View Cart" bar*/}
            {cart.length > 0 && !showCart && (
                <button className="mobile-cart-bar" onClick={openCart}>
                    <span className="mobile-cart-bar-left">
                        <span className="mobile-cart-bar-icon">
                            <IconShoppingCart size={18} stroke={2.2} />
                            <span className="mobile-cart-bar-count">{getCartItemCount()}</span>
                        </span>
                        <span className="mobile-cart-bar-info">
                            <strong>{getCartItemCount()} {getCartItemCount() > 1 ? 'items' : 'item'}</strong>
                            <span>₹{calculateTotal()}</span>
                        </span>
                    </span>
                    <span className="mobile-cart-bar-right">
                        View Cart <IconChevronRight size={16} stroke={2.5} />
                    </span>
                </button>
            )}
        </div>
    );
};

export default CustomerMenu;