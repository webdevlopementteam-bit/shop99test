"use client";

import { Fragment, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getOrdersApi,
  getProfileApi,
  updateProfileApi,
  getWishlistApi,
  getOrderInvoiceApi,
  requestOrderReturnApi,
  requestOrderReplacementApi,
  getMyWarrantiesApi,
  getUserAddressesApi,
  createUserAddressApi,
  updateUserAddressApi,
  deleteUserAddressApi,
  setDefaultUserAddressApi,
  BASE_URL,
  IMAGE_URL,
} from "@/lib/api";
import { toast } from "react-toastify";
import { INDIAN_STATES } from "@/lib/constants/indianStates";
import { getUserToken } from "@/lib/authSession";

const profileImage = "/assets/profileIcon.png";

function tabFromSearchParams(searchParams) {
  const t = searchParams.get("tab");
  if (
    t === "orders" ||
    t === "wishlist" ||
    t === "profile" ||
    t === "addresses"
  )
    return t;
  return "profile";
}

export default function AccountPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() =>
    tabFromSearchParams(searchParams),
  );
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getUserToken();
    if (!token) {
      window.location.href = "/login?redirect=%2Faccount";
    }
  }, []);

  useEffect(() => {
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "wishlist") fetchWishlist();
  }, [activeTab]);

  useEffect(() => {
    const t = tabFromSearchParams(searchParams);
    setActiveTab(t);
  }, [searchParams]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Server already returns only this user's orders.
      const ordersRes = await getOrdersApi();
      const list = Array.isArray(ordersRes)
        ? ordersRes
        : (ordersRes?.data ?? ordersRes?.orders ?? []);
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const data = await getWishlistApi();
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setWishlist(Array.isArray(list) ? list : []);
    } catch {
      setWishlist([]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto grid w-full max-w-7xl gap-4 sm:gap-6 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow sm:p-6">
          <Sidebar />

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <MenuBtn
              label="Personal Information"
              active={activeTab === "profile"}
              onClick={() => {
                setActiveTab("profile");
                router.replace("/account?tab=profile");
              }}
            />

            <MenuBtn
              label="My Orders"
              active={activeTab === "orders"}
              onClick={() => {
                setActiveTab("orders");
                router.replace("/account?tab=orders");
              }}
            />

            <MenuBtn
              label="Wishlist"
              active={activeTab === "wishlist"}
              onClick={() => {
                setActiveTab("wishlist");
                router.replace("/account?tab=wishlist");
              }}
            />

            <MenuBtn
              label="Manage Addresses"
              active={activeTab === "addresses"}
              onClick={() => {
                setActiveTab("addresses");
                router.replace("/account?tab=addresses");
              }}
            />
          </div>
        </div>

        <div className="min-w-0 rounded-xl bg-white p-4 shadow sm:p-6 lg:col-span-3">
          {activeTab === "profile" && <ProfileSection />}

          {activeTab === "orders" && (
            <OrdersSection
              orders={orders}
              loading={loading}
              onOrderActionSuccess={fetchOrders}
            />
          )}

          {activeTab === "wishlist" && (
            <WishlistSection wishlist={wishlist} loading={loading} />
          )}

          {activeTab === "addresses" && <AddressesSection />}
        </div>
      </div>
    </div>
  );
}

/* ================= SIDEBAR ================= */

function Sidebar() {
  const [user, setUser] = useState(null);

  const loadUser = async () => {
    try {
      const data = await getProfileApi();
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();

    const onProfileUpdated = (e) => {
      if (e.detail) {
        setUser(e.detail);
      } else {
        loadUser();
      }
    };

    window.addEventListener("profile-updated", onProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", onProfileUpdated);
    };
  }, []);

  if (!user) return null;

  return (
    <div className="border-b pb-5 text-center">
      <img
        src={profileImageSrc(user)}
        className="mx-auto mb-3 h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
        alt="profile"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = profileImage;
        }}
      />

      <h3 className="break-words text-base font-semibold sm:text-lg">
        {user.name}
      </h3>
    </div>
  );
}

/* ================= SIDEBAR BUTTON ================= */

function MenuBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition sm:px-4 sm:py-3
      ${active ? "bg-orange-500 text-white" : "hover:bg-gray-100"}`}
    >
      {label}
    </button>
  );
}

/* ================= PROFILE SECTION ================= */

function profileImageSrc(user) {
  const raw =
    user?.image || user?.profile_image || user?.avatar || user?.photo || "";

  if (!raw) return profileImage;
  if (/^https?:\/\//i.test(raw)) return raw;

  const path = String(raw).replace(/^\/+/, "");

  if (path.toLowerCase().startsWith("uploads/")) {
    return `${BASE_URL}/${path}`;
  }

  return `${BASE_URL}/uploads/${path}`;
}

function ProfileSection() {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [backup, setBackup] = useState(null);
  const [preview, setPreview] = useState(profileImage);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfileApi();
      setForm(data);
      setBackup(data);
      setPreview(profileImageSrc(data));
    } catch {
      setForm(null);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForm((prev) => ({
      ...prev,
      imageFile: file,
    }));

    setPreview(URL.createObjectURL(file));
  };

  const handleEdit = () => setEditMode(true);

  const handleCancel = () => {
    setForm(backup);
    setPreview(profileImageSrc(backup));
    setEditMode(false);
  };

  const handleSave = async () => {
    try {
      const fd = new FormData();

      fd.append("name", form.name || "");
      fd.append("email", form.email || "");
      fd.append("city", form.city || "");

      if (form.imageFile) {
        fd.append("image", form.imageFile);
      }

      const updated = await updateProfileApi(fd);

      const nextProfile = updated?.user || updated?.data || updated || form;

      setForm(nextProfile);
      setBackup(nextProfile);
      setPreview(profileImageSrc(nextProfile));
      setEditMode(false);

      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: nextProfile,
        }),
      );

      toast.success("Profile updated successfully ✅");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Profile update failed",
      );
    }
  };

  if (!form) return null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">
          Personal Information
        </h2>

        {!editMode ? (
          <button
            onClick={handleEdit}
            className="w-full rounded-lg border border-orange-500 px-4 py-2 text-sm font-medium text-orange-500 sm:w-auto sm:border-0 sm:p-0"
          >
            Edit
          </button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={handleCancel}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border bg-gray-50 p-4 sm:flex-row sm:items-center">
        <img
          src={preview}
          alt="profile"
          className="h-24 w-24 rounded-full border bg-white object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = profileImage;
          }}
        />

        <div className="text-center sm:text-left">
          <p className="font-medium text-gray-800">Profile Image</p>
          {/* <p className="mb-3 text-xs text-gray-500">
            Existing image will stay same unless you select a new one.
          </p> */}

          {editMode && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-sm"
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          name="name"
          value={form.name}
          editMode={editMode}
          onChange={handleChange}
        />

        <Field
          label="Phone"
          name="phone"
          value={form.phone}
          editMode={false}
          onChange={handleChange}
        />

        <Field
          label="Email"
          name="email"
          value={form.email}
          editMode={editMode}
          onChange={handleChange}
        />

        <Field
          label="City"
          name="city"
          value={form.city}
          editMode={editMode}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

function Field({ label, name, value, editMode, onChange }) {
  return (
    <div className="min-w-0 rounded-lg border p-3 sm:p-4">
      <p className="mb-1 text-xs text-gray-400">{label}</p>

      {editMode ? (
        <input
          name={name}
          value={value ?? ""}
          onChange={onChange}
          className="w-full rounded border p-2 text-sm outline-none focus:border-orange-500"
        />
      ) : (
        <p className="break-words font-medium">{value || "-"}</p>
      )}
    </div>
  );
}

/* ================= IMAGES (orders + wishlist API shapes) ================= */

function rawImageFromRecord(item) {
  if (!item || typeof item !== "object") return "";
  const product = item.Product || item.product;
  return (
    item.img ||
    item.image ||
    item.product_image ||
    item.thumbnail ||
    item.product_image_url ||
    product?.image ||
    ""
  );
}

function resolveUploadImageSrc(raw) {
  if (raw == null || String(raw).trim() === "") return "/no-image.png";
  const s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) return s;
  let path = s.replace(/^\/+/, "");
  if (path.toLowerCase().startsWith("uploads/")) {
    return `${BASE_URL}/${path}`;
  }
  return `${IMAGE_URL}${path}`;
}

function orderImageSrc(item) {
  return resolveUploadImageSrc(rawImageFromRecord(item));
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
          order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0,
        ) ?? 0;
      return Math.max(lineSub + splitTax + ship - disc, 0);
    }
  }

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

  const sellingCandidates = [
    order.selling_price,
    order.price,
    order.unit_price,
    order.sale_price,
    order.final_price,
    order.net_price,
    order.discounted_price,
    order.item_price,
    order.rate,
  ];
  for (const value of sellingCandidates) {
    const n = numOrNull(value);
    if (n != null && n >= 0) return n * safeQty;
  }

  return 0;
}

function OrdersSection({ orders, loading, onOrderActionSuccess }) {
  const RETURN_REPLACE_WINDOW_DAYS = 7;
  const [actionType, setActionType] = useState("");
  const [actionOrderId, setActionOrderId] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [warranties, setWarranties] = useState([]);

  const fetchWarranties = async () => {
    try {
      const data = await getMyWarrantiesApi();
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setWarranties(Array.isArray(rows) ? rows : []);
    } catch {
      setWarranties([]);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, []);

  const findWarrantyForOrder = (orderPk) =>
    warranties.find((w) => String(w.order_pk) === String(orderPk));

  const openInvoice = async (orderId) => {
    try {
      const res = await getOrderInvoiceApi(orderId);
      if (res?.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (res?.blob instanceof Blob) {
        const fileUrl = window.URL.createObjectURL(res.blob);
        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = res.filename || `invoice-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 1500);
        return;
      }
      toast.error("Invoice is not available for this order yet.");
    } catch {
      toast.error("Could not download invoice.");
    }
  };

  const statusClass = (s) => {
    const v = (s || "").toLowerCase();

    if (v === "delivered") return "bg-green-100 text-green-800";
    if (v === "shipped") return "bg-purple-100 text-purple-800";
    if (v === "processing") return "bg-blue-100 text-blue-800";
    if (v === "confirmed") return "bg-emerald-100 text-emerald-800";
    if (v === "accepted") return "bg-green-100 text-green-800";
    if (v === "pending") return "bg-yellow-100 text-yellow-800";
    if (v === "failed") return "bg-red-100 text-red-800";
    if (v === "cancelled" || v === "canceled") {
      return "bg-red-100 text-red-800";
    }

    return "bg-amber-100 text-amber-900";
  };

  const normalizeStatus = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const getDisplayStatus = (value) => {
    const s = normalizeStatus(value);

    if (!s) return "pending";

    if (s === "pending") return "pending";
    if (s === "processing") return "processing";
    if (s === "confirmed") return "confirmed";
    if (s === "accepted") return "accepted";
    if (s === "confirm") return "confirmed";
    if (s === "shipped") return "shipped";
    if (s === "delivered") return "delivered";

    if (s === "failed") return "failed";
    if (s === "cancelled" || s === "canceled") return "cancelled";

    return s;
  };

  // Main order status only. Return/replacement timelines are shown separately below.
  const getResolvedOrderStatus = (order) => {
    return getDisplayStatus(order?.status);
  };

  const timelineSteps = [
    { key: "accepted", label: "Accepted" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const returnTimelineSteps = [
    { key: "requested", label: "Requested" },
    { key: "approved", label: "Approved" },
    { key: "completed", label: "Completed" },
  ];

  const replacementTimelineSteps = [
    { key: "requested", label: "Requested" },
    { key: "approved", label: "Approved" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const formatStatusDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  };
  const getOrderStepDate = (order, stepKey) => {
    if (stepKey === "accepted") {
      return (
        formatStatusDate(order.confirmed_date) ||
        formatStatusDate(order.order_date)
      );
    }
    if (stepKey === "processing")
      return formatStatusDate(order.processing_date);
    if (stepKey === "shipped") {
      return (
        formatStatusDate(order.shipped_status_date) ||
        formatStatusDate(order.shipping_date)
      );
    }
    if (stepKey === "delivered") return formatStatusDate(order.delivered_date);
    return "";
  };
  const getReturnStepDate = (order, stepKey) => {
    if (stepKey === "requested")
      return formatStatusDate(order.return_requested_date);
    if (stepKey === "approved")
      return formatStatusDate(order.return_approved_date);
    if (stepKey === "completed")
      return formatStatusDate(order.return_completed_date);
    return "";
  };
  const getReplacementStepDate = (order, stepKey) => {
    if (stepKey === "requested")
      return formatStatusDate(order.replacement_requested_date);
    if (stepKey === "approved")
      return formatStatusDate(order.replacement_approved_date);
    if (stepKey === "shipped")
      return formatStatusDate(order.replacement_shipped_date);
    if (stepKey === "delivered")
      return formatStatusDate(order.replacement_delivered_date);
    return "";
  };

  const statusToStepIndex = (status) => {
    const s = normalizeStatus(status);
    if (["accepted", "confirm", "confirmed"].includes(s)) return 0;
    if (["processing", "packed", "packaging", "ready_to_ship"].includes(s)) {
      return 1;
    }
    if (
      [
        "shipped",
        "out_for_delivery",
        "out for delivery",
        "in_transit",
      ].includes(s)
    ) {
      return 2;
    }
    if (s === "delivered") return 3;
    return -1;
  };

  const returnStatusToStepIndex = (status) => {
    const s = normalizeStatus(status);
    if (s === "requested" || s === "pending") return 0;
    if (s === "approved" || s === "processing") return 1;
    if (s === "completed" || s === "refunded") return 2;
    return -1;
  };

  const replacementStatusToStepIndex = (status) => {
    const s = normalizeStatus(status);
    if (s === "requested" || s === "pending") return 0;
    if (s === "approved" || s === "processing") return 1;
    if (s === "shipped") return 2;
    if (s === "delivered") return 3;
    return -1;
  };

  const isCancelledStatus = (status) => {
    const s = normalizeStatus(status);
    return s === "cancelled" || s === "canceled" || s === "failed";
  };

  const isRejectedRequest = (status) => {
    const s = normalizeStatus(status);
    return s === "rejected" || s === "cancelled" || s === "canceled";
  };

  const hasRaisedRequest = (value) => {
    const v = normalizeStatus(value);

    if (!v || v === "none" || v === "not_required") {
      return false;
    }

    return [
      "requested",
      "pending",
      "approved",
      "rejected",
      "completed",
      "received",
      "done",
      "processed",
      "refunded",
      "sent",
      "shipped",
      "delivered",
      "dispatched",
      "in_transit",
    ].includes(v);
  };

  const isEligibleForRequest = (order) => {
    const status = normalizeStatus(order?.status);
    return status === "delivered";
  };

  const getReturnReplaceWindowState = (order) => {
    const dateCandidates = [
      order?.delivered_date,
      order?.deliveredDate,
      order?.order_date,
      order?.createdAt,
    ];

    const anchorRaw = dateCandidates.find(
      (v) => v != null && String(v).trim() !== "",
    );

    if (!anchorRaw) {
      return { withinWindow: true, daysPassed: 0 };
    }

    const anchorDate = new Date(anchorRaw);
    if (Number.isNaN(anchorDate.getTime())) {
      return { withinWindow: true, daysPassed: 0 };
    }

    const now = new Date();
    const diffMs = now.getTime() - anchorDate.getTime();
    if (diffMs <= 0) {
      return { withinWindow: true, daysPassed: 0 };
    }

    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      withinWindow: daysPassed <= RETURN_REPLACE_WINDOW_DAYS,
      daysPassed,
    };
  };

  const getRequestState = (order) => {
    const returnStatus =
      order?.return_status ??
      order?.returnStatus ??
      order?.return_request_status ??
      order?.returnRequestStatus;

    const replacementStatus =
      order?.replacement_status ??
      order?.replacementStatus ??
      order?.replace_status ??
      order?.replaceStatus;

    return {
      hasReturnRequest:
        hasRaisedRequest(returnStatus) ||
        normalizeStatus(order?.status) === "returned",
      hasReplacementRequest:
        hasRaisedRequest(replacementStatus) ||
        normalizeStatus(order?.status) === "replaced",
      returnStatus: normalizeStatus(returnStatus),
      replacementStatus: normalizeStatus(replacementStatus),
    };
  };

  const closeActionForm = () => {
    setActionType("");
    setActionOrderId(null);
    setActionReason("");
  };

  const openActionForm = (orderId, type) => {
    setActionOrderId(orderId);
    setActionType(type);
    setActionReason("");
  };

  const submitOrderAction = async (order) => {
    const reason = actionReason.trim();
    if (!reason) {
      toast.error("Please enter reason.");
      return;
    }

    const orderPk = order?.id;
    if (!orderPk) {
      toast.error("Order not found.");
      return;
    }

    const payload =
      actionType === "return"
        ? {
            return_status: "requested",
            return_reason: reason,
            reason,
            refund_status: "pending",
          }
        : {
            replacement_status: "requested",
            replacement_reason: reason,
            reason,
          };

    try {
      setActionSubmitting(true);

      if (actionType === "return") {
        await requestOrderReturnApi(orderPk, payload);
        toast.success("Return request submitted. Refund will be processed.");
      } else {
        await requestOrderReplacementApi(orderPk, payload);
        toast.success("Replacement request submitted.");
      }

      closeActionForm();

      if (typeof onOrderActionSuccess === "function") {
        await onOrderActionSuccess();
      }
    } catch {
      toast.error("Could not submit request.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const RequestTimeline = ({
    title,
    status,
    steps,
    getStepIndex,
    getStepDate,
    order,
    color = "blue",
  }) => {
    const currentIndex = getStepIndex(status);
    const rejected = isRejectedRequest(status);

    const activeColor =
      color === "red"
        ? "bg-red-500"
        : color === "indigo"
          ? "bg-indigo-500"
          : "bg-blue-500";

    const activeText =
      color === "red"
        ? "text-red-700"
        : color === "indigo"
          ? "text-indigo-700"
          : "text-blue-700";

    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-2 py-3 sm:px-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">
            {title}
          </p>

          {rejected ? (
            <span className="text-[11px] font-semibold text-red-600">
              Rejected
            </span>
          ) : (
            <span className={`text-[11px] font-semibold ${activeText}`}>
              {status || "requested"}
            </span>
          )}
        </div>

        <div
          className="grid gap-1 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          }}
        >
          {steps.map((step, idx) => {
            const completed = !rejected && idx <= currentIndex;
            const active = !rejected && idx === currentIndex;

            return (
              <div key={step.key} className="min-w-0">
                <div className="flex items-center">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      completed
                        ? activeColor
                        : rejected
                          ? "bg-red-300"
                          : "bg-gray-300"
                    }`}
                  />

                  {idx < steps.length - 1 && (
                    <span
                      className={`mx-1 h-[2px] flex-1 ${
                        !rejected && idx < currentIndex
                          ? activeColor
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>

                <p
                  className={`mt-1 truncate text-[9px] sm:text-[11px] ${
                    active
                      ? `font-semibold ${activeText}`
                      : completed
                        ? activeText
                        : rejected
                          ? "text-red-500"
                          : "text-gray-500"
                  }`}
                >
                  {step.label}
                  {getStepDate?.(order, step.key) && (
                    <span className="block text-[8px] text-gray-400 sm:text-[10px]">
                      {getStepDate(order, step.key)}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">Order History</h2>

        <Link
          href="/warranty-register"
          className="w-full rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-600 sm:w-auto"
        >
          Warranty Register
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && orders.length === 0 && (
        <p className="text-sm text-gray-400">No Orders Yet</p>
      )}

      <div className="space-y-4">
        {orders.map((item) => {
          const orderId = item.order_id ?? item.orderId ?? "";
          const name = item.product_name ?? item.name ?? "Product";
          const price = pickOrderDisplayPrice(item);
          const status = getResolvedOrderStatus(item);
          const requestState = getRequestState(item);
          const returnStatus = requestState.returnStatus;
          const replacementStatus = requestState.replacementStatus;
          const isDelivered = isEligibleForRequest(item);
          const requestWindow = getReturnReplaceWindowState(item);
          const canRequest = isDelivered && requestWindow.withinWindow;
          const formOpen = actionOrderId === item.id;
          const isReturnForm = formOpen && actionType === "return";
          const isReplaceForm = formOpen && actionType === "replacement";
          const timelineIndex = statusToStepIndex(status);
          const cancelled = isCancelledStatus(status);
          const deliveryRaw = item.delivery_date;
          const deliveryDateObj = deliveryRaw ? new Date(deliveryRaw) : null;
          const delivery =
            deliveryRaw &&
            deliveryDateObj &&
            !Number.isNaN(deliveryDateObj.getTime())
              ? deliveryDateObj.toLocaleDateString()
              : deliveryRaw || "";
          const deliveryText = status === "delivered" ? "Delivered" : delivery;
          const partner = item.shipping_partner;
          const tid = item.tracking_id;
          const tlink = item.tracking_link;

          return (
            <Fragment key={item.id}>
              <div className="flex flex-col gap-4 rounded-xl border p-3 sm:p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{name}</p>

                    <p className="font-mono text-xs text-gray-500">
                      #{orderId || item.id}
                    </p>

                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${statusClass(
                        status,
                      )}`}
                    >
                      {status}
                    </span>

                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-2 py-3 sm:px-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">
                          Order Timeline
                        </p>

                        {cancelled && (
                          <span className="text-[11px] font-semibold text-red-600">
                            {status === "failed" ? "Failed" : "Cancelled"}
                          </span>
                        )}

                        {status === "pending" && (
                          <span className="text-[11px] font-semibold text-yellow-700">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1 sm:gap-3">
                        {timelineSteps.map((step, idx) => {
                          const completed = !cancelled && idx <= timelineIndex;
                          const active = !cancelled && idx === timelineIndex;

                          return (
                            <div key={step.key} className="min-w-0">
                              <div className="flex items-center">
                                <span
                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                    completed
                                      ? "bg-green-500"
                                      : cancelled
                                        ? "bg-red-300"
                                        : status === "pending"
                                          ? "bg-yellow-300"
                                          : "bg-gray-300"
                                  }`}
                                />

                                {idx < timelineSteps.length - 1 && (
                                  <span
                                    className={`mx-1 h-[2px] flex-1 ${
                                      !cancelled && idx < timelineIndex
                                        ? "bg-green-500"
                                        : "bg-gray-300"
                                    }`}
                                  />
                                )}
                              </div>

                              <p
                                className={`mt-1 truncate text-[9px] sm:text-[11px] ${
                                  active
                                    ? "font-semibold text-green-700"
                                    : completed
                                      ? "text-green-700"
                                      : cancelled
                                        ? "text-red-500"
                                        : status === "pending"
                                          ? "text-yellow-700"
                                          : "text-gray-500"
                                }`}
                              >
                                {step.label}
                                {getOrderStepDate(item, step.key) && (
                                  <span className="block text-[8px] text-gray-400 sm:text-[10px]">
                                    {getOrderStepDate(item, step.key)}
                                  </span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {requestState.hasReturnRequest && (
                      <RequestTimeline
                        title="Return Timeline"
                        status={returnStatus}
                        steps={returnTimelineSteps}
                        getStepIndex={returnStatusToStepIndex}
                        getStepDate={getReturnStepDate}
                        order={item}
                        color="red"
                      />
                    )}

                    {requestState.hasReplacementRequest && (
                      <RequestTimeline
                        title="Replacement Timeline"
                        status={replacementStatus}
                        steps={replacementTimelineSteps}
                        getStepIndex={replacementStatusToStepIndex}
                        getStepDate={getReplacementStepDate}
                        order={item}
                        color="indigo"
                      />
                    )}

                    {(deliveryText || partner || tid) && (
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        {deliveryText && (
                          <p>
                            <span className="text-gray-400">
                              Est. delivery:
                            </span>{" "}
                            {deliveryText}
                          </p>
                        )}

                        {partner && (
                          <p>
                            <span className="text-gray-400">Courier:</span>{" "}
                            {partner}
                          </p>
                        )}

                        {tid && (
                          <p className="break-all">
                            <span className="text-gray-400">Tracking ID:</span>{" "}
                            {tlink ? (
                              <a
                                href={tlink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-orange-600 underline"
                              >
                                {tid}
                              </a>
                            ) : (
                              <span>{tid}</span>
                            )}
                          </p>
                        )}

                        {tlink && !tid && (
                          <a
                            href={tlink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block font-medium text-orange-600 underline"
                          >
                            Track shipment
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap md:flex-col md:items-end">
                  <p className="text-lg font-semibold text-red-500 md:text-right">
                    ₹{Number(price).toFixed(2)}
                  </p>

                  <button
                    type="button"
                    onClick={() => openInvoice(item.id)}
                    className="rounded-lg border border-orange-500 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50"
                  >
                    Invoice
                  </button>

                  {canRequest &&
                    !requestState.hasReturnRequest &&
                    !requestState.hasReplacementRequest && (
                      <button
                        type="button"
                        onClick={() => openActionForm(item.id, "return")}
                        className="rounded-lg border border-red-500 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Return
                      </button>
                    )}

                  {canRequest &&
                    !requestState.hasReplacementRequest &&
                    !requestState.hasReturnRequest && (
                      <button
                        type="button"
                        onClick={() => openActionForm(item.id, "replacement")}
                        className="rounded-lg border border-blue-500 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        Replace
                      </button>
                    )}

                  {requestState.hasReturnRequest && (
                    <p className="text-xs font-medium text-red-600">
                      Return: {requestState.returnStatus || "requested"}
                    </p>
                  )}

                  {requestState.hasReplacementRequest && (
                    <p className="text-xs font-medium text-blue-600">
                      Replacement:{" "}
                      {requestState.replacementStatus || "requested"}
                    </p>
                  )}

                  {findWarrantyForOrder(item.id) && (
                    <p className="text-xs font-medium text-emerald-600">
                      Warranty: {findWarrantyForOrder(item.id).status || "pending"}
                    </p>
                  )}

                  {isDelivered &&
                    !requestWindow.withinWindow &&
                    !requestState.hasReturnRequest &&
                    !requestState.hasReplacementRequest && (
                      <p className="max-w-full text-xs font-medium text-gray-500 md:max-w-[170px] md:text-right">
                        Only {RETURN_REPLACE_WINDOW_DAYS} days
                        replacement/return available.
                      </p>
                    )}
                </div>
              </div>

              {(isReturnForm || isReplaceForm) && (
                <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-medium">
                    {isReturnForm
                      ? "Return reason (refund will be initiated)"
                      : "Replacement reason"}
                  </p>

                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border p-2 text-sm outline-none focus:border-orange-500"
                    placeholder="Enter reason..."
                  />

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={actionSubmitting}
                      onClick={() => submitOrderAction(item)}
                      className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                    >
                      {actionSubmitting ? "Submitting..." : "Submit Request"}
                    </button>

                    <button
                      type="button"
                      disabled={actionSubmitting}
                      onClick={closeActionForm}
                      className="rounded-lg border px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ================= WISHLIST ================= */

function WishlistSection({ wishlist, loading }) {
  return (
    <div className="min-w-0">
      <h2 className="mb-5 text-lg font-semibold sm:text-xl">Wishlist</h2>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && wishlist.length === 0 && (
        <p className="text-sm text-gray-400">No Wishlist Items</p>
      )}

      <div className="space-y-3">
        {wishlist.map((item) => {
          const product = item.Product || item.product;
          const rowKey = product?.id ?? item.id ?? item.ProductId;
          const name = product?.name ?? item.name ?? "Product";
          const price = product?.price ?? item.price ?? 0;
          return (
            <div
              key={rowKey}
              className="flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={orderImageSrc(item)}
                  className="h-14 w-14 shrink-0 rounded bg-gray-100 object-cover"
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    // Fallback once — never loop if the placeholder itself fails.
                    if (!e.currentTarget.src.endsWith("/no-image.png")) e.currentTarget.src = "/no-image.png";
                  }}
                />
                <p className="min-w-0 break-words">{name}</p>
              </div>

              <p className="shrink-0 font-semibold text-red-500 sm:text-right">
                ₹{Number(price).toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= ADDRESSES ================= */

const EMPTY_ADDRESS = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line: "",
  city: "",
  state: "",
  postcode: "",
  is_default: false,
};

function AddressesSection() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await getUserAddressesApi();
      const rows = Array.isArray(data?.addresses) ? data.addresses : [];
      setAddresses(rows);
    } catch {
      setAddresses([]);
      toast.error("Could not load addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_ADDRESS);
    setEditingAddressId(null);
    setShowForm(false);
  };

  const onFormField = (name) => (e) => {
    const value = e?.target?.value ?? "";
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = [
      ["full_name", "Full name"],
      ["phone", "Phone"],
      ["address_line", "Address line"],
      ["city", "City"],
      ["state", "State / UT"],
      ["postcode", "Postcode / ZIP"],
    ];
    const missing = required
      .filter(([k]) => !String(form[k] ?? "").trim())
      .map(([, label]) => label);
    if (missing.length) {
      toast.error(`Please fill: ${missing.join(", ")}`);
      return false;
    }
    return true;
  };

  const startAdd = () => {
    setForm(EMPTY_ADDRESS);
    setEditingAddressId(null);
    setShowForm(true);
  };

  const startEdit = (address) => {
    setForm({
      label: String(address?.label || "Home").trim() || "Home",
      full_name: String(address?.full_name || "").trim(),
      phone: String(address?.phone || "").trim(),
      address_line: String(address?.address_line || "").trim(),
      city: String(address?.city || "").trim(),
      state: String(address?.state || "").trim(),
      postcode: String(address?.postcode || "").trim(),
      is_default: Boolean(address?.is_default),
    });
    setEditingAddressId(address?.id ?? null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editingAddressId) {
        await updateUserAddressApi(editingAddressId, form);
        toast.success("Address updated.");
      } else {
        await createUserAddressApi(form);
        toast.success("Address added.");
      }
      await loadAddresses();
      resetForm();
    } catch (error) {
      const msg = error?.response?.data?.message || "Could not save address.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUserAddressApi(id);
      toast.success("Address deleted.");
      await loadAddresses();
    } catch {
      toast.error("Could not delete address.");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultUserAddressApi(id);
      toast.success("Default address updated.");
      await loadAddresses();
    } catch {
      toast.error("Could not set default address.");
    }
  };

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">Manage Addresses</h2>
        {!showForm && (
          <button
            type="button"
            onClick={startAdd}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 sm:w-auto"
          >
            Add Address
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border bg-gray-50 p-3 sm:p-4">
          <h3 className="mb-4 text-base font-semibold text-gray-800">
            {editingAddressId ? "Edit address" : "Add new address"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.label}
              onChange={onFormField("label")}
              className="rounded-lg border p-3 text-sm outline-none focus:border-orange-500"
              placeholder="Label (Home/Office)"
            />
            <input
              value={form.full_name}
              onChange={onFormField("full_name")}
              className="rounded-lg border p-3 text-sm outline-none focus:border-orange-500"
              placeholder="Full name"
            />
            <input
              value={form.phone}
              onChange={onFormField("phone")}
              className="rounded-lg border p-3 text-sm outline-none focus:border-orange-500"
              placeholder="Phone"
            />
            <input
              value={form.city}
              onChange={onFormField("city")}
              className="rounded-lg border p-3 text-sm outline-none focus:border-orange-500"
              placeholder="City"
            />
            <select
              value={form.state}
              onChange={onFormField("state")}
              className="rounded-lg border p-3 text-sm outline-none focus:border-orange-500"
            >
              <option value="">Select state / UT</option>
              {INDIAN_STATES.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
            <input
              value={form.postcode}
              onChange={onFormField("postcode")}
              className="rounded-lg border p-3 text-sm outline-none focus:border-orange-500"
              placeholder="Postcode / ZIP"
            />
            <textarea
              value={form.address_line}
              onChange={onFormField("address_line")}
              className="rounded-lg border p-3 text-sm outline-none focus:border-orange-500 sm:col-span-2"
              rows={3}
              placeholder="Address line"
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingAddressId
                  ? "Update Address"
                  : "Save Address"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && addresses.length === 0 && (
        <p className="text-sm text-gray-500">No saved addresses yet.</p>
      )}

      <div className="space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className="rounded-xl border p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-words font-semibold text-gray-800">
                {addr.label || "Address"} - {addr.full_name}
              </p>
              <div className="grid grid-cols-2 gap-2 min-[420px]:flex min-[420px]:flex-wrap">
                {addr.is_default ? (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-center text-xs font-medium text-green-700">
                    Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="rounded-lg border border-green-500 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                  >
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(addr)}
                  className="rounded-lg border border-blue-500 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className="rounded-lg border border-red-500 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-2 break-words text-sm text-gray-700">
              {addr.phone}
            </p>
            <p className="break-words text-sm text-gray-600">
              {addr.address_line}, {addr.city}, {addr.state} - {addr.postcode}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
