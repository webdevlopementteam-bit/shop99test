"use client";

import { useEffect, useState } from "react";
import { getProductsApi, getDealsProductsApi, addDealsProductsApi, deleteDealsProductApi, updateDealsProductApi } from "@/lib/adminApi";

export default function DealsProducts() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("0");
  const [editingId, setEditingId] = useState(null);
  const [editDiscountType, setEditDiscountType] = useState("percent");
  const [editDiscountValue, setEditDiscountValue] = useState("0");

  const fetchProducts = async () => {
    try {
      const res = await getProductsApi(1, 1000);
      const sorted = (res.data || []).sort((a, b) => a.id - b.id);
      setProducts(sorted);
    } catch (err) {
      console.error(err);
      setProducts([]);
    }
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await getDealsProductsApi();
      setDeals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchDeals();
  }, []);

  const filteredProducts = products.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!selected.length) return alert("Select product");
    try {
      await addDealsProductsApi({
        productIds: selected,
        discount_type: discountType,
        discount_value: Number(discountValue || 0),
      });
      setSelected([]);
      fetchDeals();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 501) {
        alert("Server par /api/deals route maujood nahi hai (404). Curated deals ke liye backend mein route deploy karein.");
        return;
      }
      console.error(err);
      alert(err?.response?.data?.message || "Add deals products failed");
    }
  };

  const handleDelete = async (item) => {
    try {
      await deleteDealsProductApi(item.id);
      fetchDeals();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Remove failed");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDiscountType(item.discount_type || "percent");
    setEditDiscountValue(String(item.discount_value ?? 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDiscountType("percent");
    setEditDiscountValue("0");
  };

  const handleUpdate = async (item) => {
    try {
      await updateDealsProductApi(item.id, {
        discount_type: editDiscountType,
        discount_value: Number(editDiscountValue || 0),
      });
      cancelEdit();
      fetchDeals();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Update failed");
    }
  };

  const toggleSelect = (id) => {
    const strId = String(id);
    if (selected.includes(strId)) {
      setSelected(selected.filter((i) => i !== strId));
    } else {
      setSelected([...selected, strId]);
    }
  };

  return (
    <div className="text-white max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Deals Products</h2>
        <p className="text-sm text-gray-400">Choose products to show in storefront Deals section</p>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-md space-y-4">
        <input
          type="text"
          placeholder="Search by ID or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00C2A8]"
        />

        <div className="bg-[#0B0F19] border border-gray-700 rounded-lg max-h-64 overflow-y-auto custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <p className="p-3 text-gray-500 text-sm">No products found</p>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`flex justify-between items-center px-3 py-2 cursor-pointer transition ${
                  selected.includes(String(p.id)) ? "bg-[#1F2937]" : "hover:bg-[#1F2937]"
                }`}
              >
                <div>
                  <p className="text-sm">
                    {p.name}
                    <span className="text-gray-400 ml-2">(ID: {p.id})</span>
                  </p>
                  <p className="text-xs text-gray-500">₹{p.price}</p>
                </div>

                <input type="checkbox" checked={selected.includes(String(p.id))} readOnly className="accent-[#00C2A8]" />
              </div>
            ))
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00C2A8]"
          >
            <option value="percent">Percent</option>
            <option value="flat">Flat</option>
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="Discount value"
            className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00C2A8]"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!selected.length}
          className={`w-full py-2 rounded-lg text-sm font-medium transition ${
            selected.length ? "bg-gradient-to-r from-[#00C2A8] to-[#00A8FF]" : "bg-gray-700 cursor-not-allowed"
          }`}
        >
          Add to Deals ({selected.length})
        </button>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm text-gray-400 mb-4">Deals Products (homepage)</h3>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : deals.length === 0 ? (
          <p className="text-gray-500">No deals products selected</p>
        ) : (
          <div className="space-y-3">
            {deals.map((item) => (
              <div
                key={item._readOnlyCurated ? `ro-${item.Product?.id}` : item.id}
                className="flex justify-between items-center bg-[#0B0F19] border border-gray-700 p-3 rounded-lg hover:bg-[#1F2937] transition"
              >
                <div>
                  <p className="text-sm font-medium">{item.Product?.name}</p>
                  <p className="text-xs text-gray-400">
                    ID: {item.Product?.id} | ₹{item.Product?.price}
                  </p>
                  {editingId === item.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={editDiscountType}
                        onChange={(e) => setEditDiscountType(e.target.value)}
                        className="bg-[#111827] border border-gray-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="percent">Percent</option>
                        <option value="flat">Flat</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editDiscountValue}
                        onChange={(e) => setEditDiscountValue(e.target.value)}
                        className="w-24 bg-[#111827] border border-gray-700 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-amber-300">Discount: {item.discount_type === "percent" ? `${item.discount_value}%` : `₹${item.discount_value}`}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {editingId === item.id ? (
                    <>
                      <button onClick={() => handleUpdate(item)} className="text-sm text-green-400 hover:text-green-300">
                        Save
                      </button>
                      <button onClick={cancelEdit} className="text-sm text-gray-400 hover:text-gray-300">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(item)} className="text-sm text-blue-400 hover:text-blue-300">
                      Edit
                    </button>
                  )}
                  <button onClick={() => handleDelete(item)} className="text-sm text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
