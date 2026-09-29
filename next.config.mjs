/** @type {import('next').NextConfig} */


const missing = ["NEXT_PUBLIC_SITE_URL"].filter((k) => !String(process.env[k] || "").trim());
if (missing.length) {
  throw new Error(
    `Missing env: ${missing.join(", ")}. Set it in .env.local (local, e.g. http://localhost:3000) ` +
      `or .env (server, e.g. https://www.shop99.co.in). See .env.example.`,
  );
}

const nextConfig = {
  serverExternalPackages: ["sequelize", "pdfkit"],

  // Resized/WebP copies served from /_next/image (see lib/imageUrl.js),
  // cached for 31 days so each size is generated once.
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },

  // Files in public/ default to "Cache-Control: max-age=0" — every visit
  // re-downloaded every image and font.
  async headers() {
    return [
      {
        // Upload names are timestamp-prefixed: a given URL never changes.
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Site artwork can be replaced under the same name — cache a week,
        // then revalidate in the background.
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
