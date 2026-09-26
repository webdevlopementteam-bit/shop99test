"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { BASE_URL, getWarrantyRequestsApi, updateWarrantyStatusApi } from "@/lib/adminApi";
import { Search, FileText } from "lucide-react";

function resolveInvoiceUrl(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.replace(/^\/+/, "");
  return `${BASE_URL}/${path}`;
}

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-blue-500/20 text-blue-400",
};

export default function Warranty() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getWarrantyRequestsApi();
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setRequests(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.log(err);
      toast.error("Could not load warranty requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await updateWarrantyStatusApi(id, status);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      toast.success("Status updated.");
    } catch (err) {
      console.log(err);
      toast.error("Could not update status.");
    }
  };

  const filtered = requests.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(r.order_number || "").toLowerCase().includes(q) ||
      String(r.name || "").toLowerCase().includes(q) ||
      String(r.email || "").toLowerCase().includes(q) ||
      String(r.mobile || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col text-white">
      <div className="shrink-0 border-b border-gray-800/80 bg-[#0B0F19]/50 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Warranty Registrations
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filtered.length} request{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, order, email, mobile…"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-800/80 bg-[#111827] shadow-xl">
          <div className="custom-scrollbar min-h-[280px] min-w-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[960px] border-separate border-spacing-y-1 text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#0B0F19] text-left text-xs font-semibold uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgba(55,65,81,0.6)]">
                  <th className="whitespace-nowrap px-3 py-3 pl-4">#</th>
                  <th className="whitespace-nowrap px-3 py-3">Source</th>
                  <th className="whitespace-nowrap px-3 py-3">Order</th>
                  <th className="min-w-[160px] px-3 py-3">Product</th>
                  <th className="whitespace-nowrap px-3 py-3">Name</th>
                  <th className="whitespace-nowrap px-3 py-3">Mobile</th>
                  <th className="whitespace-nowrap px-3 py-3">Email</th>
                  <th className="whitespace-nowrap px-3 py-3">Invoice</th>
                  <th className="whitespace-nowrap px-3 py-3">Submitted</th>
                  <th className="whitespace-nowrap px-3 py-3 pr-4">Status</th>
                </tr>
              </thead>

              <tbody className="text-gray-300">
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="rounded-xl bg-[#0B0F19]/40 px-6 py-16 text-center text-gray-500"
                    >
                      No warranty requests found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, index) => (
                    <tr
                      key={r.id}
                      className="bg-[#161b26] shadow-sm transition hover:bg-[#1c2333]"
                    >
                      <td className="whitespace-nowrap rounded-l-lg px-3 py-3 pl-4 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {r.purchase_source === "other" ? (
                          <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-400">
                            Other
                          </span>
                        ) : (
                          <span className="rounded-full bg-teal-500/10 px-2 py-1 text-xs text-teal-400">
                            Shop99
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium text-white">
                        {r.order_number || r.order_pk || "-"}
                      </td>

                      <td
                        className="max-w-[200px] truncate px-3 py-3 text-gray-300"
                        title={r.product_name}
                      >
                        {r.product_name || "-"}
                      </td>

                      <td className="px-3 py-3">{r.name}</td>
                      <td className="px-3 py-3">{r.mobile}</td>
                      <td className="max-w-[180px] truncate px-3 py-3" title={r.email}>
                        {r.email}
                      </td>

                      <td className="px-3 py-3">
                        {r.invoice_url ? (
                          <a
                            href={resolveInvoiceUrl(r.invoice_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-fit items-center gap-1 rounded-md bg-green-500/10 px-3 py-1 text-xs text-green-400 hover:bg-green-500/20"
                          >
                            <FileText size={14} /> View
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-400">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="rounded-r-lg px-3 py-3 pr-4">
                        <select
                          value={r.status || "pending"}
                          onChange={(e) => updateStatus(r.id, e.target.value)}
                          className={`rounded-md border border-gray-600 bg-[#020617] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                            STATUS_COLORS[r.status] || "text-gray-300"
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
