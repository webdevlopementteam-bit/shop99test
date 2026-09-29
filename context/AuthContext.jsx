"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { clearUserSession, scheduleUserSessionExpiry, USER_SESSION_EXPIRED_EVENT } from "@/lib/authSession";

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

    const onExpired = () => setUser(null);
    window.addEventListener(USER_SESSION_EXPIRED_EVENT, onExpired);
    // Auto-logout when the 7-day login runs out (also if it already has).
    const cancelExpiry = scheduleUserSessionExpiry();
    return () => {
      window.removeEventListener(USER_SESSION_EXPIRED_EVENT, onExpired);
      cancelExpiry();
    };
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("userToken", token);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    clearUserSession();
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
