// Server-only SEO helpers for generateMetadata().
//
// Reads the admin-managed `seo` table straight from the DB instead of
// self-fetching /api/seo over HTTP: static pages run generateMetadata at
// build time, when no server is listening on FRONTEND_URL, and a failed fetch
// used to bake "Default Title" into the page until the next deploy.

import { Op } from "sequelize";
import SEO from "@/lib/models/seoModel.js";

export const SITE_URL = "https://www.shop99.co.in";

/**
 * Admin entries are keyed by `page_name`, which is either a page key
 * ("home", "shop-category-car-charger") or — for pages without a key, like a
 * single product — the page's URL or path. Returns the first active entry,
 * preferring earlier keys. Throws on DB errors (so a build fails loudly and a
 * background revalidation keeps the last good page, rather than caching
 * defaults).
 * @param {string|null} pageKey
 * @param {string} pathname e.g. "/productPage/541"
 */
export async function findSeoEntry(pageKey, pathname) {
  const keys = [pageKey, pathname, `${SITE_URL}${pathname}`, `${SITE_URL}${pathname}/`].filter(Boolean);
  if (pathname === "/") keys.push(SITE_URL);

  const rows = await SEO.findAll({
    where: { page_name: { [Op.in]: keys }, is_active: "active" },
  });
  if (!rows.length) return null;

  // MySQL's default collation matches page_name case-insensitively ("Home" = "home").
  const rank = (row) => keys.findIndex((k) => k.toLowerCase() === String(row.page_name).toLowerCase());
  rows.sort((a, b) => rank(a) - rank(b));
  return rows[0].get({ plain: true });
}

const text = (v) => (v == null ? "" : String(v).trim());

/** Admin canonical_url, accepted only on this site's own domain and forced to
 * the www host the sitemap uses. Anything else (staging domains, typos) is
 * ignored so it can't point search engines away from the live site. */
function siteCanonical(raw) {
  const s = text(raw);
  if (!s) return null;
  try {
    const u = new URL(s, SITE_URL);
    if (u.hostname !== "www.shop99.co.in" && u.hostname !== "shop99.co.in") {
      console.warn(`[seo] ignoring off-site canonical_url: ${s}`);
      return null;
    }
    return `${SITE_URL}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** Absolute URL for an uploaded file name (or pass-through if already absolute). */
export function uploadUrl(file) {
  const f = text(file);
  if (!f) return null;
  if (/^https?:\/\//i.test(f)) return f;
  return `${SITE_URL}/uploads/${f.replace(/^\/+/, "").replace(/^uploads\//, "")}`;
}

/**
 * Layers an admin SEO entry over a page's own metadata. Only non-empty admin
 * fields win, so e.g. a product keeps its own description unless the admin set one.
 * @param {import('next').Metadata} base
 * @param {object|null} seo row from findSeoEntry
 * @returns {import('next').Metadata}
 */
export function applySeoEntry(base, seo) {
  if (!seo) return base;

  const title = text(seo.meta_title) || base.title;
  const description = text(seo.meta_description) || base.description;
  const keywords = text(seo.meta_keywords) || base.keywords;
  const canonical = siteCanonical(seo.canonical_url) || base.alternates?.canonical;
  const ogImage = uploadUrl(seo.og_image);

  return {
    ...base,
    title,
    description,
    keywords,
    alternates: { ...base.alternates, canonical },
    openGraph: {
      ...base.openGraph,
      // Admin meta fields beat the page's own OG text when no OG override is set.
      title: text(seo.og_title) || (text(seo.meta_title) ? title : base.openGraph?.title || title),
      description:
        text(seo.og_description) ||
        (text(seo.meta_description) ? description : base.openGraph?.description || description),
      url: canonical,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
