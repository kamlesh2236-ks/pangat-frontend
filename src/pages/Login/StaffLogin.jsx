import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';
import Food2 from '../../assets/food2.png'
import './login.css';

const StaffLogin = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        restaurantCode: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password || !formData.restaurantCode) {
            toast.error('Please enter email, password and restaurant code');
            return;
        }

        setLoading(true);

        try {
            const response = await authAPI.staffLogin(formData);

            if (response.data.success) {
                toast.success('Login successful!');

                const { role, adminId, name, email, permissions, restaurantId } = response.data.data;

                // ✅ role backend se jo bhi aaye wahi use karo — hardcode mat karo
                login(response.data.data.token, {
                    adminId,
                    name,
                    email,
                    restaurantId,
                    restaurantDbName: formData.restaurantCode,
                    permissions,
                    role, // "Kitchen" | "Waiter" | "Owner" | koi bhi staff role
                    staffRole: response.data.data.staffRole,
                });

                if (role === 'Kitchen') {
                    navigate('/kitchen');
                } else if (role === 'Waiter') {
                    navigate('/waiter');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="image-container">
                <img src={Food2} alt="Plated dish from the restaurant" />
                <div className="image-overlay" />
                <div className="image-caption">
                    <span className="image-caption-eyebrow">Kitchen dashboard</span>
                    <h2>Run the floor. Not the chaos.</h2>
                </div>
            </div>
            <div className="login">
                <div className="login-card">
                    <div className="login-head">
                        <h1>Staff Login</h1>
                        <p>Kitchen, Waiter and other staff sign in here</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="loginForm-group">
                            <label htmlFor="restaurantCode">Restaurant Code</label>
                            <input
                                type="text"
                                name="restaurantCode"
                                value={formData.restaurantCode}
                                onChange={handleChange}
                                placeholder="e.g. restaurant_ab12cd34"
                                required
                            />
                        </div>

                        <div className="loginForm-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="staff@restaurant.com"
                                required
                            />
                        </div>

                        <div className="loginForm-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                            <line x1="2" y1="2" x2="22" y2="22" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="auth-button" disabled={loading}>
                            <span className="auth-button-label">
                                {loading ? 'Logging in...' : 'Login'}
                            </span>
                        </button>
                    </form>

                    <p className="auth-footer">
                        Restaurant owner? <Link to="/login">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StaffLogin;