import ProductPage from "@/components/ProductPage";
import { getProductByIdApi } from "@/lib/api";
import { SITE_URL, findSeoEntry, applySeoEntry } from "@/lib/seo";

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchProduct(slug) {
  try {
    const res = await getProductByIdApi(slug);
    if (res && typeof res.specifications === "string") {
      return { ...res, specifications: JSON.parse(res.specifications) };
    }
    return res;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) return {};

  const title = String(product.meta_title || product.name || "SHOP99").trim();

  const summaryDescription = (product.short_description || product.description || "").trim();
  const fallback = String(product.meta_description || stripHtml(summaryDescription) || product.name || "").trim();
  const description = fallback.length > 160 ? `${fallback.slice(0, 157).trim()}...` : fallback;

  // Always the slug URL — even when the page was opened by numeric id
  // (/productPage/541), which the backend still accepts for old links.
  const canonical = `${SITE_URL}/productPage/${product.slug || slug}`;
  const image = product.image
    ? /^https?:\/\//i.test(product.image)
      ? product.image
      : `${SITE_URL}/uploads/${String(product.image).replace(/^\/+/, "")}`
    : null;

  // Admin SEO entries for a product are keyed by its URL (page_name =
  // "https://www.shop99.co.in/productPage/<slug-or-id>"), so check both.
  const seo =
    (await findSeoEntry(null, `/productPage/${slug}`)) ||
    (product.id != null && String(product.id) !== String(slug)
      ? await findSeoEntry(null, `/productPage/${product.id}`)
      : null);

  const meta = applySeoEntry(
    {
      title,
      description,
      keywords: String(product.meta_keywords || "").trim() || undefined,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, images: image ? [image] : undefined },
    },
    seo,
  );

  // Admin SEO may carry an id-based canonical_url (".../productPage/541");
  // a product's canonical is its slug URL regardless.
  return {
    ...meta,
    alternates: { ...meta.alternates, canonical },
    openGraph: { ...meta.openGraph, url: canonical },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  return <ProductPage slug={slug} initialProduct={product} />;
}
