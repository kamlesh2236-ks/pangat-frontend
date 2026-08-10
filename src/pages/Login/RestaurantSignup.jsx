import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../utils/api';
import './Auth.css';
const IMAGE_URL = "https://res.cloudinary.com/xruyknps/image/upload/v1784703806/food2_prnpcy.png";

// Same checks as the backend — catches obviously fake numbers before we even hit the server
const isRepeatedDigitPhone = (phone) => /^(\d)\1{9}$/.test(phone);

const isSequentialPhone = (phone) => {
    let ascending = true;
    let descending = true;
    for (let i = 1; i < phone.length; i++) {
        const prev = Number(phone[i - 1]);
        const curr = Number(phone[i]);
        if ((curr - prev + 10) % 10 !== 1) ascending = false;
        if ((prev - curr + 10) % 10 !== 1) descending = false;
    }
    return ascending || descending;
};

const isSuspiciousPhone = (phone) => isRepeatedDigitPhone(phone) || isSequentialPhone(phone);

const RestaurantSignup = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('form'); // 'form' | 'otp'
    const [otp, setOtp] = useState('');
    const [resending, setResending] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        cuisine: 'Indian',
        cuisineType: 'Both',
        contactEmail: '',
        contactPhone: '',
        ownerName: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (!/^\d{10}$/.test(formData.phone)) {
            toast.error('Phone must be 10 digits');
            return;
        }

        if (isSuspiciousPhone(formData.phone)) {
            toast.error('Please enter a real phone number');
            return;
        }

        setLoading(true);

        try {
            const response = await authAPI.restaurantSignupRequestOtp(formData);

            if (response.data.success) {
                toast.success('OTP sent to your email');
                setStep('otp');
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || 'Failed to send OTP. Please try again.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            toast.error('Please enter the 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            const response = await authAPI.restaurantSignupVerifyOtp({
                email: formData.email,
                otp,
            });

            if (response.data.success) {
                toast.success('Registration successful! Redirecting...');
                localStorage.setItem('adminToken', response.data.data.token);
                localStorage.setItem(
                    'adminUser',
                    JSON.stringify({
                        restaurantId: response.data.data.restaurantId,
                        name: response.data.data.name,
                        email: response.data.data.email,
                        restaurantDbName: response.data.data.dbName,
                    })
                );
                navigate('/dashboard');
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || 'Invalid OTP. Please try again.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setResending(true);
        try {
            const response = await authAPI.restaurantSignupResendOtp({ email: formData.email });
            if (response.data.success) {
                toast.success('OTP resent to your email');
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || 'Failed to resend OTP';
            toast.error(errorMessage);
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form-panel">
                <div className="auth-card">
                    {step === 'form' ? (
                        <>
                            <div className="auth-header">
                                <h1>Restaurant signup</h1>
                                <p>Register your restaurant and start taking QR orders</p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form">
                                {/* Restaurant Info */}
                                <div className="signupForm-section">
                                    <h3>Restaurant information</h3>

                                    <div className="signupForm-group">
                                        <label>Restaurant name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="e.g., ABC Restaurant"
                                            required
                                        />
                                    </div>

                                    <div className="signupForm-row">
                                        <div className="signupForm-group">
                                            <label>Email *</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="owner@restaurant.com"
                                                required
                                            />
                                        </div>
                                        <div className="signupForm-group">
                                            <label>Phone *</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="10-digit number"
                                                maxLength="10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="signupForm-row">
                                        <div className="signupForm-group">
                                            <label>Address *</label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                placeholder="Street address"
                                                required
                                            />
                                        </div>
                                        <div className="signupForm-group">
                                            <label>City *</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                placeholder="City"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="signupForm-row">
                                        <div className="signupForm-group">
                                            <label>State</label>
                                            <input
                                                type="text"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                placeholder="State"
                                            />
                                        </div>
                                        <div className="signupForm-group">
                                            <label>Zip code</label>
                                            <input
                                                type="text"
                                                name="zipCode"
                                                value={formData.zipCode}
                                                onChange={handleChange}
                                                placeholder="Zip code"
                                            />
                                        </div>
                                    </div>

                                    <div className="signupForm-row">
                                        <div className="signupForm-group">
                                            <label>Cuisine type</label>
                                            <input
                                                type="text"
                                                name="cuisine"
                                                value={formData.cuisine}
                                                onChange={handleChange}
                                                placeholder="e.g., Indian, Chinese"
                                            />
                                        </div>
                                        <div className="signupForm-group">
                                            <label>Category</label>
                                            <select name="cuisineType" value={formData.cuisineType} onChange={handleChange}>
                                                <option value="Vegetarian">Vegetarian</option>
                                                <option value="Non-Vegetarian">Non-Vegetarian</option>
                                                <option value="Both">Both</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Info */}
                                <div className="signupForm-section">
                                    <h3>Owner information</h3>

                                    <div className="signupForm-group">
                                        <label>Owner name</label>
                                        <input
                                            type="text"
                                            name="ownerName"
                                            value={formData.ownerName}
                                            onChange={handleChange}
                                            placeholder="Your full name"
                                        />
                                    </div>

                                    <div className="signupForm-row">
                                        <div className="signupForm-group">
                                            <label>Contact email</label>
                                            <input
                                                type="email"
                                                name="contactEmail"
                                                value={formData.contactEmail}
                                                onChange={handleChange}
                                                placeholder="Contact email"
                                            />
                                        </div>
                                        <div className="signupForm-group">
                                            <label>Contact phone</label>
                                            <input
                                                type="tel"
                                                name="contactPhone"
                                                value={formData.contactPhone}
                                                onChange={handleChange}
                                                placeholder="Contact number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Security */}
                                <div className="signupForm-section">
                                    <h3>Security</h3>

                                    <div className="signupForm-group">
                                        <label>Password *</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Minimum 6 characters"
                                            required
                                        />
                                    </div>

                                    <div className="signupForm-group">
                                        <label>Confirm password *</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Re-enter password"
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="auth-button" disabled={loading}>
                                    <span className="auth-button-label">
                                        {loading ? 'Sending OTP...' : 'Send verification OTP'}
                                    </span>
                                    {loading && <span className="auth-button-spinner" aria-hidden="true" />}
                                </button>
                            </form>

                            <p className="auth-footer">
                                Already have an account? <Link to="/login">Login here</Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="auth-header">
                                <h1>Verify your email</h1>
                                <p>We sent a 6-digit code to <strong>{formData.email}</strong></p>
                            </div>

                            <form onSubmit={handleVerifyOtp} className="auth-form">
                                <div className="signupForm-group">
                                    <label>Enter OTP *</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="6"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="6-digit code"
                                        autoFocus
                                        required
                                    />
                                </div>

                                <button type="submit" className="auth-button" disabled={loading}>
                                    <span className="auth-button-label">
                                        {loading ? 'Verifying...' : 'Verify & create account'}
                                    </span>
                                    {loading && <span className="auth-button-spinner" aria-hidden="true" />}
                                </button>
                            </form>

                            <p className="auth-footer">
                                Didn't get the code?{' '}
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={resending}
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                    {resending ? 'Resending...' : 'Resend OTP'}
                                </button>
                                <br />
                                <button
                                    type="button"
                                    onClick={() => setStep('form')}
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}
                                >
                                    ← Edit details
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="auth-image-panel">
                <img src={IMAGE_URL} alt="Plated dish from the restaurant" />
                <div className="auth-image-overlay" />
                <span className="particle" style={{ left: '8%', animationDelay: '0s', animationDuration: '9s', width: 4, height: 4 }} />
                <span className="particle" style={{ left: '22%', animationDelay: '2.5s', animationDuration: '11s', width: 6, height: 6 }} />
                <span className="particle" style={{ left: '38%', animationDelay: '1s', animationDuration: '8s', width: 3, height: 3 }} />
                <span className="particle" style={{ left: '55%', animationDelay: '4s', animationDuration: '12s', width: 5, height: 5 }} />
                <span className="particle" style={{ left: '70%', animationDelay: '0.5s', animationDuration: '10s', width: 4, height: 4 }} />
                <span className="particle" style={{ left: '85%', animationDelay: '3s', animationDuration: '9.5s', width: 3, height: 3 }} />
                <div className="auth-image-caption">
                    <span className="auth-image-caption-eyebrow">Kitchen dashboard</span>
                    <h2>One menu. Every table. Zero chaos.</h2>
                </div>
            </div>
        </div>
    );
};

export default RestaurantSignup;