import { BASE_URL } from "./api";

const VARIANT_HIDDEN_MARKER_KEY = "__variant_hidden__";

export function normalizeVariantImageUrl(img) {
  if (!img) return null;
  if (typeof img === "string") {
    return img.startsWith("http") ? img : `${BASE_URL}/uploads/${img}`;
  }
  const path = img.image ?? img.path ?? img.filename ?? img.url ?? "";
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}/uploads/${path}`;
}

/** Dedupe full URLs, preserve order. */
export function mergeUniqueImageUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Main image + gallery from product API (multiple possible keys / shapes).
 */
export function collectProductGalleryUrls(product) {
  if (!product) return [];
  const raw = [];

  const pushPath = (p) => {
    const u = normalizeVariantImageUrl(p);
    if (u) raw.push(u);
  };

  const main =
    product.image ??
    product.main_image ??
    product.thumbnail ??
    product.cover_image;
  if (main) {
    if (typeof main === "string") pushPath(main);
    else if (main && typeof main === "object") {
      pushPath(
        main.image ?? main.path ?? main.filename ?? main.url ?? main.src,
      );
    }
  }

  const lists = [
    product.images,
    product.product_images,
    product.ProductImages,
    product.gallery,
    product.GalleryImages,
  ].filter(Boolean);

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const it of list) {
      if (typeof it === "string") pushPath(it);
      else if (it && typeof it === "object") {
        pushPath(
          it.image ?? it.path ?? it.filename ?? it.url ?? it.src ?? "",
        );
      }
    }
  }

  return mergeUniqueImageUrls(raw);
}

function normalizeAttributesShape(attrs) {
  if (!attrs) return [];
  if (typeof attrs === "string") {
    try {
      const p = JSON.parse(attrs);
      return normalizeAttributesShape(p);
    } catch {
      return [];
    }
  }
  if (Array.isArray(attrs)) {
    return attrs
      .map((a) => {
        if (!a || typeof a !== "object") return null;
        return {
          attribute: String(
            a.attribute ??
              a.name ??
              a.attribute_name ??
              a.attr_name ??
              a.Attribute?.name ??
              "",
          ).trim(),
          value: String(
            a.value ??
              a.attribute_value ??
              a.attr_value ??
              a.AttributeValue?.value ??
              "",
          ).trim(),
        };
      })
      .filter((a) => a && a.attribute && a.value);
  }
  if (typeof attrs === "object") {
    return Object.entries(attrs)
      .map(([attribute, value]) => ({
        attribute: String(attribute).trim(),
        value: String(value ?? "").trim(),
      }))
      .filter((a) => a.attribute && a.value);
  }
  return [];
}

/**
 * API / Sequelize se variant attributes — multiple shapes (admin JSON object, join rows, etc.).
 */
export function extractVariantAttributes(v) {
  if (!v || typeof v !== "object") return [];

  const first = normalizeAttributesShape(
    v.attributes ??
      v.variant_attributes ??
      v.VariantAttributes ??
      v.variantAttributes ??
      null,
  );
  if (first.length) return first;

  // Sequelize join table: [{ Attribute: { name }, AttributeValue: { value } }, ...]
  const joinRows =
    v.VariantAttributes ??
    v.variantAttributes ??
    v.variant_attributes ??
    [];
  if (Array.isArray(joinRows) && joinRows.length) {
    const out = [];
    for (const row of joinRows) {
      if (!row || typeof row !== "object") continue;
      const attrName = String(
        row.Attribute?.name ??
          row.attribute?.name ??
          row.attribute_name ??
          row.name ??
          "",
      ).trim();
      const val = String(
        row.AttributeValue?.value ??
          row.attribute_value?.value ??
          row.value ??
          "",
      ).trim();
      if (attrName && val) {
        out.push({ attribute: attrName, value: val });
        continue;
      }
      if (row.attribute != null && row.value != null) {
        const a = String(row.attribute).trim();
        const b = String(row.value).trim();
        if (a && b) out.push({ attribute: a, value: b });
      }
    }
    if (out.length) return out;
  }

  return [];
}

/** 2D spec table from API (matches admin ProductForm `specifications` / `specTable`). */
export function normalizeVariantSpecifications(raw) {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      return normalizeVariantSpecifications(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    if (Array.isArray(raw[0])) return raw.map((row) => [...row]);
    return [];
  }
  if (typeof raw === "object" && raw !== null) {
    const items = raw.items;
    /** `{ "heading": "...", "items": [["Brand","X"],["Key","val"],...] }` — Flipkart-style */
    if (Array.isArray(items) && items.length > 0 && Array.isArray(items[0])) {
      return items.map((row) =>
        Array.isArray(row)
          ? row.map((c) => (c == null ? "" : String(c)))
          : [String(row ?? "")],
      );
    }
    /** Legacy object + comma-packed `items` string → expand via `transformSpecsForPdpDisplay` */
    if (typeof items === "string" && items.trim()) {
      return [["items", items]];
    }
    /** Flat `{ Brand: "X", Type: "Y" }` */
    return Object.entries(raw).map(([k, val]) => [
      String(k),
      String(val ?? ""),
    ]);
  }
  return [];
}

/** PDP / product specs — `heading` sirf title field mein, table row mein nahi */
export function stripHeadingPseudoRowsFromSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs.filter(
    (r) =>
      Array.isArray(r) &&
      String(r[0] ?? "").trim().toLowerCase() !== "heading",
  );
}

function extractHeadingFromSpecPayload(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") {
    try {
      return extractHeadingFromSpecPayload(JSON.parse(raw));
    } catch {
      return "";
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return String(raw.heading ?? raw.specifications_heading ?? "").trim();
  }
  return "";
}

function buildVariantAttributeSignature(attrList) {
  const normalized = (Array.isArray(attrList) ? attrList : [])
    .map((a) => {
      const k = String(a?.attribute ?? "").trim().toLowerCase();
      const v = String(a?.value ?? "").trim().toLowerCase();
      if (!k || !v) return "";
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .sort();
  return normalized.join("&");
}

function hasHiddenMarkerInSpecPayload(raw, attrSignature) {
  const rows = normalizeVariantSpecifications(raw);
  return rows.some((row) => {
    if (!Array.isArray(row)) return false;
    const key = String(row[0] ?? "").trim().toLowerCase();
    const val = String(row[1] ?? "").trim();
    const valLower = val.toLowerCase();
    return (
      key === VARIANT_HIDDEN_MARKER_KEY &&
      valLower.startsWith("sig:") &&
      val.slice(4).trim().toLowerCase() === String(attrSignature || "").toLowerCase()
    );
  });
}

/** True if spec table has any non-empty cell (skip empty placeholder grids). */
export function specTableHasContent(specs) {
  if (!Array.isArray(specs) || specs.length === 0) return false;
  return specs.some((row) =>
    Array.isArray(row) &&
    row.some((cell) => String(cell ?? "").trim() !== ""),
  );
}

/**
 * Hero title: `specifications_heading` field, else first spec row with label "heading".
 */
export function extractPdpHeroTitleFromVariant(variant) {
  if (!variant) return "";
  const fromField = String(
    variant.specifications_heading ?? variant.heading ?? "",
  ).trim();
  if (fromField) return fromField;
  const vs = variant.specifications;
  if (!Array.isArray(vs)) return "";
  for (const row of vs) {
    if (!Array.isArray(row) || row.length < 2) continue;
    if (String(row[0] ?? "").trim().toLowerCase() === "heading") {
      const t = String(row[1] ?? "").trim();
      if (t) return t;
    }
  }
  return "";
}

/** `items` cell: "Color,Pink" or "Color,Pink,Size,M" → [["Color","Pink"],...] */
export function expandItemsCellToPairs(raw, knownKeys = []) {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  const parts = s.split(/[,，]\s*/).map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return [];

  const likelyKeys = new Set([
    "color",
    "brand",
    "size",
    "screen size",
    "ram",
    "storage",
    "rom",
    "model",
    "material",
    "age group",
    "warranty",
    "type",
    "convenience features",
    "maximum output power",
    ...knownKeys.map((k) => String(k ?? "").trim().toLowerCase()).filter(Boolean),
  ]);

  const smart = [];
  let currentKey = "";
  let currentVals = [];
  for (let idx = 0; idx < parts.length; idx += 1) {
    const token = parts[idx];
    const lower = token.toLowerCase();
    const isKey = likelyKeys.has(lower);
    if (!currentKey) {
      currentKey = token;
      continue;
    }
    if (isKey) {
      smart.push([currentKey, currentVals.join(", ").trim()]);
      currentKey = token;
      currentVals = [];
      continue;
    }
    currentVals.push(token);
  }
  if (currentKey) {
    smart.push([currentKey, currentVals.join(", ").trim()]);
  }
  if (smart.some(([k, v]) => k && v)) {
    return smart.filter(([k, v]) => k && v);
  }

  const pairs = [];
  for (let i = 0; i < parts.length - 1; i += 2) {
    pairs.push([parts[i], parts[i + 1]]);
  }
  return pairs;
}

/** PDP spec table: "heading" row hatao; legacy "items" row ko rows me expand karo. */
export function transformSpecsForPdpDisplay(specRows, knownKeys = []) {
  if (!Array.isArray(specRows)) return [];
  const out = [];
  for (const row of specRows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const col0 = String(row[0] ?? "").trim();
    const col1 = String(row[1] ?? "").trim();
    const keyLower = col0.toLowerCase();
    if (keyLower === "heading") continue;
    if (keyLower === "items" && col1) {
      const pairs = expandItemsCellToPairs(col1, knownKeys);
      if (pairs.length) {
        for (const [k, v] of pairs) out.push([k, v]);
      } else {
        out.push(row.map((c) => String(c ?? "")));
      }
      continue;
    }
    out.push(row.map((c) => String(c ?? "")));
  }
  return out;
}

function firstFiniteNumber(...candidates) {
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toHiddenFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return false;
  return (
    s === "1" ||
    s === "true" ||
    s === "yes" ||
    s === "hidden" ||
    s === "inactive" ||
    s === "disabled" ||
    s === "off"
  );
}

export function normalizeProductVariant(v) {
  const attrs = extractVariantAttributes(v);

  const rawImgs =
    v.images ??
    v.variant_images ??
    v.VariantImages ??
    v.variantImages ??
    [];
  const asList = Array.isArray(rawImgs)
    ? rawImgs
    : rawImgs && typeof rawImgs === "object"
      ? [rawImgs]
      : [];
  const images = mergeUniqueImageUrls(
    asList.map(normalizeVariantImageUrl).filter(Boolean),
  );

  const price = firstFiniteNumber(
    v.price,
    v.sale_price,
    v.selling_price,
    v.sellingPrice,
  );
  const stock = v.stock != null && v.stock !== "" ? Number(v.stock) : null;
  const oldPrice = firstFiniteNumber(v.old_price, v.mrp, v.MRP);

  const specRaw =
    v.specifications ??
    v.specification ??
    v.variant_specifications ??
    v.variantSpecifications;

  const specHeading = String(
    v.specifications_heading ??
      v.specs_heading ??
      v.spec_heading ??
      v.specificationsHeading ??
      v.specHeading ??
      v.specification_heading ??
      "",
  ).trim() || extractHeadingFromSpecPayload(specRaw);

  const rawId = v.id ?? v.variant_id ?? v.product_variant_id;
  const attrSignature = buildVariantAttributeSignature(attrs);
  const isHidden =
    v.visible != null
      ? !toHiddenFlag(v.visible)
      : toHiddenFlag(
          v.is_hidden ??
            v.isHidden ??
            v.hidden ??
            v.visibility,
        );
  const hiddenBySpecMarker = hasHiddenMarkerInSpecPayload(specRaw, attrSignature);
  return {
    id: rawId != null && rawId !== "" ? rawId : null,
    attributes: attrs,
    price: Number.isFinite(price) ? price : null,
    stock: Number.isFinite(stock) ? stock : null,
    old_price: Number.isFinite(oldPrice) ? oldPrice : null,
    short_description: String(v.short_description ?? "").trim(),
    is_hidden: isHidden || hiddenBySpecMarker,
    specifications_heading: specHeading,
    specifications: stripHeadingPseudoRowsFromSpecs(
      normalizeVariantSpecifications(specRaw),
    ),
    sku: v.sku ?? v.variant_sku ?? null,
    images,
  };
}

/** List/detail — kitni variant rows hain (0 = sirf base product price). */
export function countProductVariantsInPayload(product) {
  if (!product || typeof product !== "object") return 0;
  const raw =
    product.variants ??
    product.product_variants ??
    product.ProductVariants ??
    product.productVariants ??
    [];
  if (!Array.isArray(raw)) return 0;
  return raw.filter((v) => !normalizeProductVariant(v).is_hidden).length;
}

function splitCommaParts(value) {
  return String(value ?? "")
    .split(/[,，]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function getAttrValueByName(variant, attrName) {
  const name = String(attrName ?? "").trim();
  if (!name) return "";
  const row = (variant?.attributes || []).find(
    (a) => String(a?.attribute ?? "").trim() === name,
  );
  return String(row?.value ?? "").trim();
}

function hiddenVariantMatchesPart(hiddenVariant, sourceVariant, attrName, partValue) {
  const targetAttr = String(attrName ?? "").trim();
  const targetPart = String(partValue ?? "").trim();
  if (!targetAttr || !targetPart) return false;

  const hiddenAttrVal = getAttrValueByName(hiddenVariant, targetAttr);
  if (hiddenAttrVal !== targetPart) return false;

  const sourceAttrs = Array.isArray(sourceVariant?.attributes)
    ? sourceVariant.attributes
    : [];
  for (const a of sourceAttrs) {
    const name = String(a?.attribute ?? "").trim();
    if (!name || name === targetAttr) continue;
    const sourceVal = String(a?.value ?? "").trim();
    const hiddenVal = getAttrValueByName(hiddenVariant, name);
    if (!sourceVal || !hiddenVal || sourceVal !== hiddenVal) {
      return false;
    }
  }
  return true;
}

function removeHiddenPartsFromVisibleVariant(visibleVariant, hiddenVariants) {
  const attrs = Array.isArray(visibleVariant?.attributes)
    ? visibleVariant.attributes
    : [];
  if (!attrs.length || !hiddenVariants.length) return visibleVariant;

  const nextAttrs = attrs.map((attr) => {
    const attrName = String(attr?.attribute ?? "").trim();
    const rawVal = String(attr?.value ?? "").trim();
    const parts = splitCommaParts(rawVal);
    if (!attrName || parts.length <= 1) return attr;

    const kept = parts.filter((part) => {
      const matchedHidden = hiddenVariants.some((h) =>
        hiddenVariantMatchesPart(h, visibleVariant, attrName, part),
      );
      return !matchedHidden;
    });

    if (kept.length === parts.length || kept.length === 0) return attr;
    return { ...attr, value: kept.join(", ") };
  });

  return { ...visibleVariant, attributes: nextAttrs };
}

export function collectVariantsFromProduct(product) {
  if (!product) return [];

  const raw =
    product.variants ??
    product.product_variants ??
    product.ProductVariants ??
    product.productVariants ??
    product.Variants ??
    [];

  if (!Array.isArray(raw) || raw.length === 0) return [];

  const normalized = raw
    .map(normalizeProductVariant)
    .filter((v) => v.attributes.length > 0);
  const hidden = normalized.filter((v) => v.is_hidden);
  const visible = normalized.filter((v) => !v.is_hidden);
  if (!hidden.length) return visible;
  return visible.map((v) => removeHiddenPartsFromVisibleVariant(v, hidden));
}

function splitAttributeValues(val) {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val
      .map((x) => String(x ?? "").trim())
      .filter(Boolean);
  }
  const s = String(val).trim();
  if (!s) return [];
  return s.split(/[,，]\s*/).map((x) => x.trim()).filter(Boolean);
}


export function buildSyntheticVariantsFromProductAttributes(product) {
  if (!product || !Array.isArray(product.attributes)) return [];

  const attrs = product.attributes
    .map((a) => {
      const name = String(
        a.attribute ??
          a.name ??
          a.attribute_name ??
          a.Attribute?.name ??
          "",
      ).trim();
      const values = splitAttributeValues(
        a.value ?? a.values ?? a.AttributeValues?.map((x) => x.value),
      );
      return { name, values };
    })
    .filter((a) => a.name && a.values.length > 0);

  if (attrs.length === 0) return [];

  let rows = [{ attributes: [] }];
  for (const { name, values } of attrs) {
    const next = [];
    for (const row of rows) {
      for (const v of values) {
        next.push({
          attributes: [...row.attributes, { attribute: name, value: v }],
        });
      }
    }
    rows = next;
  }

  const basePrice =
    product.price != null && product.price !== ""
      ? Number(product.price)
      : null;
  const baseOld =
    product.old_price != null && product.old_price !== ""
      ? Number(product.old_price)
      : null;
  const inStock = product.in_stock != null ? !!product.in_stock : true;

  return rows.map((row, idx) => ({
    id: `synthetic-${idx}`,
    attributes: row.attributes,
    price: Number.isFinite(basePrice) ? basePrice : null,
    old_price: Number.isFinite(baseOld) ? baseOld : null,
    stock: inStock ? 1 : 0,
    short_description: "",
    specifications: [],
    sku: null,
    images: [],
    _synthetic: true,
  }));
}

/** Pehle real API variants; nahi to product.attributes se synthetic (comma-separated). */
export function collectVariantsForPdp(product) {
  const real = collectVariantsFromProduct(product);
  if (real.length > 0) return real;
  const explicitRaw =
    product?.variants ??
    product?.product_variants ??
    product?.ProductVariants ??
    product?.productVariants ??
    product?.Variants;
  if (Array.isArray(explicitRaw) && explicitRaw.length > 0) {
    return [];
  }
  return buildSyntheticVariantsFromProductAttributes(product);
}

export function buildOptionGroups(variants) {
  const map = new Map();
  for (const v of variants) {
    for (const { attribute, value } of v.attributes) {
      if (!map.has(attribute)) map.set(attribute, new Set());
      map.get(attribute).add(value);
    }
  }
  return Object.fromEntries(
    [...map.entries()].map(([k, set]) => [k, [...set]]),
  );
}

/** Stable column order for PDP tables (first-seen attribute names across variants). */
export function getAttributeColumnOrder(variants) {
  const seen = new Set();
  const order = [];
  for (const v of variants || []) {
    for (const { attribute } of v.attributes || []) {
      const name = String(attribute ?? "").trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        order.push(name);
      }
    }
  }
  return order;
}

export function getVariantAttributeValue(variant, attributeName) {
  const n = String(attributeName ?? "").trim();
  if (!n || !variant?.attributes?.length) return "";
  const found = variant.attributes.find(
    (a) => String(a.attribute ?? "").trim() === n,
  );
  return String(found?.value ?? "").trim();
}

/**
 * PDP attribute cell: comma-separated values = separate choices (pick one).
 * Example: "0-6 M, 6-12 M, 12-18 M" → three chips; user selects one for cart label.
 * Single segment with no comma stays one chip.
 */
export function splitAttributeValueDisplayParts(value) {
  const s = String(value ?? "").trim();
  if (!s) return [];
  const parts = s.split(/[,，]\s*/).map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : [s];
}

/**
 * Amazon-style: options for column `columnIndex` among variants that already match
 * the active variant on all previous columns (Color → then only valid Sizes for that color).
 */
export function getAvailableValuesForAttributeColumn(
  variants,
  columns,
  columnIndex,
  activeVariant,
) {
  if (!variants?.length || !columns?.length || !activeVariant) return [];
  const col = columns[columnIndex];
  if (!col) return [];
  const filtered = variants.filter((v) => {
    for (let i = 0; i < columnIndex; i++) {
      const c = columns[i];
      const need = getVariantAttributeValue(activeVariant, c);
      if (need && getVariantAttributeValue(v, c) !== need) return false;
    }
    return true;
  });
  const seen = new Set();
  const out = [];
  for (const v of filtered) {
    const val = getVariantAttributeValue(v, col);
    if (val && !seen.has(val)) {
      seen.add(val);
      out.push(val);
    }
  }
  return out;
}

/**
 * Pick variant row when user chooses `value` for `columnName` at `columnIndex`,
 * keeping all attribute values on `baseVariant` for columns before `columnIndex`.
 */
export function findVariantIndexForColumnPick(
  variants,
  columns,
  columnIndex,
  columnName,
  value,
  baseVariant,
) {
  if (!variants?.length || !columns?.length || !baseVariant) return -1;
  const want = String(value ?? "").trim();
  if (!want) return -1;
  return variants.findIndex((v) => {
    if (getVariantAttributeValue(v, columnName) !== want) return false;
    for (let i = 0; i < columnIndex; i++) {
      const c = columns[i];
      const need = getVariantAttributeValue(baseVariant, c);
      if (need && getVariantAttributeValue(v, c) !== need) return false;
    }
    return true;
  });
}

/** Find first variant index matching all key/value pairs in `partial`. */
export function findVariantIndexByPartialMatch(variants, partial) {
  if (!variants?.length || !partial || typeof partial !== "object") return -1;
  return variants.findIndex((v) =>
    Object.entries(partial).every(
      ([k, val]) => getVariantAttributeValue(v, k) === val,
    ),
  );
}

export function buildCartLineId(productId, variant) {
  if (!variant?.attributes?.length) return String(productId);
  const sig = variant.attributes
    .map((a) => `${a.attribute}=${a.value}`)
    .sort()
    .join("&");
  return `${productId}::${sig}`;
}

export function formatVariantLabel(variant) {
  if (!variant?.attributes?.length) return "";
  return variant.attributes.map((a) => a.value).join(" / ");
}

/** Admin-style line: `Color: Red · Size: M` */
export function formatVariantAttributeLine(variant) {
  if (!variant?.attributes?.length) return "";
  return variant.attributes
    .map((a) => `${a.attribute}: ${a.value}`)
    .join(" · ");
}

/**
 * PDP "Selected:" line — for comma-split attributes uses the picked segment only.
 * `selectedPartByAttr`: { "Age Group": "0-6", ... }
 */
export function buildPdpSelectedLine(variant, selectedPartByAttr = {}) {
  if (!variant?.attributes?.length) return "";
  return variant.attributes
    .map((a) => {
      const name = String(a.attribute ?? "").trim();
      const full = String(a.value ?? "").trim();
      const parts = splitAttributeValueDisplayParts(full);
      if (parts.length <= 1) {
        return `${name}: ${full}`;
      }
      const picked = selectedPartByAttr[name];
      const show =
        picked && parts.includes(picked) ? picked : parts[0] ?? full;
      return `${name}: ${show}`;
    })
    .join(" · ");
}

/** Short label for cart when user picks a segment (e.g. `Pink / 0-6`). */
export function buildPdpVariantLabel(variant, selectedPartByAttr = {}) {
  if (!variant?.attributes?.length) return "";
  return variant.attributes
    .map((a) => {
      const full = String(a.value ?? "").trim();
      const parts = splitAttributeValueDisplayParts(full);
      if (parts.length <= 1) return full;
      const name = String(a.attribute ?? "").trim();
      const picked = selectedPartByAttr[name];
      const show =
        picked && parts.includes(picked) ? picked : parts[0] ?? full;
      return show;
    })
    .join(" / ");
}

export function buildCartLineIdWithDetail(productId, variant, selectedPartByAttr) {
  const base = buildCartLineId(productId, variant);
  if (!selectedPartByAttr || typeof selectedPartByAttr !== "object") return base;
  const entries = Object.entries(selectedPartByAttr)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return base;
  const extra = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return `${base}::sel::${extra}`;
}
