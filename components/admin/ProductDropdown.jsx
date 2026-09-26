"use client";

import { useState, useMemo } from "react";

export default function ProductDropdown({ products = [], onSelect }) {

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  const filteredProducts = useMemo(() => {

    return products
      .filter((p) => {

        const text = search.toLowerCase();

        return (
          p.id.toString().includes(text) ||
          p.name.toLowerCase().includes(text)
        );

      })
      .sort((a, b) => a.id - b.id);

  }, [products, search]);

  const handleSelect = (product) => {

    setSelected(product);
    setSearch(product.name);
    setOpen(false);

    onSelect(product.id);
  };

  return (

    <div className="border border-gray-700 rounded bg-[#0B0F19] w-full relative">

      {/* INPUT */}

      <input
        type="text"
        placeholder="Search Product ID or Name"
        className="w-full p-2 outline-none bg-[#0B0F19] text-white placeholder-gray-400"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
      />

      {/* DROPDOWN */}

      {open && (

        <div className="absolute bg-[#111827] border border-gray-700 w-full z-10 rounded-lg shadow-lg">

          {/* HEADER */}
          <div className="grid grid-cols-2 bg-[#1F2937] text-sm font-semibold p-2 border-b border-gray-700 text-gray-300">
            <div>ID</div>
            <div>Product Name</div>
          </div>

          {/* LIST */}
          <div className="max-h-40 overflow-y-auto">

            {filteredProducts.length === 0 && (
              <div className="p-2 text-gray-400">
                No products found
              </div>
            )}

            {filteredProducts.map((product) => (

              <div
                key={product.id}
                className="grid grid-cols-2 p-2 border-b border-gray-800 cursor-pointer hover:bg-[#1F2937] transition text-white"
                onClick={() => handleSelect(product)}
              >
                <div>{product.id}</div>
                <div>{product.name}</div>
              </div>

            ))}

          </div>

        </div>

      )}

    </div>

  );
}
