"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getProductsApi, BASE_URL } from "@/lib/adminApi";
import Pagination from "@/components/admin/Pagination";

function isOutOfStock(p) {
  if (p.in_stock === true || p.in_stock === 1 || p.in_stock === "1") return false;
  if (p.in_stock === false || p.in_stock === 0 || p.in_stock === "0") return true;
  return false;
}

export default function OutOfStock() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const limit = 100;
    let currentPage = 1;
    let totalPages = 1;
    const collected = [];

    try {
      while (currentPage <= totalPages && currentPage <= 500) {
        const res = await getProductsApi(currentPage, limit);
        const data = res?.data ?? [];
        totalPages = res?.totalPages ?? 1;
        for (const p of data) {
          if (isOutOfStock(p)) collected.push(p);
        }
        currentPage += 1;
      }

      setItems(collected);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to load products");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filterQuery]);

  const filtered = useMemo(() => {
    const q = filterQuery.trim();
    if (!q) return items;
    const lower = q.toLowerCase();
    const numeric = /^\d+$/.test(q);
    return items.filter((p) => {
      if (numeric) {
        return String(p.id).includes(q);
      }
      return (p.name || "").toLowerCase().includes(lower);
    });
  }, [items, filterQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const p = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize) || 1));
    const start = (p - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold">Out of stock</h2>
          <p className="text-sm text-gray-400 mt-1">
            Products with no available stock ({filtered.length}
            {filterQuery.trim() ? ` of ${items.length}` : ""} shown)
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="self-start bg-[#1F2937] border border-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-[#374151] disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by product name or ID…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#111827] border border-gray-700 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/40"
          />
        </div>
        <p className="text-xs text-gray-500">Numeric input matches product ID (partial). Text matches name.</p>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="bg-[#111827] rounded-xl p-4 shadow-lg overflow-x-auto">
        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>
        ) : (
          <>
            <table className="min-w-[900px] w-full text-sm">
              <thead className="text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-center">Category</th>
                  <th className="p-3 text-center">Brand</th>
                  <th className="p-3 text-center">Price</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {items.length === 0 ? "No out-of-stock products." : "No products match your filter."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800 hover:bg-[#1F2937] transition">
                      <td className="p-3 text-gray-400 font-mono text-xs">{p.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img src={`${BASE_URL}/uploads/${p.image}`} alt="" className="w-12 h-12 rounded-lg object-contain bg-white p-1" />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-gray-300">{p.Category?.name || "—"}</td>
                      <td className="p-3 text-center text-gray-300">{p.Brand?.name || "—"}</td>
                      <td className="p-3 text-center font-medium">₹{p.price}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/products/edit/${p.id}`)}
                          className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md hover:bg-blue-500/30 text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="mt-4">
              <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
