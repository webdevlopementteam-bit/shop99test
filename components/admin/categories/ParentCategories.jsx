"use client";

import { useEffect, useState } from "react";
import {
  getParentCategoriesApi,
  createCategoryApi,
  deleteCategoryApi,
  updateCategoryApi
} from "@/lib/adminApi";

export default function ParentCategories() {

  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getParentCategoriesApi();
    setList(data || []);
  };

  /* ADD / UPDATE */
  const save = async () => {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("is_parent", true);

    if (editId)
      await updateCategoryApi(editId, fd);
    else
      await createCategoryApi(fd);

    setName("");
    setEditId(null);
    load();
  };

  const edit = (row) => {
    setName(row.name);
    setEditId(row.id);
  };

  const remove = async (id) => {
    await deleteCategoryApi(id);
    load();
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <h2 className="text-2xl font-bold text-primaryColor mb-6">
        Parent Categories
      </h2>

      {/* FORM */}
      <div className="flex gap-3 mb-6">
        <input
          className="border p-2 rounded flex-1"
          placeholder="Parent category name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />

        <button
          onClick={save}
          className="bg-secondaryColor text-white px-4 rounded"
        >
          {editId ? "Update" : "Add"}
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-xl overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-primaryColor text-white">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {(list || []).map((p) => (
              <tr key={p.id} className="border-t">

                <td className="p-3">{p.name}</td>

                <td className="p-3 text-center space-x-2">

                  <button
                    onClick={()=>edit(p)}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={()=>remove(p.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>
    </div>
  );
}
