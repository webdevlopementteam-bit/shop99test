import ContactUs from "@/components/Contact";
import { buildPageMetadata } from "@/lib/buildPageMetadata";

export async function generateMetadata() {
  return buildPageMetadata("/contact", new URLSearchParams());
}

export default function Page() {
  return <ContactUs />;
}
