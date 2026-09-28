"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearStoredAuthTokens, getAdminProfileApi, getStoredAuthToken } from "@/lib/adminApi";

const AdminAuthContext = createContext(null);

function unwrapProfilePayload(raw) {
  if (!raw || typeof raw !== "object") return raw;
  if (raw.user && typeof raw.user === "object") return raw.user;
  if (raw.profile && typeof raw.profile === "object") return raw.profile;
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    return raw.data;
  }
  return raw;
}

/** Shared shape for `/admin-auth/profile` (flexible field names). */
export function normalizeAdminProfile(raw) {
  const r = unwrapProfilePayload(raw);
  if (!r || typeof r !== "object") {
    return { name: "", phone: "", role: "" };
  }
  return {
    name: String(r.name ?? r.customer_name ?? "").trim(),
    phone: String(r.phone ?? r.mobile ?? r.contact ?? "").trim(),
    role: String(r.role ?? r.adminRole ?? r.userRole ?? r.user_role ?? r.type ?? "").trim(),
  };
}

export function AdminAuthProvider({ children }) {
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    role: "",
  });
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setProfile({ name: "", phone: "", role: "" });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getAdminProfileApi();
      const n = normalizeAdminProfile(data);
      setProfile({
        name: n.name || "Admin",
        phone: n.phone,
        role: n.role || "Administrator",
      });
    } catch {
      // A rejected session (401 / non-admin 403) is ended and redirected by
      // the adminApi response interceptor; anything else (network, 5xx) keeps
      // the session — it's still valid, the profile just didn't load.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(() => {
    clearStoredAuthTokens();
    setProfile({ name: "", phone: "", role: "" });
    window.location.assign("/admin/login");
  }, []);

  return <AdminAuthContext.Provider value={{ profile, loading, refreshProfile, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
