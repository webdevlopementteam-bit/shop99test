"use client";

import { useEffect, useState } from "react";

import { getProductsApi, getLatestProductsApi, addLatestProductsApi, deleteLatestProductApi } from "@/lib/adminApi";

export default function LatestProducts() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const readOnlyCurated = latest.some((row) => row._readOnlyCurated);

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

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const data = await getLatestProductsApi();
      setLatest(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLatest([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchLatest();
  }, []);

  const filteredProducts = products.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!selected.length) return alert("Select product");

    try {
      await addLatestProductsApi(selected);
      setSelected([]);
      fetchLatest();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 501) {
        alert("Server par /api/latest-products route maujood nahi hai (404). Storefront par curated list ke liye backend mein ye route deploy karein — tabhi Add yahan se kaam karega.");
        return;
      }
      console.error(err);
      alert(err?.response?.data?.message || "Add latest products failed");
    }
  };

  const handleDelete = async (item) => {
    if (item._readOnlyCurated) {
      alert("Yeh list /products/latest se aa rahi hai — isse hatane ke liye server par /api/latest-products curated API chahiye.");
      return;
    }
    try {
      await deleteLatestProductApi(item.id);
      fetchLatest();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Remove failed");
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
        <h2 className="text-2xl font-semibold">Latest Products</h2>
        <p className="text-sm text-gray-400">Choose which products appear in the Latest Products section on the storefront</p>
        {readOnlyCurated && (
          <p className="text-sm text-amber-400 mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
            API <code className="text-amber-200">/api/latest-products</code> server par 404 hai — abhi list <code className="text-amber-200">/products/latest</code> se dikh rahi hai. Add /
            Remove tabhi chalega jab backend par curated route deploy ho.
          </p>
        )}
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

        <button
          onClick={handleAdd}
          disabled={!selected.length || readOnlyCurated}
          title={readOnlyCurated ? "Pehle server par /api/latest-products add karein" : undefined}
          className={`w-full py-2 rounded-lg text-sm font-medium transition ${
            selected.length && !readOnlyCurated ? "bg-gradient-to-r from-[#00C2A8] to-[#00A8FF]" : "bg-gray-700 cursor-not-allowed"
          }`}
        >
          Add to Latest ({selected.length})
        </button>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm text-gray-400 mb-4">Latest Products (homepage)</h3>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : latest.length === 0 ? (
          <p className="text-gray-500">No latest products selected</p>
        ) : (
          <div className="space-y-3">
            {latest.map((item) => (
              <div
                key={item._readOnlyCurated ? `ro-${item.Product?.id}` : item.id}
                className="flex justify-between items-center bg-[#0B0F19] border border-gray-700 p-3 rounded-lg hover:bg-[#1F2937] transition"
              >
                <div>
                  <p className="text-sm font-medium">{item.Product?.name}</p>
                  <p className="text-xs text-gray-400">
                    ID: {item.Product?.id} | ₹{item.Product?.price}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(item)}
                  disabled={item._readOnlyCurated}
                  className={`text-sm ${item._readOnlyCurated ? "text-gray-600 cursor-not-allowed" : "text-red-400 hover:text-red-300"}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
