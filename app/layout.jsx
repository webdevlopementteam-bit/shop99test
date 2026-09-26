import Script from "next/script";
import "./globals.css";

export const metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=3",
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
  url: "https://www.shop99.co.in",
  logo: "https://www.shop99.co.in/favicon.png",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css"
          integrity="sha512-2SwdPD6INVrV/lHTZbO2nodKhrnDdJK9/kg2XD1r9uGqPo1cUbujc+IYdlYdEErWNu69gVcYgdxlmVmzTWnetw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
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
