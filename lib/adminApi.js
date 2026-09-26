// Admin panel's API client — same pattern as lib/api.js (storefront): backend
// now lives at /api/* on this same Next.js app, so a relative baseURL works
// client-side, and an absolute self-fetch URL is needed server-side.
import axios from "axios";

const isServer = typeof window === "undefined";
const INTERNAL_BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const BASE_URL = isServer ? INTERNAL_BASE_URL : "";
export const FRONTEND_URL = "https://www.shop99.co.in";
export const IMAGE_URL = "/uploads/";

export const Api = axios.create({
  baseURL: `${BASE_URL}/api`,
});

const AUTH_TOKEN_KEYS = ["adminToken", "token", "accessToken", "access_token", "authToken", "jwt"];

/** Prefer admin session token, then generic `token` */
export function getStoredAuthToken() {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem("adminToken") || localStorage.getItem("token") || "";
  const t = String(raw).trim();
  if (!t) return "";
  return t.replace(/^Bearer\s+/i, "").trim();
}

/** Remove all known auth token keys (local + session). Call on logout. */
export function clearStoredAuthTokens() {
  if (typeof window === "undefined") return;
  for (const k of AUTH_TOKEN_KEYS) {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export function persistAuthToken(token) {
  const t = String(token).trim().replace(/^Bearer\s+/i, "");
  if (!t) return;
  localStorage.setItem("adminToken", t);
  localStorage.setItem("token", t);
}

/** Parse token from register/login response (shape varies by backend). */
export function pickTokenFromAuthResponse(data) {
  if (!data || typeof data !== "object") return "";
  return data.token || data.accessToken || data.access_token || data.data?.token || data.data?.accessToken || "";
}

Api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["x-client"] = "admin";
  if (config.skipAuth) {
    return config;
  }
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  /* FormData: browser must set multipart boundary — strip any preset Content-Type */
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers?.delete) config.headers.delete("Content-Type");
    else delete config.headers["Content-Type"];
  }
  return config;
});

// users Api

export const getUsersApi = async () => {
  const res = await Api.get("/auth/users");
  return res.data;
};

export const getNewsletterSubscribersApi = async () => {
  const res = await Api.get("/newsletter-subscriptions");
  return res.data;
};

/** Logged-in admin — Bearer from `getStoredAuthToken()` */
export const getAdminProfileApi = async () => {
  const res = await Api.get("/admin-auth/profile");
  return res.data;
};

export const updateAdminProfileApi = async (data) => {
  const res = await Api.put("/admin-auth/profile", data);
  return res.data;
};

/**
 * First-time admin account (no JWT yet). Backend should return `{ token }` or `{ accessToken }`.
 */
export const registerAdminApi = async (data) => {
  const res = await Api.post("/admin-auth/register", data, { skipAuth: true });
  return res.data;
};

/** Phone + password — backend path should match your server (often `/admin-auth/login`). */
export const loginAdminApi = async ({ phone, password }) => {
  const res = await Api.post("/admin-auth/login", { phone, password }, { skipAuth: true });
  return res.data;
};

/* ================= PRODUCTS ================= */

