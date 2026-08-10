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
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('credentials');
  const [otp, setOtp] = useState('');
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

  const handleAuthSuccess = (data) => {
    toast.success('Login successful!');

    const { role } = data;

    if (role === 'SuperAdmin') {
      login(data.token, {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: 'SuperAdmin',
      });
      navigate('/super-admin/dashboard');
    } else {
      login(data.token, {
        restaurantId: data.restaurantId,
        name: data.name,
        email: data.email,
        restaurantDbName: data.dbName,
        logo: data.logo,
        role: 'Owner',
      });
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(formData);

      if (response.data.success && response.data.requiresOtp) {
        toast.success('OTP sent to your email');
        setStep('otp');
      } else if (response.data.success) {
        // backward-compat safety net, in case requiresOtp isn't set
        handleAuthSuccess(response.data.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
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
      const response = await authAPI.loginVerifyOtp({
        email: formData.email,
        otp,
      });

      if (response.data.success) {
        handleAuthSuccess(response.data.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Invalid OTP. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const response = await authAPI.loginResendOtp({ email: formData.email });
      if (response.data.success) {
        toast.success('OTP resent to your email');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(errorMessage);
    } finally {
      setResending(false);
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
          {step === 'credentials' ? (
            <>
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

                <div className="forgot-password-row">
                  <Link to="/forgot-password" className="forgot-password-link">
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" className="auth-button" disabled={loading}>
                  <span className="auth-button-label">
                    {loading ? 'Sending OTP...' : 'Continue'}
                  </span>
                </button>
              </form>

              <p className="auth-footer">
                Staff Login Here <Link to="/staff-login">Staff Login</Link>
                <br />
                Don't have an account? <Link to="/signup">Register here</Link>
              </p>
            </>
          ) : (
            <>
              <div className="login-head">
                <h1>Verify it's you</h1>
                <p>We sent a 6-digit code to <strong>{formData.email}</strong></p>
              </div>

              <form className="auth-form" onSubmit={handleVerifyOtp}>
                <div className="loginForm-group">
                  <label htmlFor="otp">Enter OTP</label>
                  <input
                    type="text"
                    id="otp"
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
                    {loading ? 'Verifying...' : 'Verify & login'}
                  </span>
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
                  onClick={() => { setStep('credentials'); setOtp(''); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}
                >
                  ← Back to login
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RestaurantLogin