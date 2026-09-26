/**
 * generate-sitemap.mjs
 *
 * Generates a sitemap.xml for the storefront by pulling static pages +
 * dynamic categories/brands/products from the API, and writes it into
 * public/sitemap.xml.
 *
 * Ported from frontend/generateSitemap.js — same-origin now (site and API
 * share one domain), so both URLs below point at the production domain
 * instead of a separate api.* subdomain.
 *
 * USAGE:
 *   node scripts/generate-sitemap.mjs
 *
 * Wired into `npm run build` (see package.json) so it runs on every deploy,
 * same as the original frontend build did.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= CONFIG ================= */

const SITE_URL = process.env.SITEMAP_SITE_URL || "https://www.shop99.co.in";
const API_BASE_URL = process.env.SITEMAP_API_URL || SITE_URL;

const OUTPUT_PATH = path.join(__dirname, "..", "public", "sitemap.xml");

const PRODUCTS_PAGE_SIZE = 100;

/* ================= STATIC PAGES ================= */

const staticPages = [
  { url: "/", changefreq: "daily", priority: 1.0 },
  { url: "/shop", changefreq: "daily", priority: 0.9 },
  { url: "/about", changefreq: "daily", priority: 0.5 },
  { url: "/contact", changefreq: "daily", priority: 0.5 },
];

/* ================= URL BUILDERS ================= */

// Product detail route is /productPage/:slug (backend resolves products by
// slug now, falling back to id for older/legacy links).
function buildProductUrl(product) {
  return `/productPage/${product.slug || product.id}`;
}

// Category has a real `slug` field (backend generates it via slugify(name)),
// so use that for cleaner URLs. Change to category.id if your route uses id instead.
function buildCategoryUrl(category) {
  return `/category/${category.slug}`;
}

// Brand model has no slug field (only name/image), so id-based route.
function buildBrandUrl(brand) {
  return `/brand/${brand.id}`;
}

/* ================= FETCH HELPERS ================= */

async function safeFetchJson(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️  ${label} fetch failed: ${res.status} ${res.statusText}`);
      return null;
    }
    // A non-JSON body (e.g. an SPA's index.html served for /api/*) means
    // API_BASE_URL isn't pointing at the API — fail clearly instead of
    // letting res.json() throw on "<!doctype".
    const type = res.headers.get("content-type") || "";
    if (!type.includes("application/json")) {
      console.warn(`⚠️  ${label} returned ${type || "no content-type"}, not JSON — check SITEMAP_API_URL (${API_BASE_URL})`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`⚠️  ${label} fetch error:`, err.message);
    return null;
  }
}

// Handles both { data: [...] } and plain [...] response shapes
function extractList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

async function fetchAllProducts() {
  const allProducts = [];
  let page = 1;
  let totalPages = 1;

  do {
    const json = await safeFetchJson(
      `${API_BASE_URL}/api/products?page=${page}&limit=${PRODUCTS_PAGE_SIZE}&include_offer=false`,
      `products page ${page}`
    );

    if (!json) break;

    const products = extractList(json);
    allProducts.push(...products);

    totalPages = json.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return allProducts;
}

async function fetchCategories() {
  // No ?page/&limit → backend returns { categories: [...], totalPages, currentPage }
  // and only publish=1 categories (frontend-safe, correct for sitemap).
  const json = await safeFetchJson(`${API_BASE_URL}/api/categories`, "categories");
  if (!json) return [];
  return Array.isArray(json.categories) ? json.categories : extractList(json);
}

async function fetchBrands() {
  const json = await safeFetchJson(`${API_BASE_URL}/api/brands`, "brands");
  return extractList(json);
}

/* ================= XML BUILDING ================= */

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, { changefreq = "daily", priority = 0.7, lastmod } = {}) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function buildSitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

/* ================= MAIN ================= */

async function generateSitemap() {
  console.log("🔧 Generating sitemap...");

  const today = new Date().toISOString().split("T")[0];
  const entries = [];

  // Static pages
  staticPages.forEach((page) => {
    entries.push(
      urlEntry(`${SITE_URL}${page.url}`, {
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: today,
      })
    );
  });

  // Categories
  const categories = await fetchCategories();
  console.log(`📂 Categories fetched: ${categories.length}`);
  categories.forEach((cat) => {
    entries.push(
      urlEntry(`${SITE_URL}${buildCategoryUrl(cat)}`, {
        changefreq: "daily",
        priority: 0.7,
        lastmod: today,
      })
    );
  });

  // Brands
  const brands = await fetchBrands();
  console.log(`🏷️  Brands fetched: ${brands.length}`);
  brands.forEach((brand) => {
    entries.push(
      urlEntry(`${SITE_URL}${buildBrandUrl(brand)}`, {
        changefreq: "daily",
        priority: 0.6,
        lastmod: today,
      })
    );
  });

  // Products
  const products = await fetchAllProducts();
  console.log(`📦 Products fetched: ${products.length}`);
  products.forEach((product) => {
    entries.push(
      urlEntry(`${SITE_URL}${buildProductUrl(product)}`, {
        changefreq: "daily",
        priority: 0.8,
        lastmod: today,
      })
    );
  });

  // Don't clobber a good sitemap with a static-pages-only one when the API
  // was unreachable/misconfigured.
  if (categories.length + brands.length + products.length === 0) {
    console.warn(`⚠️  No dynamic URLs fetched — keeping existing ${OUTPUT_PATH}`);
    return;
  }

  const xml = buildSitemapXml(entries);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, xml, "utf-8");

  console.log(`✅ Sitemap written to ${OUTPUT_PATH}`);
  console.log(`📊 Total URLs: ${entries.length}`);
}

generateSitemap().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
