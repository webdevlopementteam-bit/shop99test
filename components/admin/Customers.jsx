"use client";

import { useEffect, useState } from "react";
import { getUsersApi } from "@/lib/adminApi";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const pickRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (Array.isArray(payload.users)) return payload.users;
    if (Array.isArray(payload.customers)) return payload.customers;
    if (Array.isArray(payload.subscribers)) return payload.subscribers;
    return [];
  };

  const normalizeUserRow = (row, idx) => ({
    id: row?.id ?? row?.user_id ?? row?.userId ?? `row-${idx}`,
    name: row?.name ?? row?.customer_name ?? row?.username ?? "User",
    email: row?.email ?? row?.mail ?? row?.customer_email ?? row?.user_email ?? "",
    phone: row?.phone ?? row?.mobile ?? row?.contact ?? "-",
    createdAt: row?.createdAt ?? row?.created_at ?? row?.joined_at ?? row?.join_date ?? null,
  });

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const usersRes = await getUsersApi();
      const users = pickRows(usersRes);
      const normalizedUsers = users.map(normalizeUserRow);

      const dedupe = new Map();
      normalizedUsers.forEach((row, idx) => {
        const emailKey = String(row?.email || "").trim().toLowerCase();
        const phoneKey = String(row?.phone || "").trim();
        const idKey = String(row?.id ?? idx);
        const key = emailKey || phoneKey || idKey;
        if (!dedupe.has(key)) {
          dedupe.set(key, {
            ...row,
            id: row?.id ?? `row-${idx}`,
          });
        }
      });

      setCustomers(Array.from(dedupe.values()));
    } catch (err) {
      console.error("Fetch customers error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="text-white space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Customers</h2>
        <p className="text-sm text-gray-400">Registered users from your platform</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading customers...</div>
      ) : (
        <div className="bg-[#111827] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0B0F19] text-gray-400">
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Joined</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((c, index) => (
                  <tr key={c.id} className="border-t border-gray-800 hover:bg-[#1F2937]">
                    <td className="p-3">{index + 1}</td>

                    <td className="p-3 font-medium">{c.name || "User"}</td>

                    <td className="p-3 text-gray-400">{c.email || "-"}</td>

                    <td className="p-3 text-gray-400">{c.phone || "-"}</td>

                    <td className="p-3 text-gray-500 text-xs">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}

                {customers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center p-6 text-gray-400">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
