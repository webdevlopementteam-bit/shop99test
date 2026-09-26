"use client";

import { useEffect, useState } from "react";
import { BASE_URL } from "@/lib/adminApi";
import ProductDropdown from "@/components/admin/ProductDropdown";
import CategoryDropdown from "@/components/admin/CategoryDropdown";
import { toast } from "react-toastify";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    offer_name: "",
    description: "",
    begin_on: "",
    end_on: "",
    discount_type: "flat",
    discount_value: "",
    apply_on: "all",
    product_id: "",
    category_id: "",
     // ✅ NEW FIELDS
    usage_limit: "",
    per_user_limit: "",
  });

  useEffect(() => {
    fetchOffers();

    fetch(`${BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data.data || data.products || []));

    fetch(`${BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data.data || data.categories || []));
  }, []);

  const fetchOffers = () => {
    fetch(`${BASE_URL}/api/offers`)
      .then((res) => res.json())
      .then((data) => setOffers(data));
  };

  /* ================= HELPERS ================= */
const isExpired = (offer) => {
  const today = new Date().toISOString().split("T")[0];

  const end = offer.end_on
    ? new Date(offer.end_on).toISOString().split("T")[0]
    : null;

  return end && end < today;
};

  const getProductName = (id) => {
    const p = products.find((p) => p.id === id);
    return p?.name;
  };

  const getCategoryName = (id) => {
    const c = categories.find((c) => c.id === id);
    return c?.name;
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    let payload = { ...form ,
      usage_limit: form.usage_limit || null,
      per_user_limit: form.per_user_limit || null,
       end_on: form.end_on || null,
       begin_on: form.begin_on || null,
        };

    if (payload.apply_on === "product") payload.category_id = null;
    if (payload.apply_on === "category") payload.product_id = null;
    if (payload.apply_on === "all") {
      payload.product_id = null;
      payload.category_id = null;
    }

    const url = editingId
      ? `${BASE_URL}/api/offers/${editingId}`
      : `${BASE_URL}/api/offers`;

    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    toast.success(editingId ? "Offer updated" : "Offer created");

    setEditingId(null);

    setForm({
      offer_name: "",
      description: "",
      begin_on: "",
      end_on: "",
      discount_type: "flat",
      discount_value: "",
      apply_on: "all",
      product_id: "",
      category_id: "",
       usage_limit: "",
        per_user_limit: "",
    });

    fetchOffers();
  };

  /* ================= EDIT ================= */

  const handleEdit = (offer) => {
    setEditingId(offer.id);

    setForm({
      offer_name: offer.offer_name,
      description: offer.description,
      begin_on: offer.begin_on?.split("T")[0],
      end_on: offer.end_on
  ? new Date(offer.end_on).toISOString().split("T")[0]
  : "",
      discount_type: offer.discount_type || "flat",
      discount_value: offer.discount_value,
      apply_on: offer.apply_on,
      product_id: offer.product_id,
      category_id: offer.category_id,
       // ✅ NEW
      usage_limit: offer.usage_limit || "",
      per_user_limit: offer.per_user_limit || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ================= DELETE ================= */

  const handleDelete = (id) => {
    toast.info(
      ({ closeToast }) => (
        <div className="text-sm">
          <p className="mb-2">Delete this offer?</p>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  await fetch(`${BASE_URL}/api/offers/${id}`, {
                    method: "DELETE",
                  });

                  toast.success("Offer deleted successfully");
                  fetchOffers();
                } catch (err) {
                  toast.error("Delete failed", err);
                }

                closeToast();
              }}
              className="bg-red-500 px-3 py-1 rounded text-white text-xs"
            >
              Yes
            </button>

            <button
              onClick={closeToast}
              className="bg-gray-600 px-3 py-1 rounded text-white text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { autoClose: false }, // 🔥 important
    );
  };

  /* ================= TOGGLE ================= */

const handleToggle = async (id) => {
  try {
    const res = await fetch(`${BASE_URL}/api/offers/${id}/status`, {
      method: "PATCH",
    });

    const data = await res.json();

    toast.success(data.message || "Status updated");

    // 🔥 IMPORTANT FIX (instant UI update)
    setOffers((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, is_active: !o.is_active } : o
      )
    );

  } catch {
    toast.error("Failed to update status");
  }
};

  return (
    <div className="text-white space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Offers Management</h2>
          <p className="text-sm text-gray-400">
            Create and manage promotional campaigns
          </p>
        </div>

        {editingId && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
            Editing Mode
          </span>
        )}
      </div>

      {/* FORM */}
      <div className="bg-[#111827] p-6 rounded-2xl shadow-lg border border-gray-800">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="Offer Name"
            value={form.offer_name}
            onChange={(e) => setForm({ ...form, offer_name: e.target.value })}
            className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
          />

          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
          />

          <input
            type="date"
            value={form.begin_on}
            onChange={(e) => setForm({ ...form, begin_on: e.target.value })}
            className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
          />

          <input
            type="date"
            value={form.end_on || ""}
            onChange={(e) => setForm({ ...form, end_on: e.target.value || "" })}
            className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
          />

          <select
            value={form.discount_type}
            onChange={(e) =>
              setForm({ ...form, discount_type: e.target.value })
            }
            className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
          >
            <option value="flat">Flat ₹</option>
            <option value="percent">Percentage %</option>
          </select>

          <input
            placeholder={
              form.discount_type === "percent" ? "Discount %" : "Discount ₹"
            }
            value={form.discount_value}
            onChange={(e) =>
              setForm({ ...form, discount_value: e.target.value })
            }
            className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
          />

            <input
                    placeholder="Total Usage Limit (optional)"
                    value={form.usage_limit}
                    onChange={(e) =>
                      setForm({ ...form, usage_limit: e.target.value })
                    }
                    className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
                  />

                  <input
                    placeholder="Per User Limit (optional)"
                    value={form.per_user_limit}
                    onChange={(e) =>
                      setForm({ ...form, per_user_limit: e.target.value })
                    }
                    className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
                  />

          <select
            value={form.apply_on}
            onChange={(e) =>
              setForm({
                ...form,
                apply_on: e.target.value,
                product_id: "",
                category_id: "",
              })
            }
            className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg md:col-span-2"
          >
            <option value="all">All Products</option>
            <option value="product">Single Product</option>
            <option value="category">Category</option>
          </select>

          {form.apply_on === "product" && (
            <ProductDropdown
              products={products}
              onSelect={(id) => setForm({ ...form, product_id: id })}
            />
          )}

          {form.apply_on === "category" && (
            <CategoryDropdown
              categories={categories}
              onSelect={(id) => setForm({ ...form, category_id: id })}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({
                  offer_name: "",
                  description: "",
                  begin_on: "",
                  end_on: "",
                  discount_type: "flat",
                  discount_value: "",
                  apply_on: "all",
                  product_id: "",
                  category_id: "",
                });
              }}
              className="px-5 py-2 rounded-lg bg-gray-700"
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#00C2A8] to-[#00A8FF]"
          >
            {editingId ? "Update Offer" : "Create Offer"}
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#111827] rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold">Offers List</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-[#0B0F19] text-gray-400">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Offer</th>
              <th className="p-3">Target</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Usage</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {offers.map((offer, index) => (
              <tr key={offer.id} className="border-t border-gray-800">
                <td className="p-3">{index + 1}</td>

                <td className="p-3">
                  <div>
                    <div>{offer.offer_name}</div>
                    <div className="text-xs text-gray-400">
                      {offer.description}
                    </div>
                  </div>
                </td>

                <td className="p-3">
                  {offer.apply_on === "all" && "All Products"}
                  {offer.apply_on === "product" &&
                    getProductName(offer.product_id)}
                  {offer.apply_on === "category" &&
                    getCategoryName(offer.category_id)}
                </td>

                <td className="p-3 text-xs">
                  {new Date(offer.begin_on).toLocaleDateString()} →{" "}
                  {new Date(offer.end_on).toLocaleDateString()}
                </td>

                <td className="p-3">
                  {offer.discount_type === "percent"
                    ? `${offer.discount_value}%`
                    : `₹${offer.discount_value}`}
                </td>

                <td className="p-3 text-xs">
                  {offer.used_count || 0} / {offer.usage_limit || "∞"}
                  <br />
                  <span className="text-gray-400">
                    Per user: {offer.per_user_limit || "∞"}
                  </span>
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      isExpired(offer)
                        ? "bg-gray-500/20 text-gray-400"
                        : offer.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {isExpired(offer)
                      ? "Expired"
                      : offer.is_active
                        ? "Active"
                        : "Inactive"}
                  </span>
                </td>

                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(offer)}
                      className="text-blue-400"
                    >
                      Edit
                    </button>

                   <button
                      onClick={() => setDeleteId(offer.id)}
                      className="text-red-400"
                    >
                      Delete
                    </button>

                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!offer.is_active}
                        onChange={() => handleToggle(offer.id)}
                        className="sr-only peer"
                      />

                      <div
                        className="w-11 h-6 bg-gray-600 rounded-full peer
                          peer-checked:bg-green-500
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                          after:bg-white after:border after:rounded-full after:h-5 after:w-5
                          after:transition-all
                          peer-checked:after:translate-x-full relative"
                      ></div>
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteId && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">

    <div className="bg-[#111827] p-6 rounded-2xl w-[350px] shadow-xl border border-gray-800">

      <h3 className="text-lg font-semibold mb-2">
        Delete Offer
      </h3>

      <p className="text-sm text-gray-400 mb-5">
        Are you sure you want to delete this offer?
      </p>

      <div className="flex justify-end gap-3">

        {/* Cancel */}
        <button
          onClick={() => setDeleteId(null)}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
        >
          Cancel
        </button>

        {/* Confirm Delete */}
        <button
          onClick={async () => {
            try {
              await fetch(`${BASE_URL}/api/offers/${deleteId}`, {
                method: "DELETE"
              });

              setDeleteId(null);
              fetchOffers();

              // toast
              import("react-toastify").then(({ toast }) =>
                toast.success("Offer deleted successfully")
              );

            } catch {
              import("react-toastify").then(({ toast }) =>
                toast.error("Delete failed")
              );
            }
          }}
          className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
        >
          Delete
        </button>

      </div>

    </div>

  </div>
)}
    </div>
  );
}
