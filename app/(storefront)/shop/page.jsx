import ShopPage from "@/components/Shop";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const usp = new URLSearchParams();
  Object.entries(sp || {}).forEach(([k, v]) => {
    if (v != null) usp.set(k, Array.isArray(v) ? v[0] : v);
  });
  return buildPageMetadata("/shop", usp);
}

export default function Page() {
  return <ShopPage />;
}
