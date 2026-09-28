"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BASE_URL, getDealsProductsApi, getWishlistApi, addToWishlistApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { toast } from "react-toastify";
import { Home, Sparkles } from "lucide-react";
import { countProductVariantsInPayload } from "@/lib/productVariants";
import { getProductDisplayPricing } from "@/lib/productPricing";
import { setNavState } from "@/lib/navState";
import { getUserToken } from "@/lib/authSession";

const dealsBanner = "/assets/banner/banner-3.png";

const PREVIEW_COUNT = 4;

export default function DealsPage({
  embedded = false,
  toggleWishlist: toggleWishlistProp,
  handleAddToCart: handleAddToCartProp,
  wishlistIds: wishlistIdsProp,
}) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { addToCart } = useCart();
  const [localWishlistIds, setLocalWishlistIds] = useState([]);

  const useParentWishlist =
    embedded && typeof toggleWishlistProp === "function" && typeof handleAddToCartProp === "function";

  const wishlistIds = useParentWishlist ? wishlistIdsProp ?? [] : localWishlistIds;

  useEffect(() => {
    let ignore = false;
    const loadDeals = async () => {
      setLoading(true);
      try {
        const rows = await getDealsProductsApi();
        if (!ignore) setOffers(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error("Deals fetch failed:", err);
        if (!ignore) setOffers([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadDeals();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (useParentWishlist) return;

    const loadWishlist = async () => {
      const token = getUserToken();
      try {
        if (token) {
          const data = await getWishlistApi();
          const ids = data.map((item) => item.ProductId);
          setLocalWishlistIds(ids);
        } else {
          const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist")) || [];
          setLocalWishlistIds(guestWishlist);
        }
      } catch (err) {
        console.log("Wishlist load error", err);
      }
    };

    loadWishlist();
  }, [useParentWishlist]);

  const toggleWishlistLocal = useCallback(
    async (productId) => {
      const token = getUserToken();

      try {
        if (localWishlistIds.includes(productId)) {
          toast.info("Already in wishlist ❤️");
          return;
        }

        if (token) {
          await addToWishlistApi({ productId });
        } else {
          const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist")) || [];
          guestWishlist.push(productId);
          localStorage.setItem("guestWishlist", JSON.stringify(guestWishlist));
        }

        setLocalWishlistIds((prev) => [...prev, productId]);
        toast.success("Added to wishlist ❤️");
      } catch (err) {
        toast.error("Wishlist error", err);
      }
    },
    [localWishlistIds],
  );

  const handleAddToCartLocal = useCallback(
    (item) => {
      const imageUrl = item?.image ? `${BASE_URL}/uploads/${item.image}` : "/no-image.png";

      if (countProductVariantsInPayload(item) > 1) {
        router.push(`/productPage/${item.slug || item.id}`);

        return;
      }

      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: imageUrl,
      });

      toast.success("Product added to cart 🛒");
    },
    [addToCart, router],
  );

  const toggleWishlist = useParentWishlist ? toggleWishlistProp : toggleWishlistLocal;

  const handleAddToCart = useParentWishlist ? handleAddToCartProp : handleAddToCartLocal;

  const visibleOffers = useMemo(() => (embedded ? offers.slice(0, PREVIEW_COUNT) : offers), [embedded, offers]);

  const getTimeLeft = (endDate) => {
    if (!endDate) return null;
    const total = new Date(endDate) - new Date();
    if (total <= 0) return "Expired";
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / (1000 * 60)) % 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const toPositive = (n) => {
    const x = Number(n);
    return Number.isFinite(x) && x > 0 ? x : null;
  };

  const resolveDealPricing = (product, item) => {
    const base = getProductDisplayPricing(product || {});
    const baseFinal = toPositive(base.finalPrice) ?? 0;
    const baseOld = toPositive(base.oldPrice);
    const discountType = String(item?.discount_type || "").toLowerCase();
    const discountValue = toPositive(item?.discount_value) ?? 0;

    if (!["percent", "flat"].includes(discountType) || discountValue <= 0) {
      const oldPrice = baseOld && baseOld > baseFinal ? baseOld : null;
      const discountPercent = oldPrice && oldPrice > baseFinal ? Math.round(((oldPrice - baseFinal) / oldPrice) * 100) : 0;
      return { finalPrice: baseFinal, oldPrice, discountPercent };
    }

    const offerBase = Math.max(baseOld ?? baseFinal, baseFinal, 0);
    const finalPrice =
      discountType === "percent" ? Math.max(offerBase - (offerBase * discountValue) / 100, 0) : Math.max(offerBase - discountValue, 0);
    const oldPrice = offerBase > finalPrice ? offerBase : null;
    const discountPercent = oldPrice && oldPrice > finalPrice ? Math.round(((oldPrice - finalPrice) / oldPrice) * 100) : 0;
    return { finalPrice, oldPrice, discountPercent };
  };

  const renderCard = (item) => {
    const product = item.Product;
    if (!product) return null;

    const { finalPrice, oldPrice, discountPercent } = resolveDealPricing(product, item);
    const productWithDealPrice = {
      ...product,
      price: finalPrice,
      old_price: oldPrice ?? undefined,
      mrp: oldPrice ?? undefined,
    };
    const dealState = {
      id: item.id,
      product_id: item.product_id,
      discount_type: item.discount_type,
      discount_value: Number(item.discount_value || 0),
    };

    const goToProductWithDeal = () => {
      setNavState("productDeal", { deal: dealState });
      router.push(`/productPage/${product.slug || product.id}`);
    };

    const timerLeft = item.end_on ? getTimeLeft(item.end_on) : null;
    const rawDealValue = Number(item?.discount_value || 0);
    const badgeLabel =
      discountPercent > 0
        ? `-${discountPercent}%`
        : String(item?.discount_type || "").toLowerCase() === "percent"
          ? `-${rawDealValue}%`
          : `-₹${rawDealValue}`;

    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToProductWithDeal();
          }
        }}
        onClick={(e) => {
          if (e.defaultPrevented) return;
          goToProductWithDeal();
        }}
        className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl sm:p-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/0 via-transparent to-amber-50/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex flex-col gap-0 sm:flex-row sm:gap-6">
          <div className="relative mx-auto flex w-full max-w-[200px] flex-shrink-0 justify-center sm:mx-0 sm:w-40">
            <span className="absolute -left-1 -top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-[10px] font-bold text-white shadow-md sm:h-10 sm:w-10 sm:text-xs">
              {badgeLabel}
            </span>

            <div className="flex h-36 w-full items-center justify-center rounded-xl bg-slate-50/80 sm:h-36">
              <img
                src={product.image ? `${BASE_URL}/uploads/${product.image}` : "/no-image.png"}
                alt={product.name || "Product"}
                className="h-32 max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>

          <div className="relative mx-auto flex w-full flex-1 flex-col pt-2 text-center sm:mx-0 sm:pt-0 sm:text-left">
            {timerLeft && timerLeft !== "Expired" && (
              <p className="mb-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-[#0B3C5D] sm:justify-start">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                Ends in {timerLeft}
              </p>
            )}
            {timerLeft === "Expired" && <p className="mb-1 text-xs font-medium text-slate-400">Offer ended</p>}

            <h4 className="line-clamp-2 font-semibold text-slate-900 sm:text-lg">{product.name}</h4>

            <p className="mt-2 mb-1">
              {oldPrice != null && <del className="mr-2 text-sm text-slate-400">₹{oldPrice.toFixed(2)}</del>}
              <span className="text-lg font-bold text-orange-600">₹{Math.max(finalPrice, 0).toFixed(2)}</span>
            </p>

            <div className="mt-2 overflow-hidden transition-all duration-300 sm:max-h-0 sm:opacity-0 sm:group-hover:max-h-40 sm:group-hover:opacity-100">
              <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:gap-6">
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(productWithDealPrice);
                    }}
                  >
                    <i className="fa-solid fa-bag-shopping" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}
                  >
                    <i className={`fa-heart ${wishlistIds?.includes(product.id) ? "fa-solid text-red-500" : "fa-regular"}`} />
                  </button>
                </div>

                <button
                  type="button"
                  className="bubble-btn w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-amber-600 sm:w-auto"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddToCart(productWithDealPrice);
                    router.push("/cart");
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ================= FULL PAGE (Brands-style) ================= */
  if (!embedded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 pb-12 pt-6 sm:pt-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative mb-8 overflow-hidden rounded-2xl shadow-lg">
            <img src={dealsBanner} alt="Latest deals" className="h-48 w-full object-cover md:h-64" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B3C5D]/85 to-[#0B3C5D]/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
              <div className="mb-2 flex items-center gap-2 text-amber-200">
                <Sparkles className="h-6 w-6 md:h-7 md:w-7" />
                <span className="text-sm font-semibold uppercase tracking-widest">Limited time</span>
              </div>
              <h1 className="text-2xl font-bold md:text-4xl">Latest Deals</h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm md:text-base">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex cursor-pointer items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm transition hover:bg-white/25"
                >
                  <Home size={16} />
                  <span>Home</span>
                </button>
                <span className="text-white/60">/</span>
                <span className="font-semibold">Latest Deals</span>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 md:text-2xl">All deals</h2>
              <p className="text-sm text-slate-500">
                {loading ? "Loading…" : `${offers.length} deal${offers.length === 1 ? "" : "s"} available`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20 text-slate-500">Loading deals…</div>
          ) : offers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 py-16 text-center text-slate-500">
              <p className="text-lg font-medium">No Deals Available</p>
              <button
                type="button"
                onClick={() => router.push("/shop")}
                className="mt-6 inline-flex rounded-lg bg-[#0B3C5D] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#0a2f4a]"
              >
                Shop Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">{offers.map((item) => renderCard(item))}</div>
          )}
        </div>
      </div>
    );
  }

  /* ================= HOME EMBEDDED SECTION ================= */
  return (
    <div className="mt-8 bg-[#ffffff] px-4 py-8 sm:mt-10 sm:px-8 sm:py-10 lg:px-24">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B3C5D] md:text-3xl">Latest deals</h2>
        </div>

        <div className="text-left sm:text-right">
          <button
            type="button"
            onClick={() => router.push("/deals")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B3C5D] underline-offset-4 transition hover:text-orange-600 hover:underline"
          >
            View all deals
            <i className="fa-solid fa-angles-right text-xs" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading deals…</div>
      ) : visibleOffers.length === 0 ? (
        <p className="text-center text-slate-500">No deals available</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{visibleOffers.map((item) => renderCard(item))}</div>
      )}
    </div>
  );
}
