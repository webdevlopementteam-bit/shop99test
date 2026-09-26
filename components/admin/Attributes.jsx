"use client";

import { useEffect, useState } from "react";
import {
  getAttributesApi,
  createAttributeApi,
  updateAttributeApi,
  deleteAttributeApi,
} from "@/lib/adminApi";

import { FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

export default function Attributes() {
  const [attributes, setAttributes] = useState([]);
  const [name, setName] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  /* ================= FETCH ================= */
  const fetchData = async () => {
    try {
      const res = await getAttributesApi();
      setAttributes(res || []);
    } catch {
      toast.error("Failed to load attributes");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= ADD ================= */
  const handleAdd = async () => {
    if (!name.trim()) {
      toast.warning("Please enter attribute name");
      return;
    }

    try {
      await createAttributeApi({
        name,
        is_published: false,
        variants: [],
      });

      setName("");
      fetchData();

      toast.success("Attribute added ✅");
    } catch {
      toast.error("Add failed ❌");
    }
  };

  /* ================= TOGGLE ================= */
  const togglePublish = async (attr) => {
    try {
      await updateAttributeApi(attr.id, {
        name: attr.name,
        is_published: !attr.is_published,
      });

      fetchData();
    } catch {
      toast.error("Update failed ❌");
    }
  };

  /* ================= OPEN EDIT ================= */
  const openEdit = (attr) => {
    setEditData({ ...attr });
    setEditOpen(true);
  };

  /* ================= SAVE EDIT ================= */
  const handleEditSave = async () => {
    try {
      await updateAttributeApi(editData.id, {
        name: editData.name,
        is_published: editData.is_published,
      });

      setEditOpen(false);
      fetchData();

      toast.success("Updated successfully ✏️");
    } catch {
      toast.error("Update failed ❌");
    }
  };

  /* ================= DELETE ================= */
  const confirmDelete = async () => {
    try {
      await deleteAttributeApi(deleteId);
      fetchData();
      toast.success("Deleted successfully 🗑");
    } catch {
      toast.error("Delete failed ❌");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 text-white bg-[#0B0F19] min-h-screen">
      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-3xl font-semibold">Attributes</h2>
        <p className="text-sm text-gray-400">
          Create attribute names only. Values (variants) are set per product in
          Products → Add/Edit.
        </p>
      </div>

      {/* ADD */}
      <div className="bg-[#111827] p-5 rounded-xl mb-6 shadow-md">
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter attribute name (e.g. Color, Size)..."
            className="flex-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg"
          />

          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-[#00C2A8]/20 to-[#00A8FF]/20 text-[#00C2A8] px-6 py-2 rounded-lg"
          >
            Add
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#111827] rounded-xl overflow-hidden shadow-md">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-[#00C2A8]/20 to-[#00A8FF]/20 text-[#00C2A8]">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-center">Published</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {attributes.length > 0 ? (
              attributes.map((attr, index) => (
                <tr key={attr.id} className="border-b border-gray-800">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{attr.name}</td>

                  <td className="text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attr.is_published}
                        onChange={() => togglePublish(attr)}
                        className="sr-only peer"
                      />

                      <div
                        className="w-11 h-6 bg-gray-600 rounded-full peer
                            peer-checked:bg-[#00C2A8]
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                            after:bg-white after:rounded-full after:h-5 after:w-5
                            after:transition-all
                            peer-checked:after:translate-x-full"
                      />
                    </label>
                  </td>

                  <td className="p-3 flex justify-center gap-3">
                    <button
                      onClick={() => openEdit(attr)}
                      className="bg-yellow-500 p-2 rounded"
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={() => setDeleteId(attr.id)}
                      className="bg-red-500 p-2 rounded"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-6 text-gray-400">
                  No attributes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT DRAWER */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="w-[350px] bg-[#111827] p-6 h-full">
            <h3 className="text-xl mb-4">Edit Attribute</h3>

            <input
              value={editData?.name || ""}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
              className="w-full bg-[#0B0F19] border p-3 rounded mb-3"
            />

            <label className="flex items-center gap-2 text-sm text-gray-300 mb-6">
              <input
                type="checkbox"
                checked={!!editData?.is_published}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    is_published: e.target.checked,
                  })
                }
              />
              Published
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleEditSave}
                className="bg-green-500 px-4 py-2 rounded"
              >
                Save
              </button>

              <button
                onClick={() => setEditOpen(false)}
                className="bg-gray-600 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] p-6 rounded-xl w-[320px] text-center">
            <h3 className="text-lg font-semibold mb-2">Delete Attribute</h3>

            <p className="text-gray-400 mb-5 text-sm">
              Are you sure you want to delete this attribute?
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
              >
                Yes, Delete
              </button>

              <button
                onClick={() => setDeleteId(null)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
