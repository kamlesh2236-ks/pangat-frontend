import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconHome2, IconReceipt2 } from '@tabler/icons-react';
import { getActiveOrder } from '../../utils/activeOrder';
import './BottomNav.css';

/**
 * Bottom tab bar with Home + Status.
 * - Only renders once the customer has an active order saved (nothing to show otherwise).
 * - Auto-hides on scroll-down, reappears on scroll-up — same behaviour as the
 *   floating mobile cart bar / Big Basket's bottom nav.
 * - "Status" always routes to the last known active order, even if the
 *   customer navigated back or reloaded the page.
 * - `homePath` (optional) lets the page that renders it pin an exact "Home"
 *   destination; otherwise falls back to the homePath saved with the order.
 */
const BottomNav = ({ homePath }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [visible, setVisible] = useState(true);
    const [activeOrder, setActiveOrder] = useState(() => getActiveOrder());
    const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);

    // Re-check localStorage whenever the route changes (e.g. right after an order is placed,
    // or after OrderStatus clears it on "Served").
    useEffect(() => {
        setActiveOrder(getActiveOrder());
    }, [location.pathname, location.search]);

    useEffect(() => {
        const handleScroll = () => {
            const currentY = window.scrollY;
            const diff = currentY - lastScrollY.current;

            if (currentY < 40) {
                setVisible(true);
            } else if (diff > 6) {
                setVisible(false);
            } else if (diff < -6) {
                setVisible(true);
            }
            lastScrollY.current = currentY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!activeOrder) return null;

    const isStatusPage = location.pathname.startsWith('/order-status');

    const goHome = () => {
        const target = homePath || activeOrder.homePath;
        if (target) {
            navigate(target);
        } else {
            navigate(-1);
        }
    };

    const goStatus = () => {
        navigate(`/order-status/${activeOrder.orderId}?qr=${activeOrder.qrId}`);
    };

    return (
        <nav className={`bottom-nav ${visible ? 'visible' : 'hidden'}`}>
            <button
                type="button"
                className={`bottom-nav-item ${!isStatusPage ? 'active' : ''}`}
                onClick={goHome}
            >
                <IconHome2 size={21} stroke={2} />
                <span>Home</span>
            </button>
            <button
                type="button"
                className={`bottom-nav-item ${isStatusPage ? 'active' : ''}`}
                onClick={goStatus}
            >
                <IconReceipt2 size={21} stroke={2} />
                <span>Status</span>
            </button>
        </nav>
    );
};

export default BottomNav;