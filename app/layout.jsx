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

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Shop99",
  alternateName: "Prakash Electronics (India)",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
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
        {/* Organization schema — site-wide identity, kept minimal/static so it
            never drifts (no phone/address here since those are admin-editable
            via the footer settings and could go stale). */}
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
