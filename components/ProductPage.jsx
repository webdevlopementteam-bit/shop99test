"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import {
  getProductByIdApi,
  getProductReviewsApi,
  submitCustomerProductReviewApi,
  getOrdersApi,
  getProfileApi,
  apiErrorMessage,
  BASE_URL,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Star, Image as ImageIcon, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "react-toastify";
import { setNavState, consumeNavState } from "@/lib/navState";
import {
  collectVariantsForPdp,
  buildOptionGroups,
  specTableHasContent,
  formatVariantAttributeLine,
  collectProductGalleryUrls,
  getAttributeColumnOrder,
  getVariantAttributeValue,
  splitAttributeValueDisplayParts,
  buildPdpSelectedLine,
  buildPdpVariantLabel,
  buildCartLineIdWithDetail,
  extractPdpHeroTitleFromVariant,
  transformSpecsForPdpDisplay,
  findVariantIndexByPartialMatch,
  normalizeVariantSpecifications,
  stripHeadingPseudoRowsFromSpecs,
} from "@/lib/productVariants";

/** Read-only chips (non-selected table rows). */
function AttributeValueChips({ value }) {
  const raw = String(value ?? "").trim();
  if (!raw) return <span className="text-gray-400">—</span>;
  const parts = splitAttributeValueDisplayParts(raw);
  if (parts.length <= 1) {
    return (
      <span className="inline-block rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-900 shadow-sm">
        {raw}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {parts.map((p, i) => (
        <span
          key={`${p}-${i}`}
          className="inline-block rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-900 shadow-sm"
        >
          {p}
        </span>
      ))}
    </span>
  );
}

/** Clickable chips for the active row — updates Selected + cart sub-choice. */
function VariantAttributeCell({
  attributeName,
  value,
  selectedPart,
  onSelectPart,
}) {
  const raw = String(value ?? "").trim();
  if (!raw) return <span className="text-gray-400">—</span>;
  const parts = splitAttributeValueDisplayParts(raw);
  if (parts.length <= 1) {
    const isSelected = selectedPart === raw || !selectedPart;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectPart(attributeName, raw);
        }}
        className={`inline-block rounded-md border px-2 py-1 text-xs font-medium shadow-sm transition ${
          isSelected
            ? "border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-200"
            : "border-gray-300 bg-white text-gray-900 hover:border-orange-300"
        }`}
      >
        {raw}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {parts.map((p, i) => (
        <button
          key={`${attributeName}-${i}-${p}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectPart(attributeName, p);
          }}
          className={`inline-block rounded-md border px-2 py-1 text-xs font-medium shadow-sm transition ${
            selectedPart === p
              ? "border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-200"
              : "border-gray-300 bg-white text-gray-900 hover:border-orange-300"
          }`}
        >
          {p}
        </button>
      ))}
    </span>
  );
}

/** Same shape-fixup the fetch effect applies, shared with the SSR-preloaded product path. */
function normalizeProductResponse(res) {
  if (!res) return res;
  if (res.specifications && typeof res.specifications === "string") {
    return { ...res, specifications: JSON.parse(res.specifications) };
  }
  return res;
}

/** Strips tags for plain-text contexts (e.g. <meta name="description">) — descriptions are rich HTML now. */
function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductReviewsPayload(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.reviews)) return data.reviews;
  return [];
}

function ProductRatingStars({ rating, size = 18 }) {
  const r = Math.min(5, Math.max(0, Number(rating) || 0));
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            r >= i
              ? "fill-amber-400 text-amber-400"
              : r >= i - 0.5
                ? "fill-amber-400/60 text-amber-400"
                : "text-gray-300"
          }
        />
      ))}
    </span>
  );
}

function pickReviewerName(r) {
  const rn = r.reviewer_name ?? r.reviewerName;
  if (rn != null && String(rn).trim()) return String(rn).trim();
  const u = r.User || r.user || {};
  return u.name || u.email || "Customer";
}

/** Admin backdated “review date” — prefer over DB createdAt on PDP. */
function pickReviewDisplayDate(r) {
  if (!r || typeof r !== "object") return null;
  const raw =
    r.reviewed_at ??
    r.reviewedAt ??
    r.createdAt ??
    r.created_at ??
    r.updatedAt ??
    r.updated_at;
  return raw != null && String(raw).trim() !== "" ? raw : null;
}

function pickReviewImages(r) {
  const raw = r.images;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function reviewImageSrc(path) {
  if (!path || typeof path !== "string") return "";
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  const base = (BASE_URL || "").replace(/\/$/, "");
  let rel = p.replace(/^\/+/, "");
  if (rel && !rel.startsWith("uploads/")) {
    rel = `uploads/${rel}`;
  }
  return `${base}/${rel}`;
}

function normalizeIdentityStr(v) {
  return String(v ?? "").trim().toLowerCase();
}

function pickUserIdentityForOrders(profile, fallbackUser) {
  const p = profile && typeof profile === "object" ? profile : {};
  const f = fallbackUser && typeof fallbackUser === "object" ? fallbackUser : {};
  return {
    id: p.id ?? p.user_id ?? p.userId ?? f.id ?? f.user_id ?? f.userId,
    name: p.name ?? p.customer_name ?? f.name ?? f.customer_name ?? "",
    phone: p.phone ?? p.mobile ?? p.contact ?? f.phone ?? f.mobile ?? "",
    email: p.email ?? f.email ?? "",
  };
}

function orderBelongsToUserForReview(order, userIdentity) {
  if (!order || typeof order !== "object") return false;
  const uid = userIdentity?.id;
  if (uid != null) {
    const orderIds = [
      order.user_id,
      order.userId,
      order.UserId,
      order.customer_id,
      order.customerId,
      order.CustomerId,
    ].filter((x) => x != null);
    if (orderIds.some((x) => String(x) === String(uid))) return true;
  }

  const targetName = normalizeIdentityStr(userIdentity?.name);
  const targetPhone = normalizeIdentityStr(userIdentity?.phone);
  const targetEmail = normalizeIdentityStr(userIdentity?.email);
  const orderName = normalizeIdentityStr(order.customer_name ?? order.name);
  const orderPhone = normalizeIdentityStr(order.phone ?? order.customer_phone ?? order.mobile);
  const orderEmail = normalizeIdentityStr(order.email ?? order.customer_email);

  if (targetEmail && orderEmail && targetEmail === orderEmail) return true;
  if (targetPhone && orderPhone && targetPhone === orderPhone) return true;
  if (targetName && orderName && targetName === orderName) return true;
  return false;
}

function orderRowProductId(order) {
  if (!order || typeof order !== "object") return null;
  const raw =
    order.product_id ??
    order.productId ??
    order.ProductId ??
    order.Product?.id ??
    order.product?.id;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Order row + nested line items (grouped-order APIs). */
function orderLinesForPurchaseCheck(order) {
  if (!order || typeof order !== "object") return [];
  const lines = [order];
  const keys = [
    "items",
    "order_items",
    "OrderItems",
    "orderItems",
    "lines",
    "products",
  ];
  for (const k of keys) {
    const arr = order[k];
    if (Array.isArray(arr)) {
      for (const row of arr) {
        if (row && typeof row === "object") lines.push(row);
      }
    }
  }
  return lines;
}

function orderCountsAsPurchaseForReview(order) {
  const s = normalizeIdentityStr(order?.status);
  if (s === "cancelled" || s === "canceled") return false;
  return true;
}

function userHasPurchasedProduct(orders, productId, userIdentity) {
  const pid = Number(productId);
  if (!Number.isFinite(pid)) return false;
  const list = Array.isArray(orders) ? orders : [];
  for (const order of list) {
    if (!orderBelongsToUserForReview(order, userIdentity)) continue;
    if (!orderCountsAsPurchaseForReview(order)) continue;
    for (const line of orderLinesForPurchaseCheck(order)) {
      const linePid = orderRowProductId(line);
      if (linePid != null && linePid === pid) return true;
    }
  }
  return false;
}

function ReviewPhotoThumb({ file, onRemove, disabled }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return null;
  return (
    <li className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
        aria-label="Remove photo"
      >
        <X size={12} />
      </button>
    </li>
  );
}

function InteractiveStarRating({ value, onChange, size = 26, disabled }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;
  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="group"
      aria-label="Select rating"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(i)}
          className="rounded p-0.5 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Star
            size={size}
            className={
              display >= i
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

function ZoomableProductImage({ src, alt }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={onMove}
    >
      <img
        src={src}
        alt={alt}
        className="h-auto w-full max-h-[min(240px,42vh)] object-contain transition duration-200 sm:max-h-[min(320px,48vh)] md:max-h-[min(400px,55vh)] lg:max-h-[440px]"
        draggable={false}
      />

      {/* Hover zoom (desktop) */}
      <div
        className={`pointer-events-none absolute inset-0 hidden md:block transition-opacity duration-150 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          backgroundImage: `url("${src}")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: `${pos.x}% ${pos.y}%`,
          backgroundSize: "220%",
        }}
      />

      <div className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white md:block">
        Move to zoom
      </div>
    </div>
  );
}

export default function ProductPage({ slug, initialProduct }) {
  const preloadedProduct = initialProduct;
  /** Only trust the preload if it's actually for the product this render is for
   * — a client-side nav to a different product leaves stale preloaded data behind.
   * The route param can be the slug OR (legacy/back-compat) the numeric id, and
   * the server preloads by whichever was in the URL, so match on either. */
  const hasMatchingPreload =
    !!preloadedProduct &&
    (String(preloadedProduct.slug) === slug || String(preloadedProduct.id) === slug);

  const [product, setProduct] = useState(() =>
    hasMatchingPreload ? normalizeProductResponse(preloadedProduct) : null,
  );
  /** Real numeric product id, only available once `product` loads by slug — reviews,
   * purchase-check, and cart/order APIs all key off this, never the URL slug. */
  const productId = product?.id ?? null;
  const [activeTab, setActiveTab] = useState("detail");
  const [loading, setLoading] = useState(() => !hasMatchingPreload);
  const [activeImage, setActiveImage] = useState("");
  /** Har variant alag row — tab se select; ek ka data doosre ko override nahi karega. */
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  /** Comma-split attributes: konsa segment user ne pick kiya (Age Group → "0-6", …). */
  const [selectedPartByAttr, setSelectedPartByAttr] = useState({});
  const mobileThumbsRef = useRef(null);
  const overflowThumbsRef = useRef(null);

  useEffect(() => {
    setProduct(hasMatchingPreload ? normalizeProductResponse(preloadedProduct) : null);
    setLoading(!hasMatchingPreload);
    setActiveImage("");
    setActiveVariantIndex(0);
    setSelectedPartByAttr({});
    setProductReviews([]);
    setReviewRating(5);
    setReviewComment("");
    setGuestReviewerName("");
    setReviewPhotoFiles([]);
    setReviewSubmitting(false);
    setHasPurchasedProduct(false);
    setRawDealFromNav(consumeNavState("productDeal")?.deal ?? null);
  }, [slug, hasMatchingPreload, preloadedProduct]);

  const [productReviews, setProductReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [guestReviewerName, setGuestReviewerName] = useState("");
  const [reviewPhotoFiles, setReviewPhotoFiles] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasPurchasedProduct, setHasPurchasedProduct] = useState(false);
  const [purchaseCheckLoading, setPurchaseCheckLoading] = useState(false);

  const router = useRouter();
  const [rawDealFromNav, setRawDealFromNav] = useState(null);
  const { addToCart } = useCart();
  const { user } = useAuth();

  /* ================= FETCH PRODUCT ================= */
  useEffect(() => {
    // Already have this exact product from the server's SSR preload (or, on
    // the very first hydration, from window.__PRELOADED_PRODUCT__) — no
    // need to re-fetch what we were just handed.
    if (hasMatchingPreload) return;

    let ignore = false;
    setLoading(true);

    const fetchProduct = async () => {
      try {
        const res = await getProductByIdApi(slug);
        if (!ignore) setProduct(normalizeProductResponse(res));
      } catch (err) {
        console.error(err);
        if (!ignore) setProduct(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      ignore = true;
    };
  }, [slug, hasMatchingPreload]);

  useEffect(() => {
    if (!productId) return;
    let ignore = false;
    setReviewsLoading(true);
    getProductReviewsApi(productId)
      .then((data) => {
        if (!ignore) setProductReviews(normalizeProductReviewsPayload(data));
      })
      .catch(() => {
        if (!ignore) setProductReviews([]);
      })
      .finally(() => {
        if (!ignore) setReviewsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setHasPurchasedProduct(false);
      setPurchaseCheckLoading(false);
      return;
    }
    if (!user) {
      setHasPurchasedProduct(false);
      setPurchaseCheckLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setHasPurchasedProduct(false);
      setPurchaseCheckLoading(false);
      return;
    }

    let ignore = false;
    setPurchaseCheckLoading(true);
    (async () => {
      try {
        const [ordersRes, profileRes] = await Promise.all([
          getOrdersApi(),
          getProfileApi().catch(() => null),
        ]);
        const list = Array.isArray(ordersRes)
          ? ordersRes
          : ordersRes?.data ?? ordersRes?.orders ?? [];
        const safeList = Array.isArray(list) ? list : [];
        const fallbackUser = JSON.parse(localStorage.getItem("user") || "null");
        const currentUser = pickUserIdentityForOrders(profileRes, user ?? fallbackUser);
        const ok = userHasPurchasedProduct(safeList, productId, currentUser);
        if (!ignore) setHasPurchasedProduct(ok);
      } catch {
        if (!ignore) setHasPurchasedProduct(false);
      } finally {
        if (!ignore) setPurchaseCheckLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [productId, user]);

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!productId) return;
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      toast.error("Please choose a rating from 1 to 5.");
      return;
    }

    if (!user) {
      const guestName = guestReviewerName.trim();
      if (!guestName) {
        toast.error("Please enter your name to submit a guest review.");
        return;
      }
      setReviewSubmitting(true);
      try {
        await submitCustomerProductReviewApi({
          productId,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
          name: guestName,
          reviewerName: guestName,
          images: reviewPhotoFiles,
        });
        toast.success("Thanks! Your review was submitted.");
        setReviewComment("");
        setGuestReviewerName("");
        setReviewRating(5);
        setReviewPhotoFiles([]);
        const data = await getProductReviewsApi(productId);
        setProductReviews(normalizeProductReviewsPayload(data));
      } catch (err) {
        toast.error(apiErrorMessage(err));
      } finally {
        setReviewSubmitting(false);
      }
      return;
    }

    if (purchaseCheckLoading) {
      toast.error("Please wait while we verify your purchase.");
      return;
    }
    if (!hasPurchasedProduct) {
      toast.error("You can only review products you have purchased.");
      return;
    }
    const displayName = String(user.name || user.email || "").trim();
    if (!displayName) {
      toast.error("Please update your profile name to submit a review.");
      return;
    }
    setReviewSubmitting(true);
    try {
      await submitCustomerProductReviewApi({
        productId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        name: displayName,
        reviewerName: displayName,
        images: reviewPhotoFiles,
      });
      toast.success("Thanks! Your review was submitted.");
      setReviewComment("");
      setReviewRating(5);
      setReviewPhotoFiles([]);
      const data = await getProductReviewsApi(productId);
      setProductReviews(normalizeProductReviewsPayload(data));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setReviewSubmitting(false);
    }
  }

  const reviewStats = useMemo(() => {
    const list = Array.isArray(productReviews) ? productReviews : [];
    const ratings = list
      .map((r) => Number(r.rating))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    if (!ratings.length) return { avg: 0, count: 0 };
    const sum = ratings.reduce((a, b) => a + b, 0);
    return { avg: sum / ratings.length, count: ratings.length };
  }, [productReviews]);

  /** Logged-in: must have verified purchase. Guests: always allowed (name on submit). */
  const memberPurchaseVerified = useMemo(
    () => Boolean(user && !purchaseCheckLoading && hasPurchasedProduct),
    [user, purchaseCheckLoading, hasPurchasedProduct],
  );

  const normalizedVariants = useMemo(
    () => collectVariantsForPdp(product),
    [product],
  );

  const optionGroups = useMemo(
    () => buildOptionGroups(normalizedVariants),
    [normalizedVariants],
  );

  const attributeColumns = useMemo(
    () => getAttributeColumnOrder(normalizedVariants),
    [normalizedVariants],
  );

  /** First attribute (e.g. Color) — group chips + filter rows below. */
  const groupAttributeName = attributeColumns[0] ?? null;

  const uniqueGroupValues = useMemo(() => {
    if (!groupAttributeName) return [];
    const seen = new Set();
    const out = [];
    for (const v of normalizedVariants) {
      const val = String(getVariantAttributeValue(v, groupAttributeName) ?? "").trim();
      if (!val) continue;
      const key = val.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(val);
      }
    }
    return out;
  }, [normalizedVariants, groupAttributeName]);

  const [selectedGroupValue, setSelectedGroupValue] = useState(null);

  /** Avoid empty selection when multiple groups exist (first paint + product change). */
  const resolvedGroupValue = useMemo(() => {
    if (!groupAttributeName || !uniqueGroupValues.length) return null;
    if (
      selectedGroupValue != null &&
      uniqueGroupValues.includes(selectedGroupValue)
    ) {
      return selectedGroupValue;
    }
    return uniqueGroupValues[0];
  }, [groupAttributeName, uniqueGroupValues, selectedGroupValue]);

  useEffect(() => {
    if (!groupAttributeName || !normalizedVariants.length) {
      setSelectedGroupValue(null);
      return;
    }
    setSelectedGroupValue((prev) => {
      if (prev != null && uniqueGroupValues.includes(prev)) return prev;
      return (
        getVariantAttributeValue(normalizedVariants[0], groupAttributeName) ||
        uniqueGroupValues[0] ||
        null
      );
    });
  }, [normalizedVariants, groupAttributeName, uniqueGroupValues, slug]);

  /** Row click → selected variant; keep group chip in sync (e.g. pick Black row). */
  useEffect(() => {
    if (!groupAttributeName || !normalizedVariants.length) return;
    const v = normalizedVariants[activeVariantIndex];
    if (!v) return;
    const g = getVariantAttributeValue(v, groupAttributeName);
    if (g && uniqueGroupValues.includes(g)) {
      setSelectedGroupValue((prev) => (prev !== g ? g : prev));
    }
  }, [
    activeVariantIndex,
    normalizedVariants,
    groupAttributeName,
    uniqueGroupValues,
  ]);

  const tableVariantRows = useMemo(() => {
    if (!normalizedVariants.length) return [];
    const singleGroup =
      groupAttributeName && uniqueGroupValues.length <= 1;
    if (!groupAttributeName || singleGroup) {
      return normalizedVariants.map((v, i) => ({ v, i }));
    }
    const groupVal = resolvedGroupValue;
    if (groupVal == null || groupVal === "") {
      return normalizedVariants.map((v, i) => ({ v, i }));
    }
    return normalizedVariants
      .map((v, i) => ({ v, i }))
      .filter(
        ({ v }) =>
          getVariantAttributeValue(v, groupAttributeName) === groupVal,
      );
  }, [
    normalizedVariants,
    groupAttributeName,
    resolvedGroupValue,
    uniqueGroupValues.length,
  ]);

  const showGroupChips =
    !!groupAttributeName && uniqueGroupValues.length > 1;
  const showSingleGroupMergedCell =
    !!groupAttributeName &&
    uniqueGroupValues.length === 1 &&
    tableVariantRows.length > 1;
  const tableDisplayColumns = useMemo(() => {
    if (!attributeColumns.length) return [];
    if (!showGroupChips || !groupAttributeName) return attributeColumns;
    return attributeColumns.filter((col) => col !== groupAttributeName);
  }, [attributeColumns, showGroupChips, groupAttributeName]);
  const collapseRowsToSingleOptionRow =
    tableDisplayColumns.length === 1 && tableVariantRows.length > 1;
  const collapsedColumnOptions = useMemo(() => {
    if (!collapseRowsToSingleOptionRow) return {};
    const out = {};
    for (const col of tableDisplayColumns) {
      const seen = new Set();
      const values = [];
      for (const { v } of tableVariantRows) {
        const val = String(getVariantAttributeValue(v, col) ?? "").trim();
        if (!val || seen.has(val)) continue;
        seen.add(val);
        values.push(val);
      }
      out[col] = values;
    }
    return out;
  }, [collapseRowsToSingleOptionRow, tableDisplayColumns, tableVariantRows]);
  const showVariantsTable = normalizedVariants.length > 0;

  const matchedVariant = useMemo(() => {
    if (!normalizedVariants.length) return null;
    const idx = Math.min(
      Math.max(0, activeVariantIndex),
      normalizedVariants.length - 1,
    );
    return normalizedVariants[idx];
  }, [normalizedVariants, activeVariantIndex]);

  /** Hero title: `specifications_heading`, `heading`, ya spec table ki `heading` row. */
  const pdpHeroTitle = useMemo(
    () =>
      matchedVariant ? extractPdpHeroTitleFromVariant(matchedVariant) : "",
    [matchedVariant],
  );

  const baseGalleryImages = useMemo(
    () => collectProductGalleryUrls(product),
    [product],
  );

  const displayImages = useMemo(() => {
    const base = baseGalleryImages;
    if (!normalizedVariants.length) return base;
    if (matchedVariant?.images?.length > 0) {
      return matchedVariant.images;
    }
    return base;
  }, [matchedVariant, baseGalleryImages, normalizedVariants.length]);

  const mainProductImage = displayImages[0] || "";
  const galleryThumbnails = displayImages;
  const primaryThumbnails = galleryThumbnails.slice(0, 5);
  const overflowThumbnails = galleryThumbnails.slice(5);

  // Sirf product URL change par reset — `normalizedVariants` ref har load par badal sakta hai
  // aur user ka Black → Pink wapas jump karwa sakta hai.
  useEffect(() => {
    setActiveVariantIndex(0);
  }, [slug]);

  useEffect(() => {
    if (!normalizedVariants.length) {
      setSelectedPartByAttr({});
      return;
    }
    const idx = Math.min(
      Math.max(0, activeVariantIndex),
      normalizedVariants.length - 1,
    );
    const v = normalizedVariants[idx];
    if (!v?.attributes?.length) {
      setSelectedPartByAttr({});
      return;
    }
    setSelectedPartByAttr((prev) => {
      const next = {};
      for (const a of v.attributes) {
        const name = String(a.attribute ?? "").trim();
        const parts = splitAttributeValueDisplayParts(a.value);
        if (parts.length <= 1) continue;
        if (prev[name] && parts.includes(prev[name])) {
          next[name] = prev[name];
        } else {
          next[name] = parts[0];
        }
      }
      return next;
    });
  }, [activeVariantIndex, slug, normalizedVariants]);

  const handleSelectAttributePart = (attrName, part) => {
    setSelectedPartByAttr((prev) => ({ ...prev, [attrName]: part }));
  };

  const handleSelectGroupValue = (value) => {
    if (!groupAttributeName) return;
    setSelectedGroupValue(value);
    const idx = normalizedVariants.findIndex(
      (v) => getVariantAttributeValue(v, groupAttributeName) === value,
    );
    if (idx >= 0) setActiveVariantIndex(idx);
  };
  const handleSelectCollapsedOption = (attrName, value) => {
    handleSelectAttributePart(attrName, value);
    const partial = {};
    if (groupAttributeName && resolvedGroupValue) {
      partial[groupAttributeName] = resolvedGroupValue;
    }
    partial[attrName] = value;
    const idx = findVariantIndexByPartialMatch(normalizedVariants, partial);
    if (idx >= 0) setActiveVariantIndex(idx);
  };

  const scrollThumbStrip = (ref, direction) => {
    if (!ref?.current) return;
    ref.current.scrollBy({
      left: direction * 180,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!displayImages.length) return;
    setActiveImage((prev) =>
      displayImages.includes(prev) ? prev : displayImages[0],
    );
  }, [displayImages]);

  const displayPrice = useMemo(() => {
    if (matchedVariant?.price != null && !Number.isNaN(matchedVariant.price)) {
      return Number(matchedVariant.price);
    }
    // Multi-variant: product.price pehle variant se enrich — doosri row ke liye mat use karo
    if (normalizedVariants.length > 1) return 0;
    if (normalizedVariants.length === 1) {
      return Number(product?.price) || 0;
    }
    return Number(product?.price) || 0;
  }, [matchedVariant, product?.price, normalizedVariants.length]);

  const incomingDeal = useMemo(() => {
    const d = rawDealFromNav;
    if (!d || typeof d !== "object") return null;
    const dealProductId = Number(d.product_id);
    const currentProductId = Number(productId);
    if (
      Number.isFinite(dealProductId) &&
      Number.isFinite(currentProductId) &&
      dealProductId !== currentProductId
    ) {
      return null;
    }
    if (!["flat", "percent"].includes(d.discount_type)) return null;
    const value = Number(d.discount_value);
    if (!Number.isFinite(value) || value < 0) return null;
    return { discount_type: d.discount_type, discount_value: value };
  }, [rawDealFromNav, productId]);

  const applyDealToPrice = (basePrice, deal) => {
    const safeBase = Math.max(Number(basePrice) || 0, 0);
    if (!deal) return safeBase;
    if (deal.discount_type === "percent") {
      return Math.max(
        safeBase - (safeBase * Number(deal.discount_value || 0)) / 100,
        0,
      );
    }
    return Math.max(safeBase - Number(deal.discount_value || 0), 0);
  };

  const displayOldPrice = useMemo(() => {
    if (normalizedVariants.length > 0 && matchedVariant) {
      const o = matchedVariant.old_price;
      if (o != null && Number.isFinite(o) && o > 0) return o;
      return null;
    }
    return product?.old_price ? Number(product.old_price) : null;
  }, [normalizedVariants.length, matchedVariant, product?.old_price]);

  const hasServerDiscount = useMemo(() => {
    if (displayOldPrice == null) return false;
    return displayOldPrice > displayPrice && displayPrice > 0;
  }, [displayOldPrice, displayPrice]);

  const shouldApplyIncomingDeal = !!incomingDeal && !hasServerDiscount;

  const displayFinalPrice = useMemo(
    () =>
      applyDealToPrice(
        displayPrice,
        shouldApplyIncomingDeal ? incomingDeal : null,
      ),
    [displayPrice, incomingDeal, shouldApplyIncomingDeal],
  );

  const variantInStock = useMemo(() => {
    if (!normalizedVariants.length) return !!product?.in_stock;
    if (!matchedVariant) return false;
    if (matchedVariant.stock == null) return !!product?.in_stock;
    return Number(matchedVariant.stock) > 0;
  }, [normalizedVariants, matchedVariant, product?.in_stock]);

  const canAddToCart =
    !normalizedVariants.length || (matchedVariant && variantInStock);

  const productSpecs = useMemo(() => {
    if (!product) return [];
    return stripHeadingPseudoRowsFromSpecs(
      normalizeVariantSpecifications(product.specifications),
    );
  }, [product]);

  const summaryDescription = useMemo(() => {
    if (!product) return "";
    if (normalizedVariants.length > 0 && matchedVariant) {
      const vs = (matchedVariant.short_description || "").trim();
      if (vs) return vs;
    }
    return (product.short_description || product.description || "").trim();
  }, [normalizedVariants, matchedVariant, product]);

  /** meta_title/meta_description are backend-generated fallbacks already (name /
   * first ~160 chars of description) — these are just a last line of defense. */
  const pdpMetaTitle = useMemo(() => {
    if (!product) return "SHOP99";
    return String(product.meta_title || product.name || "SHOP99").trim();
  }, [product]);

  const pdpMetaDescription = useMemo(() => {
    if (!product) return "";
    const fallback = String(
      product.meta_description || stripHtml(summaryDescription) || product.name || "",
    ).trim();
    return fallback.length > 160 ? `${fallback.slice(0, 157).trim()}...` : fallback;
  }, [product, summaryDescription]);

  /** short_description is rich HTML from the admin's Jodit editor — sanitize
   * before dangerouslySetInnerHTML. Skipped during SSR (no DOM there); the
   * backend already sanitizes on save, so the raw value is safe either way. */
  const safeSummaryHtml = useMemo(() => {
    if (!summaryDescription) return "";
    return typeof window !== "undefined"
      ? DOMPurify.sanitize(summaryDescription)
      : summaryDescription;
  }, [summaryDescription]);

  /** Which spec table is shown — variant heading sirf tab jab table variant ki ho, product specs par nahi. */
  const { detailSpecs, specsTableSource } = useMemo(() => {
    if (normalizedVariants.length > 0 && matchedVariant) {
      const vs = matchedVariant.specifications;
      if (specTableHasContent(vs)) {
        return { detailSpecs: vs, specsTableSource: "variant" };
      }
    }
    return { detailSpecs: productSpecs, specsTableSource: "product" };
  }, [normalizedVariants, matchedVariant, productSpecs]);

  const displayDetailSpecs = useMemo(
    () =>
      transformSpecsForPdpDisplay(
        detailSpecs,
        (matchedVariant?.attributes || [])
          .map((a) => String(a?.attribute ?? "").trim())
          .filter(Boolean),
      ),
    [detailSpecs, matchedVariant],
  );

  const specTableRows = useMemo(() => {
    return (displayDetailSpecs || [])
      .map((row) =>
        Array.isArray(row)
          ? row.map((cell) => String(cell ?? "").trim())
          : [String(row ?? "").trim()],
      )
      .filter((row) => row.some((cell) => cell !== ""));
  }, [displayDetailSpecs]);

  const attributeLineText = useMemo(() => {
    if (!matchedVariant) return "";
    return String(formatVariantAttributeLine(matchedVariant) || "").trim();
  }, [matchedVariant]);

  const selectedVariantForSave = useMemo(() => {
    if (!normalizedVariants.length) return null;

    const partial = {};
    if (groupAttributeName && resolvedGroupValue) {
      partial[groupAttributeName] = resolvedGroupValue;
    }
    for (const [k, v] of Object.entries(selectedPartByAttr || {})) {
      const key = String(k || "").trim();
      const val = String(v || "").trim();
      if (key && val) partial[key] = val;
    }

    const idx = findVariantIndexByPartialMatch(normalizedVariants, partial);
    if (idx >= 0) return normalizedVariants[idx];
    return matchedVariant || normalizedVariants[0];
  }, [
    normalizedVariants,
    groupAttributeName,
    resolvedGroupValue,
    selectedPartByAttr,
    matchedVariant,
  ]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12 text-gray-600 sm:min-h-screen">
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12 text-gray-600 sm:min-h-screen">
        Product not found
      </div>
    );
  }

  const buildCartPayload = () => {
    // Price/MRP sirf active table row (matchedVariant) se — kabhi product.old_price mat lo
    // (wo enrich se pehle variant / Pink ka MRP ho sakta hai, e.g. 399).
    const payloadVariant =
      normalizedVariants.length > 0
        ? matchedVariant
        : selectedVariantForSave || null;

    const payloadBasePrice =
      payloadVariant?.price != null && !Number.isNaN(payloadVariant.price)
        ? Number(payloadVariant.price)
        : normalizedVariants.length > 0
          ? 0
          : displayPrice;
    const payloadPrice = applyDealToPrice(
      payloadBasePrice,
      shouldApplyIncomingDeal ? incomingDeal : null,
    );

    const payloadOldPrice =
      shouldApplyIncomingDeal
        ? payloadBasePrice
        : payloadVariant?.old_price != null &&
            Number.isFinite(payloadVariant.old_price) &&
            payloadVariant.old_price > 0
          ? Number(payloadVariant.old_price)
          : undefined;

    const variantLabel = payloadVariant
      ? buildPdpVariantLabel(payloadVariant, selectedPartByAttr)
      : "";
    const cartLineId = payloadVariant
      ? buildCartLineIdWithDetail(
          product.id,
          payloadVariant,
          selectedPartByAttr,
        )
      : String(product.id);
    const selectedAttributesText = payloadVariant
      ? buildPdpSelectedLine(payloadVariant, selectedPartByAttr)
      : "";
    const selectedTitle =
      normalizedVariants.length > 0 && pdpHeroTitle ? pdpHeroTitle : product.name;

    return {
      cartLineId,
      id: product.id,
      product_id: product.id,
      category_id: product.category_id,
      name: selectedTitle,
      price: payloadPrice,
      old_price: payloadOldPrice,
      mrp: payloadOldPrice,
      image: activeImage || displayImages[0] || "",
      variantLabel: variantLabel || undefined,
      variantAttributes: selectedAttributesText || undefined,
      variant_id: (() => {
        const vid = payloadVariant?.id ?? payloadVariant?.variant_id;
        if (vid == null || vid === "") return undefined;
        const n = Number(vid);
        return Number.isFinite(n) ? n : String(vid);
      })(),
      variant_sku: payloadVariant?.sku ?? undefined,
    };
  };

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error("Please select a valid option");
      return;
    }
    addToCart(buildCartPayload());
    toast.success("Product added to cart 🛒");
  };

  const handleBuyNow = () => {
    if (!canAddToCart) {
      toast.error("Please select a valid option");
      return;
    }
    const productData = {
      ...buildCartPayload(),
      qty: 1,
    };
    localStorage.setItem("buyNow", JSON.stringify(productData));
    setNavState("checkout", {
      type: "buyNow",
      product: productData,
    });
    router.push("/checkout");
  };

  /** Jab real variants load ho rahe hon to purana "Color: Red, Blue..." table mat dikhao. */
  const showStaticAttributes =
    normalizedVariants.length === 0 &&
    Array.isArray(product.attributes) &&
    product.attributes.length > 0;

  return (
    <>
      <title>{pdpMetaTitle}</title>
      <meta name="description" content={pdpMetaDescription} />
      <link rel="canonical" href={`https://www.shop99.co.in/productPage/${slug}`} />

      <div className="min-h-screen w-full overflow-x-hidden bg-gray-100">
      <div className="h-2 bg-orange-500 sm:h-3" />

      <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-8 lg:px-6 lg:py-10">
        <div className="grid min-w-0 grid-cols-1 gap-6 rounded-lg bg-white p-4 shadow-sm sm:p-6 md:grid-cols-2 md:gap-8 lg:gap-10 lg:p-8">
          <div className="flex min-w-0 w-full flex-col gap-4 sm:flex-row sm:gap-4 md:gap-6">
            {galleryThumbnails.length > 0 && (
              <div className="hidden sm:flex sm:flex-col gap-2 shrink-0 order-1 w-auto">
                {primaryThumbnails.map((img, i) => (
                  <button
                    key={`${img}-g-primary-${i}`}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`shrink-0 w-16 h-16 md:w-20 md:h-20 rounded border overflow-hidden transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
                      (activeImage || mainProductImage) === img
                        ? "border-orange-500 ring-2 ring-orange-400"
                        : "border-gray-300 hover:border-orange-400"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="order-1 flex min-w-0 flex-1 flex-col items-center justify-center sm:order-2">
              <div className="flex min-h-[200px] w-full items-center justify-center rounded-lg bg-gray-50 p-3 sm:min-h-[260px] sm:p-4 md:min-h-[300px] md:p-6 lg:min-h-[320px]">
                <ZoomableProductImage
                  src={activeImage || mainProductImage || "/no-image.png"}
                  alt={product.name}
                />
              </div>

              {galleryThumbnails.length > 0 && (
                <div className="flex sm:hidden items-center gap-2 mt-3 w-full">
                  <button
                    type="button"
                    aria-label="Previous images"
                    onClick={() => scrollThumbStrip(mobileThumbsRef, -1)}
                    className="shrink-0 h-8 w-8 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600"
                  >
                    {"<"}
                  </button>
                  <div
                    ref={mobileThumbsRef}
                    className="flex-1 flex flex-row gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {galleryThumbnails.map((img, i) => (
                      <button
                        key={`${img}-g-mobile-${i}`}
                        type="button"
                        onClick={() => setActiveImage(img)}
                        className={`shrink-0 w-16 h-16 rounded border overflow-hidden transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
                          (activeImage || mainProductImage) === img
                            ? "border-orange-500 ring-2 ring-orange-400"
                            : "border-gray-300 hover:border-orange-400"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Next images"
                    onClick={() => scrollThumbStrip(mobileThumbsRef, 1)}
                    className="shrink-0 h-8 w-8 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600"
                  >
                    {">"}
                  </button>
                </div>
              )}

              {overflowThumbnails.length > 0 && (
                <div className="hidden sm:flex mt-4 w-full items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous extra images"
                    onClick={() => scrollThumbStrip(overflowThumbsRef, -1)}
                    className="shrink-0 h-8 w-8 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600"
                  >
                    {"<"}
                  </button>
                  <div
                    ref={overflowThumbsRef}
                    className="flex-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {overflowThumbnails.map((img, i) => (
                      <button
                        key={`${img}-g-overflow-${i}`}
                        type="button"
                        onClick={() => setActiveImage(img)}
                        className={`shrink-0 w-16 h-16 md:w-20 md:h-20 rounded border overflow-hidden transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
                          (activeImage || mainProductImage) === img
                            ? "border-orange-500 ring-2 ring-orange-400"
                            : "border-gray-300 hover:border-orange-400"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Next extra images"
                    onClick={() => scrollThumbStrip(overflowThumbsRef, 1)}
                    className="shrink-0 h-8 w-8 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600"
                  >
                    {">"}
                  </button>
                </div>
              )}

            </div>
          </div>

          <div className="min-w-0">
            <h1 className="mb-2 break-words text-xl font-semibold leading-snug text-gray-800 sm:text-2xl lg:text-3xl">
              {normalizedVariants.length > 0 && pdpHeroTitle
                ? pdpHeroTitle
                : product.name}
            </h1>

            <div
              id="product-review-summary"
              className="mb-3 flex flex-wrap items-center gap-2"
            >
              {reviewsLoading ? (
                <span className="text-sm text-gray-400">Loading ratings…</span>
              ) : reviewStats.count > 0 ? (
                <>
                  <ProductRatingStars rating={reviewStats.avg} size={18} />
                  <span className="text-sm font-semibold text-gray-800">
                    {reviewStats.avg.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({reviewStats.count}{" "}
                    {reviewStats.count === 1 ? "review" : "reviews"})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("reviews")}
                    className="text-sm font-medium text-orange-600 hover:underline"
                  >
                    See all
                  </button>
                </>
              ) : (
                <span className="text-sm text-gray-500">No reviews yet</span>
              )}
            </div>
            {/* {normalizedVariants.length > 0 && pdpHeroTitle ? (
              <p className="text-sm text-gray-600 mb-3">{product.name}</p>
            ) : null} */}

            {/* {normalizedVariants.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {Object.entries(optionGroups).map(([attrName, values]) => (
                  <p key={attrName} className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {attrName}:
                    </span>{" "}
                    {values.join(", ")}
                  </p>
                ))}
              </div>
            )} */}

            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              {((shouldApplyIncomingDeal && displayPrice > displayFinalPrice) ||
                (displayOldPrice != null && displayOldPrice > displayFinalPrice)) && (
                <span className="text-base text-gray-400 line-through sm:text-lg">
                  ₹{(shouldApplyIncomingDeal ? displayPrice : displayOldPrice).toFixed(2)}
                </span>
              )}

              <span className="text-2xl font-bold text-red-600 sm:text-3xl">
                ₹{displayFinalPrice.toFixed(2)}
              </span>

              {((shouldApplyIncomingDeal && displayPrice > displayFinalPrice && displayPrice > 0) ||
                (displayOldPrice != null &&
                  displayOldPrice > displayFinalPrice &&
                  displayOldPrice > 0)) && (
                  <span className="text-green-600 text-sm font-medium">
                    {Math.round(
                      (((shouldApplyIncomingDeal ? displayPrice : displayOldPrice) -
                        displayFinalPrice) /
                        (shouldApplyIncomingDeal ? displayPrice : displayOldPrice)) *
                        100,
                    )}
                    % OFF
                  </span>
                )}
            </div>

            {showVariantsTable && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Variants
                </p>

                {showGroupChips && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {uniqueGroupValues.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectGroupValue(val)}
                        className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition sm:px-4 ${
                          resolvedGroupValue === val
                            ? "border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                            : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-gray-50"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
                <div className="-mx-1 overflow-x-auto rounded-lg border border-gray-200 sm:mx-0">
                  <table className="w-full min-w-[280px] text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
                        {tableDisplayColumns.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2.5 font-semibold whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {collapseRowsToSingleOptionRow ? (
                        <tr className="border-b border-gray-100 last:border-0">
                          {tableDisplayColumns.map((col) => {
                            const currentVal = String(
                              getVariantAttributeValue(matchedVariant, col) ?? "",
                            ).trim();
                            const options = collapsedColumnOptions[col] || [];
                            return (
                              <td
                                key={`collapsed-${col}`}
                                className="px-3 py-2.5 text-gray-800 align-middle"
                              >
                                {options.length <= 1 ? (
                                  <AttributeValueChips value={options[0] || currentVal} />
                                ) : (
                                  <span className="inline-flex flex-wrap items-center gap-1.5">
                                    {options.map((opt) => (
                                      <button
                                        key={`${col}-${opt}`}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectCollapsedOption(col, opt);
                                        }}
                                        className={`inline-block rounded-md border px-2 py-1 text-xs font-medium shadow-sm transition ${
                                          currentVal === opt
                                            ? "border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-200"
                                            : "border-gray-300 bg-white text-gray-900 hover:border-orange-300"
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ) : (
                        tableVariantRows.map(({ v, i: idx }, rowIdx) => {
                        const selected = activeVariantIndex === idx;
                        return (
                          <tr
                            key={v.id != null ? `v-${v.id}` : `variant-row-${idx}`}
                            className={`cursor-pointer border-b border-gray-100 last:border-0 transition ${
                              selected
                                ? "bg-orange-50/90 ring-1 ring-inset ring-orange-200"
                                : "hover:bg-gray-50"
                            }`}
                            onClick={() => setActiveVariantIndex(idx)}
                          >
                            {tableDisplayColumns.map((col) => {
                              if (showSingleGroupMergedCell && col === groupAttributeName) {
                                if (rowIdx > 0) return null;
                                const mergedVal = getVariantAttributeValue(v, col);
                                return (
                                  <td
                                    key={`${col}-merged`}
                                    rowSpan={tableVariantRows.length}
                                    className="px-3 py-2.5 text-gray-800 align-top bg-white"
                                  >
                                    <AttributeValueChips value={mergedVal} />
                                  </td>
                                );
                              }
                              const cellVal = getVariantAttributeValue(v, col);
                              const rowActive = activeVariantIndex === idx;
                              return (
                                <td
                                  key={`${idx}-${col}`}
                                  className="px-3 py-2.5 text-gray-800 align-middle"
                                >
                                  {rowActive ? (
                                    <VariantAttributeCell
                                      attributeName={col}
                                      value={cellVal}
                                      selectedPart={selectedPartByAttr[col]}
                                      onSelectPart={handleSelectAttributePart}
                                    />
                                  ) : (
                                    <AttributeValueChips value={cellVal} />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>

                {matchedVariant && matchedVariant.attributes?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    <span className="font-medium text-gray-600">Selected: </span>
                    <span className="font-medium text-gray-800">
                      {buildPdpSelectedLine(matchedVariant, selectedPartByAttr)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {showStaticAttributes && (
              <div className="mb-6">
                <h3 className="mb-3 text-base font-semibold text-gray-700 sm:text-lg">
                  Product Attributes
                </h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[260px] text-xs sm:text-sm">
                    <tbody>
                      {product.attributes.map((attr, index) => (
                        <tr key={index} className="border-b last:border-none">
                          <td className="w-[38%] max-w-[10rem] break-words bg-gray-50 p-2.5 font-medium sm:w-40 sm:max-w-none sm:p-3">
                            {attr.attribute}
                          </td>
                          <td className="min-w-0 break-words p-2.5 sm:p-3">
                            {attr.value || attr.values?.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-4">
              {variantInStock && canAddToCart ? (
                <span className="text-green-600 font-semibold">
                  ✔ In Stock
                </span>
              ) : normalizedVariants.length > 0 ? (
                <span className="text-red-500 font-semibold">
                  ✖ Out of Stock
                </span>
              ) : product.in_stock ? (
                <span className="text-green-600 font-semibold">
                  ✔ In Stock
                </span>
              ) : (
                <span className="text-red-500 font-semibold">
                  ✖ Out of Stock
                </span>
              )}
            </div>

            <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-4">
              {canAddToCart ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="min-h-[44px] w-full rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 sm:w-auto sm:min-w-[140px]"
                >
                  Add To Cart
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="min-h-[44px] w-full cursor-not-allowed rounded-lg bg-gray-400 px-6 py-2.5 text-sm font-medium text-white sm:w-auto sm:min-w-[140px]"
                >
                  OUT OF STOCK
                </button>
              )}

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!canAddToCart}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[120px]"
              >
                Buy Now
              </button>
            </div>

            <div className="mt-5 text-xs text-gray-500 sm:mt-6 sm:text-sm">
              <p className="font-medium text-gray-700">
                Estimated delivery: 3–5 business days
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-white p-4 shadow-sm sm:mt-8 sm:p-6 lg:p-8">
          <div className="-mx-1 mb-4 overflow-x-auto border-b border-gray-200 pb-px sm:mx-0 sm:mb-6 [scrollbar-width:thin]">
            <div className="flex min-w-max gap-1 px-1 text-xs font-medium sm:min-w-0 sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:text-sm md:gap-x-8">
            {["detail", "reviews", "return", "delivery"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-2 py-2.5 transition sm:px-0 sm:py-2 ${
                  activeTab === tab
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "detail" && "Detail"}
                {tab === "reviews" &&
                  `Reviews${
                    reviewStats.count > 0 ? ` (${reviewStats.count})` : ""
                  }`}
                {tab === "return" && "Return Policy"}
                {tab === "delivery" && "Delivery Info"}
              </button>
            ))}
            </div>
          </div>

          {activeTab === "detail" && (
            <div className="text-sm text-gray-600">
              {normalizedVariants.length > 0 && matchedVariant && attributeLineText ? (
                <p className="mb-4 text-xs font-medium text-gray-500">
                  {attributeLineText}
                </p>
              ) : null}

              {summaryDescription ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">
                    Description
                  </h3>
                  <div
                    className="leading-relaxed whitespace-pre-wrap text-gray-600 [&_a]:text-primaryColor [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: safeSummaryHtml }}
                  />
                </div>
              ) : null}

              {specTableHasContent(detailSpecs) &&
              displayDetailSpecs.length > 0 ? (
                <div id="pdp-size-chart" className="mt-4 scroll-mt-24">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">
                    Specifications
                    {/* {specsTableSource === "variant" && matchedVariant && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        (this.option)
                      </span>
                    )} */}
                  </h3>

                  <table className="w-full table-fixed border border-gray-200 text-xs sm:text-sm">
                    <tbody>
                      {specTableRows.map((row, i) => (
                        <tr key={`spec-row-${i}`} className="align-top">
                          {row.map((cell, j) => (
                            <td
                              key={`spec-cell-${i}-${j}`}
                              className={`px-3 py-2 border border-gray-200 text-gray-700 ${
                                j === 0
                                  ? "w-[32%] sm:w-[28%] bg-gray-50 font-medium break-words"
                                  : "min-w-0 break-words whitespace-pre-wrap"
                              }`}
                            >
                              {cell || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !summaryDescription ? (
                <p className="text-gray-500">No details available.</p>
              ) : null}
            </div>
          )}

          {activeTab === "reviews" && (
            <div id="product-reviews" className="scroll-mt-24 text-sm text-gray-600">
              <form
                onSubmit={handleSubmitReview}
                className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <h3 className="text-base font-semibold text-gray-900">
                  Write a review
                </h3>
                {/* <p className="mt-1 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Guests:</span> enter
                  your name below (no account).{" "}
                  <span className="font-medium text-gray-700">Signed in:</span> you
                  can review only if you bought this product on this account.
                </p> */}
                {user && purchaseCheckLoading ? (
                  <p className="mt-4 text-sm text-gray-500">
                    Checking your orders…
                  </p>
                ) : null}
                {user && !purchaseCheckLoading && !hasPurchasedProduct ? (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">
                      Purchase required (signed-in)
                    </p>
                    {/* <p className="mt-1 text-xs text-gray-600">
                      We could not find a non-cancelled order for this product on
                      your account. To leave a guest review with your name, sign
                      out first or open this page in a private window.
                    </p> */}
                  </div>
                ) : null}
                {(!user || memberPurchaseVerified) && (
                  <>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                      <div>
                        <span className="mb-2 block text-xs font-medium text-gray-700">
                          Your rating
                        </span>
                        <InteractiveStarRating
                          value={reviewRating}
                          onChange={setReviewRating}
                          disabled={reviewSubmitting}
                        />
                      </div>
                      {!user ? (
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor="reviewer-name"
                            className="mb-1 block text-xs font-medium text-gray-700"
                          >
                            Your name <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="reviewer-name"
                            type="text"
                            autoComplete="name"
                            value={guestReviewerName}
                            onChange={(e) => setGuestReviewerName(e.target.value)}
                            disabled={reviewSubmitting}
                            placeholder="e.g. Rahul"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-50"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 sm:self-end">
                          Posting as{" "}
                          <span className="font-medium text-gray-800">
                            {user.name || user.email || "Account"}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="mt-4">
                      <label
                        htmlFor="review-comment"
                        className="mb-1 block text-xs font-medium text-gray-700"
                      >
                        Comment{" "}
                        <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <textarea
                        id="review-comment"
                        rows={4}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        disabled={reviewSubmitting}
                        placeholder="What did you like? Would you recommend this product?"
                        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div className="mt-4">
                      <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <ImageIcon size={14} className="text-orange-500" />
                        Photos{" "}
                        <span className="font-normal text-gray-400">(optional, max 5)</span>
                      </span>
                      <label className="mt-1 flex cursor-pointer flex-wrap items-center gap-3">
                        <span className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-600 hover:border-orange-400 hover:bg-orange-50/50">
                          Choose images
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={reviewSubmitting}
                          className="sr-only"
                          onChange={(e) => {
                            const list = Array.from(e.target.files || []).filter(
                              (f) => f.type.startsWith("image/"),
                            );
                            setReviewPhotoFiles((prev) =>
                              [...prev, ...list].slice(0, 5),
                            );
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {reviewPhotoFiles.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {reviewPhotoFiles.map((file, idx) => (
                            <ReviewPhotoThumb
                              key={`${file.name}-${idx}-${file.lastModified}`}
                              file={file}
                              disabled={reviewSubmitting}
                              onRemove={() =>
                                setReviewPhotoFiles((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewSubmitting ? "Submitting…" : "Submit review"}
                      </button>
                      {!user && (
                        <button
                          type="button"
                          onClick={() => router.push("/login")}
                          className="text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                          Sign in instead (verified purchase)
                        </button>
                      )}
                    </div>
                  </>
                )}
              </form>

              {reviewsLoading ? (
                <p className="text-gray-500">Loading reviews…</p>
              ) : productReviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet.</p>
              ) : (
                <ul className="space-y-4">
                  {productReviews.map((r) => {
                    const displayDate = pickReviewDisplayDate(r);
                    return (
                      <li
                        key={r.id ?? `${r.user_id}-${displayDate ?? "x"}`}
                        className="rounded-lg border border-gray-200 bg-gray-50/80 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ProductRatingStars
                              rating={Number(r.rating)}
                              size={16}
                            />
                            <span className="text-xs font-medium text-gray-800">
                              {pickReviewerName(r)}
                            </span>
                          </div>
                          {displayDate && (
                            <span className="text-xs text-gray-400">
                              {new Date(displayDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {r.comment && String(r.comment).trim() ? (
                          <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                            {r.comment}
                          </p>
                        ) : null}
                        {pickReviewImages(r).length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {pickReviewImages(r).slice(0, 8).map((src, idx) => (
                              <a
                                key={idx}
                                href={reviewImageSrc(src)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden rounded-lg border border-gray-200 bg-white"
                              >
                                <img
                                  src={reviewImageSrc(src)}
                                  alt=""
                                  className="h-16 w-16 object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === "return" && <p>7 days easy return policy.</p>}

          {activeTab === "delivery" && <p>Delivery within 3-5 days.</p>}
        </div>
      </div>
    </div>
    </>
  );
}
