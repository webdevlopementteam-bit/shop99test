"use client";

import { useEffect, useState } from "react";
import { getBrandsApi, BASE_URL } from "@/lib/api";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";

const brandBanner = "/assets/brands/brand-banner.png";

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await getBrandsApi();
      setBrands(Array.isArray(res) ? [...res].reverse() : []);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl shadow-xl">
          <img src={brandBanner} alt="Brands Banner" className="h-48 w-full object-cover md:h-64" />

          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/20" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <h2 className="text-3xl font-extrabold md:text-5xl">All Brands</h2>

            <div className="mt-4 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-md md:text-base">
              <div onClick={() => router.push("/")} className="flex cursor-pointer items-center gap-1 transition hover:text-gray-200">
                <Home size={16} />
                <span>Home</span>
              </div>

              <span className="text-white/70">/</span>
              <span className="font-semibold">Brands</span>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">Explore collections</p>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Shop By Brands</h1>
          </div>

          <p className="w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
            Total Brands:
            <span className="ml-2 text-blue-600">{brands.length}</span>
          </p>
        </div>

        {/* Grid */}
        {brands.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-500">No brands found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand) => (
              <div
                key={brand.id}
                onClick={() => router.push(`/shop?brand=${encodeURIComponent(brand.id)}`)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative z-10 p-4 sm:p-5">
                  <div className="flex h-24 w-full items-center justify-center rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 transition-all duration-300 group-hover:border-blue-200 group-hover:bg-blue-50/40 sm:h-28 lg:h-32">
                    {brand.image ? (
                      <img
                        src={`${BASE_URL}/uploads/${brand.image}`}
                        alt={brand.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <p className="line-clamp-2 text-center text-sm font-bold text-gray-700">{brand.name}</p>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-1 text-center text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-blue-600">
                    {brand.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
