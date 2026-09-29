// Server-only SEO helpers for generateMetadata().
//
// Reads the admin-managed `seo` table straight from the DB instead of
// self-fetching /api/seo over HTTP: static pages run generateMetadata at
// build time, when the site isn't reachable yet, and a failed fetch
// used to bake "Default Title" into the page until the next deploy.

import { Op } from "sequelize";
import SEO from "@/lib/models/seoModel.js";

import { SITE_URL, siteHostnames } from "@/lib/siteConfig";

export { SITE_URL };

/**
 * Admin entries are keyed by `page_name`, which is either a page key
 * ("home", "shop-category-car-charger") or — for pages without a key, like a
 * single product — the page's path or full URL. A full URL matches by its
 * path only, whatever domain it was typed with, so entries keep working when
 * NEXT_PUBLIC_SITE_URL differs (local / test / live). Returns the best active
 * entry: page key, then exact path, then URL. Throws on DB errors (so a build
 * fails loudly and a background revalidation keeps the last good page, rather
 * than caching defaults).
 * @param {string|null} pageKey
 * @param {string} pathname e.g. "/productPage/541"
 */
export async function findSeoEntry(pageKey, pathname) {
  const exact = [pageKey, pathname, pathname === "/" ? null : `${pathname}/`].filter(Boolean);
  const like = pathname.replace(/[\\%_]/g, "\\$&");

  const rows = await SEO.findAll({
    where: {
      is_active: "active",
      [Op.or]: [
        { page_name: { [Op.in]: exact } },
        { page_name: { [Op.like]: `http%${like}` } },
        { page_name: { [Op.like]: `http%${like}/` } },
        ...(pathname === "/" ? [{ page_name: { [Op.like]: "http%" } }] : []),
      ],
    },
  });

  const urlPath = (name) => {
    try {
      const p = new URL(name).pathname.replace(/\/+$/, "");
      return p || "/";
    } catch {
      return null;
    }
  };
  // MySQL's default collation matches page_name case-insensitively ("Home" = "home").
  const rank = (row) => {
    const name = String(row.page_name);
    const i = exact.findIndex((k) => k.toLowerCase() === name.toLowerCase());
    if (i !== -1) return i;
    return urlPath(name) === pathname ? exact.length : -1;
  };
  const matches = rows.filter((r) => rank(r) !== -1).sort((a, b) => rank(a) - rank(b));
  return matches.length ? matches[0].get({ plain: true }) : null;
}

const text = (v) => (v == null ? "" : String(v).trim());

/** Admin canonical_url, accepted only on this site's own domain (NEXT_PUBLIC_SITE_URL)
 * and rewritten onto SITE_URL. Anything else (staging domains, typos) is
 * ignored so it can't point search engines away from the live site. */
function siteCanonical(raw) {
  const s = text(raw);
  if (!s) return null;
  try {
    const u = new URL(s, SITE_URL);
    if (!siteHostnames().includes(u.hostname)) {
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
