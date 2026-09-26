import DealsPage from "@/components/DealsPage";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/deals", new URLSearchParams());
}

export default function Page() {
  return <DealsPage />;
}
