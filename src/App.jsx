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
import KitchenDashboard from './pages/Kitchen/Kitchendashboard';
import WaiterDashboard from './pages/Waiter/Waiterdashboard';
import StaffLogin from "./pages/Login/StaffLogin";

// Super Admin Pages
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import RestaurantDetail from './pages/SuperAdmin/RestaurantDetail';

// ---- Role helpers ----
// NOTE: agar normal restaurant owner/admin ka user.role backend se
// 'Admin' ya 'Owner' string aata hai (undefined/null nahi), to
// ADMIN_ROLES array mein wo exact value add/replace kar dena.
const ADMIN_ROLES = [undefined, null, 'Admin', 'Owner'];

const getUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('adminUser'));
  } catch {
    return null;
  }
};

// Role ke hisaab se sahi landing route decide karta hai
const getDefaultRoute = (user) => {
  if (!user) return '/login';
  if (user.role === 'SuperAdmin') return '/super-admin/dashboard';
  if (user.role === 'Kitchen') return '/kitchen';
  if (user.role === 'Waiter') return '/waiter';
  return '/dashboard';
};

// Sirf login check karta hai (kisi bhi role ke liye)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" />;
};

// allowedRoles list ke hisaab se access deta hai — mismatch hone par
// user ko uske apne sahi dashboard pe bhej deta hai (login pe nahi,
// taaki logged-in user "logged out" jaisa feel na kare)
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/login" />;

  const user = getUserFromStorage();
  if (!user) return <Navigate to="/login" />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
};

// Sirf SuperAdmin role wale users ko allow karta hai
const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const user = getUserFromStorage();

  if (!token) return <Navigate to="/login" />;
  if (user?.role !== 'SuperAdmin') {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
};

// "/" aur "*" dono ke liye — role ke hisaab se sahi jagah bhejta hai
const RootRedirect = () => (
  <Navigate to={getDefaultRoute(getUserFromStorage())} replace />
);

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

                  <Route
                    path="/dashboard"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Dashboard />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />

                  <Route
                    path="/tables"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <TablesList />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />

                  {/* Kitchen route — sirf Kitchen role */}
                  <Route
                    path="/kitchen"
                    element={
                      <RoleProtectedRoute allowedRoles={[...ADMIN_ROLES, 'Kitchen']}>
                        <MainLayout>
                          <KitchenDashboard />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />

                  {/* Waiter route — sirf Waiter role */}
                  <Route
                    path="/waiter"
                    element={
                      <RoleProtectedRoute allowedRoles={[...ADMIN_ROLES, 'Waiter']}>
                        <MainLayout>
                          <WaiterDashboard />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />

                  <Route
                    path="/menu"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Menu />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />

                  <Route
                    path="/main_category"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <MainCategories />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />

                  <Route
                    path="/orders"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Orders />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Billing />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/combos"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Combos />
                        </MainLayout>
                      </RoleProtectedRoute>
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
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Inventory />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Staff />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Reports />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/media"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Media />
                        </MainLayout>
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
                        <MainLayout>
                          <Transactions />
                        </MainLayout>
                      </RoleProtectedRoute>
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

                  {/* Redirect — ab role-aware hai, hardcoded /dashboard nahi */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="*" element={<RootRedirect />} />
                </Routes>
              </NotificationProvider>
            </NavbarProvider>
          </ThemeProvider>
        </RestaurantProvider>
      </AuthProvider>
    </Router>
  );
}