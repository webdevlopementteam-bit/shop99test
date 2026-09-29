"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/admin/Pagination";
import { SITE_URL } from "@/lib/siteConfig";
import { toast } from "react-toastify";

import {
  getOrdersAdminApi,
  updateOrderStatusApi,
  updateShippingApi,
  updateReturnApi,
  updateReplacementApi,
  downloadInvoiceApi, // ✅ ADD THIS
  downloadLabelApi,
} from "@/lib/adminApi";

import {
  Search,
  FileText,
  Truck,
  Pencil,
  Save,
  X,
  Eye,
  RotateCcw,
  RefreshCcw,
} from "lucide-react";

export default function Orders() {
  const DEFAULT_DELIVERY_WINDOW = "3-7 days";
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState(null);
  const [labelLoadingId, setLabelLoadingId] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [reasonPreview, setReasonPreview] = useState(null);

  const perPage = 5;

  const fetchOrders = async () => {
    try {
      const data = await getOrdersAdminApi();
      setOrders(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const downloadInvoice = async (order) => {
    try {
      setInvoiceLoadingId(order.id);

      const blob = await downloadInvoiceApi(order.id);

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `invoice-${order.order_id}.pdf`);
      document.body.appendChild(link);

      link.click();
      link.remove();
    } catch (err) {
      console.log(err);
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const downloadLabel = async (order) => {
    try {
      setLabelLoadingId(order.id);

      const blob = await downloadLabelApi(order.id);

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `label-${order.order_id}.pdf`);
      document.body.appendChild(link);

      link.click();
      link.remove();
    } catch (err) {
      console.log(err);
    } finally {
      setLabelLoadingId(null);
    }
  };

  const updateStatus = async (id, status) => {
    await updateOrderStatusApi(id, status);
    fetchOrders();
  };

  const handleChange = (id, field, value) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  };

  const handleSave = async (order) => {
    console.log("SAVE CLICKED", order);

    try {
      await updateShippingApi(order.id, {
        shipping_partner: order.shipping_partner,
        tracking_id: order.tracking_id,
        tracking_link: order.tracking_link,
      });

      toast.success("Saved ✅");
      setEditRow(null);
      fetchOrders();
    } catch (err) {
      console.log(err);
    }
  };

  const visibleStatuses = [
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "returned",
  ];

  const activeOrders = (orders || []).filter((o) =>
    visibleStatuses.includes(
      String(o.status || "")
        .trim()
        .toLowerCase(),
    ),
  );

  const filteredOrders = activeOrders.filter((o) =>
    (o.order_id || "").toLowerCase().includes(search.toLowerCase()),
  );

  const start = (page - 1) * perPage;
  const currentOrders = filteredOrders.slice(start, start + perPage);
  const totalPages = Math.ceil(filteredOrders.length / perPage);

  // const updateReturn = async (id, status) => {
  //   try {
  //     await updateReturnApi(id, { return_status: status });
  //     fetchOrders();
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  // const updateReplacement = async (id, status) => {
  //   try {
  //     await updateReplacementApi(id, { replacement_status: status });
  //     fetchOrders();
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  const getMainStatusFromReturn = (returnStatus) => {
    const s = String(returnStatus || "")
      .trim()
      .toLowerCase();
    if (s === "requested") return "processing";
    if (s === "approved") return "processing";
    if (s === "completed") return "returned";
    // rejected/none par original order delivered hi rehna better hai
    if (s === "rejected") return "delivered";
    if (s === "none") return "delivered";
    return null;
  };
  const getMainStatusFromReplacement = (replacementStatus) => {
    const s = String(replacementStatus || "")
      .trim()
      .toLowerCase();
    if (s === "requested") return "processing";
    if (s === "approved") return "processing";
    if (s === "shipped") return "shipped";
    if (s === "delivered") return "delivered";
    // rejected/none par original order delivered hi rehna better hai
    if (s === "rejected") return "delivered";
    if (s === "none") return "delivered";
    return null;
  };
  const updateReturn = async (id, status) => {
    try {
      await updateReturnApi(id, { return_status: status });
      const mainStatus = getMainStatusFromReturn(status);
      if (mainStatus) {
        await updateOrderStatusApi(id, mainStatus);
      }
      fetchOrders();
    } catch (err) {
      console.log(err);
    }
  };
  const updateReplacement = async (id, status) => {
    try {
      await updateReplacementApi(id, { replacement_status: status });
      const mainStatus = getMainStatusFromReplacement(status);
      if (mainStatus) {
        await updateOrderStatusApi(id, mainStatus);
      }
      fetchOrders();
    } catch (err) {
      console.log(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
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
      case "returned":
        return "bg-orange-500/20 text-orange-400";
      case "cancelled":
        return "bg-red-500/20 text-red-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getDisplayStatus = (status) => {
    const s = String(status ?? "")
      .trim()
      .toLowerCase();
    return s || "pending";
  };

  const getReturnReason = (order) => {
    return String(order?.return_reason ?? order?.returnReason ?? "").trim();
  };
  const getReplacementReason = (order) => {
    return String(
      order?.replacement_reason ?? order?.replacementReason ?? "",
    ).trim();
  };

  const getOrderVariantText = (order) => {
    const raw =
      order?.variant_label ??
      order?.variantLabel ??
      order?.variant ??
      order?.selected_variant ??
      order?.selectedVariant ??
      order?.variant_details ??
      order?.attributes ??
      "";
    if (raw == null) return "";
    if (typeof raw === "string") {
      const text = raw.trim();
      if (!text) return "";
      if (
        (text.startsWith("{") && text.endsWith("}")) ||
        (text.startsWith("[") && text.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed.filter(Boolean).join(" · ");
          if (parsed && typeof parsed === "object") {
            return Object.entries(parsed)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")
              .trim();
          }
        } catch {
          // non-json string fallback
        }
      }
      return text;
    }
    if (typeof raw === "object") {
      return Object.entries(raw)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
        .trim();
    }
    return String(raw).trim();
  };

  const numOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const pickOrderDisplayPrice = (order) => {
    if (!order || typeof order !== "object") return 0;

    // 1) Prefer backend final payable totals when available.
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
        order.selling_price ??
          order.rate ??
          order.unit_price ??
          order.price ??
          order.sale_price ??
          order.final_price ??
          order.net_price ??
          order.discounted_price ??
          order.item_price ??
          0,
      ) ?? 0;
    const lineSub =
      Number.isFinite(baseUnit) && baseUnit >= 0 ? baseUnit * safeQty : 0;

    // 2) Single tax-amount field.
    const gstOneField = numOrNull(
      order.gst_amount ?? order.tax_amount ?? order.total_tax ?? order.tax ?? 0,
    );
    if (gstOneField != null && gstOneField > 0 && lineSub > 0) {
      const ship =
        numOrNull(
          order.shipping_charge ??
            order.shipping_amount ??
            order.shipping_fee ??
            0,
        ) ?? 0;
      const disc =
        numOrNull(
          order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0,
        ) ?? 0;
      return Math.max(lineSub + gstOneField + ship - disc, 0);
    }

    // 3) Split tax amounts (cgst/sgst/igst) saved as rupees.
    const cgst = numOrNull(order.cgst) ?? 0;
    const sgst = numOrNull(order.sgst) ?? 0;
    const igst = numOrNull(order.igst) ?? 0;
    const splitTax = cgst + sgst + igst;
    if (lineSub > 0 && splitTax > 0) {
      const likelyAbsolute =
        splitTax <= lineSub * 0.45 ||
        (cgst > 0 && cgst < 1000 && sgst > 0 && sgst < 1000);
      if (likelyAbsolute) {
        const ship =
          numOrNull(
            order.shipping_charge ??
              order.shipping_amount ??
              order.shipping_fee ??
              0,
          ) ?? 0;
        const disc =
          numOrNull(
            order.discount ??
              order.discount_amount ??
              order.coupon_discount ??
              0,
          ) ?? 0;
        return Math.max(lineSub + splitTax + ship - disc, 0);
      }
    }

    // 4) Tax percentage fallback.
    const gstRateCombined =
      Number(order.cgst_rate ?? 0) + Number(order.sgst_rate ?? 0);
    const gstRate = Number(
      order.gst_percentage ??
        order.gst_rate ??
        order.tax_rate ??
        (Number.isFinite(gstRateCombined) ? gstRateCombined : 0),
    );
    if (lineSub > 0 && Number.isFinite(gstRate) && gstRate > 0) {
      const ship =
        numOrNull(
          order.shipping_charge ??
            order.shipping_amount ??
            order.shipping_fee ??
            0,
        ) ?? 0;
      const disc =
        numOrNull(
          order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0,
        ) ?? 0;
      return Math.max(lineSub + (lineSub * gstRate) / 100 + ship - disc, 0);
    }

    // 5) Last fallback: unit/rate x qty.
    return Math.max(lineSub, 0);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col text-white">
      <div className="shrink-0 border-b border-gray-800/80 bg-[#0B0F19]/50 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredOrders.length} order
              {filteredOrders.length !== 1 ? "s" : ""}
              {search ? ` matching “${search}”` : ""}
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by Order ID…"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-800/80 bg-[#111827] shadow-xl">
          <div className="custom-scrollbar min-h-[280px] min-w-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1280px] border-separate border-spacing-y-1 text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#0B0F19] text-left text-xs font-semibold uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgba(55,65,81,0.6)]">
                  <th className="whitespace-nowrap px-3 py-3 pl-4">#</th>
                  <th className="whitespace-nowrap px-3 py-3">Order</th>
                  <th className="whitespace-nowrap px-3 py-3">Customer</th>
                  <th className="min-w-[180px] px-3 py-3">Product</th>
                  <th className="whitespace-nowrap px-3 py-3">Status</th>
                  <th className="whitespace-nowrap px-3 py-3">Price</th>
                  <th className="whitespace-nowrap px-3 py-3">Mode</th>
                  <th className="whitespace-nowrap px-3 py-3">Date</th>
                  <th className="whitespace-nowrap px-3 py-3">Delivery</th>
                  <th className="whitespace-nowrap px-3 py-3">Partner</th>
                  <th className="whitespace-nowrap px-3 py-3">Tracking</th>
                  <th className="whitespace-nowrap px-3 py-3">Invoice</th>
                  <th className="whitespace-nowrap px-3 py-3">Label</th>
                  <th className="whitespace-nowrap px-3 py-3">Action</th>
                  <th className="whitespace-nowrap px-3 py-3">Shipping</th>
                  <th className="whitespace-nowrap px-3 py-3">Delivered</th>
                  <th className="whitespace-nowrap px-3 py-3">Return</th>
                  <th className="whitespace-nowrap px-3 py-3 pr-4">Replace</th>
                </tr>
              </thead>

              <tbody className="text-gray-300">
                {currentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={18}
                      className="rounded-xl bg-[#0B0F19]/40 px-6 py-16 text-center text-gray-500"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  currentOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      className="bg-[#161b26] shadow-sm transition hover:bg-[#1c2333]"
                    >
                      <td className="whitespace-nowrap rounded-l-lg px-3 py-3 pl-4 text-gray-500">
                        {start + index + 1}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium text-white">
                        {order.order_id}
                      </td>

                      <td
                        className="max-w-[140px] truncate px-3 py-3"
                        title={order.customer_name}
                      >
                        {order.customer_name}
                      </td>

                      <td
                        className="max-w-[240px] px-3 py-3 text-gray-300"
                        title={order.product_name}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate">{order.product_name}</p>
                            {getOrderVariantText(order) ? (
                              <p
                                className="mt-0.5 truncate text-xs text-gray-500"
                                title={getOrderVariantText(order)}
                              >
                                {/* <span className="font-medium text-gray-400">
                                  Variants:
                                </span>{" "}
                                {getOrderVariantText(order)} */}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              console.log("product_id:", order.product_id);
                              console.log(
                                "URL:",
                                `${SITE_URL}/productPage/${order.product_id}`,
                              );
                              window.open(
                                `${SITE_URL}/productPage/${order.product_id}`,
                                "_blank",
                              );
                            }}
                            className="shrink-0 rounded-md border border-gray-700 bg-[#0B0F19] p-1.5 text-gray-300 hover:border-orange-400 hover:text-orange-300"
                            title="Edit Product"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="p-3">
                        {(() => {
                          const displayStatus = getDisplayStatus(order.status);
                          return (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${getStatusColor(displayStatus)}`}
                            >
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </td>

                      {/* <td className="p-3 text-center">{order.qty}</td> */}

                      <td className="p-3 font-medium">
                        ₹{pickOrderDisplayPrice(order).toFixed(2)}
                      </td>

                      <td className="p-3">{order.payment_mode}</td>

                      <td className="p-3 text-xs text-gray-400">
                        {order.order_date
                          ? new Date(order.order_date).toLocaleDateString()
                          : "-"}
                      </td>

                      {/* DELIVERY */}
                      <td className="p-3">{DEFAULT_DELIVERY_WINDOW}</td>

                      {/* PARTNER */}
                      <td className="p-3">
                        {editRow === order.id ? (
                          <input
                            type="text"
                            value={order.shipping_partner || ""}
                            onChange={(e) =>
                              handleChange(
                                order.id,
                                "shipping_partner",
                                e.target.value,
                              )
                            }
                            className="bg-[#0B0F19] border border-gray-700 p-1 text-xs rounded"
                          />
                        ) : (
                          order.shipping_partner || "-"
                        )}
                      </td>

                      {/* TRACKING */}
                      <td className="p-3">
                        {editRow === order.id ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              placeholder="Tracking ID"
                              value={order.tracking_id || ""}
                              onChange={(e) =>
                                handleChange(
                                  order.id,
                                  "tracking_id",
                                  e.target.value,
                                )
                              }
                              className="bg-[#0B0F19] border border-gray-700 p-1 text-xs rounded"
                            />
                            <input
                              type="text"
                              placeholder="Tracking Link"
                              value={order.tracking_link || ""}
                              onChange={(e) =>
                                handleChange(
                                  order.id,
                                  "tracking_link",
                                  e.target.value,
                                )
                              }
                              className="bg-[#0B0F19] border border-gray-700 p-1 text-xs rounded"
                            />
                          </div>
                        ) : order.tracking_id ? (
                          order.tracking_link ? (
                            <a
                              href={order.tracking_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 text-xs underline"
                            >
                              {order.tracking_id}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300">
                              {order.tracking_id}
                            </span>
                          )
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* INVOICE — uses invoice_url from API when present, else generates */}
                      <td className="p-3">
                        <button
                          onClick={() => downloadInvoice(order)}
                          className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-1 rounded-md text-xs"
                        >
                          <FileText size={14} />
                          {invoiceLoadingId === order.id
                            ? "Loading..."
                            : order.invoice_url
                              ? "Download"
                              : "Generate"}
                        </button>
                      </td>

                      {/* LABEL — uses label_url from API when present, else generates */}
                      <td className="p-3">
                        <button
                          onClick={() => downloadLabel(order)}
                          className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-1 rounded-md text-xs"
                        >
                          <Truck size={14} />
                          {labelLoadingId === order.id
                            ? "Loading..."
                            : order.shipping_label_url
                              ? "Download"
                              : "Generate"}
                        </button>
                      </td>

                      {/* ACTION */}
                      <td className="p-3 flex flex-col gap-2">
                        {editRow === order.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(order)}
                              className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs"
                            >
                              <Save size={14} /> Save
                            </button>

                            <button
                              onClick={() => {
                                setEditRow(null);
                                fetchOrders();
                              }}
                              className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs"
                            >
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditRow(order.id)}
                            className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                        )}
                        <select
                          value={order.status || "pending"}
                          onChange={(e) =>
                            updateStatus(order.id, e.target.value)
                          }
                          className="bg-[#0B0F19] border border-gray-700 p-1 rounded text-xs"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="returned">Returned</option>
                          <option value="failed">Failed</option>
                          <option value="cancelled">Cancel</option>
                        </select>
                      </td>

                      {/* SHIPPING DATE */}
                      <td className="p-3 text-xs">
                        {order.shipping_date
                          ? new Date(order.shipping_date).toLocaleDateString()
                          : "-"}
                      </td>

                      {/* DELIVERED DATE */}
                      <td className="p-3 text-xs">
                        {order.delivered_date
                          ? new Date(order.delivered_date).toLocaleDateString()
                          : "-"}
                      </td>

                      {/* RETURN */}
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <RotateCcw size={14} className="text-yellow-400" />
                            <select
                              value={order.return_status || "none"}
                              onChange={(e) =>
                                updateReturn(order.id, e.target.value)
                              }
                              className="bg-[#020617] border border-gray-600 px-2 py-1 rounded-md text-xs text-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            >
                              <option value="none">None</option>
                              <option value="requested">Requested</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>

                          {getReturnReason(order) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setReasonPreview({
                                  title: "Return Reason",
                                  order,
                                  reason: getReturnReason(order),
                                })
                              }
                              className="text-xs text-yellow-300 underline hover:text-yellow-200"
                            >
                              View
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* REPLACEMENT */}
                      <td className="rounded-r-lg px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <RefreshCcw size={14} className="text-indigo-400" />
                            <select
                              value={order.replacement_status || "none"}
                              onChange={(e) =>
                                updateReplacement(order.id, e.target.value)
                              }
                              className="bg-[#020617] border border-gray-600 px-2 py-1 rounded-md text-xs text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="none">None</option>
                              <option value="requested">Requested</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </div>

                          {getReplacementReason(order) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setReasonPreview({
                                  title: "Replacement Reason",
                                  order,
                                  reason: getReplacementReason(order),
                                })
                              }
                              className="text-xs text-indigo-300 underline hover:text-indigo-200"
                            >
                              View
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="shrink-0 border-t border-gray-800/80 bg-[#0f1419] px-2 py-4 sm:px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      </div>

      {previewOrder && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewOrder(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#0f172a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Product & Variant
              </h3>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <span className="text-gray-400">Order:</span>{" "}
                {previewOrder.order_id || previewOrder.id}
              </p>
              <p>
                <span className="text-gray-400">Product:</span>{" "}
                {previewOrder.product_name || "-"}
              </p>
              <p>
                <span className="text-gray-400">Variants:</span>{" "}
                {getOrderVariantText(previewOrder) || "Not available"}
              </p>
              <p>
                <span className="text-gray-400">Price:</span> ₹
                {pickOrderDisplayPrice(previewOrder).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {reasonPreview && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReasonPreview(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-700 bg-[#0f172a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {reasonPreview.title}
              </h3>

              <button
                type="button"
                onClick={() => setReasonPreview(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <span className="text-gray-400">Order:</span>{" "}
                {reasonPreview.order?.order_id || reasonPreview.order?.id}
              </p>

              <div className="rounded-lg border border-gray-700 bg-[#020617] p-3">
                <p className="whitespace-pre-wrap break-words">
                  {reasonPreview.reason}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
