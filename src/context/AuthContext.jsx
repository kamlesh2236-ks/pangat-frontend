import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    restaurantId: null,
    restaurantDbName: null,
    loading: true,
  });

  // Check if token exists in localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');

    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setAuth({
          isAuthenticated: true,
          user: userData,
          token,
          restaurantId: userData.restaurantId,
          restaurantDbName: userData.restaurantDbName,
          loading: false,
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setAuth((prev) => ({ ...prev, loading: false }));
      }
    } else {
      setAuth((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const login = (token, user) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    setAuth({
      isAuthenticated: true,
      user,
      token,
      restaurantId: user.restaurantId,
      restaurantDbName: user.restaurantDbName,
      loading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      restaurantId: null,
      restaurantDbName: null,
      loading: false,
    });
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('adminUser', JSON.stringify(updatedUser));
    setAuth((prev) => ({
      ...prev,
      user: updatedUser,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};