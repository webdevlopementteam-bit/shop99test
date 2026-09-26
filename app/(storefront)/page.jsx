import Home from "@/components/Home";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/", new URLSearchParams());
}

export default function Page() {
  return <Home />;
}
