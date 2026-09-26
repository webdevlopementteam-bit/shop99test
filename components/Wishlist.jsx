"use client";

import { useEffect, useState } from "react";
import { getWishlistApi, removeWishlistApi, BASE_URL } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { countProductVariantsInPayload } from "@/lib/productVariants";
import { getProductDisplayPricing } from "@/lib/productPricing";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const { addToCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    // 🔥 If not logged in → redirect immediately
    if (!token) {
      toast.warning("Please login first ❤️");
      router.push("/login");
      return;
    }

    const loadWishlist = async () => {
      try {
        const data = await getWishlistApi();
        setWishlist(data);
      } catch (err) {
        console.log("Wishlist error:", err);
        toast.error("Failed to load wishlist");
      }
    };

    loadWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await removeWishlistApi(productId);

      setWishlist((prev) => prev.filter((item) => item.ProductId !== productId));

      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error("Remove failed", err);
    }
  };

  const moveAllToCart = () => {
    let skipped = 0;
    wishlist.forEach((item) => {
      const p = item.Product;
      if (countProductVariantsInPayload(p) > 1) {
        skipped += 1;
        return;
      }
      const pricing = getProductDisplayPricing(p);
      addToCart({
        ...p,
        price: pricing.finalPrice,
      });
    });
    if (skipped > 0) {
      toast.info(`${skipped} product(s) skip — multi-variant ke liye product page se add karen`);
    }
    toast.success("Items moved to cart 🛒");
  };

  return (
    <section className="px-4 sm:px-6 lg:px-16 py-10 sm:py-14 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">My Wishlist ❤️</h2>

        {wishlist.length > 0 && (
          <button
            onClick={moveAllToCart}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 transition text-white px-6 py-2 rounded-lg"
          >
            Move All To Cart
          </button>
        )}
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center text-gray-500 text-base sm:text-lg mt-20">Your wishlist is empty ❤️</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {wishlist.map((item) => {
            const product = item.Product;
            const pricing = getProductDisplayPricing(product);

            const imageUrl = product?.image ? `${BASE_URL}/uploads/${product.image}` : "/no-image.png";

            return (
              <div key={product.id} className="bg-white p-4 sm:p-6 rounded-xl shadow hover:shadow-lg transition duration-300 flex flex-col">
                {/* Product Image */}
                <div className="h-40 sm:h-44 flex items-center justify-center mb-4">
                  <img src={imageUrl} className="max-h-full object-contain" alt={product.name} />
                </div>

                {/* Product Info */}
                <h4 className="font-semibold mb-2 line-clamp-2 text-sm sm:text-base">{product.name}</h4>

                <div className="mb-4 flex items-center gap-2 text-sm sm:text-base">
                  {pricing.hasDiscount && pricing.oldPrice != null && (
                    <span className="text-gray-400 line-through">₹{pricing.oldPrice.toFixed(2)}</span>
                  )}
                  <span className="text-red-500 font-bold">₹{pricing.finalPrice.toFixed(2)}</span>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                  <button
                    onClick={() => router.push(`/productPage/${product.slug || product.id}`)}
                    className="flex-1 bg-primaryColor hover:opacity-90 transition text-white py-2 rounded-lg text-sm sm:text-base"
                  >
                    View
                  </button>

                  <button
                    onClick={() => {
                      if (countProductVariantsInPayload(product) > 1) {
                        router.push(`/productPage/${product.slug || product.id}`);
                        toast.info("Please select a product variant first. The price will be saved according to the selected variant.");
                        return;
                      }
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: pricing.finalPrice,
                        image: product.image
                          ? product.image.startsWith("http")
                            ? product.image
                            : `${BASE_URL}/uploads/${product.image}`
                          : "/no-image.png",
                        qty: 1,
                      });
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 transition text-white py-2 rounded-lg text-sm sm:text-base"
                  >
                    Add To Cart
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(product.id)}
                  className="mt-4 w-full bg-red-500 hover:bg-red-600 transition text-white py-2 rounded-lg text-sm sm:text-base"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
