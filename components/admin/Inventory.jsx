"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "react-toastify";
import {
  BASE_URL,
  getProductsApi,
  getProductByIdApi,
  updateProductApi,
  saveProductVariantsApi,
} from "@/lib/adminApi";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseVariants(product) {
  const list =
    product?.variants ?? product?.product_variants ?? product?.ProductVariants ?? [];
  if (Array.isArray(list) && list.length > 0) return list;
  return [
    {
      id: `p-${product?.id ?? "x"}`,
      price: product?.price ?? "",
      old_price: product?.old_price ?? "",
      stock: product?.stock ?? 0,
      attributes: [],
      images: [],
      short_description: "",
      specifications: [["", ""]],
    },
  ];
}

function toAttributesObject(attrs) {
  if (Array.isArray(attrs)) {
    const out = {};
    attrs.forEach((a) => {
      const k = String(a?.attribute ?? a?.name ?? "").trim();
      const v = String(a?.value ?? a?.attribute_value ?? "").trim();
      if (k) out[k] = v;
    });
    return out;
  }
  if (attrs && typeof attrs === "object") return attrs;
  return {};
}

function parseSpecs(v) {
  const raw =
    v?.specifications ??
    v?.variant_specifications ??
    v?.variantSpecifications ??
    [["", ""]];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [["", ""]];
    } catch {
      return [["", ""]];
    }
  }
  return [["", ""]];
}

