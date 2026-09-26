"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Phone, Lock, Loader2 } from "lucide-react";
import { getStoredAuthToken, loginAdminApi, persistAuthToken, pickTokenFromAuthResponse } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Login failed";
  if (typeof d === "string") return d;
  return d.message || d.error || "Login failed";
}

export default function AdminLogin() {
  const router = useRouter();
  const { refreshProfile } = useAdminAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredAuthToken()) {
      router.replace("/admin");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, "").slice(0, 15);
    if (!p.trim()) {
      toast.error("Enter your phone number.");
      return;
    }
    if (!password.trim()) {
      toast.error("Enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await loginAdminApi({ phone: p.trim(), password });
      const tok = pickTokenFromAuthResponse(data);
      if (!tok) {
        toast.error("Server did not return a token. Check backend login response.");
        return;
      }
      persistAuthToken(tok);
      await refreshProfile();
      toast.success("Welcome back.");
      router.replace("/admin");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] px-4 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-sm text-gray-400">Use your registered phone number and password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-800 bg-[#111827] p-8 shadow-xl">
          <label className="block">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Phone size={12} />
              Phone number
            </span>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="10-digit mobile"
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Lock size={12} />
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00C2A8] py-3 text-sm font-medium text-white transition hover:bg-[#00b396] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          First-time setup?{" "}
          <Link href="/admin/register" className="font-medium text-[#00C2A8] hover:underline">
            Create admin account
          </Link>
        </p>
      </div>
    </div>
  );
}
