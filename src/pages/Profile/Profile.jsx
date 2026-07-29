import React, { useState, useEffect, useContext } from 'react';
import {
    IconBuildingStore,
    IconMapPin,
    IconPhone,
    IconMail,
    IconWorld,
    IconQrcode,
    IconClock,
    IconPalette,
    IconLock,
    IconUpload,
    IconX,
    IconPlus,
    IconShieldCheck,
    IconCrown,
    IconCamera,
    IconDeviceFloppy,
    IconCopy,
    IconReceiptTax,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { profileAPI, subscriptionAPI } from '../../utils/api';
import { useSubscriptionPayment } from '../../hooks/useSubscriptionPayment';
import { AuthContext } from '../../context/AuthContext';
import './Profile.css';

const DAYS = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
];

const COMMON_CUISINES = [
    'Indian', 'North Indian', 'South Indian', 'Chinese', 'Italian',
    'Continental', 'Mexican', 'Thai', 'Fast Food', 'Bakery',
    'Desserts', 'Mughlai', 'Punjabi',
];

const THEMES = [
    { value: 'orange', label: 'Orange', color: '#ff6b35' },
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'green', label: 'Green', color: '#22c55e' },
    { value: 'purple', label: 'Purple', color: '#7c3aed' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

const emptyOperatingHours = () =>
    DAYS.reduce((acc, d) => {
        acc[d.key] = { open: '09:00', close: '23:00' };
        return acc;
    }, {});

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const { user, updateUser } = useContext(AuthContext);
    const { pay, payingPlan } = useSubscriptionPayment(() => fetchSubscription());

    const fetchSubscription = async () => {
        try {
            const res = await subscriptionAPI.getMySubscription();
            if (res.data.success) setSubscription(res.data.data);
        } catch (error) {
            console.error('Subscription fetch error:', error);
        }
    };
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        cuisine: [],
        cuisineType: 'Both',
        logo: '',
        coverImage: '',
        contactEmail: '',
        contactPhone: '',
        websiteUrl: '',
        upiId: '',
        operatingHours: emptyOperatingHours(),
        theme: 'orange',
        currency: 'INR',
        // 👇 GST / Tax settings — restaurant-level, applies to all future orders
        gstEnabled: false,
        gstPercentage: '5',
    });

    const [customCuisine, setCustomCuisine] = useState('');

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        fetchProfile();
        fetchSubscription();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await profileAPI.getProfile();
            if (response.data.success) {
                const data = response.data.data;
                setProfile(data);
                setFormData({
                    name: data.name || '',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    zipCode: data.zipCode || '',
                    cuisine: data.cuisine || [],
                    cuisineType: data.cuisineType || 'Both',
                    logo: data.logo || '',
                    coverImage: data.coverImage || '',
                    contactEmail: data.contactEmail || '',
                    contactPhone: data.contactPhone || '',
                    websiteUrl: data.websiteUrl || '',
                    upiId: data.upiId || '',
                    operatingHours: data.operatingHours || emptyOperatingHours(),
                    theme: data.theme || 'orange',
                    currency: data.currency || 'INR',
                    gstEnabled: data.gstEnabled || false,
                    gstPercentage:
                        data.gstPercentage !== undefined && data.gstPercentage !== null
                            ? data.gstPercentage.toString()
                            : '5',
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData((prev) => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const toggleCuisine = (cuisine) => {
        setFormData((prev) => ({
            ...prev,
            cuisine: prev.cuisine.includes(cuisine)
                ? prev.cuisine.filter((c) => c !== cuisine)
                : [...prev.cuisine, cuisine],
        }));
    };

    const addCustomCuisine = () => {
        const val = customCuisine.trim();
        if (!val) return;
        if (!formData.cuisine.includes(val)) {
            setFormData((prev) => ({ ...prev, cuisine: [...prev.cuisine, val] }));
        }
        setCustomCuisine('');
    };

    const updateHour = (day, field, value) => {
        setFormData((prev) => ({
            ...prev,
            operatingHours: {
                ...prev.operatingHours,
                [day]: { ...prev.operatingHours[day], [field]: value },
            },
        }));
    };

    const applyToAllDays = (day) => {
        const source = formData.operatingHours[day];
        setFormData((prev) => ({
            ...prev,
            operatingHours: DAYS.reduce((acc, d) => {
                acc[d.key] = { ...source };
                return acc;
            }, {}),
        }));
        toast.success(`${DAYS.find((d) => d.key === day).label} ke timings sab din pe apply ho gaye`);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Restaurant name is required');
            return;
        }

        // 👇 GST validation — sirf tab check karo jab GST on hai
        if (formData.gstEnabled) {
            const gstVal = parseFloat(formData.gstPercentage);
            if (isNaN(gstVal) || gstVal < 0 || gstVal > 28) {
                toast.error('GST percentage 0 se 28 ke beech honi chahiye');
                return;
            }
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                gstPercentage: parseFloat(formData.gstPercentage) || 0,
            };
            const response = await profileAPI.updateProfile(payload);
            if (response.data.success) {
                toast.success('Profile updated successfully');
                setProfile(response.data.data);

                // 👇 AuthContext ka user bhi update karo taaki Navbar/Topbar/Dashboard turant naya naam dikhaye
                updateUser({
                    ...user,
                    name: response.data.data.name,
                    logo: response.data.data.logo,
                });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to update profile';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            toast.error('Saare password fields fill karo');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New passwords match nahi karte');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error('Password kam se kam 6 characters ka hona chahiye');
            return;
        }

        try {
            setChangingPassword(true);
            const response = await profileAPI.changePassword(passwordForm);
            if (response.data.success) {
                toast.success('Password successfully changed');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to change password';
            toast.error(msg);
        } finally {
            setChangingPassword(false);
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    if (loading) {
        return (
            <div className="profile-page loading">
                <div className="spinner"></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="profile-page">
            {/* ===== Cover + Logo Header ===== */}
            <div className="profile-hero">
                <div className="profile-cover">
                    {formData.coverImage ? (
                        <img src={formData.coverImage} alt="Cover" />
                    ) : (
                        <div className="profile-cover-placeholder" />
                    )}
                    <label className="profile-cover-edit">
                        <IconCamera size={16} /> Change Cover
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'coverImage')}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                <div className="profile-hero-bottom">
                    <div className="profile-logo-wrap">
                        {formData.logo ? (
                            <img src={formData.logo} alt="Logo" className="profile-logo" />
                        ) : (
                            <div className="profile-logo profile-logo-placeholder">
                                <IconBuildingStore size={28} />
                            </div>
                        )}
                        <label className="profile-logo-edit">
                            <IconCamera size={14} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'logo')}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>

                    <div className="profile-hero-info">
                        <h1>{profile?.name}</h1>
                        <div className="profile-hero-badges">
                            <span className="profile-badge plan">
                                <IconCrown size={13} /> {profile?.subscriptionPlan || 'free'}
                            </span>
                            {profile?.isVerified && (
                                <span className="profile-badge verified">
                                    <IconShieldCheck size={13} /> Verified
                                </span>
                            )}
                            <span className={`profile-badge status ${profile?.isActive ? 'active' : 'inactive'}`}>
                                {profile?.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Login Info (read-only) ===== */}
            <div className="profile-card readonly-card">
                <h3>Login Details</h3>
                <p className="profile-card-sub">
                    Ye login email/phone hai — inhe yaha se change nahi kar sakte, security ke liye alag process hai.
                </p>
                <div className="profile-readonly-grid">
                    <div className="profile-readonly-item" onClick={() => copyToClipboard(profile?.email, 'Email')}>
                        <IconMail size={16} />
                        <span>{profile?.email}</span>
                        <IconCopy size={14} className="copy-icon" />
                    </div>
                    <div className="profile-readonly-item" onClick={() => copyToClipboard(profile?.phone, 'Phone')}>
                        <IconPhone size={16} />
                        <span>{profile?.phone}</span>
                        <IconCopy size={14} className="copy-icon" />
                    </div>
                    <div className="profile-readonly-item" onClick={() => copyToClipboard(profile?.dbName, 'Restaurant Code')}>
                        <IconBuildingStore size={16} />
                        <span>{profile?.dbName}</span>
                        <IconCopy size={14} className="copy-icon" />
                    </div>
                </div>
            </div>

            {/* ===== Subscription Info ===== */}
            <div className="profile-card readonly-card">
                <h3><IconClock size={18} /> Subscription</h3>
                {subscription ? (
                    <>
                        <p className="profile-card-sub">
                            Current Plan: <strong>{subscription.plan}</strong> &middot; Status:{' '}
                            <strong>{subscription.status}</strong>
                        </p>
                        {subscription.status === 'trial' && (
                            <p className="profile-card-sub">
                                Demo ke <strong>{subscription.daysLeft} din</strong> bache hain.
                            </p>
                        )}
                        {subscription.expiry && (
                            <p className="profile-card-sub">
                                Expiry: {new Date(subscription.expiry).toLocaleDateString('en-IN')}
                            </p>
                        )}
                        <div className="profile-hero-badges" style={{ marginTop: 12 }}>
                            {['weekly', 'monthly', 'yearly'].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className="profile-tag-chip"
                                    disabled={payingPlan === p}
                                    onClick={() => pay(p, p.charAt(0).toUpperCase() + p.slice(1))}
                                >
                                    {payingPlan === p ? 'Processing...' : `Buy ${p}`}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="profile-card-sub">Loading subscription info...</p>
                )}
            </div>

            <form onSubmit={handleSaveProfile}>
                {/* ===== Basic Info ===== */}
                <div className="profile-card">
                    <h3><IconBuildingStore size={18} /> Basic Information</h3>

                    <div className="Profile-form-group">
                        <label>Restaurant Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="Profile-form-group">
                        <label>Cuisine Type</label>
                        <div className="profile-radio-row">
                            {['Vegetarian', 'Non-Vegetarian', 'Both'].map((type) => (
                                <label key={type} className="profile-radio">
                                    <input
                                        type="radio"
                                        checked={formData.cuisineType === type}
                                        onChange={() => setFormData({ ...formData, cuisineType: type })}
                                    />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="Profile-form-group">
                        <label>Cuisines</label>
                        <div className="profile-tags-selection">
                            {COMMON_CUISINES.map((c) => (
                                <button
                                    type="button"
                                    key={c}
                                    className={`profile-tag-chip ${formData.cuisine.includes(c) ? 'active' : ''}`}
                                    onClick={() => toggleCuisine(c)}
                                >
                                    {c}
                                </button>
                            ))}
                            {formData.cuisine
                                .filter((c) => !COMMON_CUISINES.includes(c))
                                .map((c) => (
                                    <button
                                        type="button"
                                        key={c}
                                        className="profile-tag-chip active"
                                        onClick={() => toggleCuisine(c)}
                                    >
                                        {c} <IconX size={12} />
                                    </button>
                                ))}
                        </div>
                        <div className="profile-add-cuisine">
                            <input
                                type="text"
                                placeholder="Custom cuisine add karo..."
                                value={customCuisine}
                                onChange={(e) => setCustomCuisine(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addCustomCuisine();
                                    }
                                }}
                            />
                            <button type="button" onClick={addCustomCuisine}>
                                <IconPlus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ===== Address ===== */}
                <div className="profile-card">
                    <h3><IconMapPin size={18} /> Address</h3>

                    <div className="Profile-form-group">
                        <label>Full Address</label>
                        <textarea
                            rows="2"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="form-row">
                        <div className="Profile-form-group">
                            <label>City</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                        <div className="Profile-form-group">
                            <label>State</label>
                            <input
                                type="text"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            />
                        </div>
                        <div className="Profile-form-group">
                            <label>Zip Code</label>
                            <input
                                type="text"
                                value={formData.zipCode}
                                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* ===== Contact ===== */}
                <div className="profile-card">
                    <h3><IconPhone size={18} /> Contact Info</h3>
                    <p className="profile-card-sub">
                        Ye customer-facing contact details hain (menu/bill par dikhengi) — login credentials se alag.
                    </p>

                    <div className="Profile-form-row">
                        <div className="Profile-form-group">
                            <label>Contact Email</label>
                            <input
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            />
                        </div>
                        <div className="Profile-form-group">
                            <label>Contact Phone</label>
                            <input
                                type="text"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="Profile-form-group">
                        <label><IconWorld size={14} /> Website URL</label>
                        <input
                            type="text"
                            placeholder="https://..."
                            value={formData.websiteUrl}
                            onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                        />
                    </div>
                </div>

                {/* ===== Payment ===== */}
                <div className="profile-card">
                    <h3><IconQrcode size={18} /> Payment (UPI)</h3>
                    <p className="profile-card-sub">
                        Bill print pe QR code isi UPI ID se generate hota hai.
                    </p>
                    <div className="Profile-form-group">
                        <label>UPI ID</label>
                        <input
                            type="text"
                            placeholder="yourname@upi"
                            value={formData.upiId}
                            onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        />
                    </div>
                </div>

                {/* ===== Tax Settings (GST) ===== */}
                <div className="profile-card">
                    <h3><IconReceiptTax size={18} /> Tax Settings (GST)</h3>
                    <p className="profile-card-sub">
                        GST ON karne par, ye sabhi naye orders (QR order + Counter Billing) me automatically
                        add ho jayega — bill aur order summary me alag se dikhega. OFF karne par naye orders
                        me GST lagna band ho jayega (purane orders ka record nahi badlega).
                    </p>

                    <div className="Profile-form-group profile-gst-toggle-row">
                        <label className="profile-switch">
                            <input
                                type="checkbox"
                                checked={formData.gstEnabled}
                                onChange={(e) =>
                                    setFormData({ ...formData, gstEnabled: e.target.checked })
                                }
                            />
                            <span className="profile-switch-slider"></span>
                        </label>
                        <span className="profile-gst-toggle-label">
                            {formData.gstEnabled ? 'GST Enabled' : 'GST Disabled'}
                        </span>
                    </div>

                    {formData.gstEnabled && (
                        <div className="Profile-form-group">
                            <label>GST Percentage (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="28"
                                step="0.1"
                                value={formData.gstPercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, gstPercentage: e.target.value })
                                }
                            />
                            <small>Common slabs: 5%, 12%, 18%</small>
                        </div>
                    )}
                </div>

                {/* ===== Operating Hours ===== */}
                <div className="profile-card">
                    <h3><IconClock size={18} /> Operating Hours</h3>

                    <div className="profile-hours-table">
                        {DAYS.map((day) => (
                            <div key={day.key} className="profile-hours-row">
                                <span className="profile-hours-day">{day.label}</span>
                                <input
                                    type="time"
                                    value={formData.operatingHours[day.key]?.open || '09:00'}
                                    onChange={(e) => updateHour(day.key, 'open', e.target.value)}
                                />
                                <span className="profile-hours-sep">to</span>
                                <input
                                    type="time"
                                    value={formData.operatingHours[day.key]?.close || '23:00'}
                                    onChange={(e) => updateHour(day.key, 'close', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="profile-hours-apply"
                                    onClick={() => applyToAllDays(day.key)}
                                    title="Ye timing sab din pe apply karo"
                                >
                                    Apply to all
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ===== Branding ===== */}
                <div className="profile-card">
                    <h3><IconPalette size={18} /> Branding & Preferences</h3>

                    <div className="Profile-form-group">
                        <label>Theme Color</label>
                        <div className="profile-theme-row">
                            {THEMES.map((t) => (
                                <button
                                    type="button"
                                    key={t.value}
                                    className={`profile-theme-swatch ${formData.theme === t.value ? 'active' : ''}`}
                                    style={{ background: t.color }}
                                    onClick={() => setFormData({ ...formData, theme: t.value })}
                                    title={t.label}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="Profile-form-group">
                        <label>Currency</label>
                        <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button type="submit" className="profile-save-btn" disabled={saving}>
                    <IconDeviceFloppy size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            {/* ===== Change Password ===== */}
            <form onSubmit={handlePasswordChange} className="profile-card profile-password-card">
                <h3><IconLock size={18} /> Change Password</h3>

                <div className="Profile-form-group">
                    <label>Current Password</label>
                    <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        }
                    />
                </div>

                <div className="Profile-form-row">
                    <div className="Profile-form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                            }
                        />
                    </div>
                    <div className="Profile-form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                            }
                        />
                    </div>
                </div>

                <button type="submit" className="btn-secondary" disabled={changingPassword}>
                    {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
};

export default Profile;