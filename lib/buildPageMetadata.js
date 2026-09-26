// Replaces the old components/SEO.jsx + Preloaded*SeoContext + entry-server.jsx
// custom hoisting pipeline. Next.js's generateMetadata() owns <head> natively,
// so there's no more manual title/meta/link tag reconciliation to race —
// this is what fixed the old duplicate/stale-canonical-on-navigation bugs
// structurally rather than papering over them.
import { getSEOByPageApi } from "@/lib/api.js";
import { resolveSeoPageKey } from "@/lib/seoPageKey.js";

const SITE_URL = "https://www.shop99.co.in";

/**
 * @param {string} pathname
 * @param {URLSearchParams} searchParams
 * @returns {Promise<import('next').Metadata>}
 */
export async function buildPageMetadata(pathname, searchParams) {
  const { page, canonicalSearch } = resolveSeoPageKey(pathname, searchParams);

  if (page == null) return {};

  let seo = null;
  try {
    seo = await getSEOByPageApi(page);
    if (seo == null && page !== "shop" && String(page).startsWith("shop-category-")) {
      seo = await getSEOByPageApi("shop");
    }
  } catch {
    seo = null;
  }

  const canonicalUrl = `${SITE_URL}${pathname}${canonicalSearch}`;

  return {
    title: seo?.meta_title || "Default Title",
    description: seo?.meta_description || "Default description",
    keywords: seo?.meta_keywords || "",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seo?.og_title || "",
      description: seo?.og_description || "",
      images: seo?.og_image ? [`${SITE_URL}/uploads/${seo.og_image}`] : undefined,
    },
  };
}
