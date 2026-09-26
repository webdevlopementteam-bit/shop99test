import sequelize from "@/lib/db.js";
import { saveUploadedFiles } from "@/lib/upload.js";

const MAX_REVIEW_IMAGES = 10;

export const orderByReviewDate = [
  [sequelize.fn("COALESCE", sequelize.col("ProductReview.reviewed_at"), sequelize.col("ProductReview.createdAt")), "DESC"],
];

/** ISO / parseable date; no future dates (2m skew). Null = caller may use new Date(). */
export const parseReviewedAt = (body) => {
  const raw = body?.reviewedAt ?? body?.review_date ?? body?.reviewed_at;
  if (raw == null || raw === "") return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now() + 120000) return null;
  return d;
};

const parseImagesFromBody = (body) => {
  const raw = body?.images ?? body?.imageUrls;
  if (raw == null) return [];
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      return Array.isArray(p) ? p.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  return [];
};

/** formData "images" files -> saved filenames, mirroring multer's upload.fields([{name:"images"}]). */
export async function resolveImagesForCreate(formData, body) {
  if (String(body?.clearImages) === "true" || body?.clearImages === "1") {
    return null;
  }
  const uploadedFilenames = await saveUploadedFiles(formData, "images");
  const uploaded = uploadedFilenames.map((f) => `/uploads/${f}`);
  const fromBody = parseImagesFromBody(body);
  const merged = [...fromBody, ...uploaded].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const u of merged) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= MAX_REVIEW_IMAGES) break;
  }
  return out.length ? out : null;
}

export async function resolveImagesForUpdate(formData, body) {
  const clear = String(body?.clearImages) === "true" || body?.clearImages === "1";
  if (clear) return null;

  const imageFiles = formData.getAll("images").filter((f) => f && typeof f !== "string" && f.name);
  const hasNewInput = imageFiles.length > 0 || body?.images !== undefined || body?.imageUrls !== undefined;

  if (!hasNewInput) return undefined;

  const uploadedFilenames = await saveUploadedFiles(formData, "images");
  const uploaded = uploadedFilenames.map((f) => `/uploads/${f}`);
  const fromBody = parseImagesFromBody(body);
  const merged = [...fromBody, ...uploaded].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const u of merged) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= MAX_REVIEW_IMAGES) break;
  }
  return out.length ? out : null;
}

export const parseRating = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
};
