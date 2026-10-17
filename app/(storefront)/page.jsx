import { preload } from "react-dom";
import Home from "@/components/Home";
import { buildPageMetadata } from "@/lib/buildPageMetadata";
import { getBanners } from "@/lib/banners";
import { heroBackground, heroProduct } from "@/lib/imageUrl";
import { listBrands, listCuratedProducts, listDeals, listTopCategories } from "@/lib/storefrontLists";
import PopularProduct from "@/lib/models/popularProductModel.js";
import LatestProduct from "@/lib/models/latestProductModel.js";
import MostSellingProduct from "@/lib/models/mostSellingProductModel.js";

// The page is pre-rendered with its data baked in, so rebuild it in the
// background at most once a minute — admin edits (banners, product lists,
// deals) show up without a redeploy.
export const revalidate = 60;

export async function generateMetadata() {
  return buildPageMetadata("/", new URLSearchParams());
}

/** null on failure → that section falls back to fetching on the client. */
const orNull = (label, promise) =>
  promise.catch((err) => {
    console.error(`Homepage ${label}:`, err);
    return null;
  });

export default async function Page() {
  // Everything below the hero too, so products are in the HTML that search
  // engines and AI crawlers read (most don't run JavaScript).
  const [banners, topCategories, brands, popular, latest, mostSelling, deals] = await Promise.all([
    orNull("banners", getBanners()),
    orNull("top categories", listTopCategories()),
    orNull("brands", listBrands()),
    orNull("popular products", listCuratedProducts(PopularProduct)),
    orNull("latest products", listCuratedProducts(LatestProduct)),
    orNull("most selling products", listCuratedProducts(MostSellingProduct)),
    orNull("deals", listDeals()),
  ]);

  // First slide is the LCP: start its images with the HTML, not after JS —
  // the same responsive URLs HeroCarousel renders, so nothing loads twice.
  const first = banners?.[0];
  for (const img of [
    first?.background && heroBackground(`/uploads/${first.background}`),
    first?.image && heroProduct(`/uploads/${first.image}`),
  ]) {
    if (!img) continue;
    preload(img.src, { as: "image", fetchPriority: "high", imageSrcSet: img.srcSet, imageSizes: img.sizes });
  }

  return (
    <Home
      initialBanners={banners}
      initialLists={{ topCategories, brands, popular, latest, mostSelling, deals }}
    />
  );
}
