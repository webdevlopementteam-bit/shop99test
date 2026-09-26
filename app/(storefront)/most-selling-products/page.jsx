import MostSellingProducts from "@/components/MostSellingProducts";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/most-selling-products", new URLSearchParams());
}

export default function Page() {
  return <MostSellingProducts />;
}
