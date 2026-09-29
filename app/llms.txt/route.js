// /llms.txt — site summary for AI crawlers, with links built from
// NEXT_PUBLIC_SITE_URL instead of a hardcoded domain.
import { SITE_URL } from "@/lib/siteConfig";

export function GET() {
  return new Response(
    `# Shop99

> Shop99 (shop99.co.in) is an online store in India for car accessories — car speakers, amplifiers, Android car stereos/infotainment systems, BassTubes, and other car audio & electronic accessories. Operated by Prakash Electronics (India).

Shop99 sells genuine, brand-sourced car audio and electronics products with pan-India doorstep delivery, competitive pricing, and manufacturer warranty support (including for products bought elsewhere, via the Warranty Register page).

## Key pages

- [Homepage](${SITE_URL}/): Featured products, deals, and brand categories.
- [Shop](${SITE_URL}/shop): Full product catalog, filterable by category and brand.
- [Categories](${SITE_URL}/categories): Browse products by category.
- [Brands](${SITE_URL}/brands): Browse products by brand.
- [Deals](${SITE_URL}/deals): Current discounts and offers.
- [Most Selling Products](${SITE_URL}/most-selling-products): Best-selling products.
- [Blog](${SITE_URL}/blog): Buying guides and articles about car audio/accessories.
- [Warranty Register](${SITE_URL}/warranty-register): Register a product for manufacturer warranty, whether bought from Shop99 or another retailer.
- [About](${SITE_URL}/about): About Shop99 / Prakash Electronics (India).
- [Contact](${SITE_URL}/contact): Contact and support details.

## Notes

- Prices, stock, and offers change frequently — always verify current details on the live page rather than relying on cached content.
- Product pages are at \`/productPage/:slug\`; category listings are reachable via \`/shop?category=<name>\`.
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
