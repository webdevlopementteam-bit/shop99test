"use client";

import { useEffect, useState } from "react";

import { getProductsApi, getPopularProductsApi, addPopularProductsApi, deletePopularProductApi } from "@/lib/adminApi";

export default function PopularProducts() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* ================= FETCH ================= */

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

  const fetchPopular = async () => {
    setLoading(true);
    const data = await getPopularProductsApi();
    setPopular(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchPopular();
  }, []);

  /* ================= FILTER ================= */

  const filteredProducts = products.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(search.toLowerCase()));

  /* ================= HANDLERS ================= */

  const handleAdd = async () => {
    if (!selected.length) return alert("Select product");

    await addPopularProductsApi(selected);
    setSelected([]);
    fetchPopular();
  };

  const handleDelete = async (id) => {
    await deletePopularProductApi(id);
    fetchPopular();
  };

  const toggleSelect = (id) => {
    const strId = String(id);
    if (selected.includes(strId)) {
      setSelected(selected.filter((i) => i !== strId));
    } else {
      setSelected([...selected, strId]);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="text-white max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-semibold">Popular Products</h2>
        <p className="text-sm text-gray-400">Manage featured products easily</p>
      </div>

      {/* ADD SECTION */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-md space-y-4">
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search by ID or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00C2A8]"
        />

        {/* DROPDOWN LIST */}
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

        {/* ACTION BUTTON */}
        <button
          onClick={handleAdd}
          disabled={!selected.length}
          className={`w-full py-2 rounded-lg text-sm font-medium transition ${
            selected.length ? "bg-gradient-to-r from-[#00C2A8] to-[#00A8FF]" : "bg-gray-700 cursor-not-allowed"
          }`}
        >
          Add to Popular ({selected.length})
        </button>
      </div>

      {/* POPULAR LIST */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm text-gray-400 mb-4">Popular Products</h3>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : popular.length === 0 ? (
          <p className="text-gray-500">No popular products</p>
        ) : (
          <div className="space-y-3">
            {popular.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-[#0B0F19] border border-gray-700 p-3 rounded-lg hover:bg-[#1F2937] transition">
                <div>
                  <p className="text-sm font-medium">{item.Product?.name}</p>
                  <p className="text-xs text-gray-400">
                    ID: {item.Product?.id} | ₹{item.Product?.price}
                  </p>
                </div>

                <button onClick={() => handleDelete(item.id)} className="text-red-400 text-sm hover:text-red-300">
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
