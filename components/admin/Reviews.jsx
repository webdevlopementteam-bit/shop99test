"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  Star,
  Trash2,
  Pencil,
  Search,
  RefreshCw,
  MessageSquare,
  Package,
  Plus,
  X,
  Image as ImageIcon,
} from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import {
  getAdminProductReviewsApi,
  getProductReviewsByProductApi,
  getProductsApi,
  getUsersApi,
  createProductReviewApi,
  updateProductReviewApi,
  deleteProductReviewApi,
  BASE_URL,
} from "@/lib/adminApi";

/** API origin for static files; env overrides production hostname */
const UPLOAD_ORIGIN = (() => {
  const fromEnv =
    (typeof process !== "undefined" && process.env?.REACT_APP_API_ORIGIN) ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_API_ORIGIN) ||
    "";
  const base = (fromEnv || BASE_URL || "").replace(/\/$/, "");
  return base;
})();

function reviewImageSrc(path) {
  if (!path || typeof path !== "string") return "";
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (!UPLOAD_ORIGIN) return "";
  let rel = p.replace(/^\/+/, "");
  if (rel && !rel.startsWith("uploads/")) {
    rel = `uploads/${rel}`;
  }
  return `${UPLOAD_ORIGIN}/${rel}`;
}

function normalizeReviewsPayload(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.reviews)) return data.reviews;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.rows)) return data.rows;
  return [];
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

function pickReviewDisplayDate(r) {
  const d = r.reviewed_at ?? r.reviewedAt ?? r.createdAt;
  return d || null;
}

function toDatetimeLocalValue(isoOrDate) {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function pickUserLabel(r) {
  const rn = r.reviewer_name != null && String(r.reviewer_name).trim();
  if (rn) return String(r.reviewer_name).trim();
  const u = r.User || r.user || {};
  return (
    u.name ||
    u.email ||
    u.phone ||
    (r.user_id != null ? `User #${r.user_id}` : "Guest")
  );
}

function pickProductLabel(r) {
  const p = r.Product || r.product || {};
  return p.name || r.product_name || (r.product_id != null ? `Product #${r.product_id}` : "—");
}

function StarRow({ value, size = 14 }) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${v} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= v ? "fill-amber-400 text-amber-400" : "text-gray-600"
          }
        />
      ))}
    </span>
  );
}

