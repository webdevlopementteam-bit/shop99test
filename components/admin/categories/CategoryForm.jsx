"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createCategoryApi,
  updateCategoryApi,
  getCategoryByIdApi,
  getAllCategoriesFlatApi,
} from "@/lib/adminApi";

import { useRouter, useParams } from "next/navigation";
import { Trash2 } from "lucide-react";

/** BFS: category being edited + all its descendants (cannot be chosen as parent — avoids cycles). */
function collectSelfAndDescendantIds(flat, editId) {
  const set = new Set([String(editId)]);
  const queue = [String(editId)];
  while (queue.length) {
    const pid = queue.shift();
    flat.forEach((c) => {
      const cid = String(c.id);
      if (set.has(cid)) return;
      if (String(c.parent_id) === pid) {
        set.add(cid);
        queue.push(cid);
      }
    });
  }
  return set;
}

/** Ordered tree walk for <select>: any category can be a parent (nested subcategories). */
function buildIndentedParentOptions(flat, excludeIds) {
  const ex = excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
  const byParent = new Map();
  flat.forEach((c) => {
    const pk =
      c.parent_id == null || c.parent_id === ""
        ? "__root__"
        : String(c.parent_id);
    if (!byParent.has(pk)) byParent.set(pk, []);
    byParent.get(pk).push(c);
  });
  const sortFn = (a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
    });
  const out = [];
  function walk(pk, depth) {
    const kids = (byParent.get(pk) || []).slice().sort(sortFn);
    for (const k of kids) {
      if (ex.has(String(k.id))) continue;
      out.push({ ...k, depth });
      walk(String(k.id), depth + 1);
    }
  }
  walk("__root__", 0);
  return out;
}

