import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    IconShoppingCart, IconMinus, IconPlus, IconX,
    IconLeaf, IconReceipt2, IconUser, IconPhone,
    IconShoppingBagCheck, IconMoodEmpty, IconChevronUp, IconMail, IconCash, IconCreditCard,
    IconChevronRight, IconArrowLeft, IconStarFilled, IconSearch, IconClock, IconAdjustmentsHorizontal, IconCheck,
    IconMeat, IconFlame, IconCoffee, IconGlassCocktail, IconSnowflake, IconIceCream, IconBurger
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { customerAPI } from '../../utils/api';
import { resolveIcon } from '../../utils/mainCategoryIcons';
import { saveActiveOrder, getActiveOrder } from '../../utils/activeOrder';
import BottomNav from './BottomNav';

import './CustomerMenu.css';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const SPICY_LEVELS = ['Low', 'Medium', 'High'];
const CUSTOMER_DETAILS_KEY = 'pangat_customer_details';

// Item ye check karta hai ki wo selected landing-category (tag) se match karta hai ya nahi
const itemMatchesMainCategory = (item, mainCatTag) => {
    if (!mainCatTag || mainCatTag === 'ALL') return true;
    return item.tags?.includes(mainCatTag);
};

// Cart me Half aur Full ko alag line item ke tarah track karne ke liye unique key
const getCartKey = (itemId, portion) => portion ? `${itemId}::${portion}` : itemId;

const getISTNow = () => {
    const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(istString);
};

const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

const formatTime12h = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

// Restaurant abhi open hai ya band — IST time + operatingHours ke hisaab se
const getRestaurantStatus = (restaurantInfo) => {
    if (!restaurantInfo) return { isOpen: null, detailText: null };

    if (restaurantInfo.isTemporarilyClosed) {
        return { isOpen: false, detailText: 'Temporarily closed' };
    }

    const hours = restaurantInfo.operatingHours;
    if (!hours) return { isOpen: null, detailText: null };

    const istNow = getISTNow();
    const todayName = DAY_NAMES[istNow.getDay()];
    const today = hours[todayName];

    if (!today || today.isClosed || !today.open || !today.close) {
        return { isOpen: false, detailText: 'Closed today' };
    }

    const nowMin = istNow.getHours() * 60 + istNow.getMinutes();
    const openMin = toMinutes(today.open);
    const closeMin = toMinutes(today.close);

    let isOpen;
    if (closeMin > openMin) {
        isOpen = nowMin >= openMin && nowMin < closeMin;
    } else {
        // Overnight hours, e.g. 18:00 - 02:00
        isOpen = nowMin >= openMin || nowMin < closeMin;
    }

    return {
        isOpen,
        detailText: isOpen ? `Closes ${formatTime12h(today.close)}` : `Opens ${formatTime12h(today.open)}`,
    };
};

