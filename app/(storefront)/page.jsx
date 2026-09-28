import { preload } from "react-dom";
import Home from "@/components/Home";
import { buildPageMetadata } from "@/lib/buildPageMetadata";
import { getBanners } from "@/lib/banners";

export async function generateMetadata() {
  return buildPageMetadata("/", new URLSearchParams());
}

export default async function Page() {
  // null → HeroCarousel falls back to fetching on the client.
  const banners = await getBanners().catch((err) => {
    console.error("Homepage banners:", err);
    return null;
  });

  // First slide is the LCP: start its images with the HTML, not after JS.
  const first = banners?.[0];
  if (first?.background) preload(`/uploads/${first.background}`, { as: "image", fetchPriority: "high" });
  if (first?.image) preload(`/uploads/${first.image}`, { as: "image", fetchPriority: "high" });

  return <Home initialBanners={banners} />;
}