export default function CategoryForm() {

  const router = useRouter();
  const { id } = useParams();

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    name: "",
    parent_id: "",
    tax_rate: 0,
    hsn: "",
    is_publish: false,
    is_top_category: false,
    image: null,
    banner: null
  });
  const [existingImage, setExistingImage] = useState("");
  const [existingBanner, setExistingBanner] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);

  const excludedParentIds = useMemo(() => {
    if (!id || !categories.length) return new Set();
    return collectSelfAndDescendantIds(categories, id);
  }, [id, categories]);

  const parentSelectOptions = useMemo(
    () => buildIndentedParentOptions(categories, excludedParentIds),
    [categories, excludedParentIds]
  );

  /* ================= LOAD ================= */
  useEffect(() => {

    const load = async () => {
      try {
        const flat = await getAllCategoriesFlatApi();
        setCategories(Array.isArray(flat) ? flat : []);

        if (id) {
          const data = await getCategoryByIdApi(id);
          setExistingImage(data?.image || "");
          setExistingBanner(data?.banner || "");
          setRemoveImage(false);
          setRemoveBanner(false);

          setForm({
            name: data.name || "",
            parent_id: data.parent_id || "",
            tax_rate: data.tax_rate || 0,
            hsn: data.hsn != null ? String(data.hsn) : "",
            is_publish: !!data.is_publish,
            is_top_category: !!data.is_top_category,
            image: null,
            banner: null
          });
        }

      } catch (err) {
        console.log(err);
      }
    };

    load();

  }, [id]);

  /* ================= HANDLERS ================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]:
        name === "tax_rate"
          ? Number(value)
          : value
    });
  };

  const handleImageFile = (e) =>
    setForm({ ...form, image: e.target.files[0] || null });

  const handleBannerFile = (e) =>
    setForm({ ...form, banner: e.target.files[0] || null });

  const onImagePick = (e) => {
    handleImageFile(e);
    if (e.target.files?.[0]) setRemoveImage(false);
  };

  const onBannerPick = (e) => {
    handleBannerFile(e);
    if (e.target.files?.[0]) setRemoveBanner(false);
  };

  const handleSubmit = async () => {
    try {
      const fd = new FormData();

      fd.append("name", form.name);
      fd.append("parent_id", form.parent_id || "");
      fd.append("tax_rate", form.tax_rate || 0);
      fd.append("hsn", (form.hsn || "").trim());

      fd.append("is_publish", form.is_publish ? 1 : 0);
      fd.append("is_top_category", form.is_top_category ? 1 : 0);

      if (form.image) {
        fd.append("image", form.image);
      }
      if (form.banner) {
        fd.append("banner", form.banner);
      }
      if (id) {
        fd.append("remove_image", removeImage ? 1 : 0);
        fd.append("remove_banner", removeBanner ? 1 : 0);
      }

      if (id)
        await updateCategoryApi(id, fd);
      else
        await createCategoryApi(fd);

      router.push("/admin/categories");

    } catch {
      alert("Save failed");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="text-white">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">
            {id ? "Edit Category" : "Add Category"}
          </h2>
          <p className="text-sm text-gray-400">
            Manage your category details
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/admin/categories")}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-5 py-2 rounded-lg font-medium"
          >
            Save
          </button>
        </div>
      </div>

      {/* FORM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-[#111827] p-6 rounded-xl">
            <h3 className="mb-4 font-semibold">Basic Information</h3>

            <div className="space-y-4">

              {/* NAME */}
              <div>
                <label className="text-sm text-gray-400">Category Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="mt-1 w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
                />
              </div>

              {/* PARENT — any depth: subcategory can be parent of another subcategory */}
              <div>
                <label className="text-sm text-gray-400">
                  Parent Category (optional — pick any level)
                </label>
                <select
                  name="parent_id"
                  value={form.parent_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
                >
                  <option value="">None (top level)</option>

                  {parentSelectOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${"— ".repeat(c.depth)}${c.name}`}
                    </option>
                  ))}

                </select>
              </div>

              {/* TAX */}
              <div>
                <label className="text-sm text-gray-400">Tax Rate (%)</label>
                <input
                  type="number"
                  name="tax_rate"
                  value={form.tax_rate}
                  onChange={handleChange}
                  className="mt-1 w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
                />
              </div>

              {/* HSN — synced to all products in this category on save (server) */}
              <div>
                <label className="text-sm text-gray-400">HSN code</label>
                <input
                  name="hsn"
                  value={form.hsn}
                  onChange={handleChange}
                  placeholder="e.g. 8517"
                  maxLength={16}
                  className="mt-1 w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
                />
                <p className="mt-1 text-xs text-gray-500">
                  When you save, this HSN is applied to every product in this category
                  (empty clears category HSN and updates those products).
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* IMAGE */}
          <div className="bg-[#111827] p-6 rounded-xl">
            <h3 className="mb-4 font-semibold">Category Image</h3>

            <input
              type="file"
              accept="image/*"
              onChange={onImagePick}
              className="w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
            />
            {!form.image && existingImage && (
              <p className="mt-2 text-xs text-gray-400">Current: {existingImage}</p>
            )}
            {id && existingImage && (
              <button
                type="button"
                onClick={() => {
                  setRemoveImage((prev) => !prev);
                  setForm((prev) => ({ ...prev, image: null }));
                }}
                className={`mt-3 inline-flex items-center gap-2 rounded px-3 py-1 text-xs ${
                  removeImage
                    ? "bg-red-600/20 text-red-300 border border-red-500/40"
                    : "bg-[#0B0F19] text-gray-300 border border-gray-700"
                }`}
              >
                <Trash2 size={14} />
                {removeImage ? "Image will be removed" : "Remove current image"}
              </button>
            )}
          </div>

          {/* BANNER */}
          <div className="bg-[#111827] p-6 rounded-xl">
            <h3 className="mb-4 font-semibold">Category Banner [w-1930, h-350]</h3>

            <input
              type="file"
              accept="image/*"
              onChange={onBannerPick}
              className="w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
            />
            {!form.banner && existingBanner && (
              <p className="mt-2 text-xs text-gray-400">Current: {existingBanner}</p>
            )}
            {id && existingBanner && (
              <button
                type="button"
                onClick={() => {
                  setRemoveBanner((prev) => !prev);
                  setForm((prev) => ({ ...prev, banner: null }));
                }}
                className={`mt-3 inline-flex items-center gap-2 rounded px-3 py-1 text-xs ${
                  removeBanner
                    ? "bg-red-600/20 text-red-300 border border-red-500/40"
                    : "bg-[#0B0F19] text-gray-300 border border-gray-700"
                }`}
              >
                <Trash2 size={14} />
                {removeBanner ? "Banner will be removed" : "Remove current banner"}
              </button>
            )}
          </div>

          {/* SETTINGS */}
          <div className="bg-[#111827] p-6 rounded-xl space-y-4">
            <h3 className="font-semibold">Settings</h3>

            <label className="flex items-center justify-between text-sm text-gray-300">
              Publish
              <input
                type="checkbox"
                checked={form.is_publish}
                onChange={(e) =>
                  setForm({ ...form, is_publish: e.target.checked })
                }
              />
            </label>

            <label className="flex items-center justify-between text-sm text-gray-300">
              Top Category
              <input
                type="checkbox"
                checked={form.is_top_category}
                onChange={(e) =>
                  setForm({ ...form, is_top_category: e.target.checked })
                }
              />
            </label>

          </div>

        </div>

      </div>
    </div>
  );
}
