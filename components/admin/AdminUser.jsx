"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { User, Phone, Lock, Loader2 } from "lucide-react";
import { getAdminProfileApi, updateAdminProfileApi } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

function pickNamePhone(raw) {
  if (!raw || typeof raw !== "object") return { name: "", phone: "" };
  return {
    name: String(raw.name ?? raw.customer_name ?? "").trim(),
    phone: String(raw.phone ?? raw.mobile ?? raw.contact ?? "").trim(),
  };
}

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Request failed";
  if (typeof d === "string") return d;
  return d.message || d.error || "Request failed";
}

/** Logged-in profile only — create account lives on `/admin/register` (same layout as login). */
export default function AdminUser() {
  const { refreshProfile } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAdminProfileApi();
        if (cancelled) return;
        const { name: n, phone: p } = pickNamePhone(data);
        setName(n);
        setPhone(p);
      } catch (err) {
        if (!cancelled) toast.error(apiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const wantsPassword = currentPassword.trim() !== "" || newPassword.trim() !== "" || confirmPassword.trim() !== "";

    if (wantsPassword) {
      if (!currentPassword.trim()) {
        toast.error("Enter your current password to set a new password.");
        return;
      }
      if (!newPassword.trim()) {
        toast.error("Enter a new password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New password and confirmation do not match.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
      };
      if (wantsPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      await updateAdminProfileApi(payload);
      await refreshProfile();
      toast.success(wantsPassword ? "Account and password updated." : "Details saved.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-gray-400">
        <Loader2 className="animate-spin" size={22} />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-semibold">My account</h2>
        <p className="mt-1 text-sm text-gray-400">Update your name, phone, and password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-lg">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <User size={16} className="text-[#00C2A8]" />
            Profile
          </h3>

          <label className="block">
            <span className="text-xs text-gray-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="Your name"
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Phone size={12} />
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
              autoComplete="tel"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="Mobile number"
            />
          </label>
        </div>

        <div className="space-y-4 border-t border-gray-800 pt-6">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Lock size={16} className="text-[#00C2A8]" />
            Change password
          </h3>
          <p className="text-xs text-gray-500">
            Leave password fields empty to only update name or phone. Changing password requires current and new password (server rule).
          </p>

          <label className="block">
            <span className="text-xs text-gray-500">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="••••••••"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="••••••••"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="••••••••"
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00C2A8] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#00b396] disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
