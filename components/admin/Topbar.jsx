"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserCircle, ChevronDown, LogOut, User } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function Topbar() {
  const { profile, loading, logout } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const displayName = loading ? "…" : profile.name || "Admin";
  const displayRole = loading ? "…" : profile.role || "Administrator";

  return (
    <div className="h-16 bg-[#0B0F19] border-b border-gray-800 flex items-center justify-between px-6">
      {/* Left - Search */}
      <div className="flex-1 max-w-md" />

      {/* Right */}
      <div className="flex items-center gap-6">
        {/* Profile + dropdown */}
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-3 cursor-pointer rounded-lg py-1 pl-1 pr-2 hover:bg-white/5 transition"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full shrink-0">
              <UserCircle size={20} className="text-white" />
            </div>

            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-medium text-white truncate max-w-[140px]">{displayName}</p>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">{displayRole}</p>
            </div>

            <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-gray-800 bg-[#111827] py-1 shadow-xl z-50">
              <Link
                href="/admin/adminUser"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5"
              >
                <User size={16} className="text-gray-400" />
                My account
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