export const createProductApi = async (data) => {
  const res = await Api.post("/products", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getProductsApi = async (page = 1, limit = 10, extraParams = {}) => {
  const res = await Api.get(`/products`, {
    params: { page, limit, include_offer: false, ...extraParams },
  });
  return res.data;
};

export const getProductByIdApi = async (id) => {
  const res = await Api.get(`/products/${id}`, {
    params: { include_offer: false },
  });
  return res.data;
};

export const updateProductApi = async (id, data) => {
  const res = await Api.put(`/products/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteProductApi = async (id) => {
  const res = await Api.delete(`/products/${id}`);
  return res.data;
};

/* ================= SHIPPING (product-level) ================= */

export const getShippingStatesApi = async () => {
  const res = await Api.get("/shipping/states");
  return res.data;
};

export const getProductShippingApi = async (productId) => {
  const res = await Api.get(`/shipping/product/${productId}`);
  return res.data;
};

export const putProductShippingApi = async (productId, body) => {
  const res = await Api.put(`/shipping/product/${productId}`, body);
  return res.data;
};

/* ================= CATEGORIES ================= */

/**
 * Categories API helper
 * - Without params: returns flat categories array (backward-compatible for forms/dropdowns)
 * - With params (page/limit/filter): returns full payload { categories, totalPages, ... }
 */
export const getCategoriesApi = async (params) => {
  const res = await Api.get("/categories", { params });
  const payload = res.data;

  if (params && typeof params === "object" && Object.keys(params).length > 0) {
    return payload;
  }

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  return [];
};

export const createCategoryApi = async (data) =>
  (
    await Api.post("/categories", data, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;

export const updateCategoryApi = async (id, data) =>
  (
    await Api.put(`/categories/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;

export const deleteCategoryApi = async (id) => {
  try {
    const res = await Api.delete(`/categories/${id}`);
    return res.data;
  } catch (err) {
    console.error("DELETE CATEGORY API ERROR:", err.response || err);

    throw err?.response?.data || "Delete failed";
  }
};

export const getCategoryByIdApi = async (id) => (await Api.get(`/categories/${id}`)).data;

export const getParentCategoriesApi = () => Api.get("/categories/parents").then((r) => r.data);

/** Flat list of all categories (all pages) — for nested parent picker in CategoryForm */
export const getAllCategoriesFlatApi = async () => {
  const all = [];
  let page = 1;
  let totalPages = 1;
  const limit = 200;
  do {
    const res = await Api.get("/categories", { params: { page, limit } });
    const payload = res.data;
    const rows = payload?.categories ?? (Array.isArray(payload) ? payload : []);
    if (Array.isArray(rows)) all.push(...rows);
    totalPages = Number(payload?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages);
  return all;
};

/* ================= BRANDS ================= */

export const getBrandsApi = async () => (await Api.get("/brands")).data;

export const createBrandApi = async (data) =>
  (
    await Api.post("/brands", data, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;

export const updateBrandApi = async (id, data) =>
  (
    await Api.put(`/brands/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;

export const deleteBrandApi = async (id) => (await Api.delete(`/brands/${id}`)).data;

/* ================= DASHBOARD ================= */

export const getDashboardStatsApi = async () => (await Api.get("/dashboard")).data;

/* ================= BANNERS ================= */

export const getBannersApi = async () => (await Api.get("/banners")).data;

export const createBannerApi = async (data) =>
  (
    await Api.post("/banners", data, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;

export const updateBannerApi = async (id, data) =>
  (
    await Api.put(`/banners/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;

export const deleteBannerApi = async (id) => (await Api.delete(`/banners/${id}`)).data;

// orders api

export const getOrdersApi = async () => {
  const res = await Api.get("/orders");
  return res.data;
};

export const updateReturnApi = async (id, data) => {
  const res = await Api.put(`/orders/${id}/return`, data);
  return res.data;
};

export const updateReplacementApi = async (id, data) => {
  const res = await Api.put(`/orders/${id}/replacement`, data);
  return res.data;
};

// For PDF binary download
export const downloadInvoiceApi = async (id) => {
  const res = await Api.get(`/orders/${id}/invoice`, {
    responseType: "blob",
    params: { t: Date.now() }, // cache-buster
  });
  return res.data;
};

export const downloadLabelApi = async (id) => {
  const res = await Api.get(`/orders/${id}/label`, {
    responseType: "blob",
    params: { t: Date.now() }, // cache-buster
  });
  return res.data;
};

/* ================= WARRANTY REGISTRATIONS ================= */

export const getWarrantyRequestsApi = async () => {
  const res = await Api.get("/warranty");
  return res.data;
};

export const updateWarrantyStatusApi = async (id, status) => {
  const res = await Api.put(`/warranty/${id}/status`, { status });
  return res.data;
};

/* ================= ATTRIBUTES ================= */

/* GET ALL */
export const getAttributesApi = async () => {
  const res = await Api.get("/attributes");
  return res.data;
};

// create
export const createAttributeApi = async (data) => {
  const res = await Api.post("/attributes", data);
  return res.data;
};
// update
export const updateAttributeApi = async (id, data) => {
  const res = await Api.put(`/attributes/${id}`, data);
  return res.data;
};
// delete
export const deleteAttributeApi = async (id) => {
  const res = await Api.delete(`/attributes/${id}`);
  return res.data;
};

export const getCategoryAttributesFullApi = async (categoryId) => {
  const res = await Api.get(`/category-attributes/full/${categoryId}`);
  return res.data;
};

export const assignProductAttributesApi = async (data) => {
  const res = await Api.post("/product-attributes/bulk", data);
  return res.data;
};

export const saveProductVariantsApi = async (data) => {
  const res = await Api.post("/product-variants/bulk", data);
  return res.data;
};

/**
 * Ek variant delete (DB primary key = variantId).
 * productId optional — server par match verify ke liye bhej sakte ho.
 */
export const deleteProductVariantApi = async (variantId, productId) => {
  const res = await Api.delete(`/product-variants/${variantId}`, {
    params: productId != null && productId !== "" ? { product_id: productId } : {},
  });
  return res.data;
};

/* CATEGORY ATTRIBUTES */

export const getCategoryAttributesApi = async (categoryId) => {
  const res = await Api.get(`/category-attributes/${categoryId}`);
  return res.data;
};

export const assignCategoryAttributesApi = async (data) => {
  const res = await Api.post("/category-attributes/assign", data);
  return res.data;
};

// get all orders
export const getOrdersAdminApi = async () => {
  const res = await Api.get("/orders");
  return res.data;
};

// update status
export const updateOrderStatusApi = async (id, status) => {
  const res = await Api.put(`/orders/${id}/status`, { status });
  return res.data;
};

// update shipping
export const updateShippingApi = async (id, data) => {
  const res = await Api.put(`/orders/${id}/shipping`, data);
  return res.data;
};

export const generateInvoiceApi = async (id) => {
  const res = await Api.get(`/orders/${id}/invoice`);
  return res.data;
};

export const generateLabelApi = async (id) => {
  const res = await Api.get(`/orders/${id}/label`);
  return res.data;
};

/* ================= SEO ================= */

// GET ALL SEO
export const getSEOApi = async () => {
  const res = await Api.get("/seo");
  return res.data;
};

// CREATE SEO
export const createSEOApi = async (data) => {
  const res = await Api.post("/seo", data);
  return res.data;
};

// UPDATE SEO
export const updateSEOApi = async (id, data) => {
  const res = await Api.put(`/seo/${id}`, data);
  return res.data;
};

// DELETE SEO
export const deleteSEOApi = async (id) => {
  const res = await Api.delete(`/seo/${id}`);
  return res.data;
};

// TOGGLE STATUS
export const toggleSEOStatusApi = async (id) => {
  const res = await Api.patch(`/seo/${id}/status`);
  return res.data;
};

/* ================= BLOGS ================= */

export const getBlogsApi = async () => {
  const res = await Api.get("/blogs");
  return res.data;
};

export const createBlogApi = async (data) => {
  const res = await Api.post("/blogs", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateBlogApi = async (id, data) => {
  const res = await Api.put(`/blogs/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteBlogApi = async (id) => {
  const res = await Api.delete(`/blogs/${id}`);
  return res.data;
};

/* ================= ABOUT ================= */

export const getAboutApi = async () => {
  const res = await Api.get("/about");
  return res.data;
};

export const getAboutListApi = async () => {
  const res = await Api.get("/about/all");
  return res.data;
};

export const getAboutByIdApi = async (id) => {
  const res = await Api.get(`/about/${id}`);
  return res.data;
};

export const createAboutApi = async (data) => {
  const res = await Api.post("/about", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateAboutApi = async (id, data) => {
  const res = await Api.put(`/about/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteAboutApi = async (id) => {
  const res = await Api.delete(`/about/${id}`);
  return res.data;
};

/* ================= FOOTER ================= */

export const getFooterApi = async () => {
  const res = await Api.get("/footer");
  return res.data;
};

export const createFooterApi = async (data) => {
  const res = await Api.post("/footer", data);
  return res.data;
};

export const updateFooterApi = async (id, data) => {
  const res = await Api.put(`/footer/${id}`, data);
  return res.data;
};

export const deleteFooterApi = async (id) => {
  const res = await Api.delete(`/footer/${id}`);
  return res.data;
};

// popular products

export const getPopularProductsApi = async () => {
  const res = await Api.get("/popular-products");
  return res.data;
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
    return normalizeAdminLatestList(res.data);
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 501) return [];
    throw e;
  }
};

export const addMostSellingProductsApi = async (productIds) => {
  const res = await Api.post("/most-selling-products", { productIds });
  return res.data;
};

export const deleteMostSellingProductApi = async (id) => {
  const res = await Api.delete(`/most-selling-products/${id}`);
  return res.data;
};

/* ================= LATEST PRODUCTS (curated homepage) ================= */

function extractLatestListPayload(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  const inner = payload.data ?? payload.products ?? payload.latestProducts ?? payload.items ?? payload.rows;
  return Array.isArray(inner) ? inner : [];
}

/** Join rows { id, Product }; flat /products/latest → read-only rows */
function normalizeAdminLatestList(payload) {
  const rows = extractLatestListPayload(payload);
  if (!rows.length) return [];
  const joinShape = rows.some((r) => r && typeof r === "object" && (r.Product != null || r.product != null));
  if (joinShape) {
    return rows
      .map((item) => {
        const P = item?.Product ?? item?.product;
        if (!P) return null;
        return { ...item, Product: P };
      })
      .filter(Boolean);
  }
  return rows.map((p) => ({ _readOnlyCurated: true, Product: p }));
}

function normalizeAdminDealsList(payload) {
  const rows = extractLatestListPayload(payload);
  if (!rows.length) return [];
  const joinShape = rows.some((r) => r && typeof r === "object" && (r.Product != null || r.product != null));
  if (joinShape) {
    return rows
      .map((item) => {
        const P = item?.Product ?? item?.product;
        if (!P) return null;
        return { ...item, Product: P };
      })
      .filter(Boolean);
  }
  return rows.map((p) => ({ _readOnlyCurated: true, Product: p }));
}

export const getLatestProductsApi = async () => {
  try {
    const res = await Api.get("/latest-products");
    return normalizeAdminLatestList(res.data);
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 501) {
      try {
        const res = await Api.get("/products/latest");
        return normalizeAdminLatestList(res.data);
      } catch {
        return [];
      }
    }
    throw e;
  }
};

export const addLatestProductsApi = async (productIds) => {
  const res = await Api.post("/latest-products", { productIds });
  return res.data;
};

export const deleteLatestProductApi = async (id) => {
  const res = await Api.delete(`/latest-products/${id}`);
  return res.data;
};

/* ================= DEALS PRODUCTS (homepage) ================= */

export const getDealsProductsApi = async () => {
  try {
    const res = await Api.get("/deals");
    return normalizeAdminDealsList(res.data);
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404 || status === 501) return [];
    throw e;
  }
};

export const addDealsProductsApi = async (payload) => {
  const res = await Api.post("/deals", payload);
  return res.data;
};

export const deleteDealsProductApi = async (id) => {
  const res = await Api.delete(`/deals/${id}`);
  return res.data;
};

export const updateDealsProductApi = async (id, payload) => {
  const res = await Api.put(`/deals/${id}`, payload);
  return res.data;
};

/* ================= PRODUCT REVIEWS (admin panel) ================= */

export const getAdminProductReviewsApi = async (params = {}) => {
  const res = await Api.get("/reviews/admin", { params });
  return res.data;
};

export const getProductReviewsByProductApi = async (productId, params = {}) => {
  const res = await Api.get(`/reviews/product/${productId}`, { params });
  return res.data;
};

/** Collect image File objects from admin Reviews UI */
function reviewImageFiles(images) {
  if (!Array.isArray(images)) return [];
  return images.filter((f) => f instanceof File);
}

export const createProductReviewApi = async (data) => {
  const files = reviewImageFiles(data?.images);

  if (files.length === 0) {
    const body = { ...data };
    delete body.images;
    const res = await Api.post("/reviews/admin", body);
    return res.data;
  }

  const fd = new FormData();
  if (data.product_id != null) fd.append("product_id", String(data.product_id));
  if (data.user_id != null) fd.append("user_id", String(data.user_id));
  fd.append("rating", String(data.rating ?? ""));
  fd.append("comment", data.comment == null || data.comment === "" ? "" : String(data.comment));
  const rn = data.reviewerName ?? data.reviewer_name;
  if (rn != null && String(rn).trim() !== "") {
    const name = String(rn).trim();
    fd.append("reviewer_name", name);
    fd.append("reviewerName", name);
  }
  if (data.reviewedAt != null && data.reviewedAt !== "") {
    const raw = data.reviewedAt;
    const iso = typeof raw === "string" ? raw : new Date(raw).toISOString();
    fd.append("reviewed_at", iso);
    fd.append("reviewedAt", iso);
  }
  files.forEach((file) => fd.append("images", file));

  /* Let Axios/browser set multipart boundary — do not set Content-Type manually */
  const res = await Api.post("/reviews/admin", fd);
  return res.data;
};

export const updateProductReviewApi = async (id, data) => {
  const files = reviewImageFiles(data?.images);

  if (files.length === 0) {
    const body = { ...data };
    delete body.images;
    const res = await Api.put(`/reviews/admin/${id}`, body);
    return res.data;
  }

  const fd = new FormData();
  fd.append("rating", String(data.rating ?? ""));
  if (data.comment != null) fd.append("comment", String(data.comment));
  const rn = data.reviewerName ?? data.reviewer_name;
  if (rn != null && String(rn).trim() !== "") {
    const name = String(rn).trim();
    fd.append("reviewer_name", name);
    fd.append("reviewerName", name);
  }
  if (data.reviewedAt != null && data.reviewedAt !== "") {
    const raw = data.reviewedAt;
    const iso = typeof raw === "string" ? raw : new Date(raw).toISOString();
    fd.append("reviewed_at", iso);
    fd.append("reviewedAt", iso);
  }
  if (Array.isArray(data.existingImageUrls)) {
    fd.append("existing_image_urls", JSON.stringify(data.existingImageUrls));
    fd.append("existingImageUrls", JSON.stringify(data.existingImageUrls));
  }
  files.forEach((file) => fd.append("images", file));

  const res = await Api.put(`/reviews/admin/${id}`, fd);
  return res.data;
};

export const deleteProductReviewApi = async (id) => {
  const res = await Api.delete(`/reviews/admin/${id}`);
  return res.data;
};
