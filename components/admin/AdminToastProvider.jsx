"use client";

import { useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { consumeSessionExpiredFlag, SESSION_EXPIRED_MESSAGE } from "@/lib/authSession";

export default function AdminToastProvider() {
  // Set before an expired-session redirect to /admin/login (lib/authSession).
  useEffect(() => {
    if (consumeSessionExpiredFlag("admin")) {
      toast.info(SESSION_EXPIRED_MESSAGE, { toastId: "session-expired", autoClose: 5000 });
    }
  }, []);

  return <ToastContainer position="top-right" autoClose={3000} theme="dark" newestOnTop />;
}
