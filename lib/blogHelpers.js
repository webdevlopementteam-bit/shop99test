import Blogs from "@/lib/models/blogsModel.js";
import { slugify, generateUniqueSlug } from "@/lib/utils/slugify.js";

async function slugTakenByOtherBlog(candidate, excludeId) {
  const blog = await Blogs.findOne({ where: { slug: candidate } });
  if (!blog) return false;
  return excludeId == null || String(blog.id) !== String(excludeId);
}

/**
 * Resolves the slug to save for a blog.
 * - `requestedSlug` is `undefined` when the caller never sent a `slug` field —
 *   the existing slug (or a freshly generated one) is kept as-is.
 * - An explicitly blank `requestedSlug` ("") re-generates from the title.
 * - A non-empty `requestedSlug` is treated as a deliberate custom slug: it's
 *   sanitized and must be unique among other blogs.
 */
export async function resolveBlogSlug({ title, requestedSlug, currentSlug, excludeId }) {
  if (requestedSlug === undefined) {
    if (currentSlug) return { slug: currentSlug };
    const slug = await generateUniqueSlug(title, (c) => slugTakenByOtherBlog(c, excludeId));
    return { slug };
  }

  const trimmed = String(requestedSlug || "").trim();
  if (!trimmed) {
    const slug = await generateUniqueSlug(title, (c) => slugTakenByOtherBlog(c, excludeId));
    return { slug };
  }

  const sanitized = slugify(trimmed);
  if (!sanitized) {
    return { error: "Custom slug must contain at least one letter or number." };
  }
  if (sanitized === currentSlug) return { slug: sanitized };
  if (await slugTakenByOtherBlog(sanitized, excludeId)) {
    return { error: `Slug "${sanitized}" is already in use. Please choose a different slug.` };
  }
  return { slug: sanitized };
}
