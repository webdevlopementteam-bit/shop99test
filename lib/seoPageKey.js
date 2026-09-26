// Single source of truth for mapping a URL (pathname + query params) to the
// `page` key the admin-configured SEO table uses, and the canonical query
// string (if any) that belongs on that page's canonical URL.

function slugify(text) {
  return text
    ?.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

const STATIC_PAGE_KEYS = {
  "/": "home",
  "/about": "about",
  "/blog": "blogs",
  "/most-selling-products": "most-selling-products",
  "/warranty-register": "warranty-register",
  "/categories": "categories",
  "/contact": "contact",
  "/brands": "brands",
  "/deals": "deals",
};

/**
 * @param {string} pathname
 * @param {URLSearchParams} searchParams
 * @returns {{ page: string|null, canonicalSearch: string }}
 */
export function resolveSeoPageKey(pathname, searchParams) {
  if (pathname === "/shop") {
    const subCategoryParam = searchParams.get("subCategory");
    const categoryParam = searchParams.get("category");
    if (subCategoryParam) {
      return {
        page: `shop-category-${slugify(subCategoryParam)}`,
        canonicalSearch: `?subCategory=${encodeURIComponent(subCategoryParam)}`,
      };
    }
    if (categoryParam) {
      return {
        page: `shop-category-${slugify(categoryParam)}`,
        canonicalSearch: `?category=${encodeURIComponent(categoryParam)}`,
      };
    }
    return { page: "shop", canonicalSearch: "" };
  }

  const staticKey = STATIC_PAGE_KEYS[pathname];
  return { page: staticKey ?? null, canonicalSearch: "" };
}
