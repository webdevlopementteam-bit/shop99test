// Replaces the old components/SEO.jsx + Preloaded*SeoContext + entry-server.jsx
// custom hoisting pipeline. Next.js's generateMetadata() owns <head> natively,
// so there's no more manual title/meta/link tag reconciliation to race —
// this is what fixed the old duplicate/stale-canonical-on-navigation bugs
// structurally rather than papering over them.
import { resolveSeoPageKey } from "@/lib/seoPageKey.js";
import { SITE_URL, findSeoEntry, applySeoEntry } from "@/lib/seo.js";
import { findCategorySeo } from "@/lib/categorySeo.js";

/**
 * @param {string} pathname
 * @param {URLSearchParams} searchParams
 * @returns {Promise<import('next').Metadata>}
 */
export async function buildPageMetadata(pathname, searchParams) {
  const { page, canonicalSearch } = resolveSeoPageKey(pathname, searchParams);

  let seo = await findSeoEntry(page, pathname);
  if (seo == null && page !== "shop" && String(page).startsWith("shop-category-")) {
    seo = await findSeoEntry("shop", "/shop");
  }

  const canonicalUrl = `${SITE_URL}${pathname}${canonicalSearch}`;

  const meta = applySeoEntry(
    {
      title: "Shop99",
      alternates: { canonical: canonicalUrl },
      openGraph: { url: canonicalUrl, siteName: "Shop99" },
    },
    seo,
  );

  // Category pages: the category's own SEO (Admin → Categories → SEO) is the
  // most specific source, so its non-empty fields win over the SEO table.
  // Subcategory links carry both params (?category=Stereo&subCategory=Car
  // Stereo): use the subcategory's SEO, else fall back to the parent's.
  if (pathname === "/shop") {
    const categorySeo =
      (await findCategorySeo(searchParams.get("subCategory"))) ||
      (await findCategorySeo(searchParams.get("category")));
    if (categorySeo) return applySeoEntry(meta, categorySeo);
  }

  return meta;
}
