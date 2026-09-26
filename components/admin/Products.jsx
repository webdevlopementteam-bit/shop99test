"use client";

import { useEffect, useState } from "react";
import {
  getProductsApi,
  deleteProductApi,
  getCategoriesApi,
  BASE_URL,
} from "@/lib/adminApi";
import { useRouter } from "next/navigation";
import Pagination from "@/components/admin/Pagination";

export default function Products() {
  const router = useRouter();
  const PAGE_LIMIT = 50;

  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skuFilter, setSkuFilter] = useState("");
  const [fsnFilter, setFsnFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const resolveAdminPrice = (p) => {
    const candidates = [p?.price, p?.selling_price, p?.base_price];
    for (const c of candidates) {
      if (c == null || c === "") continue;
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };


  /* ================= LOAD PRODUCTS ================= */

  const fetchAllProducts = async () => {
    try {
      let currentPage = 1;
      let lastPage = 1;
      const allRows = [];
      do {
        const res = await getProductsApi(currentPage, PAGE_LIMIT);
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        allRows.push(...rows);
        lastPage = Number(res?.totalPages) || 1;
        currentPage += 1;
      } while (currentPage <= lastPage);
      setAllProducts(allRows);
    } catch {
      setAllProducts([]);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const rows = await getCategoriesApi();
        setCategories(Array.isArray(rows) ? rows : []);
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    await deleteProductApi(id);
    await fetchAllProducts();
  };

const filteredProducts = allProducts.filter((p) => {
  const productSku = String(p?.sku ?? "").toLowerCase();
  const productFsn = String(p?.fsn ?? "").toLowerCase();

  const skuQuery = skuFilter.trim().toLowerCase();
  const fsnQuery = fsnFilter.trim().toLowerCase();

  const selectedCategory = categoryFilter.trim();
  const productCategoryId = String(
    p?.category_id ?? p?.Category?.id ?? "",
  ).trim();

  const matchesSku = !skuQuery || productSku.includes(skuQuery);
  const matchesFsn = !fsnQuery || productFsn.includes(fsnQuery);
  const matchesCategory =
    !selectedCategory || productCategoryId === selectedCategory;

  return matchesSku && matchesFsn && matchesCategory;
});

useEffect(() => {
  setPage(1);
}, [skuFilter, fsnFilter, categoryFilter]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_LIMIT));
    setTotalPages(pages);
    setPage((prev) => Math.min(prev, pages));
  }, [filteredProducts.length]);

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PAGE_LIMIT,
    page * PAGE_LIMIT,
  );

  /* ================= UI ================= */

  return (
    <div className="text-white">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 gap-3">
        <div>
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-gray-400">
            Manage your store products
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            placeholder="Filter by SKU ID"
            className="w-44 rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#00A8FF]"
          />
          <input
            type="text"
            value={fsnFilter}
            onChange={(e) => setFsnFilter(e.target.value)}
            placeholder="Filter by FSN"
            className="w-44 rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#00A8FF]"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-52 rounded-lg border border-gray-700 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-[#00A8FF]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => {
              const catId = String(cat?.id ?? "").trim();
              if (!catId) return null;
              return (
                <option key={catId} value={catId}>
                  {cat?.name || `Category ${catId}`}
                </option>
              );
            })}
          </select>
          <button
            onClick={() => router.push("/admin/products/add")}
            className="bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-[#111827] rounded-xl p-4 shadow-lg overflow-x-auto">

        <table className="min-w-[1000px] w-full text-sm">

          {/* THEAD */}
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">FSN</th>
              <th className="p-3 text-center">Category</th>
              <th className="p-3 text-center">Brand</th>
              <th className="p-3 text-center">Price</th>
              <th className="p-3 text-center">Variants</th>
              <th className="p-3 text-center">COD</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          {/* TBODY */}
          <tbody>
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-6 text-center text-gray-400">
                  No products found
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-800 hover:bg-[#1F2937] transition"
                >
                {/* SKU (admin list); full name on hover — storefront still uses name */}
                <td className="p-3 flex items-center gap-3">
                  <img
                    src={`${BASE_URL}/uploads/${p.image}`}
                    alt={p.name}
                    className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                  />
                  <span
                    className="font-medium font-mono text-sm"
                    title={p.name || undefined}
                  >
                    {p.sku != null && String(p.sku).trim() !== ""
                      ? String(p.sku).trim()
                      : "—"}
                  </span>
                </td>
                {/* fsn */}
                <td className="p-3 text-center font-mono text-sm text-gray-300">
                    {p.fsn != null && String(p.fsn).trim() !== ""
                      ? String(p.fsn).trim()
                      : "—"}
                  </td>

                {/* CATEGORY */}
                <td className="p-3 text-center text-gray-300">
                  {p.Category?.name || "-"}
                </td>

                {/* BRAND */}
                <td className="p-3 text-center text-gray-300">
                  {p.Brand?.name || "-"}
                </td>

                {/* PRICE */}
                <td className="p-3 text-center font-medium">
                  ₹{resolveAdminPrice(p)}
                </td>

            <td className="p-3 text-center text-xs">
                  {p.attributes?.length > 0 ? (
                    p.attributes.map((a, i) => (
                      <div key={i}>
                        <b>{a.attribute}:</b>{" "}
                        {a.values?.length ? a.values.join(", ") : "-"}
                      </div>
                    ))
                  ) : (
                    "-"
                  )}
                </td>

                {/* COD */}
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      p.is_cod
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {p.is_cod ? "Yes" : "No"}
                  </span>
                </td>

                {/* ACTION */}
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">

                    <button
                      onClick={() => router.push(`/admin/products/edit/${p.id}`)}
                      className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md hover:bg-blue-500/30"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(p.id)}
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

        {/* PAGINATION */}
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>

      </div>
    </div>
  );
}
