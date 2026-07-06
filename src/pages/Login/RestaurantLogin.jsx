import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';
import './login.css'
import Food2 from '../../assets/food2.png'

const RestaurantLogin = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
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
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.restaurantLogin(formData);

      if (response.data.success) {
        toast.success('Login successful!');
        login(response.data.data.token, {
          restaurantId: response.data.data.restaurantId,
          name: response.data.data.name,
          email: response.data.data.email,
          restaurantDbName: response.data.data.dbName,
          logo: response.data.data.logo,
        });
        navigate('/dashboard');
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
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              <span className="auth-button-label">
                {loading ? 'Logging in...' : 'Login'}
              </span>
              
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RestaurantLogin