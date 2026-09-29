// Routes our own images through Next's image optimizer (/_next/image): it
// resizes to the requested width, converts to WebP and caches the result, so
// a 2 MB banner reaches a phone as ~100 KB. Works with plain <img> — spread
// responsiveImage() into the tag, or use optimizedSrc() for a single URL
// (e.g. CSS background-image).
//
// Widths must be ones Next accepts: its default deviceSizes + imageSizes.

const WIDTHS = [64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920];

/** Local raster images only; remote URLs, SVG/GIF and data/blob URLs pass through. */
function canOptimize(src) {
  const s = String(src || "");
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/_next/")) return false;
  return !/\.(svg|gif)(\?|$)/i.test(s);
}

/** URL of `src` resized to at least `width` px wide. */
export function optimizedSrc(src, width = 828) {
  if (!canOptimize(src)) return src;
  const w = WIDTHS.find((x) => x >= width) || WIDTHS[WIDTHS.length - 1];
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}

/** Homepage hero slide: full-width background and the product cut-out.
 * Shared with the page's preload so both request the same URLs. */
export const heroBackground = (src) => responsiveImage(src, { sizes: "100vw", maxWidth: 1920 });
export const heroProduct = (src) =>
  responsiveImage(src, {
    sizes: "(min-width: 1024px) 650px, (min-width: 768px) 360px, (min-width: 640px) 260px, 160px",
    maxWidth: 1200,
  });

/**
 * { src, srcSet, sizes } for an <img>, letting the browser pick the width it
 * needs. `maxWidth` caps the largest candidate (e.g. 384 for a product card).
 */
export function responsiveImage(src, { sizes = "100vw", maxWidth = 1920 } = {}) {
  if (!canOptimize(src)) return { src };
  const widths = WIDTHS.filter((w) => w >= 256 && w <= maxWidth);
  return {
    src: optimizedSrc(src, maxWidth),
    srcSet: widths.map((w) => `${optimizedSrc(src, w)} ${w}w`).join(", "),
    sizes,
  };
}
