"use client";

import { useRouter } from "next/navigation";
import { BASE_URL } from "@/lib/api";

const CategoryCard = ({ data }) => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/categories/${data.slug}`)}
      className="
        bg-white
        rounded-2xl
        p-6
        text-center
        border
        hover:shadow-xl
        hover:-translate-y-1
        transition
        duration-300
        cursor-pointer
      "
    >
      {data.image && String(data.image).trim() !== "" ? (
        <img
          src={`${BASE_URL}/uploads/${data.image}`}
          alt={data.name}
          className="h-28 mx-auto object-contain mb-4"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}

      <h3 className={`font-semibold mb-2 ${!data.image || String(data.image).trim() === "" ? "text-xl py-2" : "text-lg"}`}>
        {data.name}
      </h3>

      <p className="text-gray-500 text-sm">{data.description}</p>
    </div>
  );
};

export default CategoryCard;
