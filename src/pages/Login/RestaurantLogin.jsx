import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';
import './login.css'

const IMAGE_URL = "https://res.cloudinary.com/xruyknps/image/upload/v1784703806/food2_prnpcy.png";

const RestaurantLogin = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    console.log('form submitted, preventing default');
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(formData);

      if (response.data.success) {
        toast.success('Login successful!');

        const { role } = response.data.data;

        if (role === 'SuperAdmin') {
          login(response.data.data.token, {
            _id: response.data.data._id,
            name: response.data.data.name,
            email: response.data.data.email,
            role: 'SuperAdmin',
          });
          navigate('/super-admin/dashboard');
        } else {
          login(response.data.data.token, {
            restaurantId: response.data.data.restaurantId,
            name: response.data.data.name,
            email: response.data.data.email,
            restaurantDbName: response.data.data.dbName,
            logo: response.data.data.logo,
            role: 'Owner',
          });
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
        <img src={IMAGE_URL} alt="Plated dish from the restaurant" />
        <div className="image-overlay" />
        <div className="image-caption">
          <span className="image-caption-eyebrow">Kitchen dashboard</span>
          <h2>Run the floor. Not the chaos.</h2>
        </div>
      </div>

      <div className="login">
        <div className="login-card">
          <div className="login-head">
            <h1>Welcome back</h1>
            <p>Sign in to manage your restaurant</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="loginForm-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="owner@restaurant.com"
                required
              />
            </div>

            <div className="loginForm-group">
              <label htmlFor="password">Password</label>
              {/* ✅ NEW: wrapper for eye icon positioning */}
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
                    // eye-off icon
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    // eye icon
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>


            <div className="forgot-password-row">
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              <span className="auth-button-label">
                {loading ? 'Logging in...' : 'Login'}
              </span>
            </button>
          </form>

          <p className="auth-footer">
            Staff Login Here <Link to="/staff-login">Staff Login</Link>
            <br />
            Don't have an account? <Link to="/signup">Register here</Link>
          </p>

        </div>
      </div>
    </div>
  )
}

export default RestaurantLogin