import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../utils/api';
import './SuperAdmin.css';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [restaurantsRes, statsRes] = await Promise.all([
        superAdminAPI.getAllRestaurants(),
        superAdminAPI.getPlatformStats(),
      ]);
      setRestaurants(restaurantsRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.city?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

  if (loading) {
    return (
      <div className="sa-container">
        <div className="sa-loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="sa-container">
      <div className="sa-header">
        <div>
          <h1>All Restaurants</h1>
          <p>Platform-wide overview of every restaurant on your SaaS</p>
        </div>
      </div>

      {stats && (
        <div className="sa-stats-grid">
          <div className="sa-stat-card">
            <span className="sa-stat-label">Total Restaurants</span>
            <span className="sa-stat-value">{stats.totalRestaurants}</span>
          </div>
          <div className="sa-stat-card">
            <span className="sa-stat-label">Active</span>
            <span className="sa-stat-value sa-green">{stats.activeRestaurants}</span>
          </div>
          <div className="sa-stat-card">
            <span className="sa-stat-label">Inactive</span>
            <span className="sa-stat-value sa-red">{stats.inactiveRestaurants}</span>
          </div>
          <div className="sa-stat-card">
            <span className="sa-stat-label">Total Orders</span>
            <span className="sa-stat-value">{stats.totalOrders}</span>
          </div>
          <div className="sa-stat-card sa-highlight">
            <span className="sa-stat-label">Total Revenue</span>
            <span className="sa-stat-value">{formatCurrency(stats.totalRevenue)}</span>
          </div>
        </div>
      )}

      <div className="sa-search-row">
        <input
          type="text"
          placeholder="Search by name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sa-search-input"
        />
      </div>

      <div className="sa-table-wrapper">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>City</th>
              <th>Plan</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRestaurants.length === 0 ? (
              <tr>
                <td colSpan="7" className="sa-empty">No restaurants found</td>
              </tr>
            ) : (
              filteredRestaurants.map((r) => (
                <tr key={r._id} onClick={() => navigate(`/super-admin/restaurant/${r._id}`)} className="sa-row">
                  <td>
                    <div className="sa-restaurant-name">{r.name}</div>
                    <div className="sa-restaurant-email">{r.email}</div>
                  </td>
                  <td>{r.city || '-'}</td>
                  <td><span className="sa-plan-badge">{r.subscriptionPlan}</span></td>
                  <td>{r.totalOrders || 0}</td>
                  <td>{formatCurrency(r.totalRevenue)}</td>
                  <td>
                    <span className={`sa-status-badge ${r.isActive ? 'sa-active' : 'sa-inactive'}`}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="sa-arrow">→</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;