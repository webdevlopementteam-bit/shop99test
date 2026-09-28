"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Pagination from "@/components/Pagination";
import { BASE_URL, getMostSellingProductsApi, addToWishlistApi, getWishlistApi } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { countProductVariantsInPayload } from "@/lib/productVariants";
import { getProductCategoryLabel } from "@/lib/productCategory";
import { getProductDisplayPricing } from "@/lib/productPricing";
import { getUserToken } from "@/lib/authSession";

const PER_PAGE = 20;

function resolveImage(item) {
  const raw = item?.image ?? item?.thumbnail ?? "";
  const cleaned = String(raw).trim();
  if (!cleaned) return "/no-image.png";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  const withoutLeadingSlash = cleaned.replace(/^\/+/, "");
  if (withoutLeadingSlash.startsWith("uploads/")) return `${BASE_URL}/${withoutLeadingSlash}`;
  return `${BASE_URL}/uploads/${withoutLeadingSlash}`;
}

export default function MostSellingProducts() {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { addToCart } = useCart();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMostSellingProductsApi();
        setProducts(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Failed to load most selling products", err);
        setProducts([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadWishlist = async () => {
      const token = getUserToken();
      if (!token) {
        const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist") || "[]");
        setWishlistIds(Array.isArray(guestWishlist) ? guestWishlist : []);
        return;
      }
      try {
        const data = await getWishlistApi();
        const ids = (Array.isArray(data) ? data : []).map((item) => item.ProductId ?? item.product_id);
        setWishlistIds(ids.filter(Boolean));
      } catch (err) {
        console.log("Wishlist load error", err);
      }
    };
    loadWishlist();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [products.length]);

  const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const paginated = products.slice(start, start + PER_PAGE);

  const toggleWishlist = async (productId) => {
    const token = getUserToken();
    if (wishlistIds.includes(productId)) {
      toast.info("Already in wishlist ❤️");
      return;
    }
    try {
      if (token) {
        await addToWishlistApi({ productId });
      } else {
        const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist") || "[]");
        guestWishlist.push(productId);
        localStorage.setItem("guestWishlist", JSON.stringify(guestWishlist));
      }
      setWishlistIds((prev) => [...prev, productId]);
      toast.success("Added to wishlist ❤️");
    } catch (err) {
      toast.error("Wishlist action failed");
      console.error(err);
    }
  };

  const handleAddToCart = (item) => {
    const imageUrl = resolveImage(item);
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
    <>
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-24 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Most Selling Products</h1>
            <p className="text-sm text-gray-500 mt-1">Admin curated best selling collection</p>
          </div>
          <p className="text-sm text-gray-500">Total: {products.length}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {paginated.length > 0 ? (
            paginated.map((item) => {
              const imageUrl = resolveImage(item);
              const pricing = getProductDisplayPricing(item);
              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/productPage/${item.slug || item.id}`)}
                  className="group bg-white border rounded-xl p-4 cursor-pointer hover:shadow-lg transition"
                >
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt={item.name}
                      className="h-36 w-full object-contain transition duration-300 group-hover:opacity-30"
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex gap-2 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(imageUrl);
                        }}
                        className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(item.id);
                        }}
                        className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                      >
                        <i className={`fa-heart ${wishlistIds.includes(item.id) ? "fa-solid text-red-500" : "fa-regular"}`}></i>
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs mt-3">{getProductCategoryLabel(item) || "Category"}</p>
                  <h3 className="font-semibold text-sm line-clamp-2 mt-1">{item.name}</h3>
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    {pricing.hasDiscount && pricing.oldPrice != null && (
                      <del className="text-gray-400 text-sm">₹{pricing.oldPrice.toFixed(2)}</del>
                    )}
                    <span className="text-red-500 font-bold">₹{pricing.finalPrice.toFixed(2)}</span>
                    {pricing.hasDiscount && pricing.discountPercent > 0 && (
                      <span className="text-xs font-medium text-green-600">{pricing.discountPercent}% OFF</span>
                    )}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(item);
                    }}
                    disabled={!item.in_stock}
                    className={`mt-3 w-full py-2 rounded-lg text-sm font-semibold ${
                      item.in_stock ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {item.in_stock ? "Add to Cart" : "Out of Stock"}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="col-span-4 text-center text-gray-500 py-12">No products selected by admin yet.</div>
          )}
        </div>

        <div className="mt-8">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </section>

      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}
