/** "Apple iPhone 16 Pro Max" -> "apple-iphone-16-pro-max" */
export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds a slug guaranteed unique among existing rows via `slugExists(candidate)`.
 * Collisions get `-1`, `-2`, ... appended (per spec example).
 */
export async function generateUniqueSlug(sourceText, slugExists) {
  const base = slugify(sourceText) || "product";
  let candidate = base;
  let counter = 1;
  while (await slugExists(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

/** Strips HTML/whitespace, then trims to ~`maxLen` chars on a word boundary. */
export function buildMetaDescription(source, maxLen = 160) {
  const text = String(source || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated).trim();
}
