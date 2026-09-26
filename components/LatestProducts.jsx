"use client";

import { useEffect, useState } from "react";
import { getLatestProductsApi, BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { countProductVariantsInPayload } from "@/lib/productVariants";
import { getProductCategoryLabel } from "@/lib/productCategory";
import { getProductDisplayPricing } from "@/lib/productPricing";

function getResolvedProductImage(item) {
  const raw = item?.image ?? item?.Product?.image ?? item?.product?.image ?? item?.thumbnail ?? "";

  const cleaned = String(raw).trim();
  if (!cleaned) return "/no-image.png";

  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  const withoutLeadingSlash = cleaned.replace(/^\/+/, "");
  if (withoutLeadingSlash.startsWith("uploads/")) {
    return `${BASE_URL}/${withoutLeadingSlash}`;
  }

  return `${BASE_URL}/uploads/${withoutLeadingSlash}`;
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function toValidRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 5) return null;
  return n;
}

function toValidCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function getProductRatingMeta(item) {
  const ratingCandidates = [item?.avg_rating, item?.average_rating, item?.rating_avg, item?.ratingAverage, item?.rating];
  const countCandidates = [
    item?.rating_count,
    item?.ratings_count,
    item?.review_count,
    item?.reviews_count,
    item?.total_reviews,
  ];

  let average = ratingCandidates.map(toValidRating).find((v) => v != null) ?? 0;
  let count = countCandidates.map(toValidCount).find((v) => v != null) ?? 0;

  const reviews = Array.isArray(item?.reviews) ? item.reviews : [];
  if (!count && reviews.length) {
    const ratings = reviews.map((r) => toValidRating(r?.rating)).filter((n) => n != null);
    if (ratings.length) {
      const sum = ratings.reduce((a, b) => a + b, 0);
      average = sum / ratings.length;
      count = ratings.length;
    }
  }

  return { average, count };
}

function renderRatingStars(average) {
  const full = Math.floor(average);
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < full ? "text-yellow-400" : "text-gray-300"} aria-hidden="true">
      ★
    </span>
  ));
}

