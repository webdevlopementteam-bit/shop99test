// /robots.txt, with the sitemap URL from NEXT_PUBLIC_SITE_URL.
import { SITE_URL } from "@/lib/siteConfig";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Account / transactional pages — no SEO value, nothing to index
        "/login",
        "/register",
        "/account",
        "/cart",
        "/checkout",
        "/wishlist",
        "/payment-success",
        "/payment-failure",
        // Admin panel routes served from this same app
        "/admin",
        "/attributes",
        "/category-attribute",
        "/product-attribute",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
