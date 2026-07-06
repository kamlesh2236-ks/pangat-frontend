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

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" />;
};

const MainLayout = ({ children }) => {
  const { isNavbarOpen } = React.useContext(NavbarContext);
  useNewOrderAlert();

  return (
    <div className="main-layout">
      <Navbar />
      <Topbar />
      <main className={`main-content ${!isNavbarOpen ? 'sidebar-closed' : ''}`}>
        {children}
      </main>
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
                  <Route path="/signup" element={<RestaurantSignup />} />

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