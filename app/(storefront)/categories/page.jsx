import Categories from "@/components/Categories";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/categories", new URLSearchParams());
}

export default function Page() {
  return <Categories />;
}
