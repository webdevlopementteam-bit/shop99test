"use client";

import { useEffect, useState } from "react";
import {
  getCategoriesApi,
  getCategoryAttributesApi,
  assignCategoryAttributesApi
} from "@/lib/adminApi";

import { toast } from "react-toastify";

export default function CategoryAttribute() {

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  const [attributes, setAttributes] = useState([]);
  const [mapped, setMapped] = useState([]);
  const [applyToSub, setApplyToSub] = useState(false);

  const [parentMapped, setParentMapped] = useState([]);
  const [extraMapped, setExtraMapped] = useState([]);

  const [subcategories, setSubcategories] = useState([]);
  const [selectedSub, setSelectedSub] = useState("");

  /* ================= FETCH CATEGORIES ================= */
  useEffect(() => {
    getCategoriesApi().then(res => {
      console.log("CATEGORIES 👉", res);
      setCategories(res || []);
    });
  }, []);

  /* ================= FETCH ATTRIBUTES ================= */
  const loadAttributes = async (id) => {
    try {
      const res = await getCategoryAttributesApi(id);

      console.log("CATEGORY ATTRIBUTES 👉", res);

      const mappedData = res.mapped || [];

      setAttributes(res.all || []);
      setMapped(mappedData);
      setParentMapped(res.parentMapped || mappedData);
      setExtraMapped(res.extraMapped || []);

    } catch (err) {
      console.error(err);
    }
  };

  /* ================= CATEGORY CHANGE ================= */
  const handleCategory = (id) => {
    console.log("SELECTED CATEGORY ID 👉", id);

    setSelectedCategory(id);
    setSelectedSub(""); // reset subcategory

    loadAttributes(id);
  };

  /* ================= SUBCATEGORY CHANGE ================= */
  const handleSubcategory = (id) => {
    console.log("SELECTED SUBCATEGORY 👉", id);

    setSelectedSub(id);
    setSelectedCategory(id); // important for mapping

    loadAttributes(id);
  };

  /* ================= TOGGLE ================= */
  const toggle = (id) => {
    setMapped(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  /* ================= EXTRA TOGGLE ================= */
  const toggleExtra = (id) => {
    setExtraMapped(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    try {
      await assignCategoryAttributesApi({
        category_id: selectedCategory,
        attribute_ids: mapped,
        apply_to_sub: applyToSub,
        extra_ids: extraMapped
      });

      toast.success("Saved successfully ✅");

    } catch (err) {
      console.error(err);
      toast.error("Something went wrong ❌");
    }
  };

  /* ================= LOAD SUBCATEGORIES ================= */
  useEffect(() => {
    if (!selectedCategory) return;

    const subs = categories.filter(c => c.parent_id == selectedCategory);
    setSubcategories(subs);

  }, [selectedCategory, categories]);

  /* ================= CHECK SUBCATEGORY ================= */
  const selectedCat = categories.find(c => String(c.id) === String(selectedCategory));
  const isSubcategory = !!selectedCat?.parent_id;

  return (
    <div className="p-6 text-white bg-[#0B0F19] min-h-screen">

      {/* HEADER */}
      <h2 className="text-2xl font-semibold mb-6">
        Category Attribute Mapping
      </h2>

      {/* CATEGORY SELECT */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <select
          className="bg-[#111827] border border-gray-700 p-3 rounded w-[300px]"
          value={selectedCategory}
          onChange={(e) => handleCategory(e.target.value)}
        >
          <option value="">Select Category</option>

          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? `↳ ${c.name}` : c.name}
            </option>
          ))}
        </select>

        {/* APPLY TO SUB */}
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={applyToSub}
            onChange={() => setApplyToSub(!applyToSub)}
          />
          Apply to subcategories
        </label>
      </div>

      {/* SUBCATEGORY SELECT */}
      {subcategories.length > 0 && (
        <div className="mb-6">
          <label className="block mb-2 text-sm text-gray-400">
            Select Subcategory
          </label>

          <select
            className="bg-[#111827] border border-gray-700 p-3 rounded w-[300px]"
            value={selectedSub}
            onChange={(e) => handleSubcategory(e.target.value)}
          >
            <option value="">Select Subcategory</option>

            {subcategories.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-[#111827] rounded-xl overflow-hidden border border-gray-800">

        <table className="w-full text-sm">

          <thead className="bg-gradient-to-r from-[#00C2A8]/20 to-[#00A8FF]/20 text-[#00C2A8]">
            <tr>
              <th className="p-3 w-[60px]">#</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Attributes</th>
            </tr>
          </thead>

          <tbody>

            {/* MAPPED */}
            <tr className="border-b border-gray-800">
              <td className="p-3">1</td>
              <td className="p-3 text-green-400 font-medium">
                {isSubcategory ? "Parent / Inherited" : "Mapped"}
              </td>

              <td className="p-3">
                <div className="grid grid-cols-3 gap-3">

                  {attributes
                    .filter(a => mapped.includes(a.id))
                    .map(a => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 bg-[#0B0F19] border border-green-500/30 p-2 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked
                          onChange={() => toggle(a.id)}
                        />
                        <span>{a.name}</span>
                      </label>
                    ))}

                </div>
              </td>
            </tr>

            {/* EXTRA (SUBCATEGORY ONLY) */}
            {isSubcategory && (
              <tr>
                <td className="p-3">2</td>
                <td className="p-3 text-blue-400 font-medium">
                  Extra (Only Subcategory)
                </td>

                <td className="p-3">
                  <div className="grid grid-cols-3 gap-3">

                    {attributes
                      .filter(a => !mapped.includes(a.id))
                      .map(a => (
                        <label
                          key={a.id}
                          className="flex items-center gap-2 bg-[#0B0F19] border border-gray-700 p-2 rounded cursor-pointer hover:border-[#00C2A8]"
                        >
                          <input
                            type="checkbox"
                            checked={extraMapped.includes(a.id)}
                            onChange={() => toggleExtra(a.id)}
                          />
                          <span>{a.name}</span>
                        </label>
                      ))}

                  </div>
                </td>
              </tr>
            )}

            {/* UNMAPPED (ONLY PARENT) */}
            {!isSubcategory && (
              <tr>
                <td className="p-3">2</td>
                <td className="p-3 text-red-400 font-medium">Unmapped</td>

                <td className="p-3">
                  <div className="grid grid-cols-3 gap-3">

                    {attributes
                      .filter(a => !mapped.includes(a.id))
                      .map(a => (
                        <label
                          key={a.id}
                          className="flex items-center gap-2 bg-[#0B0F19] border border-gray-700 p-2 rounded cursor-pointer hover:border-[#00C2A8]"
                        >
                          <input
                            type="checkbox"
                            onChange={() => toggle(a.id)}
                          />
                          <span>{a.name}</span>
                        </label>
                      ))}

                  </div>
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

      {/* SAVE BUTTON */}
      <div className="mt-6">
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-6 py-2 rounded font-medium"
        >
          Save Mapping
        </button>
      </div>

    </div>
  );
}