async function loadReviewsFallback() {
  const raw = await getProductsApi(1, 100);
  const products = Array.isArray(raw?.data) ? raw.data : [];

  const merged = [];
  const chunk = 15;
  for (let i = 0; i < products.length; i += chunk) {
    const slice = products.slice(i, i + chunk);
    const part = await Promise.all(
      slice.map(async (p) => {
        const pid = p.id ?? p.product_id;
        if (pid == null) return [];
        try {
          const res = await getProductReviewsByProductApi(pid, { limit: 100 });
          const list = normalizeReviewsPayload(res);
          return list.map((rev) => ({
            ...rev,
            product_id: rev.product_id ?? pid,
            Product: rev.Product ?? rev.product ?? { name: p.name },
          }));
        } catch {
          return [];
        }
      })
    );
    part.forEach((arr) => merged.push(...arr));
  }
  return merged;
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("admin");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editReviewerName, setEditReviewerName] = useState("");
  const [editReviewedAtLocal, setEditReviewedAtLocal] = useState("");
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editExistingUrls, setEditExistingUrls] = useState([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addProductId, setAddProductId] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [addReviewerName, setAddReviewerName] = useState("");
  const [addRating, setAddRating] = useState(5);
  const [addComment, setAddComment] = useState("");
  const [addReviewedAtLocal, setAddReviewedAtLocal] = useState("");
  const [addImageFiles, setAddImageFiles] = useState([]);
  const [addSaving, setAddSaving] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [addDataLoading, setAddDataLoading] = useState(false);
  const [addSheetEntered, setAddSheetEntered] = useState(false);

  const closeAddPanel = (force = false) => {
    if (!force && (addSaving || addDataLoading)) return;
    setAddSheetEntered(false);
    window.setTimeout(() => setAddOpen(false), 320);
  };

  const openAddModal = async () => {
    setAddOpen(true);
    setAddProductId("");
    setAddUserId("");
    setAddReviewerName("");
    setAddRating(5);
    setAddComment("");
    setAddReviewedAtLocal("");
    setAddImageFiles([]);
    setAddDataLoading(true);
    try {
      const [proRes, usersRaw] = await Promise.all([
        getProductsApi(1, 500),
        getUsersApi().catch(() => []),
      ]);
      setProductOptions(Array.isArray(proRes?.data) ? proRes.data : []);
      const users = Array.isArray(usersRaw) ? usersRaw : [];
      setUserOptions(users);
    } catch (e) {
      console.error(e);
      toast.error("Products / users load failed");
    } finally {
      setAddDataLoading(false);
    }
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const adminRes = await getAdminProductReviewsApi({ limit: 500, page: 1 });
      const list = normalizeReviewsPayload(adminRes);
      setReviews(list);
      setSource("admin");
    } catch {
      try {
        const merged = await loadReviewsFallback();
        setReviews(merged);
        setSource("products");
        if (!merged.length) {
          toast.warning("Reviews not found");
        }
      } catch (e2) {
        console.error(e2);
        setReviews([]);
        setSource("error");
        toast.error("Reviews load failed.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAddReview = async () => {
    const pid = Number(addProductId);
    if (!Number.isFinite(pid) || pid <= 0) {
      toast.error("Please select a product");
      return;
    }
    const uid = addUserId ? Number(addUserId) : NaN;
    const hasUser = Number.isFinite(uid) && uid > 0;
    const guestName = addReviewerName.trim();

    if (!hasUser && !guestName) {
      return;
    }

    setAddSaving(true);
    try {
      const payload = {
        product_id: pid,
        rating: addRating,
        comment: addComment.trim() || null,
        images: addImageFiles,
      };
      if (addReviewedAtLocal) {
        payload.reviewedAt = new Date(addReviewedAtLocal).toISOString();
      }
      if (hasUser) {
        payload.user_id = uid;
      } else {
        payload.reviewerName = guestName;
      }

      const created = await createProductReviewApi(payload);
      toast.success("Review added successfully");
      closeAddPanel(true);
      const row = created?.data ?? created?.review ?? created;
      if (row && typeof row === "object" && row.id != null) {
        const pname =
          productOptions.find((p) => Number(p.id) === pid)?.name ||
          `Product #${pid}`;
        const uname = hasUser
          ? userOptions.find((u) => Number(u.id) === uid)?.name || `User #${uid}`
          : guestName;
        setReviews((prev) => [
          {
            ...row,
            product_id: row.product_id ?? pid,
            user_id: row.user_id ?? (hasUser ? uid : null),
            reviewer_name: row.reviewer_name ?? (!hasUser ? guestName : undefined),
            Product: row.Product || row.product || { name: pname },
            User: row.User || row.user || (hasUser ? { name: uname } : null),
          },
          ...prev,
        ]);
        setPage(1);
      } else {
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Add failed";
      toast.error(msg);
    } finally {
      setAddSaving(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (!addOpen) {
      setAddSheetEntered(false);
      return;
    }
    setAddSheetEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAddSheetEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [addOpen]);

  const filtered = useMemo(() => {
    let rows = reviews;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const u = pickUserLabel(r).toLowerCase();
        const p = pickProductLabel(r).toLowerCase();
        const c = String(r.comment ?? "").toLowerCase();
        return u.includes(q) || p.includes(q) || c.includes(q);
      });
    }
    if (ratingFilter !== "all") {
      const want = Number(ratingFilter);
      rows = rows.filter((r) => Number(r.rating) === want);
    }
    return rows;
  }, [reviews, search, ratingFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, total: 0 };
    const sum = reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
    return { avg: sum / reviews.length, total: reviews.length };
  }, [reviews]);

  const openEdit = (r) => {
    setEditRow(r);
    setEditRating(Number(r.rating) || 5);
    setEditComment(String(r.comment ?? ""));
    setEditReviewerName(
      r.reviewer_name != null ? String(r.reviewer_name) : pickUserLabel(r)
    );
    setEditReviewedAtLocal(toDatetimeLocalValue(pickReviewDisplayDate(r)));
    setEditExistingUrls(pickReviewImages(r));
    setEditNewFiles([]);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow?.id) return;
    setSaving(true);
    try {
      const payload = {
        rating: editRating,
        comment: editComment.trim() || null,
        reviewerName: editReviewerName.trim() || undefined,
        images: editNewFiles,
        existingImageUrls: editExistingUrls,
      };
      if (editReviewedAtLocal) {
        payload.reviewedAt = new Date(editReviewedAtLocal).toISOString();
      }

      await updateProductReviewApi(editRow.id, payload);
      toast.success("Review updated successfully");
      setEditOpen(false);
      setEditRow(null);
      await fetchReviews();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteProductReviewApi(deleteTarget.id);
      setReviews((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      toast.success("Review deleted successfully");
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const removeEditExistingUrl = (url) => {
    setEditExistingUrls((prev) => prev.filter((u) => u !== url));
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col text-white">
      <div className="shrink-0 border-b border-gray-800/80 bg-[#0B0F19]/50 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Reviews</h2>
            <p className="mt-1 text-sm text-gray-500">
              Customer ratings & comments — Content → Reviews
              {source === "products" && (
                <span className="ml-2 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                  Loaded via products (admin API unavailable)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-95"
            >
              <Plus size={18} />
              Add review
            </button>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                fetchReviews();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-[#111827] px-4 py-2.5 text-sm text-gray-200 transition hover:border-teal-500/40 hover:text-white"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total reviews
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Average rating
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-semibold text-white">
                {stats.total ? stats.avg.toFixed(1) : "—"}
              </span>
              {stats.total > 0 && <StarRow value={Math.round(stats.avg)} size={18} />}
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Search
            </p>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                placeholder="Product, customer, comment…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-700 bg-[#020617] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500">Filter by stars:</span>
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-gray-200 outline-none focus:border-teal-500/50"
          >
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} stars
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Loading reviews…
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-800/80 bg-[#111827] shadow-xl">
            <div className="custom-scrollbar min-h-[320px] flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-y-1 text-sm">
                <thead className="sticky top-0 z-10 bg-[#0B0F19] text-left text-xs font-semibold uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgba(55,65,81,0.6)]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 pl-5">Product</th>
                    <th className="whitespace-nowrap px-4 py-3">Customer</th>
                    <th className="whitespace-nowrap px-4 py-3">Rating</th>
                    <th className="min-w-[160px] px-4 py-3">Photos</th>
                    <th className="min-w-[220px] px-4 py-3">Comment</th>
                    <th className="whitespace-nowrap px-4 py-3">Date</th>
                    <th className="whitespace-nowrap px-4 py-3 pr-5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {slice.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center text-gray-500"
                      >
                        <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                        No reviews match your filters.
                      </td>
                    </tr>
                  ) : (
                    slice.map((r) => {
                      const imgs = pickReviewImages(r);
                      const disp = pickReviewDisplayDate(r);
                      return (
                        <tr
                          key={r.id}
                          className="bg-[#161b26] shadow-sm transition hover:bg-[#1c2333]"
                        >
                          <td className="rounded-l-lg px-4 py-3 pl-5 align-top">
                            <div className="flex items-start gap-2">
                              <Package
                                size={16}
                                className="mt-0.5 shrink-0 text-teal-500/80"
                              />
                              <div className="min-w-0">
                                <p className="line-clamp-2 font-medium text-white">
                                  {pickProductLabel(r)}
                                </p>
                                {r.product_id != null && (
                                  <Link
                                    href={`/admin/products/edit/${r.product_id}`}
                                    className="mt-1 inline-block text-xs text-teal-400 hover:underline"
                                  >
                                    Edit product #{r.product_id}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-gray-300">
                            {pickUserLabel(r)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StarRow value={r.rating} />
                          </td>
                          <td className="px-4 py-3 align-top">
                            {imgs.length === 0 ? (
                              <span className="text-xs text-gray-600">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {imgs.slice(0, 4).map((src) => (
                                  <a
                                    key={src}
                                    href={reviewImageSrc(src)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block h-12 w-12 shrink-0 overflow-hidden rounded border border-gray-700 bg-[#0B0F19]"
                                  >
                                    <img
                                      src={reviewImageSrc(src)}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </a>
                                ))}
                                {imgs.length > 4 && (
                                  <span className="inline-flex h-12 w-12 items-center justify-center rounded border border-gray-700 bg-[#0B0F19] text-xs text-gray-500">
                                    +{imgs.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="max-w-md px-4 py-3 align-top text-gray-400">
                            <p className="line-clamp-3 whitespace-pre-wrap">
                              {r.comment?.trim() ? r.comment : "—"}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-gray-500">
                            {disp ? (
                              <>
                                <div>{new Date(disp).toLocaleString()}</div>
                                {r.reviewed_at &&
                                  r.createdAt &&
                                  String(r.reviewed_at) !== String(r.createdAt) && (
                                    <div className="mt-0.5 text-[10px] text-gray-600">
                                      Added{" "}
                                      {new Date(r.createdAt).toLocaleDateString()}
                                    </div>
                                  )}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="rounded-r-lg px-4 py-3 pr-5 align-top text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(r)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-[#0B0F19] px-2.5 py-1.5 text-xs text-gray-200 hover:border-teal-500/50 hover:text-teal-300"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(r)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 border-t border-gray-800/80 bg-[#0f1419] px-2 py-4 sm:px-4">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Close"
            className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ease-out ${
              addSheetEntered ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => closeAddPanel()}
          />
          <aside
            className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-gray-700/90 bg-[#0b1220] shadow-[-12px_0_40px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out ${
              addSheetEntered ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-800 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Add review</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Registered user = ek product par ek review. Guest = naam + stars. Optional
                  photos & backdate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeAddPanel()}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
                aria-label="Close panel"
              >
                <X size={20} />
              </button>
            </div>

            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
              {addDataLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-sm text-gray-500">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400" />
                  Loading products & users…
                </div>
              ) : (
                <>
                  <label className="block text-xs font-medium text-gray-400">
                    Product
                  </label>
                  <select
                    value={addProductId}
                    onChange={(e) => setAddProductId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
                  >
                    <option value="">— Select product —</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {(p.name || "").slice(0, 60)}
                        {p.name && p.name.length > 60 ? "…" : ""} (#{p.id})
                      </option>
                    ))}
                  </select>
                  {productOptions.length === 0 && (
                    <>
                      <label className="mt-3 block text-xs font-medium text-gray-400">
                        Product ID (manual)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={addProductId}
                        onChange={(e) => setAddProductId(e.target.value)}
                        placeholder="e.g. 18"
                        className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
                      />
                    </>
                  )}

                  <label className="mt-4 block text-xs font-medium text-gray-400">
                    Customer (optional — guest ke liye khali + niche naam)
                  </label>
                  <select
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
                  >
                    <option value="">— Guest / manual name —</option>
                    {userOptions.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name || "User"} {u.phone ? `· ${u.phone}` : ""} (#
                        {u.id})
                      </option>
                    ))}
                  </select>
                  {userOptions.length === 0 && (
                    <p className="mt-2 text-xs text-amber-400/90">
                      Users list empty — guest naam niche use karein.
                    </p>
                  )}

                  <label className="mt-4 block text-xs font-medium text-gray-400">
                    Guest / display name (jab user select na ho)
                  </label>
                  <input
                    type="text"
                    value={addReviewerName}
                    onChange={(e) => setAddReviewerName(e.target.value)}
                    placeholder="e.g. Rahul (guest review)"
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white placeholder:text-gray-600"
                  />

                  <label className="mt-4 block text-xs font-medium text-gray-400">
                    Review date (optional — backdate)
                  </label>
                  <input
                    type="datetime-local"
                    value={addReviewedAtLocal}
                    onChange={(e) => setAddReviewedAtLocal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
                  />

                  <label className="mt-4 block text-xs font-medium text-gray-400">
                    Rating (1–5)
                  </label>
                  <select
                    value={addRating}
                    onChange={(e) => setAddRating(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  <label className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-400">
                    <ImageIcon size={14} className="text-teal-500/80" />
                    Photos (optional, max 10)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="mt-1 block w-full text-sm text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-gray-800 file:px-2 file:py-1 file:text-white"
                    onChange={(e) => {
                      const list = Array.from(e.target.files || []).slice(0, 10);
                      setAddImageFiles(list);
                    }}
                  />
                  {addImageFiles.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {addImageFiles.length} file(s) selected
                    </p>
                  )}

                  <label className="mt-4 block text-xs font-medium text-gray-400">
                    Comment
                  </label>
                  <textarea
                    value={addComment}
                    onChange={(e) => setAddComment(e.target.value)}
                    rows={4}
                    className="mt-1 w-full resize-none rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white placeholder:text-gray-600"
                    placeholder="Optional"
                  />

                  <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-800 pt-4">
                    <button
                      type="button"
                      disabled={addSaving}
                      onClick={() => closeAddPanel()}
                      className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={addSaving}
                      onClick={submitAddReview}
                      className="rounded-lg bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-4 py-2 text-sm font-medium text-white shadow-md disabled:opacity-50"
                    >
                      {addSaving ? "Saving…" : "Add review"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {editOpen && editRow && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !saving && setEditOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-700 bg-[#0f172a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Edit review</h3>
            <p className="mt-1 text-xs text-gray-500">
              Review #{editRow.id} · {pickProductLabel(editRow)}
            </p>

            <label className="mt-4 block text-xs font-medium text-gray-400">
              Display name
            </label>
            <input
              type="text"
              value={editReviewerName}
              onChange={(e) => setEditReviewerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
            />

            <label className="mt-4 block text-xs font-medium text-gray-400">
              Review date (backdate)
            </label>
            <input
              type="datetime-local"
              value={editReviewedAtLocal}
              onChange={(e) => setEditReviewedAtLocal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
            />

            <label className="mt-4 block text-xs font-medium text-gray-400">
              Rating (1–5)
            </label>
            <select
              value={editRating}
              onChange={(e) => setEditRating(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2.5 text-sm text-white"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <label className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-400">
              <ImageIcon size={14} className="text-teal-500/80" />
              Images — click × to remove; add more below (replaces list when saved)
            </label>
            {editExistingUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {editExistingUrls.map((url) => (
                  <div
                    key={url}
                    className="relative h-16 w-16 overflow-hidden rounded border border-gray-600"
                  >
                    <img
                      src={reviewImageSrc(url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeEditExistingUrl(url)}
                      className="absolute right-0 top-0 rounded-bl bg-red-600/90 p-0.5 text-white"
                      aria-label="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-2 block w-full text-sm text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-gray-800 file:px-2 file:py-1 file:text-white"
              onChange={(e) => {
                const list = Array.from(e.target.files || []).slice(0, 10);
                setEditNewFiles(list);
              }}
            />
            {editNewFiles.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                +{editNewFiles.length} new file(s)
              </p>
            )}

            <label className="mt-4 block text-xs font-medium text-gray-400">
              Comment
            </label>
            <textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white placeholder:text-gray-600"
              placeholder="Optional"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="rounded-lg bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-4 py-2 text-sm font-medium text-white shadow-md disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-700 bg-[#0f172a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Delete review?</h3>
            <p className="mt-2 text-sm text-gray-400">
              Ye review permanently hata diya jayega. Product:{" "}
              <span className="text-gray-200">{pickProductLabel(deleteTarget)}</span>
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