function existingImageName(img) {
  const raw =
    img?.image ??
    img?.path ??
    img?.filename ??
    img?.url ??
    (typeof img === "string" ? img : "");
  const s = String(raw || "");
  if (!s) return "";
  if (s.includes("/uploads/")) return s.split("/uploads/").pop() || "";
  return s.replace(/^\/+/, "");
}

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let page = 1;
      let totalPages = 1;
      const all = [];
      while (page <= totalPages && page <= 500) {
        const res = await getProductsApi(page, 100);
        const data = Array.isArray(res?.data) ? res.data : [];
        totalPages = Number(res?.totalPages || 1);
        all.push(...data);
        page += 1;
      }

      const flattened = [];
      all.forEach((p) => {
        const variants = parseVariants(p);
        variants.forEach((v, idx) => {
          const rowKey = `${p.id}-${v.id ?? idx}`;
          const mrp = v.old_price ?? p.old_price ?? "";
          const selling = v.price ?? p.price ?? "";
          flattened.push({
            key: rowKey,
            productId: p.id,
            variantId: v.id ?? null,
            variantIndex: idx,
            productName: p.name || "Product",
            productImage: p.image ? `${BASE_URL}/uploads/${p.image}` : "/no-image.png",
            category: p?.Category?.name || "-",
            mrp: String(mrp ?? ""),
            selling: String(selling ?? ""),
            stock: String(v?.stock ?? p?.stock ?? ""),
          });
        });
      });
      setRows(flattened);
    } catch (e) {
      console.error(e);
      toast.error("Inventory load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      return (
        String(r.productName).toLowerCase().includes(query) ||
        String(r.productId).includes(query)
      );
    });
  }, [rows, q]);

  const setRowField = (key, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const saveRow = async (row) => {
    setSavingKey(row.key);
    try {
      const product = await getProductByIdApi(row.productId);

      // 1) Keep product basic details unchanged.
      const fdProduct = new FormData();
      fdProduct.append("category_id", product?.category_id ?? "");
      fdProduct.append("brand_id", product?.brand_id ?? "");
      fdProduct.append("name", product?.name ?? "");
      fdProduct.append("sku", product?.sku ?? "");
      fdProduct.append("hsn", product?.hsn ?? "");
      fdProduct.append("is_cod", product?.is_cod ? 1 : 0);
      fdProduct.append("price", String(row.selling ?? ""));
      fdProduct.append("old_price", String(row.mrp ?? ""));
      fdProduct.append("stock", String(row.stock ?? ""));
      const inStockVal =
        toNum(row.stock) <= 0 ||
        product?.in_stock === false ||
        product?.in_stock === 0 ||
        product?.in_stock === "0"
          ? 0
          : 1;
      fdProduct.append("in_stock", inStockVal);
      await updateProductApi(row.productId, fdProduct);

      // 2) Save variant prices (selling + MRP).
      const sourceVariants = parseVariants(product);
      const updatedVariants = sourceVariants.map((v, idx) => {
        const isTargetById =
          row.variantId != null && v?.id != null && String(v.id) === String(row.variantId);
        const isTargetByIndex = idx === row.variantIndex;
        // Fallback to row index when variant id is unavailable/mismatched in detail API.
        const isTarget = isTargetById || (!isTargetById && isTargetByIndex);

        return {
          attributes: toAttributesObject(v?.attributes),
          price: isTarget ? String(row.selling ?? "") : String(v?.price ?? ""),
          stock: isTarget ? String(row.stock ?? "") : String(v?.stock ?? ""),
          old_price: isTarget ? String(row.mrp ?? "") : String(v?.old_price ?? ""),
          discount: Number(v?.discount || 0),
          discount_percent: Number(v?.discount_percent || v?.discount || 0),
          short_description: String(v?.short_description ?? ""),
          specifications_heading: String(
            v?.specifications_heading ?? v?.specificationsHeading ?? "",
          ),
          specifications: parseSpecs(v),
          existing_images: (Array.isArray(v?.images) ? v.images : [])
            .map(existingImageName)
            .filter(Boolean),
        };
      });

      const fdVariants = new FormData();
      fdVariants.append("product_id", row.productId);
      fdVariants.append("variants", JSON.stringify(updatedVariants));
      await saveProductVariantsApi(fdVariants);

      toast.success("Inventory updated");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="text-white">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Inventory</h2>
          <p className="text-sm text-gray-400">
            Edit MRP, selling price and stock from one page.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="self-start rounded-lg border border-gray-600 bg-[#1F2937] px-4 py-2 text-sm hover:bg-[#374151] disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product by name or ID..."
            className="w-full rounded-lg border border-gray-700 bg-[#111827] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/40"
          />
        </div>
      </div>

      {/* <div className="overflow-x-auto rounded-xl bg-[#111827] p-4 shadow-lg"> */}
      <div className="rounded-xl bg-[#111827] p-4 shadow-lg">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead className="border-b border-gray-700 text-gray-400">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-center">MRP</th>
                <th className="p-3 text-center">Selling</th>
                <th className="p-3 text-center">Stock</th>
                <th className="p-3 text-center">Category</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  return (
                    <tr key={r.key} className="border-b border-gray-800 hover:bg-[#1F2937]">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={r.productImage}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-12 w-12 rounded-lg bg-white p-1 object-contain"
                            onError={(e) => {
                              // Fallback once — never loop if the placeholder itself fails.
                              if (!e.currentTarget.src.endsWith("/no-image.png")) e.currentTarget.src = "/no-image.png";
                            }}
                          />
                          <div className="min-w-0">
                         <p className="font-medium break-words whitespace-normal">
                            {r.productName}
                          </p>
                            <p className="text-xs text-gray-500">ID: {r.productId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.mrp}
                          onChange={(e) => {
                            setRowField(r.key, "mrp", e.target.value);
                          }}
                          className="w-28 rounded-md border border-gray-700 bg-[#0B0F19] px-2 py-1.5 text-center text-white"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.selling}
                          onChange={(e) => {
                            setRowField(r.key, "selling", e.target.value);
                          }}
                          className="w-28 rounded-md border border-gray-700 bg-[#0B0F19] px-2 py-1.5 text-center text-white"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={r.stock}
                          onChange={(e) => setRowField(r.key, "stock", e.target.value)}
                          className="w-24 rounded-md border border-gray-700 bg-[#0B0F19] px-2 py-1.5 text-center text-white"
                        />
                      </td>
                      <td className="p-3 text-center text-gray-300">{r.category}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => saveRow(r)}
                          disabled={savingKey === r.key}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {savingKey === r.key ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
