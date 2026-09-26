/**
 * Variant `specifications` JSON helpers.
 * Stored shape: either a legacy array (2D spec table), or `{ heading: string|null, items: array }`.
 */

function trimOrNull(s) {
  if (s == null) return null;
  const t = String(s).trim();
  return t === "" ? null : t;
}

/** FormData / JSON se kabhi nested value string reh jati hai. */
export function parseJsonIfString(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const t = value.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return value;
  }
}

/**
 * Multiline "Label : value" paste (Flipkart-style) -> 2D rows [["Label","value"], ...].
 * Blank lines skip. First `:` on the line splits key vs value (value may contain `:`).
 */
function parseSpecificationsFromBulkText(text) {
  if (text == null || typeof text !== "string") return [];
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    rows.push([key, val]);
  }
  return rows;
}

/**
 * String input: JSON (maybe double-encoded) ya bulk text; baaki types unchanged.
 */
function unwrapSpecificationsInput(specifications) {
  if (specifications == null) return null;
  if (typeof specifications !== "string") return specifications;

  let cur = specifications.trim();
  if (!cur) return null;

  for (let i = 0; i < 4; i++) {
    if (typeof cur !== "string") return cur;
    try {
      cur = JSON.parse(cur);
    } catch {
      const bulk = parseSpecificationsFromBulkText(cur);
      return bulk.length > 0 ? bulk : null;
    }
  }
  if (typeof cur === "string") {
    const bulk = parseSpecificationsFromBulkText(cur);
    return bulk.length > 0 ? bulk : null;
  }
  return cur;
}

/**
 * Ek variant object se specs + headings nikaalo (admin/API alag keys bhej sakte hain).
 */
export function coerceIncomingVariantFields(v) {
  if (!v || typeof v !== "object") {
    return { specs: null, specsHeading: null, heading: null };
  }
  const bulkExplicit = v.specifications_bulk ?? v.specifications_paste ?? v.specs_bulk ?? null;
  let specs;
  if (typeof bulkExplicit === "string" && bulkExplicit.trim() !== "") {
    specs = bulkExplicit.trim();
  } else {
    specs = v.specifications ?? v.specification ?? v.variant_specifications ?? null;
    specs = parseJsonIfString(specs);
  }

  const specsHeading = v.specifications_heading ?? v.specs_heading ?? v.spec_heading ?? null;

  let heading = v.heading ?? v.variant_heading ?? v.title ?? null;
  if (heading != null) {
    const t = String(heading).trim();
    heading = t === "" ? null : t;
  }

  return { specs, specsHeading, heading };
}

/**
 * Merge incoming specs + optional heading into DB JSON.
 */
export function normalizeVariantSpecificationsForStorage(specifications, specifications_heading) {
  const headingFromParam = trimOrNull(specifications_heading);

  specifications = unwrapSpecificationsInput(specifications);

  if (specifications == null) {
    return headingFromParam != null ? { heading: headingFromParam, items: [] } : null;
  }

  if (Array.isArray(specifications)) {
    if (specifications.length === 0 && headingFromParam == null) return null;
    if (headingFromParam != null) {
      return { heading: headingFromParam, items: specifications };
    }
    return specifications;
  }

  if (typeof specifications === "object" && specifications !== null) {
    const h = headingFromParam ?? trimOrNull(specifications.heading);

    if (Array.isArray(specifications.items)) {
      const items = specifications.items;
      if (items.length === 0 && h == null) return null;
      return { heading: h ?? null, items };
    }

    const entries = Object.entries(specifications).filter(([k]) => k !== "heading" && k !== "items");
    if (entries.length > 0) {
      const as2D = entries.map(([k, val]) => [String(k), String(val ?? "")]);
      return normalizeVariantSpecificationsForStorage(as2D, h ?? headingFromParam);
    }

    if (h != null) {
      return { heading: h, items: [] };
    }
  }

  return null;
}

/**
 * API: specification rows only (no heading).
 */
export function parseVariantSpecifications(stored) {
  if (stored == null) return null;
  if (Array.isArray(stored)) return stored;
  if (typeof stored === "object" && stored !== null && Array.isArray(stored.items)) {
    return stored.items;
  }
  return stored;
}

/**
 * API: heading string duplicated for convenience (also inside stored JSON).
 */
export function specificationsHeadingFromStored(stored) {
  if (stored == null) return null;
  if (typeof stored === "object" && !Array.isArray(stored)) {
    return trimOrNull(stored.heading);
  }
  return null;
}
