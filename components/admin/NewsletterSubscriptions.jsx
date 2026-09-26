"use client";

import { useEffect, useMemo, useState } from "react";
import { getNewsletterSubscribersApi, getUsersApi } from "@/lib/adminApi";

function pickRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.subscribers)) return payload.subscribers;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function normalizeRow(row, idx) {
  const email = row?.email ?? row?.mail ?? "";
  const emailName = String(email).includes("@") ? String(email).split("@")[0] : "";
  return {
    id: row?.id ?? row?.subscriber_id ?? `sub-${idx}`,
    name: (row?.name ?? row?.full_name ?? row?.customer_name ?? row?.username ?? emailName) || "Guest",
    email: email || "-",
    createdAt: row?.createdAt ?? row?.created_at ?? null,
  };
}

export default function NewsletterSubscriptions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [subsRes, usersRes] = await Promise.allSettled([getNewsletterSubscribersApi(), getUsersApi()]);

        const subscriptions = subsRes.status === "fulfilled" ? pickRows(subsRes.value) : [];
        const users = usersRes.status === "fulfilled" ? pickRows(usersRes.value) : [];

        const userNameByEmail = new Map();
        users.forEach((u) => {
          const email = String(u?.email ?? u?.mail ?? u?.customer_email ?? u?.user_email ?? "")
            .trim()
            .toLowerCase();
          const name = String(u?.name ?? u?.full_name ?? u?.customer_name ?? u?.username ?? "").trim();
          if (email && name) {
            userNameByEmail.set(email, name);
          }
        });

        const list = subscriptions.map((row, idx) => {
          const normalized = normalizeRow(row, idx);
          const key = String(normalized.email || "").trim().toLowerCase();
          if (key && (!normalized.name || normalized.name === "Guest" || normalized.name === "Customer")) {
            const matched = userNameByEmail.get(key);
            if (matched) {
              return { ...normalized, name: matched };
            }
          }
          return normalized;
        });

        setRows(list);
      } catch (err) {
        const message = err?.response?.data?.message || err?.response?.data?.error || "Could not load newsletter subscriptions";
        setError(message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return copy;
  }, [rows]);

  return (
    <div className="text-white space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Newsletter Subscriptions</h2>
        <p className="text-sm text-gray-400">All subscribed emails with customer name</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading subscriptions...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-800 bg-red-950/30 text-red-300 p-4">{error}</div>
      ) : (
        <div className="bg-[#111827] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0B0F19] text-gray-400">
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Subscribed On</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr key={row.id} className="border-t border-gray-800 hover:bg-[#1F2937]">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">{row.name || "Guest"}</td>
                    <td className="p-3 text-gray-300">{row.email || "-"}</td>
                    <td className="p-3 text-gray-500 text-xs">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center p-6 text-gray-400">
                      No newsletter subscriptions found
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
