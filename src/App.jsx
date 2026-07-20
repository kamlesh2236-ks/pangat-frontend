import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useNewOrderAlert from './hooks/useNewOrderAlert';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { NavbarProvider, NavbarContext } from './context/NavbarContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

// Layout
import Navbar from './components/Navbar';
import Topbar from './components/Topbar';
import SubscriptionGate from './components/SubscriptionGate';

// Pages
import RestaurantLogin from './pages/Login/RestaurantLogin';
import RestaurantSignup from './pages/Login/RestaurantSignup';
import Dashboard from './pages/Dashboard';
import TablesList from './pages/Tables/TablesList';
import Menu from './pages/Menu/Menu';
import CustomerMenu from './pages/customer/CustomerMenu';
import OrderStatus from './pages/customer/OrderStatus';
import Orders from './pages/Orders/AdminOrders';
import Billing from './pages/Billing/Billing';
import Combos from './pages/Combos/Combos';
import Profile from './pages/Profile/Profile';
import Inventory from './pages/Inventory/Inventory';
import Staff from './pages/Staff/Staff';
import Reports from './pages/Reports/Reports';
import Media from './pages/Media/Media';
import Transactions from './pages/Transactions/Transactions';
import ForgotPassword from './pages/Login/ForgotPassword';
import MainCategories from './pages/Menu/MainCategories';
import KitchenDashboard from './pages/Kitchen/KitchenDashboard';
import WaiterDashboard from './pages/Waiter/Waiterdashboard';
import StaffLogin from "./pages/Login/StaffLogin";

// Super Admin Pages
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import RestaurantDetail from './pages/SuperAdmin/RestaurantDetail';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" />;
};

// Sirf SuperAdmin role wale users ko allow karta hai
const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const userStr = localStorage.getItem('adminUser');

  if (!token) return <Navigate to="/login" />;

  try {
    const user = JSON.parse(userStr);
    if (user?.role !== 'SuperAdmin') {
      return <Navigate to="/dashboard" />;
    }
  } catch {
    return <Navigate to="/login" />;
  }

  return children;
};

const MainLayout = ({ children }) => {
  const { isNavbarOpen } = React.useContext(NavbarContext);
  const userStr = localStorage.getItem('adminUser');
  const isSuperAdmin = userStr ? JSON.parse(userStr)?.role === 'SuperAdmin' : false;

  useNewOrderAlert(isSuperAdmin);

  return (
    <div className="main-layout">
      <Navbar />
       <Topbar />
      <main className={`main-content ${!isNavbarOpen ? 'sidebar-closed' : ''}`}>
        {children}
      </main>
      {!isSuperAdmin && <SubscriptionGate />}
    </div>
  );
};

export default function App() {

  return (

    <Router>
      <AuthProvider>
        <RestaurantProvider>
          <ThemeProvider>
            <NavbarProvider>
              <NotificationProvider>
                <Toaster position="top-right" />
                <Routes>
                  {/* Auth Routes */}
                  <Route path="/login" element={<RestaurantLogin />} />
                  <Route path="/staff-login" element={<StaffLogin />} />
                  <Route path="/signup" element={<RestaurantSignup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  {/* Super Admin Routes — */}
                  <Route
                    path="/super-admin/dashboard"
                    element={
                      <SuperAdminRoute>
                        <MainLayout>
                          <SuperAdminDashboard />
                        </MainLayout>
                      </SuperAdminRoute>
                    }
                  />
                  <Route
                    path="/super-admin/restaurant/:id"
                    element={
                      <SuperAdminRoute>
                        <MainLayout>
                          <RestaurantDetail />
                        </MainLayout>
                      </SuperAdminRoute>
                    }
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Dashboard />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/tables"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <TablesList />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/kitchen"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <KitchenDashboard />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/waiter"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <WaiterDashboard />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/menu"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Menu />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/main_category"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <MainCategories />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Orders />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Billing />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/combos"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Combos />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Profile />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/inventory"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Inventory />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Staff />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Reports />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/media"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Media />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Transactions />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/order/:restaurantId/:tableNumber"
                    element={<CustomerMenu />}
                  />
                  <Route
                    path="/order-status/:orderId"
                    element={<OrderStatus />}
                  />

                  {/* Redirect */}
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </NotificationProvider>
            </NavbarProvider>
          </ThemeProvider>
        </RestaurantProvider>
      </AuthProvider>
    </Router>
  );
}