const CustomerMenu = () => {
    const { restaurantId, tableNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [menuItems, setMenuItems] = useState([]);
    const [banners, setBanners] = useState([]);
    const [activeBanner, setActiveBanner] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [spicyLevelSelections, setSpicyLevelSelections] = useState({});
    const [portionSelections, setPortionSelections] = useState({});
    const [showCart, setShowCart] = useState(false);
    const [orderPlacing, setOrderPlacing] = useState(false);
    const [restaurantInfo, setRestaurantInfo] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [tableNotFound, setTableNotFound] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('cart');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterVeg, setFilterVeg] = useState('All');
    const [filterTags, setFilterTags] = useState([]);
    const [priceBucket, setPriceBucket] = useState(0);
    const [sortBy, setSortBy] = useState('default');
    const [selectedMainCategory, setSelectedMainCategory] = useState(null);
    const [mainCategories, setMainCategories] = useState([]);
    const [hasActiveOrder, setHasActiveOrder] = useState(() => !!getActiveOrder());

    const bannerTimerRef = useRef(null);

    const categoryRefs = useRef({});
    const isClickScrolling = useRef(false);
    const scrollResumeTimer = useRef(null);
    const menuPanelRef = useRef(null);
    const sidebarItemRefs = useRef({});
    const sidebarContainerRef = useRef(null);
    const mainCategoryTabRefs = useRef({});
    const mainCategoryTabsRef = useRef(null);
    const categoryLayerPushedRef = useRef(false);

    const priceBuckets = [
        { label: 'All Prices', min: 0, max: Infinity },
        { label: 'Under ₹100', min: 0, max: 100 },
        { label: '₹100 - ₹300', min: 100, max: 300 },
        { label: '₹300 - ₹500', min: 300, max: 500 },
        { label: 'Above ₹500', min: 500, max: Infinity },
    ];

    const filterTagOptions = ['Bestseller', 'New', 'Spicy', 'Trending'];

    // Saved "remember me" customer details prefill (name/phone/email) so returning
    // customers don't have to type everything again.
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CUSTOMER_DETAILS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.name) setCustomerName(parsed.name);
                if (parsed.phone) setCustomerPhone(parsed.phone);
                if (parsed.email) setCustomerEmail(parsed.email);
            }
        } catch (e) {
            // ignore malformed/unavailable storage
        }
    }, []);

    // Landing category badalte hi active category/search reset
    useEffect(() => {
        setActiveCategory('');
        setSearchTerm('');
    }, [selectedMainCategory]);

    const [statusTick, setStatusTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setStatusTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    const restaurantStatus = useMemo(
        () => getRestaurantStatus(restaurantInfo),
        [restaurantInfo, statusTick]
    );

    // Sidebar ko andar hi andar scroll karo taaki active category hamesha dikhe
    useEffect(() => {
        const container = sidebarContainerRef.current;
        const el = sidebarItemRefs.current[activeCategory];
        if (!container || !el) return;

        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // Element ko container ke andar center karne ke liye scroll offset nikalo
        const offset = (elRect.top + elRect.height / 2) - (containerRect.top + containerRect.height / 2);

        container.scrollBy({ top: offset, behavior: 'smooth' });
    }, [activeCategory]);

    // Main-category tab strip ko horizontally auto-scroll karo taaki active tab hamesha dikhe
    useEffect(() => {
        const container = mainCategoryTabsRef.current;
        const key = selectedMainCategory || 'ALL';
        const el = mainCategoryTabRefs.current[key];
        if (!container || !el) return;

        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [selectedMainCategory]);

    useEffect(() => {
        if (showCart) {
            window.history.pushState({ menuLayer: 'cart' }, '');
        }
    }, [showCart]);

    useEffect(() => {
        if (checkoutStep === 'details') {
            window.history.pushState({ menuLayer: 'checkout' }, '');
        }
    }, [checkoutStep]);

    useEffect(() => {
        if (selectedMainCategory && !categoryLayerPushedRef.current) {
            window.history.pushState({ menuLayer: 'category' }, '');
            categoryLayerPushedRef.current = true;
        }
        if (!selectedMainCategory) {
            categoryLayerPushedRef.current = false;
        }
    }, [selectedMainCategory]);

    useEffect(() => {
        const handlePopState = () => {
            if (checkoutStep === 'details') {
                setCheckoutStep('cart');
                return;
            }
            if (showCart) {
                setShowCart(false);
                return;
            }
            if (selectedMainCategory) {
                setSelectedMainCategory(null);
                return;
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showCart, checkoutStep, selectedMainCategory]);

    useEffect(() => {
        if (!restaurantId || !tableNumber) {
            toast.error('Invalid QR code');
            navigate('/');
            return;
        }
        fetchMenuItems();
    }, [restaurantId, tableNumber]);

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

    // ---------- Banner auto-slide ----------
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
                setMainCategories(response.data.data.mainCategories || []);
            }

            fetchBanners(qrId);
        } catch (error) {
            console.error('Error fetching menu:', error);

            if (error.response?.status === 404 &&
                error.response?.data?.message?.toLowerCase().includes('table')) {
                setTableNotFound(true);
                return;
            }

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
            console.error('Error fetching banners:', error);
        }
    };

    const handleBannerClick = (banner) => {
        if (!banner.linkedCategory) return;
        goToCategory(banner.linkedCategory);
    };

    const goToBanner = (index) => {
        setActiveBanner(index);
        clearInterval(bannerTimerRef.current);
        if (banners.length > 1) {
            bannerTimerRef.current = setInterval(() => {
                setActiveBanner((prev) => (prev + 1) % banners.length);
            }, 4000);
        }
    };

    const selectSpicyLevel = (itemId, level) => {
        setSpicyLevelSelections(prev => ({ ...prev, [itemId]: level }));
    };

    const selectPortion = (itemId, portion) => {
        setPortionSelections(prev => ({ ...prev, [itemId]: portion }));
    };

    const addToCart = (item) => {
        if (restaurantStatus.isOpen === false) {
            toast.error('Restaurant is currently closed. Please try again during business hours.');
            return;
        }
        if (item.isOutOfStock === true) {
            toast.error(`${item.name} is out of stock`);
            return;
        }

        if (item.isSpicyLevel && !spicyLevelSelections[item._id]) {
            toast.error('Please select a spicy level first');
            return;
        }

        if (item.hasHalfFull && !portionSelections[item._id]) {
            toast.error('Please select Half or Full');
            return;
        }

        const selectedSpicyLevel = item.isSpicyLevel ? spicyLevelSelections[item._id] : null;
        const selectedPortion = item.hasHalfFull ? portionSelections[item._id] : null;
        const effectivePrice = item.hasHalfFull
            ? (selectedPortion === 'Half' ? item.halfPrice : item.price)
            : item.price;

        const cartKey = getCartKey(item._id, selectedPortion);
        const existingItem = cart.find(c => c.cartKey === cartKey);

        if (existingItem) {
            setCart(cart.map(c =>
                c.cartKey === cartKey
                    ? { ...c, quantity: c.quantity + 1 }
                    : c
            ));
        } else {
            setCart([...cart, { ...item, cartKey, quantity: 1, spicyLevel: selectedSpicyLevel, portion: selectedPortion, price: effectivePrice }]);
        }
        toast.success(`${item.name}${selectedPortion ? ' (' + selectedPortion + ')' : ''} added to cart`);
    };

    const updateQuantity = (cartKey, quantity) => {
        if (quantity <= 0) {
            removeFromCart(cartKey);
            return;
        }
        setCart(cart.map(c =>
            c.cartKey === cartKey ? { ...c, quantity } : c
        ));
    };

    const removeFromCart = (cartKey) => {
        setCart(cart.filter(c => c.cartKey !== cartKey));
        toast.success('Item removed from cart');
    };

    const getCartQuantity = (itemId, portion = null) => {
        const cartKey = getCartKey(itemId, portion);
        const item = cart.find(c => c.cartKey === cartKey);
        return item ? item.quantity : 0;
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const gstEnabled = restaurantInfo?.gstEnabled || false;
    const gstPercentage = restaurantInfo?.gstPercentage || 0;

    const calculateGST = () => {
        if (!gstEnabled) return 0;
        return Math.round(calculateTotal() * (gstPercentage / 100) * 100) / 100;
    };

    const calculateGrandTotal = () => {
        return Math.round((calculateTotal() + calculateGST()) * 100) / 100;
    };

    const getCartItemCount = () => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    };

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
        window.history.back();
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
                    portion: item.portion || undefined,
                    quantity: item.quantity,
                    specialInstructions: [
                        item.portion ? `Portion: ${item.portion}` : '',
                        item.spicyLevel ? `Spicy Level: ${item.spicyLevel}` : '',
                    ].filter(Boolean).join(', ') || (item.notes || ''),
                })),
                paymentMethod,
            };

            const response = await customerAPI.placeOrder(orderData);

            if (response.data.success) {
                toast.success('Order placed successfully! 🎉');

                // Remember Me: save (or clear) customer details for next visit
                try {
                    if (rememberMe) {
                        localStorage.setItem(CUSTOMER_DETAILS_KEY, JSON.stringify({
                            name: customerName.trim(),
                            phone: customerPhone.trim(),
                            email: customerEmail.trim(),
                        }));
                    } else {
                        localStorage.removeItem(CUSTOMER_DETAILS_KEY);
                    }
                } catch (e) {
                    // ignore storage errors
                }

                // Track this as the active order so the Status tab can find it
                // again even if the customer accidentally hits back or reloads.
                saveActiveOrder({
                    orderId: response.data.data.orderId,
                    qrId,
                    homePath: location.pathname,
                });
                setHasActiveOrder(true);

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

    // ---------- Category icon (first item's image per category, unfiltered) ----------
    const categoryIcons = useMemo(() => {
        const map = {};
        menuItems.forEach(item => {
            const cat = item.category || 'Other';
            if (!map[cat] && item.image) map[cat] = item.image;
        });
        return map;
    }, [menuItems]);

    // ---------- Filter + sort logic ----------
    const filterItems = useCallback((items) => {
        let out = items;

        if (filterVeg !== 'All') {
            out = out.filter(item => item.tags?.includes(filterVeg));
        }

        if (filterTags.length > 0) {
            out = out.filter(item => filterTags.every(t => item.tags?.includes(t)));
        }

        const bucket = priceBuckets[priceBucket];
        out = out.filter(item => {
            const effectivePrice = item.discountPrice || item.price;
            return effectivePrice >= bucket.min && effectivePrice <= bucket.max;
        });

        if (sortBy === 'price-asc') {
            out = [...out].sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        } else if (sortBy === 'price-desc') {
            out = [...out].sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
        } else if (sortBy === 'rating') {
            out = [...out].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        return out;
    }, [filterVeg, filterTags, priceBucket, sortBy]);

    const activeFilterCount =
        (filterVeg !== 'All' ? 1 : 0) +
        filterTags.length +
        (priceBucket !== 0 ? 1 : 0) +
        (sortBy !== 'default' ? 1 : 0);

    const clearFilters = () => {
        setFilterVeg('All');
        setFilterTags([]);
        setPriceBucket(0);
        setSortBy('default');
    };

    const toggleFilterTag = (tag) => {
        setFilterTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    // ---------- Main category (landing screen) filter ----------
    const mainCategoryItems = useMemo(
        () => menuItems.filter(item => itemMatchesMainCategory(item, selectedMainCategory)),
        [menuItems, selectedMainCategory]
    );

    // ---------- Category grouping (filtered) ----------
    const filteredMenuItems = useMemo(() => filterItems(mainCategoryItems), [mainCategoryItems, filterItems]);

    const selectMainCategory = (key) => {
        setSelectedMainCategory(key);
    };

    const goBackToLanding = () => {
        window.history.back();
    };

    const groupedMenu = useMemo(() => {
        return filteredMenuItems.reduce((groups, item) => {
            const key = item.category || 'Other';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
            return groups;
        }, {});
    }, [filteredMenuItems]);

    const categoryNames = useMemo(() => Object.keys(groupedMenu), [groupedMenu]);
    const hasCategories = categoryNames.length > 1 || (categoryNames.length === 1 && categoryNames[0] !== 'Other');

    // First category ko default active bana do jab data aaye
    useEffect(() => {
        if (categoryNames.length > 0 && !activeCategory) {
            setActiveCategory(categoryNames[0]);
        }
    }, [categoryNames, activeCategory]);

    // ---------- Search ----------
    const isSearching = searchTerm.trim().length > 0;

    const searchResults = useMemo(() => {
        if (!isSearching) return [];
        const q = searchTerm.trim().toLowerCase();
        const matched = mainCategoryItems.filter(item =>
            item.name?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q)
        );
        return filterItems(matched);
    }, [isSearching, searchTerm, mainCategoryItems, filterItems]);

    // ---------- Sidebar click -> scroll to category ----------
    const goToCategory = useCallback((category) => {
        setSearchTerm('');
        setActiveCategory(category);
        const target = categoryRefs.current[category];
        if (target) {
            isClickScrolling.current = true;
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            clearTimeout(scrollResumeTimer.current);
            scrollResumeTimer.current = setTimeout(() => {
                isClickScrolling.current = false;
            }, 700);
        }
    }, []);

    // ---------- Scroll-spy: sidebar auto-highlight on scroll ----------
    useEffect(() => {
        if (isSearching || categoryNames.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (isClickScrolling.current) return;
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length > 0) {
                    const category = visible[0].target.getAttribute('data-category');
                    if (category) setActiveCategory(category);
                }
            },
            { rootMargin: '-120px 0px -70% 0px', threshold: 0 }
        );

        categoryNames.forEach((cat) => {
            const el = categoryRefs.current[cat];
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [categoryNames, isSearching]);

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

    // ===== Category chooser landing screen (menu se pehle) =====
    if (!selectedMainCategory) {
        return (
            <div className="customer-menu category-landing-page">
                <div className="landing-mini-header">
                    {restaurantInfo?.logo ? (
                        <img src={restaurantInfo.logo} alt={restaurantInfo.name} className="restaurant-logo" />
                    ) : (
                        <div className="restaurant-logo-fallback">
                            {(restaurantInfo?.name || 'R').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1>{restaurantInfo?.name || 'Restaurant Menu'}</h1>
                        <div className="header-meta">
                            {restaurantStatus.isOpen !== null && (
                                <span className={`open-status-badge ${restaurantStatus.isOpen ? 'open' : 'closed'}`}>
                                    <span className="status-dot" />
                                    {restaurantStatus.isOpen ? 'Open now' : 'Closed'}
                                </span>
                            )}
                            <span className="table-info">Table {tableNumber}</span>
                        </div>
                    </div>
                </div>

                <div className="category-landing">
                    <h2 className="category-landing-title">Welcome! Aaj Aap kya khana Chahenge?</h2>
                    <p className="category-landing-subtitle">Category choose karein, hum aapke liye menu open kar dete hain</p>

                    <div className="category-landing-grid">
                        {mainCategories.map(cat => {
                            const Icon = resolveIcon(cat.icon);
                            return (
                                <button
                                    key={cat.tag}
                                    className="category-landing-card"
                                    onClick={() => selectMainCategory(cat.tag)}
                                >
                                    <span className="category-landing-icon">
                                        <Icon size={26} stroke={1.8} />
                                    </span>
                                    <span className="category-landing-label">{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <button className="category-landing-skip" onClick={() => selectMainCategory('ALL')}>
                        All menu dekhein <IconChevronRight size={16} stroke={2.5} />
                    </button>
                </div>

                {hasActiveOrder && <BottomNav homePath={location.pathname} />}
            </div>
        );
    }

    const renderMenuItemCard = (item, idx) => {
        const outOfStock = item.isOutOfStock === true;
        const selectedPortion = item.hasHalfFull ? (portionSelections[item._id] || null) : null;
        const cartKey = getCartKey(item._id, selectedPortion);
        const qtyInCart = getCartQuantity(item._id, selectedPortion);
        const optionsCount = item.customizations?.length || 0;
        const displayPrice = item.hasHalfFull
            ? (selectedPortion ? (selectedPortion === 'Half' ? item.halfPrice : item.price) : null)
            : item.price;

        return (
            <div
                key={item._id}
                className={`menu-item ${outOfStock ? 'out-of-stock' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
            >
                <div className="item-image">
                    {item.image ? (
                        <img src={item.image} alt={item.name} loading="lazy" />
                    ) : (
                        <div className="item-image-fallback">{item.name.charAt(0)}</div>
                    )}
                    {item.preparationTime > 0 && (
                        <span className="item-prep-badge">
                            <IconClock size={11} stroke={2} /> {item.preparationTime} MINS
                        </span>
                    )}
                    {outOfStock && (
                        <div className="out-of-stock-overlay">
                            <span>Out of Stock</span>
                        </div>
                    )}
                </div>
                <div className="item-content">
                    <div className="item-header">
                        {item.tags?.includes('Veg') && (
                            <span className="veg-badge">
                                <IconLeaf size={14} stroke={2.5} />
                            </span>
                        )}
                        <h3>{item.name}</h3>
                    </div>

                    {item.rating > 0 && (
                        <div className="item-rating">
                            <IconStarFilled size={12} />
                            <span>{item.rating.toFixed(1)}</span>
                            {item.ratingCount > 0 && (
                                <span className="rating-count">({item.ratingCount})</span>
                            )}
                        </div>
                    )}

                    {item.description && <p className="item-desc">{item.description}</p>}

                    {item.hasHalfFull && (
                        <div className="portion-selector">
                            <button
                                type="button"
                                className={`portion-btn ${selectedPortion === 'Half' ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); selectPortion(item._id, 'Half'); }}
                            >
                                Half ₹{item.halfPrice}
                            </button>
                            <button
                                type="button"
                                className={`portion-btn ${selectedPortion === 'Full' ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); selectPortion(item._id, 'Full'); }}
                            >
                                Full ₹{item.price}
                            </button>
                        </div>
                    )}

                    {item.isSpicyLevel && (
                        <div className="spicy-level-dropdown-wrapper">
                            <IconFlame size={13} stroke={2} className="spicy-dropdown-icon" />
                            <select
                                className="spicy-level-dropdown"
                                value={spicyLevelSelections[item._id] || ''}
                                onChange={(e) => selectSpicyLevel(item._id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="" disabled>Select spicy</option>
                                {SPICY_LEVELS.map(level => (
                                    <option key={level} value={level}>{level} Spicy</option>
                                ))}
                            </select>
                        </div>
                    )}

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
                            {displayPrice !== null ? `₹${displayPrice}` : `₹${item.halfPrice} - ₹${item.price}`}
                        </span>

                        <div className="item-add-zone">
                            {outOfStock ? (
                                <span className="out-of-stock-badge">Out of Stock</span>
                            ) : qtyInCart > 0 ? (
                                <div className="item-qty-control">
                                    <button
                                        onClick={() => updateQuantity(cartKey, qtyInCart - 1)}
                                        aria-label="Decrease quantity"
                                    >
                                        <IconMinus size={14} stroke={2.5} />
                                    </button>
                                    <span>{qtyInCart}</span>
                                    <button
                                        onClick={() => updateQuantity(cartKey, qtyInCart + 1)}
                                        aria-label="Increase quantity"
                                    >
                                        <IconPlus size={14} stroke={2.5} />
                                    </button>
                                </div>
                            ) : (
                                <button className="add-btn" onClick={() => addToCart(item)}>
                                    ADD
                                </button>
                            )}
                            {optionsCount > 0 && !outOfStock && (
                                <span className="options-count">{optionsCount} option{optionsCount > 1 ? 's' : ''}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`customer-menu ${hasActiveOrder && !showCart ? 'has-bottom-nav' : ''}`}>
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
                            {restaurantInfo?.address && (
                                <p className="restaurant-address">{restaurantInfo.address}</p>
                            )}
                            <div className="header-meta">
                                {restaurantStatus.isOpen !== null && (
                                    <span className={`open-status-badge ${restaurantStatus.isOpen ? 'open' : 'closed'}`}>
                                        <span className="status-dot" />
                                        {restaurantStatus.isOpen ? 'Open now' : 'Closed'}
                                    </span>
                                )}
                                {restaurantStatus.detailText && (
                                    <span className="status-detail">{restaurantStatus.detailText}</span>
                                )}
                                <span className="table-info">Table {tableNumber}</span>
                                {restaurantInfo?.cuisine?.length > 0 && (
                                    <span className="cuisine-tag">
                                        {restaurantInfo.cuisine.slice(0, 2).join(' · ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="cart-button" onClick={() => (showCart ? window.history.back() : openCart())}>
                        <IconShoppingCart size={22} stroke={2} />
                        {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
                    </button>
                </div>
            </div>

            {/* ===== Inline main-category tab strip — switch category without leaving this page ===== */}
            {mainCategories.length > 0 && (
                <div className="main-category-tabs-wrapper">
                    <div className="main-category-tabs" ref={mainCategoryTabsRef}>
                        <button
                            ref={(el) => { mainCategoryTabRefs.current['ALL'] = el; }}
                            className={`main-category-tab ${selectedMainCategory === 'ALL' ? 'active' : ''}`}
                            onClick={() => selectMainCategory('ALL')}
                        >
                            Full Menu
                        </button>
                        {mainCategories.map(cat => {
                            const Icon = resolveIcon(cat.icon);
                            return (
                                <button
                                    key={cat.tag}
                                    ref={(el) => { mainCategoryTabRefs.current[cat.tag] = el; }}
                                    className={`main-category-tab ${selectedMainCategory === cat.tag ? 'active' : ''}`}
                                    onClick={() => selectMainCategory(cat.tag)}
                                >
                                    <Icon size={15} stroke={2} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== Search Bar ===== */}
            <div className="customer-search-bar">
                <div className="search-input-wrapper">
                    <IconSearch size={18} stroke={2} />
                    <input
                        type="text"
                        placeholder="Search for dishes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear-btn" onClick={() => setSearchTerm('')} aria-label="Clear search">
                            <IconX size={16} />
                        </button>
                    )}
                </div>

                <button
                    className={`filter-toggle-btn ${activeFilterCount > 0 ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <IconAdjustmentsHorizontal size={18} stroke={2} />
                    Filters
                    {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
                </button>
            </div>

            {/* ===== Filter Panel ===== */}
            {showFilters && (
                <div className="filter-panel">
                    <div className="filter-groups">
                        <span className="filter-group-label">Sort by</span>
                        <div className="filter-chip-row">
                            {[
                                { key: 'default', label: 'Relevance' },
                                { key: 'price-asc', label: 'Price: Low to High' },
                                { key: 'price-desc', label: 'Price: High to Low' },
                                { key: 'rating', label: 'Rating' },
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    className={`filter-chip ${sortBy === opt.key ? 'active' : ''}`}
                                    onClick={() => setSortBy(opt.key)}
                                >
                                    {sortBy === opt.key && <IconCheck size={13} stroke={3} />}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-groups">
                        <span className="filter-group-label">Food type</span>
                        <div className="filter-chip-row">
                            {['All', 'Veg', 'Non-Veg'].map(opt => (
                                <button
                                    key={opt}
                                    className={`filter-chip ${filterVeg === opt ? 'active' : ''}`}
                                    onClick={() => setFilterVeg(opt)}
                                >
                                    {filterVeg === opt && <IconCheck size={13} stroke={3} />}
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-groups">
                        <span className="filter-group-label">Price</span>
                        <div className="filter-chip-row">
                            {priceBuckets.map((bucket, idx) => (
                                <button
                                    key={bucket.label}
                                    className={`filter-chip ${priceBucket === idx ? 'active' : ''}`}
                                    onClick={() => setPriceBucket(idx)}
                                >
                                    {priceBucket === idx && <IconCheck size={13} stroke={3} />}
                                    {bucket.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-groups">
                        <span className="filter-group-label">Tags</span>
                        <div className="filter-chip-row">
                            {filterTagOptions.map(tag => (
                                <button
                                    key={tag}
                                    className={`filter-chip ${filterTags.includes(tag) ? 'active' : ''}`}
                                    onClick={() => toggleFilterTag(tag)}
                                >
                                    {filterTags.includes(tag) && <IconCheck size={13} stroke={3} />}
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-panel-actions">
                        <button className="filter-clear-btn" onClick={clearFilters}>
                            Clear all
                        </button>
                        <button className="filter-apply-btn" onClick={() => setShowFilters(false)}>
                            Show results
                        </button>
                    </div>
                </div>
            )}

            {/* ===== Offer Banner Slider ===== */}
            {banners.length > 0 && !isSearching && (
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

            {restaurantStatus.isOpen === false && (
                <div className="closed-notice-bar">
                    <IconClock size={16} stroke={2} />
                    Restaurant is currently closed{restaurantStatus.detailText ? ` · ${restaurantStatus.detailText}` : ''}. You can browse the menu, but ordering is disabled right now.
                </div>
            )}

            <div className={`menu-content ${showCart ? 'cart-open' : ''}`}>

                {menuItems.length === 0 ? (
                    <div className="empty-menu">
                        <IconMoodEmpty size={48} stroke={1.5} />
                        <p>No items available at the moment</p>
                    </div>
                ) : filteredMenuItems.length === 0 && !isSearching ? (
                    <div className="empty-menu">
                        <IconMoodEmpty size={48} stroke={1.5} />
                        <p>Is category mein abhi koi item nahi hai</p>
                        <button className="category-landing-skip" onClick={() => selectMainCategory('ALL')}>
                            Full menu dekhein
                        </button>
                    </div>
                ) : isSearching ? (
                    /* ===== Search results view (no sidebar) ===== */
                    <div className="menu-section search-mode">
                        <p className="search-results-heading">
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
                        </p>
                        {searchResults.length === 0 ? (
                            <div className="empty-menu">
                                <IconMoodEmpty size={40} stroke={1.5} />
                                <p>No dishes match your search</p>
                            </div>
                        ) : (
                            <div className="menu-grid">
                                {searchResults.map((item, idx) => renderMenuItemCard(item, idx))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ===== Blinkit-style: sidebar + categorized items ===== */
                    <div className="menu-body">
                        {hasCategories && (
                            <div className="category-sidebar" ref={sidebarContainerRef}>
                                {categoryNames.map((category) => (
                                    <button
                                        key={category}
                                        ref={(el) => { sidebarItemRefs.current[category] = el; }}
                                        className={`category-sidebar-item ${activeCategory === category ? 'active' : ''}`}
                                        onClick={() => goToCategory(category)}
                                    >
                                        <span className="category-sidebar-icon">
                                            {categoryIcons[category] ? (
                                                <img src={categoryIcons[category]} alt={category} />
                                            ) : (
                                                category.charAt(0).toUpperCase()
                                            )}
                                        </span>
                                        <span className="category-sidebar-label">{category}</span>
                                        <span className="category-sidebar-count">{groupedMenu[category].length}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="menu-items-panel" ref={menuPanelRef}>
                            {categoryNames.map((category) => (
                                <div
                                    key={category}
                                    className="menu-category-block"
                                    data-category={category}
                                    ref={(el) => { categoryRefs.current[category] = el; }}
                                >
                                    {hasCategories && (
                                        <h2 className="menu-category-heading">{category}</h2>
                                    )}
                                    <div className="menu-grid">
                                        {groupedMenu[category].map((item, idx) => renderMenuItemCard(item, idx))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showCart && <div className="cart-backdrop" onClick={() => window.history.back()} />}

                <div className={`cart-sidebar ${showCart ? 'open' : ''}`}>
                    <div className="cart-drag-handle" onClick={() => window.history.back()}>
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
                        <button className="close-cart" onClick={() => window.history.back()}>
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
                                        <div key={item.cartKey} className="cart-item">
                                            <div className="item-info">
                                                <h4>{item.name}</h4>
                                                {item.portion && (
                                                    <p className="cart-item-spicy">🍽️ {item.portion} Portion</p>
                                                )}
                                                {item.spicyLevel && (
                                                    <p className="cart-item-spicy">🌶️ {item.spicyLevel} Spicy</p>
                                                )}
                                                <p>₹{item.price}</p>
                                            </div>
                                            <div className="quantity-control">
                                                <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}>
                                                    <IconMinus size={14} />
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}>
                                                    <IconPlus size={14} />
                                                </button>
                                            </div>
                                            <div className="item-total">₹{item.price * item.quantity}</div>
                                            <button className="remove-btn" onClick={() => removeFromCart(item.cartKey)}>
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
                                {gstEnabled && (
                                    <div className="summary-row">
                                        <span>GST ({gstPercentage}%)</span>
                                        <span>+₹{calculateGST().toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="summary-row total">
                                    <span>Total</span>
                                    <span>₹{calculateGrandTotal().toFixed(2)}</span>
                                </div>
                                <button className="btn-place-order" onClick={goToDetailsStep}>
                                    Continue <IconChevronRight size={18} stroke={2.5} />
                                </button>
                            </div>
                        </>
                    ) : (
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

                                    <label className="remember-me-row">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span>Remember my details for next time</span>
                                    </label>

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
                                {gstEnabled && (
                                    <div className="summary-row">
                                        <span>GST ({gstPercentage}%)</span>
                                        <span>+₹{calculateGST().toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="summary-row total">
                                    <span>Total</span>
                                    <span>₹{calculateGrandTotal().toFixed(2)}</span>
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

            {cart.length > 0 && !showCart && (
                <button className="mobile-cart-bar" onClick={openCart}>
                    <span className="mobile-cart-bar-left">
                        <span className="mobile-cart-bar-icon">
                            <IconShoppingCart size={18} stroke={2.2} />
                            <span className="mobile-cart-bar-count">{getCartItemCount()}</span>
                        </span>
                        <span className="mobile-cart-bar-info">
                            <strong>{getCartItemCount()} {getCartItemCount() > 1 ? 'items' : 'item'}</strong>
                            <span>₹{calculateGrandTotal().toFixed(2)}</span>
                        </span>
                    </span>
                    <span className="mobile-cart-bar-right">
                        View Cart <IconChevronRight size={16} stroke={2.5} />
                    </span>
                </button>
            )}

            {hasActiveOrder && !showCart && <BottomNav homePath={location.pathname} />}
        </div>
    );
};

export default CustomerMenu;