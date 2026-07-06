import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { ordersAPI } from '../utils/api';

export const NotificationContext = createContext();

const POLL_INTERVAL_MS = 15000;
const MAX_NOTIFICATIONS = 50;
const MAX_AUTH_FAILS = 2;

// "2m ago", "1h ago" jaisa relative time dikhane ke liye helper
export const formatTimeAgo = (timestamp) => {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Poll ke beech state track karne ke liye — re-render trigger nahi karte isliye refs me
  const knownOrderIds = useRef(new Set());
  const knownOrderStatus = useRef(new Map());
  const isFirstLoad = useRef(true);
  const authFailCountRef = useRef(0);

  const hasAdminToken = () => !!localStorage.getItem('adminToken');

  const pushNotification = useCallback((notification) => {
    setNotifications((prev) => {
      const next = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          read: false,
          timestamp: Date.now(),
          ...notification,
        },
        ...prev,
      ];
      return next.slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const fetchAndDiff = useCallback(async () => {
    if (!hasAdminToken()) return;
    if (authFailCountRef.current >= MAX_AUTH_FAILS) return;

    try {
      const response = await ordersAPI.getAll({ limit: 50, sort: '-createdAt' });
      if (!response.data.success) return;

      authFailCountRef.current = 0;

      const orders = response.data.data || [];

      // Pehli baar sirf baseline capture karo — purane orders ke liye
      // notifications nahi banani (warna page load hote hi dher sare aa jayenge)
      if (isFirstLoad.current) {
        orders.forEach((o) => {
          knownOrderIds.current.add(o._id);
          knownOrderStatus.current.set(o._id, o.orderStatus);
        });
        isFirstLoad.current = false;
        return;
      }

      orders.forEach((o) => {
        if (!knownOrderIds.current.has(o._id)) {
          // ===== Naya order aaya =====
          knownOrderIds.current.add(o._id);
          knownOrderStatus.current.set(o._id, o.orderStatus);

          pushNotification({
            type: 'new-order',
            title: 'New Order Received',
            message: `Order #${o.orderNumber} • Table ${o.tableNumber || '—'} • ₹${o.totalAmount}`,
            orderId: o._id,
          });
        } else {
          // ===== Existing order ka status change hua =====
          const prevStatus = knownOrderStatus.current.get(o._id);
          if (prevStatus && prevStatus !== o.orderStatus) {
            knownOrderStatus.current.set(o._id, o.orderStatus);

            pushNotification({
              type: 'status-change',
              title: `Order ${o.orderStatus}`,
              message: `Order #${o.orderNumber} (Table ${o.tableNumber || '—'}) is now "${o.orderStatus}"`,
              orderId: o._id,
            });
          }
        }
      });
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        authFailCountRef.current += 1;
      }
      console.error('Notification polling error:', err);
    }
  }, [pushNotification]);

  useEffect(() => {
    fetchAndDiff(); // baseline load
    const interval = setInterval(fetchAndDiff, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAndDiff]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => setNotifications([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
        markOneAsRead,
        clearAll,
        pushNotification, // aage kisi aur event (payment, table) ke liye bhi use ho sakta hai
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};