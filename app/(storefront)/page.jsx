import { preload } from "react-dom";
import Home from "@/components/Home";
import { buildPageMetadata } from "@/lib/buildPageMetadata";
import { getBanners } from "@/lib/banners";
import { heroBackground, heroProduct } from "@/lib/imageUrl";

export async function generateMetadata() {
  return buildPageMetadata("/", new URLSearchParams());
}

export default async function Page() {
  // null → HeroCarousel falls back to fetching on the client.
  const banners = await getBanners().catch((err) => {
    console.error("Homepage banners:", err);
    return null;
  });

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

  return <Home initialBanners={banners} />;
}
