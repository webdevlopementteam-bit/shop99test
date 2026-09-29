"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getStoredAuthToken } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { scheduleAdminSessionExpiry } from "@/lib/authSession";

// Another tab logging out/in changes the admin token.
function subscribeToStorage(onChange) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Blocks dashboard routes until a JWT exists and initial profile bootstrap finishes.
 * The token is read after mount (localStorage doesn't exist during SSR), and a
 * session the server rejects is ended by the adminApi response interceptor,
 * which redirects to /admin/login itself.
 */
export default function RequireAdminAuth({ children }) {
  const { loading } = useAdminAuth();
  const router = useRouter();
  // null during SSR/hydration (not checked yet); "" or the JWT after mount.
  const token = useSyncExternalStore(subscribeToStorage, getStoredAuthToken, () => null);

  useEffect(() => {
    if (token === "") router.replace("/admin/login");
  }, [token, router]);

  // Log out to /admin/login the moment the admin JWT expires (immediately if
  // it already has) instead of pages failing with "Unauthorized".
  useEffect(() => {
    if (token) return scheduleAdminSessionExpiry();
  }, [token]);

  if (token === null || (token && loading)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#00C2A8]" />
        <span className="text-sm">Signing you in…</span>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return children;
}
