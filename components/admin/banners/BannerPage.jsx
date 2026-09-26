"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import Pagination from "@/components/admin/Pagination";
import { BASE_URL } from "@/lib/adminApi";

function ProductDropdown({ products, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = products.find((p) => String(p.id) === String(value));

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (id) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-[#0B0F19] border border-gray-700 p-2 rounded cursor-pointer"
      >
        {!query && selected && (
          <span className="flex-1 text-sm text-white truncate pointer-events-none">
            {selected.name}
          </span>
        )}
        <input
          type="text"
          placeholder={selected ? "" : "Select product..."}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-transparent outline-none text-sm text-white placeholder-gray-400 min-w-0 ${
            !query && selected ? "w-0 absolute" : "flex-1"
          }`}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-white text-xs px-1 shrink-0"
          >
            ✕
          </button>
        )}
        <span className="text-gray-400 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1F2937] border border-gray-700 rounded max-h-52 overflow-y-auto shadow-xl">
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search product..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full bg-[#0B0F19] border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-400 outline-none"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-400">No products found</div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                onMouseDown={() => handleSelect(p.id)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-[#374151] ${
                  String(p.id) === String(value) ? "text-teal-400" : "text-gray-200"
                }`}
              >
                {p.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const BannerPage = () => {

  // ================= STATE =================
  const [banners, setBanners] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 5;

  const [form, setForm] = useState({
    id: null,
    title: "",
    subtitle: "",
    image: null,
    background: null,
    product_id: ""
  });

  const [products, setProducts] = useState([]);

  const [preview, setPreview] = useState({ image: null, background: null });

  // ================= FETCH =================
  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/banners`);
      setBanners(res.data);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/products`, {
        params: { page: 1, limit: 1000 }
      });
      setProducts(res.data?.data || []);
    } catch (error) {
      console.error("Product fetch error:", error);
      setProducts([]);
    }
  };

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/banners`);
        setBanners(res.data);
      } catch (error) {
        console.error(error);
      }
    };

    loadBanners();
    fetchProducts();
  }, []);

  // ================= FILTER (NO EFFECT) =================
  const filtered = useMemo(() => {
    return banners.filter((b) =>
      b.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, banners]);

  // ================= PAGINATION =================
  const totalPages = Math.ceil(filtered.length / limit);
  const start = (page - 1) * limit;
  const currentData = filtered.slice(start, start + limit);

  // ================= HANDLE INPUT =================
  const handleChange = (e) => {
    if (e.target.name === "image" || e.target.name === "background") {
      const file = e.target.files[0];
      setForm({ ...form, [e.target.name]: file });

      if (file) {
        const objectUrl = URL.createObjectURL(file);
        setPreview((prev) => ({ ...prev, [e.target.name]: objectUrl }));
      }
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  // ================= CREATE / UPDATE =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("subtitle", form.subtitle);
      formData.append("product_id", form.product_id);

      if (form.image) {
        formData.append("image", form.image);
      }
      if (form.background) {
        formData.append("background", form.background);
      }

      if (form.id) {
        await axios.put(
          `${BASE_URL}/api/banners/${form.id}`,
          formData
        );
      } else {
        await axios.post(`${BASE_URL}/api/banners`, formData);
      }

      resetForm();
      fetchBanners();
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  // ================= EDIT =================
  const handleEdit = (item) => {
    setForm({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      image: null,
      background: null,
      product_id: item.product_id || ""
    });

    setPreview({
      image: item?.image ? `${BASE_URL}/uploads/${item.image}` : null,
      background: item?.background ? `${BASE_URL}/uploads/${item.background}` : null
    });
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner?")) return;

    try {
      await axios.delete(`${BASE_URL}/api/banners/${id}`);
      fetchBanners();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // ================= RESET =================
  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      subtitle: "",
      image: null,
      background: null,
      product_id: ""
    });
    setPreview({ image: null, background: null });
  };

  // ================= SEARCH CHANGE =================
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="text-white">

      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Banner Management</h2>
        <p className="text-sm text-gray-400">
          Manage homepage banners
        </p>
      </div>

      {/* FORM CARD */}
      <div className="bg-[#111827] p-6 rounded-xl mb-8">

        <h3 className="text-lg font-semibold mb-4">
          {form.id ? "Edit Banner" : "Add Banner"}
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* TITLE */}
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleChange}
            className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
            required
          />

          {/* SUBTITLE */}
          <input
            type="text"
            name="subtitle"
            placeholder="Subtitle"
            value={form.subtitle}
            onChange={handleChange}
            className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
            required
          />

          {/* PRODUCT DROPDOWN */}
          <ProductDropdown
            products={products}
            value={form.product_id}
            onChange={(id) => setForm({ ...form, product_id: id })}
          />

          {/* IMAGE */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Upload Banner Image</label>
            <input
              type="file"
              name="image"
              onChange={handleChange}
              className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
            />
          </div>

          {/* BACKGROUND */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Upload Background Image</label>
            <input
              type="file"
              name="background"
              onChange={handleChange}
              className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
            />
          </div>

          {/* PREVIEW */}
          {(preview.image || preview.background) && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-400 mb-2">Preview</p>
              <div className="flex flex-wrap gap-3">
                {preview.image && (
                  <img
                    src={preview.image}
                    alt="banner preview"
                    className="w-48 h-28 object-cover rounded border border-gray-700"
                  />
                )}
                {preview.background && (
                  <img
                    src={preview.background}
                    alt="background preview"
                    className="w-48 h-28 object-cover rounded border border-gray-700"
                  />
                )}
              </div>
            </div>
          )}

          {/* BUTTONS */}
          <div className="md:col-span-3 flex gap-3 mt-2">
            <button
              type="submit"
              className="bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-6 py-2 rounded font-medium"
            >
              {form.id ? "Update Banner" : "Add Banner"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 px-6 py-2 rounded"
              >
                Cancel
              </button>
            )}
          </div>

        </form>
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={handleSearch}
          className="bg-[#111827] border border-gray-700 p-2 rounded w-full max-w-sm"
        />
      </div>

      {/* TABLE */}
      <div className="bg-[#111827] rounded-xl shadow-lg overflow-hidden">

        <table className="w-full text-sm">

          {/* HEADER */}
          <thead className="border-b border-gray-700 text-gray-400">
            <tr>
              <th className="p-3 text-left">Banner</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Subtitle</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {currentData.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-800 hover:bg-[#1F2937]"
              >

                {/* IMAGE + TITLE */}
                <td className="p-3 flex items-center gap-3">
                  <img
                    src={`${BASE_URL}/uploads/${item.image}`}
                    alt=""
                    className="w-20 h-12 object-cover rounded"
                  />
                  <span className="text-gray-300">{item.title}</span>
                </td>

                <td className="p-3">{item.title}</td>

                <td className="p-3 text-gray-400">
                  {item.subtitle}
                </td>

                {/* ACTION */}
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">

                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-md"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500/20 text-red-400 px-3 py-1 rounded-md"
                    >
                      Delete
                    </button>

                  </div>
                </td>

              </tr>
            ))}

            {currentData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center p-6 text-gray-400">
                  No banners found
                </td>
              </tr>
            )}
          </tbody>

        </table>

        {/* PAGINATION */}
        <div className="p-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

      </div>
    </div>
  );
};

export default BannerPage;
