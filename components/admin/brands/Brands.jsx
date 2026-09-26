"use client";

import { useEffect, useState } from "react";
import {
  getBrandsApi,
  createBrandApi,
  updateBrandApi,
  deleteBrandApi,
  BASE_URL,
} from "@/lib/adminApi";

export default function Brands() {

  const [brands, setBrands] = useState([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [editPreview, setEditPreview] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  /* ================= LOAD ================= */
  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    const data = await getBrandsApi();
    setBrands(data);
  };

  /* ================= FILE ================= */
  const handleFile = (e) => {
    const file = e.target.files[0];

    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {

    if (!name) {
      alert("Brand name required");
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("name", name);
      if (image) fd.append("image", image);

      await createBrandApi(fd);

      setName("");
      setImage(null);
      setPreview(null);

      loadBrands();

    } catch (err) {
      console.error(err);
      alert("Create failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {

    if (!window.confirm("Delete this brand?")) return;

    await deleteBrandApi(id);
    loadBrands();
  };

  /* ================= EDIT ================= */
  const startEdit = (brand) => {
    setEditId(brand.id);
    setEditName(brand.name || "");
    setEditImage(null);
    setEditPreview(brand.image ? `${BASE_URL}/uploads/${brand.image}` : "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditImage(null);
    setEditPreview("");
  };

  const handleEditFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditImage(file);
    setEditPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!String(editName).trim()) {
      alert("Brand name required");
      return;
    }
    try {
      setEditLoading(true);
      const fd = new FormData();
      fd.append("name", editName.trim());
      if (editImage) fd.append("image", editImage);
      await updateBrandApi(editId, fd);
      await loadBrands();
      cancelEdit();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setEditLoading(false);
    }
  };

  /* ================= UI ================= */
return (
  <div className="text-white">

    {/* HEADER */}
    <div className="mb-6">
      <h2 className="text-xl font-semibold">Brands</h2>
      <p className="text-sm text-gray-400">
        Manage your product brands
      </p>
    </div>

    {/* ADD BRAND CARD */}
    <div className="bg-[#111827] p-6 rounded-xl shadow mb-8">

      <h3 className="mb-4 font-semibold">Add New Brand</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* NAME */}
        <input
          type="text"
          placeholder="Brand Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
        />

        {/* FILE */}
        <input
          type="file"
          onChange={handleFile}
          className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
        />

        {/* BUTTON */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] rounded text-sm font-medium"
        >
          {loading ? "Saving..." : "+ Add Brand"}
        </button>

      </div>

      {/* PREVIEW */}
      {preview && (
        <div className="mt-4">
          <p className="text-sm text-gray-400 mb-2">Preview</p>
          <img
            src={preview}
            alt="Preview"
            className="w-20 h-20 object-contain bg-white rounded p-2"
          />
        </div>
      )}
    </div>

    {/* BRAND LIST */}
    <div className="bg-[#111827] rounded-xl shadow-lg overflow-x-auto">

      <table className="w-full text-sm">

        {/* THEAD */}
        <thead className="border-b border-gray-700 text-gray-400">
          <tr>
            <th className="p-3 text-left">Brand</th>
            <th className="p-3 text-center">Action</th>
          </tr>
        </thead>

        {/* TBODY */}
        <tbody>
          {brands.length === 0 ? (
            <tr>
              <td colSpan="2" className="text-center p-6 text-gray-400">
                No brands found
              </td>
            </tr>
          ) : (
            brands.map((b) => (
              <tr
                key={b.id}
                className="border-b border-gray-800 hover:bg-[#1F2937] transition"
              >

                {/* BRAND INFO */}
                <td className="p-3">
                  {editId === b.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {editPreview ? (
                          <img
                            src={editPreview}
                            className="w-10 h-10 object-contain bg-white rounded p-1"
                          />
                        ) : null}
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-[#0B0F19] border border-gray-700 p-2 rounded w-full"
                          placeholder="Brand name"
                        />
                      </div>
                      <input
                        type="file"
                        onChange={handleEditFile}
                        className="bg-[#0B0F19] border border-gray-700 p-2 rounded w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {b.image && (
                        <img
                          src={`${BASE_URL}/uploads/${b.image}`}
                          className="w-10 h-10 object-contain bg-white rounded p-1"
                        />
                      )}
                      <span className="font-medium">{b.name}</span>
                    </div>
                  )}
                </td>

                {/* ACTION */}
                <td className="p-3 text-center">
                  {editId === b.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleUpdate}
                        disabled={editLoading}
                        className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md hover:bg-emerald-500/30 disabled:opacity-60"
                      >
                        {editLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={editLoading}
                        className="bg-gray-500/20 text-gray-300 px-3 py-1 rounded-md hover:bg-gray-500/30"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => startEdit(b)}
                        className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md hover:bg-blue-500/30"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="bg-red-500/20 text-red-400 px-3 py-1 rounded-md hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  )}
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
