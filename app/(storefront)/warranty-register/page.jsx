import WarrantyRegisterPage from "@/components/WarrantyRegisterPage";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/warranty-register", new URLSearchParams());
}

export default function Page() {
  return <WarrantyRegisterPage />;
}
