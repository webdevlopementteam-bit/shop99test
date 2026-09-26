import AboutUs from "@/components/About";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/about", new URLSearchParams());
}

export default function Page() {
  return <AboutUs />;
}
