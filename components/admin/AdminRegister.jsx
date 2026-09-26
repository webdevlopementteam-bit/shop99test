"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { User, Phone, Lock, Loader2 } from "lucide-react";
import { registerAdminApi, getStoredAuthToken, clearStoredAuthTokens, pickTokenFromAuthResponse } from "@/lib/adminApi";

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Registration failed";
  if (typeof d === "string") return d;
  return d.message || d.error || "Registration failed";
}

/**
 * Same full-screen layout as login — no sidebar/dashboard.
 * After success, user is sent to /admin/login to sign in (no auto dashboard).
 */
export default function AdminRegister() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredAuthToken()) {
      router.replace("/admin");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    if (!password.trim()) {
      toast.error("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password and confirmation do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await registerAdminApi({
        name: name.trim(),
        phone: phone.replace(/\D/g, "").slice(0, 15).trim(),
        password,
      });
      const tok = pickTokenFromAuthResponse(data);
      if (tok) {
        clearStoredAuthTokens();
      }
      toast.success("Account created. Sign in with your phone and password.");
      router.replace("/admin/login");
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
          <h1 className="text-2xl font-semibold tracking-tight">Create admin account</h1>
          <p className="mt-2 text-sm text-gray-400">First-time setup — then you&apos;ll sign in like usual</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-800 bg-[#111827] p-8 shadow-xl">
          <label className="block">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User size={12} />
              Name
            </span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="Your name"
            />
          </label>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-[#00C2A8]/50"
              placeholder="••••••••"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                Creating…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/admin/login" className="font-medium text-[#00C2A8] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
