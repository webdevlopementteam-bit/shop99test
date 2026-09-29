// Every absolute URL of this app comes from here, and only from env — no
// hardcoded hosts. next.config.mjs refuses to start without NEXT_PUBLIC_SITE_URL.
//
//   NEXT_PUBLIC_SITE_URL  Public address of the site: canonical URLs, sitemap,
//                         robots, links, PayU return URL.
//                         local:  http://localhost:3000
//                         server: https://www.shop99.co.in (or the test domain)
//                         NEXT_PUBLIC_ → also in browser code, baked in at build
//                         time: rebuild after changing it.
//
//   FRONTEND_URL          Where the server calls this app's own /api (product /
//                         blog pages fetch data while rendering). Point it at the
//                         app's internal address, e.g. http://localhost:3000 —
//                         faster than going out through the public domain.
//                         Optional: defaults to NEXT_PUBLIC_SITE_URL.

const trim = (v) => String(v || "").trim().replace(/\/+$/, "");

export const SITE_URL = trim(process.env.NEXT_PUBLIC_SITE_URL);

/** Server-only: base URL for this app calling its own API. */
export const INTERNAL_URL = trim(process.env.FRONTEND_URL) || SITE_URL;

/** Hostnames that count as "this site" (with and without www). */
export function siteHostnames() {
  try {
    const host = new URL(SITE_URL).hostname;
    const bare = host.replace(/^www\./, "");
    return [bare, `www.${bare}`];
  } catch {
    return [];
  }
}
