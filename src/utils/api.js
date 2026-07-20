import axios from 'axios';

const getAPIBaseURL = () => {
    const VITE_API_URL = import.meta.env.VITE_API_URL;

    if (VITE_API_URL) {
        console.log('Using VITE_API_URL:', VITE_API_URL);
        return `${VITE_API_URL}/api`;
    }

    const hostname = window.location.hostname;
    const port = '5000';

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://localhost:${port}/api`;
    } else {
        return `http://${hostname}:${port}/api`;
    }
};

const API_BASE_URL = getAPIBaseURL();

console.log('API Base URL:', API_BASE_URL);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthRequest = error.config?.url?.includes('/login') ||
            error.config?.url?.includes('/signup') ||
            error.config?.url?.includes('/register');

        if (error.response?.status === 401 && !isAuthRequest) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/login';
        }

        if (error.response?.status === 403 && error.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
            window.dispatchEvent(new CustomEvent('subscription-expired'));
        }

        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (data) => apiClient.post('/auth/login', data),
    staffLogin: (data) => apiClient.post('/auth/admin/login', data),
    restaurantSignup: (data) => apiClient.post('/auth/restaurant/signup', data),
    restaurantLogin: (data) => apiClient.post('/auth/restaurant/login', data),
    adminLogin: (data) => apiClient.post('/auth/admin/login', data),
    forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
    resetPassword: (data) => apiClient.post('/auth/reset-password', data),
};

export const subscriptionAPI = {
    getPlans: () => apiClient.get('/admin/subscription/plans'),
    getMySubscription: () => apiClient.get('/admin/subscription/me'),
    createOrder: (plan) => apiClient.post('/admin/subscription/create-order', { plan }),
    verifyPayment: (data) => apiClient.post('/admin/subscription/verify-payment', data),
};

export const menuAPI = {
    getAll: () => apiClient.get('/admin/menu'),
    getById: (id) => apiClient.get(`/admin/menu/${id}`),
    create: (data) => apiClient.post('/admin/menu', data),
    update: (id, data) => apiClient.put(`/admin/menu/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/menu/${id}`),
    getByCategoryy: (category) => apiClient.get(`/admin/menu/category/${category}`),
    toggleAvailability: (id, isAvailable) => apiClient.patch(`/admin/menu/${id}/availability`, { isAvailable }),
    toggleStock: (id, isOutOfStock) => apiClient.patch(`/admin/menu/${id}/stock`, { isOutOfStock }),
    toggleSpicyLevel: (id, isSpicyLevel) => apiClient.patch(`/admin/menu/${id}/spicy`, { isSpicyLevel }),
    uploadImage: (formData) => apiClient.post('/admin/upload-image', formData, {
        headers: { 'Content-Type': undefined },
    }),
};


export const tablesAPI = {
    getAll: () => apiClient.get('/admin/tables'),
    getById: (id) => apiClient.get(`/admin/tables/${id}`),
    create: (data) => apiClient.post('/admin/tables', data),
    update: (id, data) => apiClient.put(`/admin/tables/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/tables/${id}`),
    updateStatus: (id, data) => apiClient.patch(`/admin/tables/${id}/status`, data),
    generateQR: (tableNumber) => apiClient.post(`/admin/tables/${tableNumber}/qr`),
    generateBatchQR: (tableNumbers) => apiClient.post('/admin/tables/qr/batch', { tableNumbers }),
};

export const ordersAPI = {
    getAll: (filters = {}) =>
        apiClient.get('/admin/orders', { params: filters }),

    getById: (id) =>
        apiClient.get(`/admin/orders/${id}`),

    updateStatus: (id, status) =>
        apiClient.put(`/admin/orders/${id}/status`, { status }),

    updatePaymentStatus: (id, paymentStatus) =>
        apiClient.put(`/admin/orders/${id}/payment-status`, { paymentStatus }),

    getByStatus: (status) =>
        apiClient.get(`/admin/orders/status/${status}`),

    getTodayOrders: () =>
        apiClient.get('/admin/orders/today'),

    cancelOrder: (id, reason) =>
        apiClient.post(`/admin/orders/${id}/cancel`, { reason }),

    createCounterBill: (data) =>
        apiClient.post('/admin/orders/counter', data),
};

export const paymentsAPI = {
    getAll: (filters) => apiClient.get('/admin/payments', { params: filters }),
    getById: (id) => apiClient.get(`/admin/payments/${id}`),
    updateStatus: (id, status) => apiClient.put(`/admin/payments/${id}/status`, { status }),
    getByStatus: (status) => apiClient.get(`/admin/payments/status/${status}`),
    getTodayPayments: () => apiClient.get('/admin/payments/today'),
};

export const dashboardAPI = {
    getStats: (params) => apiClient.get('/admin/dashboard/stats', { params }),
    getDailyStats: (date) => apiClient.get(`/admin/dashboard/daily-stats`, { params: { date } }),
    getWeeklyStats: () => apiClient.get('/admin/dashboard/weekly-stats'),
    getMonthlyStats: () => apiClient.get('/admin/dashboard/monthly-stats'),
    getRevenueData: (period) => apiClient.get(`/admin/dashboard/revenue`, { params: { period } }),
};

