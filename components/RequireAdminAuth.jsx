"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getStoredAuthToken } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

/**
 * Blocks dashboard routes until a JWT exists and initial profile bootstrap finishes.
 */
export default function RequireAdminAuth({ children }) {
  const { loading } = useAdminAuth();
  const router = useRouter();
  const token = getStoredAuthToken();

  useEffect(() => {
    if (!getStoredAuthToken()) {
      router.replace("/admin/login");
    }
  }, [router]);

  if (loading && token) {
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
