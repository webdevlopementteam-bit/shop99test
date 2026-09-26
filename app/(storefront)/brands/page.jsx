import BrandsPage from "@/components/Brands";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/brands", new URLSearchParams());
}

export default function Page() {
  return <BrandsPage />;
}
