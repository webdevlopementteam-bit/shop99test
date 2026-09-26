"use client";

import { ToastContainer } from "react-toastify";

export default function AdminToastProvider() {
  return <ToastContainer position="top-right" autoClose={3000} theme="dark" newestOnTop />;
}
