import ProductPage from "@/components/ProductPage";
import { getProductByIdApi } from "@/lib/api";

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

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.shop99.co.in/productPage/${slug}`,
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  return <ProductPage slug={slug} initialProduct={product} />;
}
