"use client";

import { useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { consumeSessionExpiredFlag, SESSION_EXPIRED_MESSAGE } from "@/lib/authSession";

export default function ToastProvider() {
  // Set before an expired-session redirect to /login (lib/authSession).
  useEffect(() => {
    if (consumeSessionExpiredFlag("user")) {
      toast.info(SESSION_EXPIRED_MESSAGE, { toastId: "session-expired", autoClose: 5000 });
    }
  }, []);

  return <ToastContainer position="top-right" autoClose={2000} />;
}
