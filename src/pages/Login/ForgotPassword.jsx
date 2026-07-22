import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../utils/api';
import './login.css'

const IMAGE_URL = "https://res.cloudinary.com/xruyknps/image/upload/v1784703767/forgot-password_syi2fe.png";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error('Please enter your email');
            return;
        }
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword({ email });
            if (res.data.success) {
                toast.success('OTP sent to your email');
                setStep(2);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!otp || !newPassword || !confirmPassword) {
            toast.error('Please fill all fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await authAPI.resetPassword({ email, otp, newPassword });
            if (res.data.success) {
                toast.success('Password reset successful!');
                setStep(3);
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            await authAPI.forgotPassword({ email });
            toast.success('OTP resent to your email');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="image-container">
                <img src={IMAGE_URL} alt="forgot-password image" />
            </div>
            <div className="login">
                <div className="login-card">
                    <div className="login-head">
                        <h1>{step === 3 ? 'All done!' : 'Reset password'}</h1>
                        <p>
                            {step === 1 && 'Enter your registered email to receive an OTP'}
                            {step === 2 && `OTP sent to ${email}`}
                            {step === 3 && 'You can now login with your new password'}
                        </p>
                    </div>

                    {step === 1 && (
                        <form className="auth-form" onSubmit={handleSendOtp}>
                            <div className="loginForm-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="owner@restaurant.com"
                                    required
                                />
                            </div>
                            <button type="submit" className="auth-button" disabled={loading}>
                                <span className="auth-button-label">
                                    {loading ? 'Sending OTP...' : 'Send OTP'}
                                </span>
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form className="auth-form" onSubmit={handleResetPassword}>
                            <div className="loginForm-group">
                                <label htmlFor="otp">Enter OTP</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="6-digit OTP"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <div className="loginForm-group">
                                <label htmlFor="newPassword">New password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            <div className="loginForm-group">
                                <label htmlFor="confirmPassword">Confirm password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>

                            <button type="submit" className="auth-button" disabled={loading}>
                                <span className="auth-button-label">
                                    {loading ? 'Resetting...' : 'Reset password'}
                                </span>
                            </button>

                            <p className="auth-footer">
                                Didn't get OTP?{' '}
                                <button type="button" onClick={handleResendOtp} className="forgot-password-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Resend
                                </button>
                            </p>
                        </form>
                    )}

                    {step === 3 && (
                        <p className="auth-footer">Redirecting to login...</p>
                    )}

                    <p className="auth-footer">
                        <Link to="/login">Back to login</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword