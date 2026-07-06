// ======================================
// Frontend Routing Setup
// ======================================

// File: src/App.jsx or src/routes/index.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Admin Components
import AdminDashboard from './pages/admin/Dashboard';
import TablesList from './pages/admin/Tables/TablesList';
import MenuManagement from './pages/admin/Menu/MenuManagement';
import OrdersManagement from './pages/admin/Orders/OrdersManagement';
import AdminLayout from './layouts/AdminLayout';

// Customer Components
import CustomerMenu from './pages/customer/CustomerMenu';
import OrderStatus from './pages/customer/OrderStatus';
import CustomerLayout from './layouts/CustomerLayout';

// Auth
import Login from './pages/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <Router>
            <Routes>
                {/* ==================== CUSTOMER ROUTES ==================== */}
                 <Route path="/order/:restaurantId/:tableNumber" element={<CustomerMenu />} />
        <Route path="/order-status/:orderId" element={<OrderStatus />} />


                {/* ==================== ADMIN ROUTES ==================== */}
                <Route path="/admin/login" element={<Login />} />

                <Route path="/admin" element={
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<AdminDashboard />} />
                    <Route path="tables" element={<TablesList />} />
                    <Route path="menu" element={<MenuManagement />} />
                    <Route path="orders" element={<OrdersManagement />} />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/order/restaurant-id/1" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;


// ======================================
// API Configuration
// ======================================

// File: src/utils/api.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ✅ TABLES API
export const tablesAPI = {
    getAll: () => api.get('/tables'),
    create: (data) => api.post('/tables', data),
    update: (id, data) => api.put(`/tables/${id}`, data),
    delete: (id) => api.delete(`/tables/${id}`),
    generateQR: (tableNumber) => api.post(`/tables/generate-qr/${tableNumber}`),
    generateBatchQR: (tableNumbers) => api.post('/tables/generate-batch-qr', { tableNumbers }),
};

// ✅ MENU API (PUBLIC)
export const menuAPI = {
    // Customer side - get menu by restaurant
    getByRestaurant: (restaurantId) => 
        api.get(`/menu/restaurant/${restaurantId}`),
    
    getByCategory: (restaurantId, category) =>
        api.get(`/menu/restaurant/${restaurantId}/category/${category}`),
    
    // Admin side - CRUD operations
    getAll: () => api.get('/menu'),
    create: (data) => api.post('/menu', data),
    update: (id, data) => api.put(`/menu/${id}`, data),
    delete: (id) => api.delete(`/menu/${id}`),
};

// ✅ ORDERS API
export const ordersAPI = {
    // Customer side - create and track order
    create: (data) => api.post('/orders/create', data),
    getById: (id) => api.get(`/orders/${id}`),
    
    // Admin side
    getAll: () => api.get('/orders'),
    updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
    updatePaymentStatus: (id, status) => api.patch(`/orders/${id}/payment-status`, { status }),
};

// ✅ RESTAURANTS API
export const restaurantsAPI = {
    getById: (id) => api.get(`/restaurants/${id}`),
    getAll: () => api.get('/restaurants'),
    create: (data) => api.post('/restaurants', data),
    update: (id, data) => api.put(`/restaurants/${id}`, data),
};

// ✅ AUTH API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
};

export default api;


// File: src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = !!localStorage.getItem('authToken');

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

export default ProtectedRoute;


// ======================================
// Customer Layout
// ======================================

// File: src/layouts/CustomerLayout.jsx

import React from 'react';

const CustomerLayout = ({ children }) => {
    return (
        <div className="customer-layout">
            {children}
        </div>
    );
};

export default CustomerLayout;