export default function LatestProducts({ products: productsFromParent, setPreviewImage, toggleWishlist, wishlistIds = [] }) {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const { addToCart } = useCart();
  const router = useRouter();

  /* ================= LOAD LATEST PRODUCTS ================= */
  useEffect(() => {
    if (productsFromParent !== undefined) {
      setProducts(Array.isArray(productsFromParent) ? productsFromParent : []);
      return;
    }
    const load = async () => {
      try {
        const res = await getLatestProductsApi();
        setProducts(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Failed to load latest products", err);
        setProducts([]);
      }
    };

    load();
  }, [productsFromParent]);

  useEffect(() => {
    if (activeTab === "All") return;
    const labels = products.map((p) => getProductCategoryLabel(p)).filter(Boolean);
    if (!labels.includes(activeTab)) setActiveTab("All");
  }, [products, activeTab]);

  /* ================= DYNAMIC TABS ================= */
  const categoryNames = [...new Set(products.map((p) => getProductCategoryLabel(p)).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const categories = ["All", ...categoryNames];

  /* ================= FILTER LOGIC ================= */
  const filtered = activeTab === "All" ? products : products.filter((p) => getProductCategoryLabel(p) === activeTab);

  const handleAddToCart = (item) => {
    const imageUrl = getResolvedProductImage(item);
    const pricing = getProductDisplayPricing(item);

    if (countProductVariantsInPayload(item) > 1) {
      router.push(`/productPage/${item.slug || item.id}`);
      toast.info("Please select a product variant first. The price will be saved according to the selected variant.");
      return;
    }

    addToCart({
      id: item.id,
      name: item.name,
      price: pricing.finalPrice,
      image: imageUrl,
    });

    toast.success("Product added to cart 🛒");
  };
  return (
    <section className="mt-24 px-4 sm:px-8 lg:px-24">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
        <h2 className="text-3xl font-semibold">Latest Products</h2>

        <div className="flex gap-6 font-semibold overflow-x-auto whitespace-nowrap scrollbar-hide">
          {categories.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 border-b-2 transition ${
                activeTab === tab ? "border-orange-500 text-orange-500" : "border-transparent text-gray-600 hover:text-orange-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ================= GRID ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filtered.map((item) => {
          const imageUrl = getResolvedProductImage(item);
          const rating = getProductRatingMeta(item);

          const pricing = getProductDisplayPricing(item);

          /* Badge Logic */
          let badge = null;
          if (item.is_popular) badge = "Popular";
          else if (pricing.hasDiscount) badge = "Sale";
          else badge = "New";

          return (
            <div
              key={item.id}
              onClick={() => router.push(`/productPage/${item.slug || item.id}`)}
              className="group cursor-pointer bg-white border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 relative overflow-hidden hover:shadow-xl transition h-full"
            >
              {/* IMAGE AREA */}
              <div className="relative w-full sm:w-32 h-40 sm:h-32 shrink-0 flex items-center justify-center overflow-hidden">
                {badge && (
                  <span
                    className={`absolute top-0 left-0 text-xs px-3 py-1 rounded text-white z-10 ${
                      badge === "Sale" ? "bg-red-500" : badge === "New" ? "bg-green-500" : "bg-orange-500"
                    }`}
                  >
                    {badge}
                  </span>
                )}

                <img
                  src={imageUrl}
                  alt={item.name}
                  className="h-32 sm:h-28 w-full object-contain transition-all duration-500 group-hover:opacity-30"
                  onError={(e) => {
                    e.currentTarget.src = "/no-image.png";
                  }}
                />

                {/* Hover Icons */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-3
                  opacity-0 translate-y-6 group-hover:opacity-100 group-hover:translate-y-0
                  transition duration-300 z-10"
                >
                  {/* PREVIEW */}
                  <button
                    className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setPreviewImage) {
                        setPreviewImage(imageUrl);
                      }
                    }}
                  >
                    <i className="fa-solid fa-eye"></i>
                  </button>

                  {/* WISHLIST */}
                  <button
                    className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (toggleWishlist) {
                        toggleWishlist(item.id);
                      }
                    }}
                  >
                    <i
                      className={`fa-heart ${wishlistIds?.includes(item.id) ? "fa-solid text-red-500" : "fa-regular"}`}
                    ></i>
                  </button>
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex-1 min-w-0 flex flex-col">
                <h4 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[40px]">{item.name}</h4>

                <div
                  className="flex items-center gap-1 text-sm mt-2"
                  aria-label={`${rating.average.toFixed(1)} out of 5 stars from ${rating.count} ratings`}
                >
                  {renderRatingStars(rating.average)}
                  <span className="text-gray-500 ml-1">
                    {rating.average.toFixed(1)} ({rating.count})
                  </span>
                </div>

                <div className="mt-2 min-h-[28px] flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {pricing.hasDiscount && pricing.oldPrice != null && (
                    <span className="text-sm text-gray-400 line-through whitespace-nowrap">
                      ₹{formatPrice(pricing.oldPrice)}
                    </span>
                  )}
                  <span className="text-red-500 font-bold whitespace-nowrap">₹{formatPrice(pricing.finalPrice)}</span>
                  {pricing.hasDiscount && pricing.discountPercent > 0 && (
                    <span className="text-xs font-medium text-green-600 whitespace-nowrap">
                      {Math.round(pricing.discountPercent)}% OFF
                    </span>
                  )}
                </div>

                {item.in_stock ? (
                  <button
                    onClick={() =>
                      handleAddToCart({
                        ...item,
                        price: pricing.finalPrice,
                      })
                    }
                    className="mt-3 text-gray-700 font-medium flex items-center gap-2 hover:text-orange-500 transition"
                  >
                    Add to Cart
                    <i className="fa-solid fa-arrow-right"></i>
                  </button>
                ) : (
                  <button disabled className="mt-3 text-gray-400 font-medium flex items-center gap-2 cursor-not-allowed">
                    Out of Stock
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
