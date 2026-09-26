"use client";

import { useEffect, useState } from "react";
import {
  getSEOApi,
  createSEOApi,
  updateSEOApi,
  deleteSEOApi,
  toggleSEOStatusApi,
  BASE_URL,
} from "@/lib/adminApi";
import { toast } from "react-toastify";

export default function SEO() {
  const [form, setForm] = useState({
    id: null,
    page_name: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    canonical_url: "",
    og_title: "",
    og_description: "",
    og_image: "",
    is_active: "active",
  });

  const [seoList, setSeoList] = useState([]);

  /* ================= FETCH ================= */
  const fetchSEO = async () => {
    const data = await getSEOApi();
    setSeoList(data);
  };

  useEffect(() => {
    fetchSEO();
  }, []);

  /* ================= CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  /* ================= IMAGE ================= */
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, og_image: file });
    }
  };

  /* ================= SAVE ================= */
  const saveSEO = async () => {
    try {
      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        if (key === "id") return;

        // ❗ skip image if it's string (already uploaded)
        if (key === "og_image" && typeof form.og_image === "string") return;

        formData.append(key, form[key]);
      });

      if (form.id) {
        await updateSEOApi(form.id, formData);
        toast.success("SEO Updated ✅");
      } else {
        await createSEOApi(formData);
        toast.success("SEO Created ✅");
      }

      setTimeout(() => toast.dismiss(), 2000);
      resetForm();
      fetchSEO();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error ❌");
      setTimeout(() => toast.dismiss(), 2000);
    }
  };

  /* ================= EDIT ================= */
  const handleEdit = (item) => {
    setForm(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    await deleteSEOApi(id);
    fetchSEO();
  };

  /* ================= TOGGLE ================= */
  const handleToggle = async (id) => {
    await toggleSEOStatusApi(id);
    fetchSEO();
  };

  /* ================= RESET ================= */
  const resetForm = () => {
    setForm({
      id: null,
      page_name: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      canonical_url: "",
      og_title: "",
      og_description: "",
      og_image: "",
      is_active: "active",
    });
  };

  return (
    <div className="text-white space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">SEO Management</h1>
          <p className="text-sm text-gray-400">
            Optimize pages for search & social sharing
          </p>
        </div>

        {form.id && (
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs">
            Editing
          </span>
        )}
      </div>

      {/* GRID */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT FORM */}
        <div className="lg:col-span-2 bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-md space-y-6">
          {/* BASIC SEO */}
          <div className="space-y-4">
            <h3 className="text-sm text-gray-400">Basic SEO</h3>

            <div>
              <label className="text-xs text-gray-400">Page Name</label>
              <input
                name="page_name"
                value={form.page_name}
                onChange={handleChange}
                className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm focus:border-[#00C2A8] outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Meta Title</label>
              <input
                name="meta_title"
                value={form.meta_title}
                onChange={handleChange}
                className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm focus:border-[#00C2A8] outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Meta Description</label>
              <textarea
                name="meta_description"
                value={form.meta_description}
                onChange={handleChange}
                className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm h-24 focus:border-[#00C2A8] outline-none"
              />
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <label className="text-xs text-gray-400">Keywords</label>
                <input
                  name="meta_keywords"
                  value={form.meta_keywords}
                  onChange={handleChange}
                  className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Canonical URL</label>
                <input
                  name="canonical_url"
                  value={form.canonical_url}
                  onChange={handleChange}
                  className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* SOCIAL */}
          <div className="space-y-4">
            <h3 className="text-sm text-gray-400">Social (OG)</h3>

            <input
              name="og_title"
              value={form.og_title}
              onChange={handleChange}
              placeholder="OG Title"
              className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />

            <input
              name="og_description"
              value={form.og_description}
              onChange={handleChange}
              placeholder="OG Description"
              className="w-full bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />

            <div className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm">
              <input type="file" onChange={handleImage} />
            </div>

            {form.og_image && (
              <img
                src={
                  typeof form.og_image === "string"
                    ? `${BASE_URL}/uploads/${form.og_image}`
                    : URL.createObjectURL(form.og_image)
                }
                className="w-40 rounded-lg border border-gray-700"
              />
            )}
            <button onClick={() => setForm({ ...form, og_image: "" })}>
              Remove Image
            </button>
          </div>

          {/* STATUS */}
          <div className="flex justify-between items-center bg-[#0B0F19] p-4 rounded-xl border border-gray-700">
            <span className="text-sm text-gray-300">SEO Status</span>

            <div
              onClick={() =>
                setForm({
                  ...form,
                  is_active:
                    form.is_active === "active" ? "inactive" : "active",
                })
              }
              className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition ${
                form.is_active === "active" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition ${
                  form.is_active === "active"
                    ? "translate-x-7"
                    : "translate-x-0"
                }`}
              />
            </div>
          </div>

          {/* ACTION */}
          <div className="flex gap-3">
            <button
              onClick={saveSEO}
              className="flex-1 bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] py-3 rounded-lg font-medium hover:opacity-90"
            >
              {form.id ? "Update SEO" : "Save SEO"}
            </button>

            {form.id && (
              <button
                onClick={resetForm}
                className="px-6 bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 h-fit shadow-md">
          <h3 className="text-sm text-gray-400 mb-3">Google Preview</h3>

          <p className="text-green-400 text-xs">
            {form.canonical_url || "www.example.com/page"}
          </p>

          <h2 className="text-blue-400 text-lg font-medium mt-1">
            {form.meta_title || "Meta Title Preview"}
          </h2>

          <p className="text-gray-400 text-sm mt-1">
            {form.meta_description || "Meta description preview..."}
          </p>
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full text-sm table-fixed">
        <thead className="bg-[#0B0F19] text-gray-400">
          <tr>
            <th className="w-1/3 p-3 text-left">Page</th>
            <th className="w-1/3 p-3 text-left">Status</th>
            <th className="w-1/3 p-3 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {seoList.map((item) => (
            <tr
              key={item.id}
              className="border-t border-gray-800 hover:bg-[#1F2937]"
            >
              <td className="w-1/3 p-3">{item.page_name}</td>

              <td className="w-1/3 p-3">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    item.is_active === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {item.is_active === "active" ? "Active" : "Inactive"}
                </span>
              </td>

              <td className="w-1/3 p-3 text-center space-x-4">
                <button
                  onClick={() => handleEdit(item)}
                  className="text-blue-400"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
