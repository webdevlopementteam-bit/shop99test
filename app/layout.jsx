import Script from "next/script";
import "./globals.css";
// Self-hosted, trimmed Font Awesome — the CDN stylesheet was render-blocking
// and ~98% unused.
import "@/styles/fontawesome.css";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata = {
  // Fallback for pages without their own title (cart, login, checkout, …).
  title: "Shop99",
  icons: {
    icon: [
      { url: "/favicon.ico?v=4" },
      { url: "/favicon.png?v=4", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico?v=4",
    apple: "/apple-icon.png",
  },
  other: {
    "google-site-verification": "tZIwVfRSlkh_HJclheO4EnblPU19JaN2RkJ_TczwgGA",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// ElectronicsStore is a LocalBusiness (and an Organization), so this one block
// covers both. Name/address/phone must match the Google Business Profile and
// the Contact page exactly — update all three together.
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ElectronicsStore",
  "@id": `${SITE_URL}/#organization`,
  name: "Shop99",
  legalName: "Prakash Electronics (India)",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
  image: `${SITE_URL}/favicon.png`,
  telephone: "+91-8920114845",
  email: "support@shop99.co.in",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "Ground Floor, 804/24-26, 940/23, 939/23, GT Karnal Road, DDA Sangam Park Market, Sidhoran Kalan",
    addressLocality: "Delhi",
    addressRegion: "Delhi",
    addressCountry: "IN",
  },
  areaServed: { "@type": "Country", name: "India" },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: "+91-8920114845",
    email: "support@shop99.co.in",
    areaServed: "IN",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Body font — fetched with the HTML instead of after the CSS. */}
        <link
          rel="preload"
          href="/fonts/Inter_18pt-SemiBold-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Site-wide business identity (LocalBusiness + Organization). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
      </head>
      <body>
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-11161878357"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag("js", new Date());
            gtag("config", "AW-11161878357");
            gtag("config", "G-VZ8LR5NJ7J");
          `}
        </Script>
      </body>
    </html>
  );
}
