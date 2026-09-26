"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProfileApi, getOrdersApi, createWarrantyApi } from "@/lib/api";

const normalize = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const pickUserIdentity = (profile, fallbackUser) => {
  const p = profile && typeof profile === "object" ? profile : {};
  const f = fallbackUser && typeof fallbackUser === "object" ? fallbackUser : {};
  return {
    id: p.id ?? p.user_id ?? p.userId ?? f.id ?? f.user_id ?? f.userId,
    name: p.name ?? p.customer_name ?? f.name ?? f.customer_name ?? "",
    phone: p.phone ?? p.mobile ?? p.contact ?? f.phone ?? f.mobile ?? "",
    email: p.email ?? f.email ?? "",
  };
};

const orderBelongsToUser = (order, userIdentity) => {
  if (!order || typeof order !== "object") return false;
  const uid = userIdentity?.id;
  if (uid != null) {
    const orderIds = [order.user_id, order.userId, order.UserId, order.customer_id, order.customerId, order.CustomerId].filter(
      (x) => x != null,
    );
    if (orderIds.some((x) => String(x) === String(uid))) return true;
  }

  const targetName = normalize(userIdentity?.name);
  const targetPhone = normalize(userIdentity?.phone);
  const targetEmail = normalize(userIdentity?.email);
  const orderName = normalize(order.customer_name ?? order.name);
  const orderPhone = normalize(order.phone ?? order.customer_phone ?? order.mobile);
  const orderEmail = normalize(order.email ?? order.customer_email);

  if (targetEmail && orderEmail && targetEmail === orderEmail) return true;
  if (targetPhone && orderPhone && targetPhone === orderPhone) return true;
  if (targetName && orderName && targetName === orderName) return true;
  return false;
};

export default function WarrantyRegisterPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [purchaseSource, setPurchaseSource] = useState("shop99");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    order_id: "",
  });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsLoggedIn(true);
    (async () => {
      setLoadingOrders(true);
      try {
        const [ordersRes, profileRes] = await Promise.all([getOrdersApi(), getProfileApi().catch(() => null)]);
        const list = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data ?? ordersRes?.orders ?? []);
        const fallbackUser = JSON.parse(localStorage.getItem("user") || "null");
        const currentUser = pickUserIdentity(profileRes, fallbackUser);
        const safeList = Array.isArray(list) ? list : [];
        const mine = safeList.filter((o) => orderBelongsToUser(o, currentUser));
        setOrders(mine);

        setForm((prev) => ({
          ...prev,
          name: prev.name || currentUser.name || "",
          mobile: prev.mobile || currentUser.phone || "",
          email: prev.email || currentUser.email || "",
        }));
      } catch {
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    })();
  }, []);

  const onField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async () => {
    const name = form.name.trim();
    const mobile = form.mobile.trim();
    const email = form.email.trim();

    if (!name || !mobile || !email) {
      toast.error("Please fill all fields.");
      return;
    }
    if (purchaseSource === "shop99" && !form.order_id) {
      toast.error("Please select an order.");
      return;
    }
    if (!invoiceFile) {
      toast.error("Please upload the invoice.");
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("purchase_source", purchaseSource);
      fd.append("name", name);
      fd.append("mobile", mobile);
      fd.append("email", email);
      fd.append("invoice", invoiceFile);
      if (purchaseSource === "shop99") {
        fd.append("order_id", form.order_id);
      }

      await createWarrantyApi(fd);
      toast.success("Warranty registration submitted.");
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit warranty registration.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-2xl font-semibold text-gray-900">Warranty Registered</h1>
        <p className="mt-3 text-gray-600">
          Thanks! Your warranty registration has been submitted. Our team will review it and update the status soon.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Warranty Register</h1>
      <p className="mt-2 text-sm text-gray-600">
        Register your product for warranty support — whether you bought it from Shop99 or somewhere else.
      </p>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="mb-3 text-sm font-medium text-gray-800">Where did you buy this product?</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPurchaseSource("shop99")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              purchaseSource === "shop99" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            Bought from Shop99
          </button>

          <button
            type="button"
            onClick={() => setPurchaseSource("other")}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              purchaseSource === "other" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            Bought from another website / store
          </button>
        </div>

        {purchaseSource === "shop99" && !isLoggedIn && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Please{" "}
            <Link href="/login" className="font-medium underline">
              log in to your Shop99 account
            </Link>{" "}
            to select from your orders. Bought elsewhere?{" "}
            <button type="button" onClick={() => setPurchaseSource("other")} className="font-medium underline">
              Register without logging in
            </button>
            .
          </div>
        )}

        {(purchaseSource === "other" || isLoggedIn) && (
          <div className="mt-5 space-y-3">
            <input
              value={form.name}
              onChange={onField("name")}
              placeholder="Name"
              className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-orange-500"
            />
            <input
              value={form.mobile}
              onChange={onField("mobile")}
              placeholder="Mobile Number"
              className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-orange-500"
            />
            <input
              value={form.email}
              onChange={onField("email")}
              placeholder="Email"
              type="email"
              className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-orange-500"
            />

            {purchaseSource === "shop99" && (
              <>
                <select
                  value={form.order_id}
                  onChange={onField("order_id")}
                  className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-orange-500"
                >
                  <option value="">{loadingOrders ? "Loading your orders..." : "Select order"}</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.order_id || o.id} — {o.product_name || "Product"}
                    </option>
                  ))}
                </select>

                {!loadingOrders && orders.length === 0 && <p className="text-xs text-gray-500">No orders found on your account yet.</p>}
              </>
            )}

            <div>
              <p className="mb-1 text-xs text-gray-500">Upload Invoice</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
