import sanitizeHtml from "sanitize-html";

// Matches the Jodit toolbar wired up in the admin panel (bold/italic/underline,
// lists, links, alignment) — nothing else should be able to reach the DB.
const ALLOWED_TAGS = ["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "div", "span"];

/** Strips any HTML the admin's rich text editor didn't offer (script tags, event handlers, etc). */
export function sanitizeRichText(html) {
  if (html == null) return html;
  return sanitizeHtml(String(html), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      "*": ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  }).trim();
}
