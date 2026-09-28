"use client";

import { useEffect, useState } from "react";
import { BASE_URL, getStoredAuthToken } from "@/lib/adminApi";
import ProductDropdown from "@/components/admin/ProductDropdown";
import CategoryDropdown from "@/components/admin/CategoryDropdown";


export default function Coupons() {

  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const token = getStoredAuthToken();

  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_value: "",
    discount_type: "flat",
    begin_on: "",
    end_on: "",
    apply_on: "all",
    product_id: "",
    category_id: "",
      // ✅ ADD THIS
  usage_limit: "",
  per_user_limit: ""

  });

  useEffect(() => {
    fetchCoupons();

    fetch(`${BASE_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data.data || []));

    fetch(`${BASE_URL}/api/categories`)
      .then(res => res.json())
      // .then(data => setCategories(data));
      .then(data => setCategories(data.data || data.categories || []));

  }, []);

  const fetchCoupons = () => {
  fetch(`${BASE_URL}/api/coupons`)
    .then(res => res.json())
    .then(data => {
      console.log("API RESPONSE:", data);

      if (Array.isArray(data)) {
        setCoupons(data);
      } else if (Array.isArray(data.data)) {
        setCoupons(data.data);
      } else {
        setCoupons([]); // ✅ fallback
      }
    })
    .catch(() => setCoupons([]));
};


  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    let payload = { ...form ,
      usage_limit: form.usage_limit || null,
      per_user_limit: form.per_user_limit || null
        };

    if (payload.apply_on === "product") payload.category_id = null;

    if (payload.apply_on === "category") payload.product_id = null;
    if (payload.apply_on === "all") {
      payload.product_id = null;
      payload.category_id = null;
    }
    if (!form.code || !form.discount_value) {
      alert("Coupon code and discount are required");
      return;
    }


    const url = editingId
      ? `${BASE_URL}/api/coupons/${editingId}`
      : `${BASE_URL}/api/coupons`;

    const method = editingId ? "PUT" : "POST";

   await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` // 🔥 ADD THIS
      },
      body: JSON.stringify(payload)
    });

    setEditingId(null);

    setForm({
      code: "",
      description: "",
      discount_value: "",
      begin_on: "",
      end_on: "",
      apply_on: "all",
      product_id: "",
      category_id: "",

  usage_limit: "",
  per_user_limit: ""
    });

    fetchCoupons();
  };

  /* ================= EDIT ================= */

  const handleEdit = (coupon) => {

    setEditingId(coupon.id);

    setForm({
      code: coupon.code,
      description: coupon.description,
      discount_value: coupon.discount_value,
      begin_on: coupon.begin_on?.split("T")[0],
      end_on: coupon.end_on?.split("T")[0],
      apply_on: coupon.apply_on,
      product_id: coupon.product_id,
      category_id: coupon.category_id,
        usage_limit: coupon.usage_limit || "",
  per_user_limit: coupon.per_user_limit || ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {

    if (!window.confirm("Delete this coupon?")) return;

    await fetch(`${BASE_URL}/api/coupons/${id}`, {
      method: "DELETE",
      headers: {
      Authorization: `Bearer ${token}` // 🔥 ADD
    }
    });

    fetchCoupons();
  };

  const getProductName = (id) => {
    const p = products.find(p => p.id === id);
    return p?.name;
  };

  const getCategoryName = (id) => {
    const c = categories.find(c => c.id === id);
    return c?.name;
  };
return (
  <div className="text-white space-y-6">

    {/* ================= TOP → FORM (FULL WIDTH) ================= */}
    <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-lg w-full">

      <h3 className="text-lg font-semibold mb-4">
        {editingId ? "Edit Coupon" : "Create Coupon"}
      </h3>

      <div className="grid md:grid-cols-2 gap-4">

        <input
          placeholder="Coupon Code"
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value })
          }
          className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg uppercase tracking-wider"
        />

        {/* Discount Type */}
        <select
          value={form.discount_type || "flat"}
          onChange={(e) =>
            setForm({ ...form, discount_type: e.target.value })
          }
          className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
        >
          <option value="flat">Flat ₹</option>
          <option value="percentage">Percentage %</option>
        </select>

        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
          className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg md:col-span-2"
        />

        <input
          type="date"
          value={form.begin_on}
          onChange={(e) =>
            setForm({ ...form, begin_on: e.target.value })
          }
          className="bg-[#0B0F19] border border-gray-700 p-2 rounded-lg"
        />

        <input
          type="date"
          value={form.end_on}
          onChange={(e) =>
            setForm({ ...form, end_on: e.target.value })
          }
          className="bg-[#0B0F19] border border-gray-700 p-2 rounded-lg"
        />

        <input
          placeholder="Usage Limit"
          value={form.usage_limit || ""}
          onChange={(e) =>
            setForm({ ...form, usage_limit: e.target.value })
          }
          className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
        />

  <input
  placeholder="Per User Limit"
  value={form.per_user_limit || ""}
  onChange={(e) =>
    setForm({ ...form, per_user_limit: e.target.value })
  }
  className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
/>

        <input
          placeholder={
            form.discount_type === "percentage"
              ? "Discount %"
              : "Discount ₹"
          }
          value={form.discount_value}
          onChange={(e) =>
            setForm({ ...form, discount_value: e.target.value })
          }
          className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
        />

        {/* Apply On */}
        <select
          value={form.apply_on}
          onChange={(e) =>
            setForm({
              ...form,
              apply_on: e.target.value,
              product_id: "",
              category_id: ""
            })
          }
          className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg md:col-span-2"
        >
          <option value="all">All Products</option>
          <option value="product">Single Product</option>
          <option value="category">Category</option>
        </select>

        {form.apply_on === "product" && (
          <ProductDropdown
            products={products}
            onSelect={(id) =>
              setForm({ ...form, product_id: id })
            }
          />
        )}

        {form.apply_on === "category" && (
          <CategoryDropdown
            categories={categories}
            onSelect={(id) =>
              setForm({ ...form, category_id: id })
            }
          />
        )}

        <button
          onClick={handleSubmit}
          className="w-full mt-2 bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] py-3 rounded-lg font-medium md:col-span-2"
        >
          {editingId ? "Update Coupon" : "Create Coupon"}
        </button>

      </div>
    </div>

    {/* ================= BOTTOM → COUPONS ================= */}
    <div>

      <h3 className="text-lg font-semibold mb-4">
        Active Coupons
      </h3>

      <div className="grid md:grid-cols-3 gap-4">

        {coupons.map((coupon) => (

          <div
            key={coupon.id}
            className="bg-gradient-to-br from-[#111827] to-[#1F2937] border border-gray-800 rounded-2xl p-5 shadow-lg hover:scale-[1.02] transition"
          >

            <div className="flex justify-between items-center mb-2">
              <span className="text-xl font-bold tracking-widest text-[#00C2A8]">
                {coupon.code}
              </span>

              <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                {coupon.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <p className="text-sm text-gray-400 mb-3">
              {coupon.description}
            </p>

            <div className="text-xs text-gray-400 space-y-1">
              <p>
                🎯 {coupon.apply_on === "all"
                  ? "All Products"
                  : coupon.apply_on === "product"
                  ? getProductName(coupon.product_id)
                  : getCategoryName(coupon.category_id)}
              </p>

              <p>
                📅 {new Date(coupon.begin_on).toLocaleDateString()} →{" "}
                {new Date(coupon.end_on).toLocaleDateString()}
              </p>

              <p>
                🔁 Used: {coupon.used_count || 0} / {coupon.usage_limit ?? "∞"}
              </p>
              <p>
                👤 Per User: {coupon.per_user_limit ?? "∞"}
              </p>
            </div>

            <div className="flex justify-between items-center mt-4">

              <span className="text-lg font-semibold text-green-400">
                {coupon.discount_type === "percentage"
                  ? `${coupon.discount_value}%`
                  : `₹${coupon.discount_value}`}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(coupon)}
                  className="text-blue-400 text-sm"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(coupon.id)}
                  className="text-red-400 text-sm"
                >
                  Delete
                </button>
              </div>

            </div>

          </div>

        ))}

      </div>
    </div>

  </div>
);
}
