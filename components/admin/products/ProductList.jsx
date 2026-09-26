"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductsApi, deleteProductApi, BASE_URL } from "@/lib/adminApi";

export default function ProductList() {
  const router = useRouter();
  const [products, setProducts] = useState([]);

  const load = async () => {
    const data = await getProductsApi();
    setProducts(data);
  };

  useEffect(() => {
     const load = async () => {
    const data = await getProductsApi();
    setProducts(data);
  };
    load();
  }, []);

  const remove = async (id) => {
    await deleteProductApi(id);
    load();
  };

  return (
    <div>

      {/* Header */}
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">Products</h2>

        <button
          onClick={() => router.push("/admin/products/add")}
          className="bg-secondaryColor text-white px-4 py-2 rounded"
        >
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-xl overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-primaryColor text-white">
            <tr>
              <th className="p-3 text-left">Image</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t">

                <td className="p-3">
                    <img
                      src={`${BASE_URL}/uploads/${p.image}`}
                      className="w-12 h-12 object-contain"
                    />
                </td>

                <td
                  className="p-3 font-mono text-sm"
                  title={p.name || undefined}
                >
                  {p.sku != null && String(p.sku).trim() !== ""
                    ? String(p.sku).trim()
                    : "—"}
                </td>
                <td className="p-3 text-center">
                    {p.Category?.name || "-"}
                  </td>
               <td className="p-3 text-center">
                  {p.Brand?.name || "-"}
                </td>

                <td className="p-3 space-x-2">
                  <button
                    onClick={() => remove(p.id)}
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
