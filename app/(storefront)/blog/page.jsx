import Blogs from "@/components/Blogs";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/blog", new URLSearchParams());
}

export default function Page() {
  return <Blogs />;
}
