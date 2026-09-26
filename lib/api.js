// Backend now lives at /api/* on this same Next.js app (no more separate
// api.shop99.co.in domain). Client-side, a relative baseURL just works.
// Server-side (Server Components, generateMetadata), axios needs an
// absolute URL to self-fetch this app's own API routes.
import axios from "axios";

const isServer = typeof window === "undefined";
const INTERNAL_BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const BASE_URL = isServer ? INTERNAL_BASE_URL : "";
export const IMAGE_URL = "/uploads/";

export const Api = axios.create({
  baseURL: `${BASE_URL}/api`,
});

function getStorefrontToken() {
  if (typeof window === "undefined") return "";
  return (
    String(localStorage.getItem("token") || "").trim() ||
    String(localStorage.getItem("userToken") || "").trim()
  );
}

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toHiddenFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return false;
  return (
    s === "1" ||
    s === "true" ||
    s === "yes" ||
    s === "hidden" ||
    s === "inactive" ||
    s === "disabled" ||
    s === "off"
  );
}

function isVariantHidden(variant) {
  if (!variant || typeof variant !== "object") return false;
  if (variant.visible != null) return !toHiddenFlag(variant.visible);
  return toHiddenFlag(
    variant.is_hidden ?? variant.isHidden ?? variant.hidden ?? variant.visibility,
  );
}

function enrichProductPriceFields(product) {
  if (!product || typeof product !== "object") return product;

  const variants = product.variants ?? product.product_variants ?? product.ProductVariants ?? [];

  if (!Array.isArray(variants) || variants.length === 0) return product;

  const firstWithPrice = variants.find((v) => !isVariantHidden(v) && toFiniteNumber(v?.price) != null);
  if (!firstWithPrice) return product;

  const selling = toFiniteNumber(firstWithPrice.price);
  const mrp = toFiniteNumber(firstWithPrice.old_price);
  const discountFromPair = mrp && selling != null && mrp > 0 && selling < mrp ? ((mrp - selling) / mrp) * 100 : 0;

  return {
    ...product,
    price: selling ?? product.price,
    old_price: mrp ?? product.old_price,
    discount_percent:
      toFiniteNumber(firstWithPrice.discount_percent) ??
      toFiniteNumber(firstWithPrice.discount) ??
      toFiniteNumber(product.discount_percent) ??
      discountFromPair,
  };
}

function normalizeProductPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeProductPayload(item));
  }
  if (!payload || typeof payload !== "object") return payload;

  const maybeProduct = enrichProductPriceFields(payload);
  const out = { ...maybeProduct };
  const nestedKeys = ["data", "products", "product", "items", "rows"];
  nestedKeys.forEach((k) => {
    if (out[k] !== undefined) out[k] = normalizeProductPayload(out[k]);
  });
  return out;
}

/** GET /popular-products & GET /latest-products — rows may be { id, Product } or flat products */
export function normalizeCurationRows(payload) {
  if (payload == null) return [];
  const raw = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.products ?? payload?.latestProducts ?? payload?.items ?? payload?.rows;
  const rows = Array.isArray(raw) ? raw : [];
  if (!rows.length) return [];

  const joinShape = rows.some((r) => r && typeof r === "object" && (r.Product != null || r.product != null));
  if (!joinShape) {
    return rows.map((p) => enrichProductPriceFields({ ...p }));
  }
  return rows
    .map((item) => {
      const p = item?.Product ?? item?.product;
      if (!p) return null;
      const flat = enrichProductPriceFields({ ...p });
      return {
        ...flat,
        image: flat.image ?? null,
        in_stock: flat.in_stock !== undefined ? flat.in_stock : true,
        Category: flat.Category ?? flat.category,
        old_price: flat.old_price ?? null,
      };
    })
    .filter(Boolean);
}

export function normalizeDealsRows(payload) {
  if (payload == null) return [];
  const rows = Array.isArray(payload) ? payload : payload?.data ?? payload?.deals ?? payload?.items ?? payload?.rows;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows
    .map((item) => {
      const p = item?.Product ?? item?.product;
      if (!p) return null;
      return {
        ...item,
        Product: enrichProductPriceFields({ ...p }),
      };
    })
    .filter(Boolean);
}

/* ================= ADD THIS ================= */

Api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["x-client"] = "storefront";
  const token = getStorefrontToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers?.delete) config.headers.delete("Content-Type");
    else delete config.headers["Content-Type"];
  }

  return config;
});

/* ================= CATEGORIES ================= */

export const getCategoryTreeApi = async () => {
  const res = await Api.get("/categories/tree");
  return res.data;
};

// For Homepage (Parent Categories Only)
export const getParentCategoriesApi = async () => {
  const res = await Api.get("/categories/parents");
  return res.data;
};

// For Shop Page (Child Categories)
export const getCategoriesApi = async () => {
  const res = await Api.get("/categories");
  return res.data;
};