export const customerAPI = {
    getMenu: (qrId, tableNumber) =>
        apiClient.get(`/customer/menu`, {
            params: { qr: qrId, table: tableNumber }
        }),

    placeOrder: (data) =>
        apiClient.post('/customer/orders', data),

    getOrderStatus: (orderId, qrId) =>
        apiClient.get(`/customer/orders/${orderId}`, {
            params: { qr: qrId }
        }),

    getTableInfo: (qrId) =>
        apiClient.get(`/customer/tables/${qrId}`),

    getOrderStatus: (orderId, qrId) =>
        apiClient.get(`/customer/orders/${orderId}`, {
            params: { qrId: qrId }
        }),

    getBanners: (restaurantId) =>
        apiClient.get(`/customer/media/${restaurantId}`),

    callWaiter: (orderId, qrId, reason) =>
        apiClient.patch(`/customer/orders/${orderId}/call-waiter`, { qrId, reason }),
};

export const restaurantAPI = {
    getPublicInfo: (restaurantId) =>
        apiClient.get(`/restaurants/${restaurantId}/public`),
};

export const combosAPI = {
    getAll: () => apiClient.get('/admin/combos'),
    getById: (id) => apiClient.get(`/admin/combos/${id}`),
    create: (data) => apiClient.post('/admin/combos', data),
    update: (id, data) => apiClient.put(`/admin/combos/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/combos/${id}`),
    toggleAvailability: (id, isAvailable) =>
        apiClient.patch(`/admin/combos/${id}/availability`, { isAvailable }),
};

export const profileAPI = {
    getProfile: () => apiClient.get('/admin/profile'),
    updateProfile: (data) => apiClient.put('/admin/profile', data),
    changePassword: (data) => apiClient.post('/admin/profile/change-password', data),
};

export const inventoryAPI = {
    getAll: (filters = {}) => apiClient.get('/admin/inventory', { params: filters }),
    getById: (id) => apiClient.get(`/admin/inventory/${id}`),
    getStats: () => apiClient.get('/admin/inventory/stats/summary'),
    create: (data) => apiClient.post('/admin/inventory', data),
    update: (id, data) => apiClient.put(`/admin/inventory/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/inventory/${id}`),

    stockIn: (id, data) => apiClient.post(`/admin/inventory/${id}/stock-in`, data),
    stockOut: (id, data) => apiClient.post(`/admin/inventory/${id}/stock-out`, data),

    getItemTransactions: (id) => apiClient.get(`/admin/inventory/${id}/transactions`),
    getAllTransactions: (filters = {}) =>
        apiClient.get('/admin/inventory/transactions/all', { params: filters }),
};

export const staffAPI = {
    getAll: (filters = {}) => apiClient.get('/admin/staff', { params: filters }),
    getById: (id) => apiClient.get(`/admin/staff/${id}`),
    create: (data) => apiClient.post('/admin/staff', data),
    update: (id, data) => apiClient.put(`/admin/staff/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/staff/${id}`),

    // Attendance
    getTodayAttendance: () => apiClient.get('/admin/staff/attendance/today'),
    markAttendance: (id, data) => apiClient.post(`/admin/staff/${id}/attendance`, data),
    bulkMarkAttendance: (data) => apiClient.post('/admin/staff/attendance/bulk', data),
    getAttendanceHistory: (id, month) =>
        apiClient.get(`/admin/staff/${id}/attendance`, { params: { month } }),

    // Salary
    getSalary: (id, month) => apiClient.get(`/admin/staff/${id}/salary`, { params: { month } }),
    addSalaryTransaction: (id, data) =>
        apiClient.post(`/admin/staff/${id}/salary-transaction`, data),
    deleteSalaryTransaction: (transactionId) =>
        apiClient.delete(`/admin/staff/salary-transaction/${transactionId}`),

    getPayrollSummary: (month) =>
        apiClient.get('/admin/staff/payroll/summary', { params: { month } }),

    // Login Credentials
    setCredentials: (id, data) => apiClient.post(`/admin/staff/${id}/credentials`, data),
    revokeCredentials: (id) => apiClient.delete(`/admin/staff/${id}/credentials`),
};

export const reportsAPI = {
    getFull: (startDate, endDate) =>
        apiClient.get('/admin/reports/full', { params: { startDate, endDate } }),
};

export const mediaAPI = {
    getAll: () => apiClient.get('/admin/media'),
    create: (data) => apiClient.post('/admin/media', data),
    update: (id, data) => apiClient.put(`/admin/media/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/media/${id}`),
    toggle: (id, isActive) => apiClient.patch(`/admin/media/${id}/toggle`, { isActive }),
    reorder: (order) => apiClient.patch('/admin/media/reorder', { order }),
};

export const searchAPI = {
    global: (q) => apiClient.get('/admin/search', { params: { q } }),
};

export const transactionsAPI = {
    getAll: (filters = {}) => apiClient.get('/admin/transactions', { params: filters }),
    getSummary: () => apiClient.get('/admin/transactions/summary'),
};

export const mainCategoriesAPI = {
    getAll: () => apiClient.get('/admin/main-categories'),
    create: (data) => apiClient.post('/admin/main-categories', data),
    update: (id, data) => apiClient.put(`/admin/main-categories/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/main-categories/${id}`),
    reorder: (order) => apiClient.patch('/admin/main-categories/reorder', { order }),
};


export const superAdminAPI = {
    getAllRestaurants: () => apiClient.get('/superadmin/restaurants'),
    getPlatformStats: () => apiClient.get('/superadmin/stats'),
    getRestaurantOverview: (id) => apiClient.get(`/superadmin/restaurants/${id}/overview`),
    getRestaurantOrders: (id, filters = {}) => apiClient.get(`/superadmin/restaurants/${id}/orders`, { params: filters }),
    getRestaurantActivity: (id, filters = {}) => apiClient.get(`/superadmin/restaurants/${id}/activity`, { params: filters }),
};

export default apiClient;