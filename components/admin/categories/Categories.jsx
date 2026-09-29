"use client";

import { useEffect, useState } from "react";
import { getAllCategoriesFlatApi, deleteCategoryApi, BASE_URL, adminFetch } from "@/lib/adminApi";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function Categories() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [gstInputs, setGstInputs] = useState({});
  const [savingGstId, setSavingGstId] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */
  const fetchCategories = async () => {
    setLoading(true);

    try {
      const data = await getAllCategoriesFlatApi();

      if (!Array.isArray(data) || data.length === 0) {
        setCategories([]);
        setGstInputs({});
      } else {
        const rows = [...data].reverse();
        setCategories(rows);

        const init = {};
        rows.forEach((c) => {
          init[c.id] = String(c.tax_rate ?? c.gst_percentage ?? 0);
        });
        setGstInputs(init);
      }
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setCategories([]);
      setGstInputs({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;

    try {
      await deleteCategoryApi(id);

      toast.success("Category deleted successfully ✅");
      fetchCategories();
    } catch (err) {
      console.error("DELETE ERROR:", err);

      toast.error(typeof err === "string" ? err : err?.message || "Delete failed ❌");
    }
  };

  /* ================= GST INLINE UPDATE ================= */
  const handleGstInputChange = (id, value) => {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setGstInputs((prev) => ({ ...prev, [id]: value }));
    }
  };

  const saveGst = async (category) => {
    const raw = gstInputs[category.id];
    const gst = Number(raw);

    if (raw === "" || Number.isNaN(gst) || gst < 0 || gst > 100) {
      toast.error("GST must be between 0 and 100");
      return;
    }

    setSavingGstId(category.id);
    try {
      // Update existing category with all required fields + gst_percentage
      const payload = {
        name: category.name,
        parent_id: category.parent_id ?? "",
        is_publish: category.is_publish ? 1 : 0,
        is_top_category: category.is_top_category ? 1 : 0,
        gst_percentage: gst,
      };

      const res = await adminFetch(`${BASE_URL}/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "GST update failed");
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, tax_rate: gst } : c))
      );

      toast.success("GST updated successfully ✅");
    } catch (err) {
      console.error("GST UPDATE ERROR:", err);
      toast.error(err?.message || "Failed to update GST ❌");
    } finally {
      setSavingGstId(null);
    }
  };

  const filteredCategories = categories.filter((c) =>
    String(c?.name || "")
      .toLowerCase()
      .includes(nameFilter.trim().toLowerCase())
  );

  /* ================= UI ================= */
  return (
    <div className="text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-gray-400">Manage product categories</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Filter by category name"
            className="w-56 rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#00A8FF]"
          />

          <button
            onClick={() => router.push("/admin/categories/add")}
            className="bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-[#111827] rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full text-sm">
          {/* THEAD */}
          <thead className="border-b border-gray-700 text-gray-400">
            <tr>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Parent</th>
              <th className="p-3 text-center">HSN</th>
              <th className="p-3 text-center">GST (%)</th>
              <th className="p-3 text-center">Publish</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          {/* TBODY */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              filteredCategories.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-800 hover:bg-[#1F2937] transition"
                >
                  {/* CATEGORY (Image + Name) */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {c.image && (
                        <img
                          src={`${BASE_URL}/uploads/${c.image}`}
                          className="w-10 h-10 object-contain bg-white rounded p-1"
                          alt="category"
                        />
                      )}
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>

                  {/* PARENT */}
                  <td className="p-3 text-gray-300">{c.parent?.name || "-"}</td>

                  <td className="p-3 text-center text-gray-300 font-mono text-xs">
                    {c.hsn ? String(c.hsn) : "—"}
                  </td>

                  {/* GST INLINE INPUT */}
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={gstInputs[c.id] ?? ""}
                        onChange={(e) => handleGstInputChange(c.id, e.target.value)}
                        className="w-20 text-center rounded border border-gray-600 bg-[#0b1220] px-2 py-1 text-white"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-400">%</span>
                      <button
                        type="button"
                        onClick={() => saveGst(c)}
                        disabled={savingGstId === c.id}
                        className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs hover:bg-blue-500/30 disabled:opacity-60"
                      >
                        {savingGstId === c.id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </td>

                  {/* PUBLISH */}
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        c.is_publish
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {c.is_publish ? "Published" : "Hidden"}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/categories/edit/${c.id}`)}
                        className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md hover:bg-blue-500/30"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(c.id)}
                        className="bg-red-500/20 text-red-400 px-3 py-1 rounded-md hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