export const getTopCategoriesApi = async () => {
  const res = await Api.get("/categories/top");
  return res.data;
};

/* ================= PRODUCTS ================= */

/** @param {Record<string, unknown>} [params] — e.g. `{ search, category, page, limit }` */
export const getProductsApi = async (params) => {
  const res = await Api.get("/products", {
    params: params && typeof params === "object" ? params : undefined,
  });
  return normalizeProductPayload(res.data);
};

/** Curated latest picks — GET /latest-products; agar 404 ho to /products/latest; dono fail ho to []. */
export const getLatestProductsApi = async () => {
  try {
    const res = await Api.get("/latest-products");
    return normalizeCurationRows(res.data);
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 501) {
      try {
        const res = await Api.get("/products/latest");
        return normalizeCurationRows(res.data);
      } catch {
        return [];
      }
    }
    throw e;
  }
};

/** Admin-style curated list — POST/DELETE need auth token (same as /popular-products). */
export const addLatestProductsApi = async (productIds) => {
  const res = await Api.post("/latest-products", { productIds });
  return res.data;
};

export const deleteLatestProductApi = async (id) => {
  const res = await Api.delete(`/latest-products/${id}`);
  return res.data;
};

/** Curated deals products — GET /deals */
export const getDealsProductsApi = async () => {
  const res = await Api.get("/deals");
  return normalizeDealsRows(res.data);
};

export const getProductByIdApi = async (id, options = {}) => {
  const includeOffer =
    options && Object.prototype.hasOwnProperty.call(options, "include_offer") ? options.include_offer : true;
  const res = await Api.get(`/products/${id}`, {
    params: { include_offer: includeOffer },
  });
  return normalizeProductPayload(res.data);
};

/** Same shape as admin: mode, flat, state → fee map */
export const getProductShippingApi = async (productId) => {
  const res = await Api.get(`/shipping/product/${productId}`);
  return res.data;
};

export const getShippingStatesApi = async () => {
  const res = await Api.get("/shipping/states");
  return res.data;
};

export const getFilteredProductsApi = async (params) => {
  const res = await Api.get("/products", { params });
  return normalizeProductPayload(res.data);
};

export const getPriceRangeApi = async () => {
  const res = await Api.get("/products/price-range");
  return res.data;
};

/* ================= POPULAR PRODUCTS ================= */

export const getPopularProductsApi = async () => {
  const res = await Api.get("/popular-products");
  return normalizeCurationRows(res.data);
};

export const addPopularProductsApi = async (productIds) => {
  const res = await Api.post("/popular-products", { productIds });
  return res.data;
};

export const deletePopularProductApi = async (id) => {
  const res = await Api.delete(`/popular-products/${id}`);
  return res.data;
};

/* ================= MOST SELLING PRODUCTS ================= */

export const getMostSellingProductsApi = async () => {
  try {
    const res = await Api.get("/most-selling-products");
    return normalizeCurationRows(res.data);
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 501) return [];
    throw e;
  }
};

/* ================= BRANDS ================= */

export const getBrandsApi = async () => {
  const res = await Api.get("/brands");
  return res.data;
};

export function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Request failed";
  const msg = typeof d === "string" ? d : d.message || "Request failed";
  const hint = typeof d === "object" && d.hint ? ` ${d.hint}` : "";
  return `${msg}${hint}`;
}

/* ================= AUTH ================= */

export const registerUserApi = async (data) => {
  const res = await Api.post("/auth/user/register", data);
  return res.data;
};

export const loginUserApi = async (data) => {
  const res = await Api.post("/auth/user/login", data);
  return res.data;
};

export const loginWithPasswordApi = async (data) => {
  const res = await Api.post("/auth/user/login", data);
  return res.data;
};

/** OTP — wired to otpController (Fast2SMS) via /api/auth/user/... */
export const sendOtpApi = async (data) => {
  const res = await Api.post("/auth/user/send-otp", data);
  return res.data;
};

export const verifyOtpApi = async (data) => {
  const res = await Api.post("/auth/user/verify-otp", data);
  return res.data;
};

/* ================= Account page ================= */

