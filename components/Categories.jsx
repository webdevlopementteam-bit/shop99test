"use client";

import { useEffect, useState } from "react";
import { getCategories } from "@/lib/categoryService";
import CategoryCard from "@/components/CategoryCard";

const Categories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getCategories();
    setCategories(data);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Heading */}
        <h2 className="text-3xl font-bold mb-10">Shop by Categories</h2>

        {/* Grid */}
        <div
          className="
            grid
            gap-6
            grid-cols-1
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
          "
        >
          {categories?.map((cat) => (
            <CategoryCard key={cat.id} data={cat} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
