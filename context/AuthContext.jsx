"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const legacyToken = localStorage.getItem("token");
    const userToken = localStorage.getItem("userToken");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // One-time migration: old sessions had only `token`.
    if (!userToken && legacyToken && storedUser) {
      localStorage.setItem("userToken", legacyToken);
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("userToken", token);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      login: () => {},
      logout: () => {},
    };
  }
  return ctx;
};
