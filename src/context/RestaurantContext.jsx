import React, { createContext, useState } from 'react';

export const RestaurantContext = createContext();

export const RestaurantProvider = ({ children }) => {
  const [restaurant, setRestaurant] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    logo: null,
    dbName: '',
  });

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalTables: 0,
    totalMenuItems: 0,
    pendingOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });

  const updateRestaurant = (data) => {
    setRestaurant((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const updateStats = (data) => {
    setStats((prev) => ({
      ...prev,
      ...data,
    }));
  };

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        updateRestaurant,
        stats,
        updateStats,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};