export const getProfileApi = async () => {
  const token = getStorefrontToken();

  const res = await Api.get("/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const updateProfileApi = async (data) => {
  const res = await Api.put("/profile", data, {
    headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
};

// orders

export const getOrdersApi = async () => {
  const res = await Api.get("/orders");
  return res.data;
};

export const requestOrderReturnApi = async (id, data) => {
  const res = await Api.put(`/orders/${id}/return`, data);
  return res.data;
};

export const requestOrderReplacementApi = async (id, data) => {
  const res = await Api.put(`/orders/${id}/replacement`, data);
  return res.data;
};

/* ================= WARRANTY REGISTRATION ================= */

export const createWarrantyApi = async (data) => {
  const res = await Api.post("/warranty", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getMyWarrantiesApi = async () => {
  const res = await Api.get("/warranty/my");
  return res.data;
};

/** Download invoice for logged-in user. Supports JSON link OR direct PDF blob response. */
export const getOrderInvoiceApi = async (orderId) => {
  const res = await Api.get(`/orders/${orderId}/invoice`, {
    responseType: "blob",
  });

  const contentType = String(res.headers?.["content-type"] || "").toLowerCase();
  const disposition = String(res.headers?.["content-disposition"] || "");

  if (contentType.includes("application/json")) {
    const raw = await res.data.text();
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  let filename = `invoice-${orderId}.pdf`;
  const m = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  if (m && m[1]) {
    filename = decodeURIComponent(m[1].replace(/"/g, "").trim());
  }

  return { blob: res.data, filename };
};

// wishlist api

export const addToWishlistApi = async (data) => {
  const res = await Api.post("/wishlist", data);
  return res.data;
};

export const getWishlistApi = async () => {
  const res = await Api.get("/wishlist");
  return res.data;
};

export const removeWishlistApi = async (id) => {
  const res = await Api.delete(`/wishlist/${id}`);
  return res.data;
};

/* ================= BANNERS ================= */

export const getBannersApi = async () => {
  const res = await Api.get("/banners");
  return res.data;
};

/* ================= PAYMENT (PayU) ================= */

export const createPaymentApi = async (data) => {
  const res = await Api.post("/payment/create-payment", data);
  return res.data;
};

export const verifyPaymentApi = async (data) => {
  const res = await Api.post("/payment/verify-payment", data);
  return res.data;
};

/* ================= USER ADDRESSES ================= */

export const getUserAddressesApi = async () => {
  const res = await Api.get("/user-addresses");
  return res.data;
};

export const createUserAddressApi = async (data) => {
  const res = await Api.post("/user-addresses", data);
  return res.data;
};

export const updateUserAddressApi = async (id, data) => {
  const res = await Api.put(`/user-addresses/${id}`, data);
  return res.data;
};

export const deleteUserAddressApi = async (id) => {
  const res = await Api.delete(`/user-addresses/${id}`);
  return res.data;
};

export const setDefaultUserAddressApi = async (id) => {
  const res = await Api.patch(`/user-addresses/${id}/default`);
  return res.data;
};

export const updateOrderStatusApi = async (orderId, status) => {
  const res = await Api.put(`/orders/${orderId}/status`, { status });
  return res.data;
};

// SEO APIs

// GET SEO BY PAGE (frontend use) — 404 = no row in admin; no axios throw
export const getSEOByPageApi = async (page) => {
  if (!page || typeof page !== "string") return null;
  const key = encodeURIComponent(page);
  const res = await Api.get(`/seo/${key}`, {
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (res.status === 404) return null;
  return res.data ?? null;
};

/* ================= BLOGS ================= */

export const getBlogsApi = async () => {
  const res = await Api.get("/blogs");
  return res.data;
};

export const getBlogByIdApi = async (id) => {
  const res = await Api.get(`/blogs/${id}`);
  return res.data;
};

// Footer APIs

export const getFooterApi = async () => {
  const res = await Api.get("/footer");
  return res.data;
};

export const subscribeNewsletterApi = async (payload) => {
  const body = payload && typeof payload === "object" ? payload : { email: String(payload || "").trim() };
  const res = await Api.post("/newsletter-subscriptions", body);
  return res.data;
};

/* ================= REVIEWS (public — app.use("/api/reviews", …)) ================= */

export const getProductReviewsApi = async (productId) => {
  const res = await Api.get(`/reviews/product/${productId}`);
  return res.data;
};

function reviewImageFiles(images) {
  if (!Array.isArray(images)) return [];
  return images.filter((f) => f instanceof File);
}

/** POST /reviews — JSON without files; multipart when `images` are File[] (same field names as admin). */
export const submitCustomerProductReviewApi = async (data) => {
  const files = reviewImageFiles(data?.images);
  const pid = data.productId ?? data.product_id;

  if (files.length === 0) {
    const res = await Api.post("/reviews", {
      productId: pid,
      product_id: pid,
      rating: data.rating,
      comment: data.comment ?? null,
      reviewerName: data.reviewerName ?? data.name,
      name: data.name,
    });
    return res.data;
  }

  const fd = new FormData();
  fd.append("product_id", String(pid ?? ""));
  fd.append("productId", String(pid ?? ""));
  fd.append("rating", String(data.rating ?? ""));
  fd.append("comment", data.comment == null || data.comment === "" ? "" : String(data.comment));
  const rn = data.reviewerName ?? data.name;
  if (rn != null && String(rn).trim() !== "") {
    const name = String(rn).trim();
    fd.append("reviewer_name", name);
    fd.append("reviewerName", name);
    fd.append("name", name);
  }
  files.forEach((file) => fd.append("images", file));

  const res = await Api.post("/reviews", fd);
  return res.data;
};
