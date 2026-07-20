import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Topbar.css';
import {
    IconListSearch,
    IconMoonStars,
    IconSunHigh,
    IconBellStar,
    IconMenu2,
    IconHaze,
    IconSun,
    IconSunMoon,
    IconMenuDeep,
    IconUserSearch,
    IconBuildingStore,
    IconMail,
    IconCrown,
    IconShieldCheck,
    IconEdit,
    IconLogout,
    IconPhone,
    IconCheck,
    IconBellOff,
    IconReceipt,
    IconUsers,
    IconToolsKitchen2,
    IconBox,
    IconBuildingWarehouse,
    IconArmchair2,
} from '@tabler/icons-react';
import { NavbarContext } from '../context/NavbarContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { NotificationContext, formatTimeAgo } from '../context/NotificationContext';
import { profileAPI, searchAPI } from '../utils/api';
import { menuGroups } from './Navbar';
import Profile from '../pages/Profile/Profile';
import LogoutConfirmModal from './LogoutConfirmModal';

const Topbar = () => {
    const navigate = useNavigate();
    const [time, setTime] = useState(new Date());
    const { isNavbarOpen, toggleNavbar } = useContext(NavbarContext);
    const [greeting, setGreeting] = useState({ greet: "", emoji: "" });
    const { user } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const dropdownRef = useRef(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);


    const isSuperAdmin = user?.role === 'SuperAdmin';
    const isStaffUser = ['Kitchen', 'Waiter', 'Staff'].includes(user?.role);

    // ===== Notifications dropdown =====
    const notificationsRef = useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const { notifications, unreadCount, markAllAsRead, markOneAsRead } =
        useContext(NotificationContext);

    // ===== Global Search =====
    const searchRef = useRef(null);
    const debounceRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [apiResults, setApiResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // Nav items (Navbar.jsx se) — instant, bina API call ke
    const flatNavItems = menuGroups.flatMap((group) =>
        group.items
            .filter((item) => item.action !== 'logout')
            .map((item) => ({ ...item, group: group.heading }))
    );

    // Debounced backend search
    useEffect(() => {
        if (isSuperAdmin) return;

        const q = searchQuery.trim();

        if (!q) {
            setApiResults(null);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                const response = await searchAPI.global(q);
                if (response.data.success) {
                    setApiResults(response.data.data);
                }
            } catch (error) {
                console.error('Global search error:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 400);

        return () => clearTimeout(debounceRef.current);
    }, [searchQuery, isSuperAdmin]);

    const matchedNavItems = searchQuery.trim()
        ? flatNavItems.filter((item) =>
            item.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
        : [];

    const buildResultGroup = (key, icon, listPath, titleField, subtitleFn) => {
        const list = apiResults?.[key] || [];
        return list.map((doc) => ({
            id: doc._id,
            icon,
            title: doc[titleField],
            subtitle: subtitleFn(doc),
            path: listPath,
            type: key,
        }));
    };

    const resultGroups = [
        {
            label: 'Nav-Items',
            items: matchedNavItems.map((item) => ({
                id: item.path,
                icon: item.icon,
                title: item.title,
                subtitle: item.group,
                path: item.path,
                type: 'nav',
            })),
        },
        {
            label: 'Orders',
            items: buildResultGroup(
                'orders', <IconReceipt size={18} />, '/orders', 'orderNumber',
                (d) => `${d.customerName} • ₹${d.totalAmount} • ${d.orderStatus}`
            ),
        },
        {
            label: 'Staff',
            items: buildResultGroup(
                'staff', <IconUsers size={18} />, '/staff', 'name',
                (d) => `${d.role} • ${d.phone || d.email || ''}`
            ),
        },
        {
            label: 'Menu',
            items: buildResultGroup(
                'menuItems', <IconToolsKitchen2 size={18} />, '/menu', 'name',
                (d) => `${d.category} • ₹${d.price}${d.isAvailable ? '' : ' • Unavailable'}`
            ),
        },
        {
            label: 'Combos',
            items: buildResultGroup(
                'combos', <IconBox size={18} />, '/combos', 'name',
                (d) => `₹${d.price}${d.isAvailable ? '' : ' • Unavailable'}`
            ),
        },
        {
            label: 'Inventory',
            items: buildResultGroup(
                'inventory', <IconBuildingWarehouse size={18} />, '/inventory', 'name',
                (d) => `${d.category} • ${d.currentStock} ${d.unit}`
            ),
        },
        {
            label: 'Tables',
            items: buildResultGroup(
                'tables', <IconArmchair2 size={18} />, '/tables', 'tableNumber',
                (d) => `${d.tableArea} • ${d.status}`
            ).map((r) => ({ ...r, title: `Table ${r.title}` })),
        },
    ].filter((g) => g.items.length > 0);

    const flatAllResults = resultGroups.flatMap((g) => g.items);

    const goToResult = (result) => {
        navigate(
            result.path,
            result.type !== 'nav' ? { state: { highlightId: result.id } } : undefined
        );
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setShowSearchResults(true);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (flatAllResults.length > 0) {
                goToResult(flatAllResults[0]);
            }
        } else if (e.key === 'Escape') {
            setShowSearchResults(false);
        }
    };

    const handleNotificationsClick = () => {
        setShowNotifications((prev) => !prev);
        setShowDropdown(false);
    };

    const handleProfileIconClick = async () => {
        const willShow = !showDropdown;
        setShowDropdown(willShow);
        setShowNotifications(false);

        if (!willShow || profile) return;

        if (isSuperAdmin) {
            setProfile({
                name: user?.name,
                email: user?.email,
                isSuperAdmin: true,
            });
            return;
        }

        if (isStaffUser) {
            setProfile({
                name: user?.name,
                email: user?.email,
                staffRole: user?.staffRole || user?.role,
                isStaffUser: true,
            });
            return;
        }

        try {
            setLoadingProfile(true);
            const response = await profileAPI.getProfile();
            if (response.data.success) {
                setProfile(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching profile preview:', error);
        } finally {
            setLoadingProfile(false);
        }
    };


    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEditProfile = () => {
        setShowDropdown(false);
        navigate('/profile');
    };

    const requestLogout = () => {
        setShowDropdown(false);
        setShowLogoutConfirm(true);
    };

    // Confirm modal
    const confirmLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setShowLogoutConfirm(false);
        navigate('/login');
    };

    const greetings = () => {
        const currentHour = new Date().getHours();
        let greet = "";
        let emoji = "";

        if (currentHour >= 0 && currentHour < 4) {
            greet = "Good Midnight";
            emoji = <IconSunMoon stroke={1} />;
        } else if (currentHour >= 4 && currentHour < 6) {
            greet = "Good Early Morning";
            emoji = <IconSunMoon stroke={1} />;
        } else if (currentHour >= 6 && currentHour < 12) {
            greet = "Good Morning";
            emoji = <IconHaze stroke={2} />
        } else if (currentHour >= 12 && currentHour < 17) {
            greet = "Good AfterNoon";
            emoji = <IconSun stroke={1} />;
        } else if (currentHour >= 17 && currentHour < 21) {
            greet = "Good Evening";
            emoji = <IconSunMoon stroke={1} />;
        } else if (currentHour >= 21 || currentHour < 5) {
            greet = "Good Night";
            emoji = <IconMoonStars stroke={1} />;
        }

        return { greet, emoji };
    }

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
            setGreeting(greetings());
        }, 1000);

        return () => clearInterval(interval);
    }, []);


    return (
        <div className="top-container">
            <div className="nav-icon" onClick={toggleNavbar}>
                {isNavbarOpen ? (
                    <IconMenu2 size={25} stroke={2} />
                ) : (
                    <IconMenuDeep size={25} stroke={2} />
                )}
            </div>

            <div className="text">
                <p title={user?.name}>{greeting.emoji} {greeting.greet}, {user?.name}!</p>
                <span>{time.toLocaleString('en-IN')}</span>
            </div>

            {/* Super Admin ke liye restaurant search bar nahi dikhega */}
            {!isSuperAdmin && (
                <div className="search-cont" ref={searchRef}>
                    <IconListSearch size={24} stroke={2} />
                    <input
                        type="text"
                        placeholder='Search anything... (orders, staff, menu, tables)'
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => setShowSearchResults(true)}
                    />

                    {showSearchResults && searchQuery.trim() && (
                        <div className="search-results-dropdown">
                            {searchLoading && (
                                <div className="search-results-loading">Searching...</div>
                            )}

                            {!searchLoading && flatAllResults.length === 0 && (
                                <div className="search-results-empty">No results found</div>
                            )}

                            {resultGroups.map((group) => (
                                <div key={group.label} className="search-results-group">
                                    <p className="search-results-group-label">{group.label}</p>
                                    {group.items.map((item) => (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            className="search-results-item"
                                            onClick={() => goToResult(item)}
                                        >
                                            {item.icon}
                                            <div className="search-results-item-text">
                                                <span className="search-results-item-title">{item.title}</span>
                                                <span className="search-results-item-group">{item.subtitle}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="left-func">
                <div className="theme" onClick={toggleTheme}>
                    {theme === 'light' ? (
                        <IconMoonStars size={21} stroke={1} />
                    ) : (
                        <IconSunHigh size={21} stroke={1} />
                    )}
                </div>
                <div className="notifications-dropdown-wrap" ref={notificationsRef}>
                    <div className="notifications" onClick={handleNotificationsClick}>
                        <IconBellStar size={21} stroke={1} />
                        {unreadCount > 0 && (
                            <span className="notifications-badge">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>

                    {showNotifications && (
                        <div className="notifications-dropdown">
                            <div className="notifications-dropdown-header">
                                <p className="notifications-dropdown-title">Notifications</p>
                                {notifications.length > 0 && unreadCount > 0 && (
                                    <button
                                        className="notifications-dropdown-mark-all"
                                        onClick={markAllAsRead}
                                    >
                                        <IconCheck size={13} /> Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="notifications-dropdown-list">
                                {notifications.length === 0 ? (
                                    <div className="notifications-dropdown-empty">
                                        <IconBellOff size={28} stroke={1.3} />
                                        <p>No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`notifications-dropdown-item ${n.read ? '' : 'unread'}`}
                                            onClick={() => markOneAsRead(n.id)}
                                        >
                                            {!n.read && <span className="notifications-dropdown-dot" />}
                                            <div className="notifications-dropdown-item-content">
                                                <p className="notifications-dropdown-item-title">{n.title}</p>
                                                <p className="notifications-dropdown-item-message">{n.message}</p>
                                                <span className="notifications-dropdown-item-time">
                                                    {formatTimeAgo(n.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="profile-dropdown-wrap" ref={dropdownRef}>
                    <div className="profile" onClick={handleProfileIconClick}>
                        <IconUserSearch size={21} stroke={1} />
                    </div>

                    {showDropdown && (
                        <div className="profile-dropdown">
                            {loadingProfile ? (
                                <div className="profile-dropdown-loading">Loading...</div>
                            ) : profile?.isSuperAdmin ? (

                                <>
                                    <div className="profile-dropdown-header">
                                        <div className="profile-dropdown-logo profile-dropdown-logo-placeholder">
                                            <IconCrown size={20} />
                                        </div>
                                        <div>
                                            <p className="profile-dropdown-name">{profile.name}</p>
                                            <div className="profile-dropdown-badges">
                                                <span className="profile-dropdown-badge plan">
                                                    <IconCrown size={11} /> Super Admin
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="profile-dropdown-info">
                                        <IconMail size={14} />
                                        <span>{profile.email}</span>
                                    </div>

                                    <div className="profile-dropdown-divider" />

                                    <button className="profile-dropdown-logout-btn" onClick={requestLogout}>
                                        <IconLogout size={16} /> Logout
                                    </button>
                                </>
                            ) : profile?.isStaffUser ? (
                                // Staff (Kitchen/Waiter/etc.) ke liye simple read-only info — koi "Edit Profile" nahi,
                                // kyunki restaurant profile edit karna staff ka kaam nahi hai
                                <>
                                    <div className="profile-dropdown-header">
                                        <div className="profile-dropdown-logo profile-dropdown-logo-placeholder">
                                            <IconUserSearch size={20} />
                                        </div>
                                        <div>
                                            <p className="profile-dropdown-name">{profile.name}</p>
                                            <div className="profile-dropdown-badges">
                                                <span className="profile-dropdown-badge plan">
                                                    {profile.staffRole}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="profile-dropdown-info">
                                        <IconMail size={14} />
                                        <span>{profile.email}</span>
                                    </div>

                                    <div className="profile-dropdown-divider" />

                                    <button className="profile-dropdown-logout-btn" onClick={requestLogout}>
                                        <IconLogout size={16} /> Logout
                                    </button>
                                </>
                            ) : profile ? (
                                <>
                                    <div className="profile-dropdown-header">
                                        {profile.logo ? (
                                            <img src={profile.logo} alt="Logo" className="profile-dropdown-logo" />
                                        ) : (
                                            <div className="profile-dropdown-logo profile-dropdown-logo-placeholder">
                                                <IconBuildingStore size={20} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="profile-dropdown-name">{profile.name}</p>
                                            <div className="profile-dropdown-badges">
                                                <span className="profile-dropdown-badge plan">
                                                    <IconCrown size={11} /> {profile.subscriptionPlan || 'free'}
                                                </span>
                                                {profile.isVerified && (
                                                    <span className="profile-dropdown-badge verified">
                                                        <IconShieldCheck size={11} /> Verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="profile-dropdown-info">
                                        <IconMail size={14} />
                                        <span>{profile.email}</span>
                                    </div>
                                    <div className="profile-dropdown-info">
                                        <IconPhone size={14} />
                                        <span>{profile.phone}</span>
                                    </div>
                                    <div className="profile-dropdown-info">
                                        <IconBuildingStore size={14} />
                                        <span>{profile.dbName}</span>
                                    </div>

                                    <div className="profile-dropdown-divider" />

                                    <button className="profile-dropdown-edit-btn" onClick={handleEditProfile}>
                                        <IconEdit size={16} /> Edit Profile
                                    </button>

                                    <button className="profile-dropdown-logout-btn" onClick={requestLogout}>
                                        <IconLogout size={16} /> Logout
                                    </button>
                                </>
                            ) : (
                                <div className="profile-dropdown-loading">Failed to load</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showLogoutConfirm && (
                <LogoutConfirmModal
                    onConfirm={confirmLogout}
                    onCancel={() => setShowLogoutConfirm(false)}
                />
            )}
        </div>

    );
};

export default Topbar;