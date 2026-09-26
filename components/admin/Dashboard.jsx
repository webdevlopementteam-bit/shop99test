"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getDashboardStatsApi, getOrdersAdminApi } from "@/lib/adminApi";
import Pagination from "@/components/admin/Pagination";
import { ShoppingBag, Boxes, ShoppingCart, IndianRupee, Filter, CalendarRange, ExternalLink, Search } from "lucide-react";

import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

function getDisplayStatus(status) {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s) return "pending";
  if (s === "failed") return "cancelled";
  return s;
}

function orderDayString(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function inDateRange(orderDate, from, to) {
  if (!from && !to) return true;
  const day = orderDayString(orderDate);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function getStatusColor(status) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-400";
    case "confirmed":
      return "bg-emerald-500/20 text-emerald-400";
    case "processing":
      return "bg-blue-500/20 text-blue-400";
    case "shipped":
      return "bg-purple-500/20 text-purple-400";
    case "delivered":
      return "bg-green-500/20 text-green-400";
    case "cancelled":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickOrderDisplayPrice(order) {
  if (!order || typeof order !== "object") return 0;

  const totalKeys = [
    "grand_total",
    "total_amount",
    "payable_amount",
    "amount_paid",
    "paid_amount",
    "payment_amount",
    "order_total",
    "order_amount",
    "txn_amount",
    "final_amount",
    "net_amount",
    "total",
    "final_total",
    "amount",
    "total_price",
    "line_total",
    "item_total",
    "subtotal_with_tax",
  ];
  for (const key of totalKeys) {
    const n = numOrNull(order[key]);
    if (n != null && n > 0) return n;
  }

  const qtyRaw = numOrNull(order.qty ?? order.quantity ?? 1);
  const safeQty = qtyRaw != null && qtyRaw > 0 ? qtyRaw : 1;

  const baseUnit =
    numOrNull(
      order.selling_price ?? order.rate ?? order.unit_price ?? order.price ?? order.sale_price ?? order.final_price ?? order.net_price ?? order.discounted_price ?? order.item_price ?? 0,
    ) ?? 0;
  const lineSub = Number.isFinite(baseUnit) && baseUnit >= 0 ? baseUnit * safeQty : 0;

  const gstOneField = numOrNull(order.gst_amount ?? order.tax_amount ?? order.total_tax ?? order.tax ?? 0);
  if (gstOneField != null && gstOneField > 0 && lineSub > 0) {
    const ship = numOrNull(order.shipping_charge ?? order.shipping_amount ?? order.shipping_fee ?? 0) ?? 0;
    const disc = numOrNull(order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0) ?? 0;
    return Math.max(lineSub + gstOneField + ship - disc, 0);
  }

  const cgst = numOrNull(order.cgst) ?? 0;
  const sgst = numOrNull(order.sgst) ?? 0;
  const igst = numOrNull(order.igst) ?? 0;
  const splitTax = cgst + sgst + igst;
  if (lineSub > 0 && splitTax > 0) {
    const likelyAbsolute = splitTax <= lineSub * 0.45 || (cgst > 0 && cgst < 1000 && sgst > 0 && sgst < 1000);
    if (likelyAbsolute) {
      const ship = numOrNull(order.shipping_charge ?? order.shipping_amount ?? order.shipping_fee ?? 0) ?? 0;
      const disc = numOrNull(order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0) ?? 0;
      return Math.max(lineSub + splitTax + ship - disc, 0);
    }
  }

  const gstRateCombined = Number(order.cgst_rate ?? 0) + Number(order.sgst_rate ?? 0);
  const gstRate = Number(order.gst_percentage ?? order.gst_rate ?? order.tax_rate ?? (Number.isFinite(gstRateCombined) ? gstRateCombined : 0));
  if (lineSub > 0 && Number.isFinite(gstRate) && gstRate > 0) {
    const ship = numOrNull(order.shipping_charge ?? order.shipping_amount ?? order.shipping_fee ?? 0) ?? 0;
    const disc = numOrNull(order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0) ?? 0;
    return Math.max(lineSub + (lineSub * gstRate) / 100 + ship - disc, 0);
  }

  return Math.max(lineSub, 0);
}

const Card = ({ icon: Icon, title, value, color, hint }) => (
  <div className={`flex items-center justify-between rounded-xl p-5 text-white ${color}`}>
    <div className="min-w-0 pr-3">
      <p className="text-sm opacity-80">{title}</p>
      <h2 className="mt-1 text-2xl font-bold tabular-nums">{value}</h2>
      {hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}
    </div>

    <div className="shrink-0 rounded-lg bg-white/20 p-3">
      <Icon size={22} />
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchOrderId, setSearchOrderId] = useState("");
  const [page, setPage] = useState(1);

  const perPage = 8;

  const loadStats = useCallback(async () => {
    try {
      const data = await getDashboardStatsApi();
      setStats(data);
    } catch (err) {
      console.error("Dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await getOrdersAdminApi();
      setOrders(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Orders load failed", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadOrders();
  }, [loadStats, loadOrders]);

  const filteredOrders = useMemo(() => {
    const q = searchOrderId.trim().toLowerCase();

    const visibleStatuses = ["confirmed", "processing", "shipped", "delivered"];

    return (orders || [])
      .filter((o) => {
        const s = getDisplayStatus(o.status);

        if (!visibleStatuses.includes(s)) return false;

        if (q && !(o.order_id || "").toLowerCase().includes(q)) return false;

        if (!inDateRange(o.order_date, dateFrom, dateTo)) return false;

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.order_date || a.createdAt || 0).getTime();
        const dateB = new Date(b.order_date || b.createdAt || 0).getTime();

        if (dateB !== dateA) return dateB - dateA;

        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [orders, dateFrom, dateTo, searchOrderId]);

  const hasActiveFilters = useMemo(() => Boolean(dateFrom) || Boolean(dateTo) || Boolean(searchOrderId.trim()), [dateFrom, dateTo, searchOrderId]);

  const overviewRevenue = useMemo(() => filteredOrders.reduce((sum, o) => sum + pickOrderDisplayPrice(o), 0), [filteredOrders]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, searchOrderId]);

  const chartDataFromOrders = useMemo(() => {
    const map = {};
    for (const o of filteredOrders || []) {
      const d = o.order_date ? new Date(o.order_date) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + pickOrderDisplayPrice(o);
    }
    const keys = Object.keys(map).sort();
    const last = keys.slice(-6);
    return last.map((k) => {
      const [y, m] = k.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      return { name: label, value: Math.round(map[k] * 100) / 100 };
    });
  }, [filteredOrders]);

  const fallbackChart = [
    { name: "Jan", value: 0 },
    { name: "Feb", value: 0 },
    { name: "Mar", value: 0 },
  ];

  const chartData = chartDataFromOrders.length > 0 ? chartDataFromOrders : fallbackChart;

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const pageRows = filteredOrders.slice(start, start + perPage);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSearchOrderId("");
  };

  if (loading) {
    return <div className="mt-20 text-center text-white">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-4 text-white sm:p-6">
      <h2 className="mb-6 text-2xl font-bold">Overview</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={ShoppingBag} title="Total Products" value={stats.products} color="bg-gradient-to-r from-blue-500 to-indigo-600" />
        <Card icon={Boxes} title="Categories" value={stats.categories} color="bg-gradient-to-r from-purple-500 to-indigo-600" />
        <Card
          icon={ShoppingCart}
          title="Orders"
          value={ordersLoading ? "…" : Number(filteredOrders.length).toLocaleString("en-IN")}
          hint={ordersLoading ? "Loading orders…" : hasActiveFilters ? "Matching filters below" : "From orders API (all)"}
          color="bg-gradient-to-r from-green-500 to-emerald-600"
        />
        <Card
          icon={IndianRupee}
          title="Revenue"
          value={
            ordersLoading
              ? "…"
              : `₹${overviewRevenue.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}`
          }
          hint={ordersLoading ? "Loading orders…" : hasActiveFilters ? "Sum of order amount — filtered" : "Sum of order amount (all)"}
          color="bg-gradient-to-r from-yellow-500 to-orange-500"
        />
      </div>

      <div className="mt-8">
        <div className="rounded-xl bg-[#111827] p-6">
          <h3 className="mb-1 font-semibold">Revenue by month</h3>
          <p className="mb-4 text-xs text-gray-500">
            {hasActiveFilters ? "Same set as filtered orders (sum of order amount per month)" : "All orders — sum of order amount per calendar month"}
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke="#888" />
              <Tooltip
                contentStyle={{
                  background: "#0B0F19",
                  border: "1px solid #374151",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders panel */}
      <div className="mt-8 min-w-0 overflow-hidden rounded-2xl border border-gray-800/80 bg-[#111827] shadow-xl">
        <div className="flex flex-col gap-4 border-b border-gray-800/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-5 w-5 text-teal-400" />
              Orders
            </h3>
            <p className="mt-1 text-sm text-gray-500">{ordersLoading ? "Loading orders…" : `Showing ${filteredOrders.length} active orders`}</p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:border-teal-500/50 hover:text-white"
          >
            Full orders page
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-col gap-4 border-b border-gray-800/60 bg-[#0f1419] p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search order ID…"
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#020617] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex flex-col gap-1 sm:min-w-[140px]">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
              <CalendarRange className="h-3.5 w-3.5" />
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="calendar-white rounded-lg border border-gray-700  px-3 py-2 text-sm text-black outline-none focus:border-teal-500/50"
            />
          </div>

          <div className="flex flex-col gap-1 sm:min-w-[140px]">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="calendar-white rounded-lg border border-gray-700 px-3 py-2 text-sm text-black outline-none focus:border-teal-500/50"
            />
          </div>

          <button type="button" onClick={clearFilters} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800">
            Clear filters
          </button>
        </div>

        <div className="custom-scrollbar min-w-0 overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 pl-5">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 pr-5">Date</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {ordersLoading ? (
                <tr>
                  <td colSpan={6} className="rounded-lg px-6 py-12 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="rounded-lg px-6 py-12 text-center text-gray-500">
                    No orders match these filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((order) => (
                  <tr key={order.id} className="bg-[#161b26] transition hover:bg-[#1c2333]">
                    <td className="whitespace-nowrap rounded-l-lg px-4 py-3 pl-5 font-mono text-xs font-medium text-white">{order.order_id}</td>
                    <td className="max-w-[140px] truncate px-4 py-3" title={order.customer_name}>
                      {order.customer_name || "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3" title={order.product_name}>
                      {order.product_name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {(() => {
                        const displayStatus = getDisplayStatus(order.status);
                        return <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(displayStatus)}`}>{displayStatus || "—"}</span>;
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">₹{pickOrderDisplayPrice(order).toFixed(2)}</td>
                    <td className="whitespace-nowrap rounded-r-lg px-4 py-3 pr-5 text-xs text-gray-400">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-800/80 bg-[#0f1419] px-2 py-4">
          <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
