import { Op } from "sequelize";
import Product from "@/lib/models/productModel.js";
import ProductVariant from "@/lib/models/productVariantModel.js";
import ProductVariantImage from "@/lib/models/productVariantImageModel.js";
import {
  parseVariantSpecifications,
  normalizeVariantSpecificationsForStorage,
  specificationsHeadingFromStored,
  coerceIncomingVariantFields,
  parseJsonIfString,
} from "@/lib/utils/variantSpecifications.js";
import { slugify, generateUniqueSlug } from "@/lib/utils/slugify.js";
import { sanitizeRichText } from "@/lib/utils/richText.js";

export function round2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

export function bodyHasShipping(body) {
  return (
    body &&
    (body.shipping_mode != null || body.shipping_flat_fee != null || body.shipping_state_rates != null)
  );
}

/** First non-empty `short_description` in an incoming (not-yet-saved) variants payload. */
export function firstNonEmptyVariantDescription(parsedVariants) {
  if (!Array.isArray(parsedVariants)) return "";
  for (const v of parsedVariants) {
    const d = String(v?.short_description || "").trim();
    if (d) return d;
  }
  return "";
}

/** Same, but for variants already saved in the DB (used when a save doesn't touch variants). */
export async function firstVariantDescriptionFromDb(productId) {
  const variant = await ProductVariant.findOne({
    where: { product_id: productId },
    order: [["id", "ASC"]],
  });
  return variant ? String(variant.short_description || "").trim() : "";
}

async function slugTakenByOtherProduct(candidate, excludeId) {
  const where = { slug: candidate };
  if (excludeId != null) where.id = { [Op.ne]: excludeId };
  const existing = await Product.findOne({ where, attributes: ["id"] });
  return !!existing;
}

/**
 * Resolves the slug to save for a product.
 * - `requestedSlug` is `undefined` when the caller never sent a `slug` field at all
 *   (e.g. a partial update from Inventory) — the existing slug (or a freshly
 *   generated one, for new products) is kept untouched.
 * - `requestedSlug === ""` (field present but left blank) auto-generates from `name`.
 * - A non-empty `requestedSlug` is treated as a deliberate custom slug: it's
 *   sanitized and must be unique, or this returns an `error` instead of silently
 *   renaming it (auto-suffixing is only for the auto-generated-from-name case).
 */
export async function resolveProductSlug({ name, requestedSlug, currentSlug, excludeId }) {
  const trimmed = requestedSlug != null ? String(requestedSlug).trim() : undefined;

  if (trimmed === undefined) {
    if (currentSlug) return { slug: currentSlug };
    const slug = await generateUniqueSlug(name, (c) => slugTakenByOtherProduct(c, excludeId));
    return { slug };
  }

  if (trimmed === "") {
    const slug = await generateUniqueSlug(name, (c) => slugTakenByOtherProduct(c, excludeId));
    return { slug };
  }

  const sanitized = slugify(trimmed);
  if (!sanitized) {
    return { error: "Custom slug must contain at least one letter or number." };
  }
  if (sanitized === currentSlug) return { slug: sanitized };
  if (await slugTakenByOtherProduct(sanitized, excludeId)) {
    return { error: `Slug "${sanitized}" is already in use. Please choose a different slug.` };
  }
  return { slug: sanitized };
}

export const parseVariantsPayload = (raw) => {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

/** Adapted for the Web Request API: reads ?include_offer= and the x-client header. */
export function shouldApplyOffersForRequest(request) {
  const includeOfferParam = String(request.nextUrl.searchParams.get("include_offer") ?? "").toLowerCase();
  const client = String(request.headers.get("x-client") ?? "").toLowerCase();

  if (includeOfferParam === "false" || includeOfferParam === "0") return false;
  if (client === "admin") return false;

  return true;
}

export const resolveProductOffer = (product, offers) => {
  const productOffer = offers.find((o) => o.apply_on === "product" && o.product_id === product.id);
  const categoryOffer = offers.find((o) => o.apply_on === "category" && o.category_id === product.category_id);
  const globalOffer = offers.find((o) => o.apply_on === "all");
  return productOffer || categoryOffer || globalOffer;
};

export const resolveProductOfferByIds = (productId, categoryId, offers) => {
  const pid = Number(productId);
  const cid = Number(categoryId);
  const productOffer = offers.find((o) => o.apply_on === "product" && Number(o.product_id) === pid);
  const categoryOffer = offers.find((o) => o.apply_on === "category" && Number(o.category_id) === cid);
  const globalOffer = offers.find((o) => o.apply_on === "all");
  return productOffer || categoryOffer || globalOffer || null;
};

export const discountedPriceForOffer = (basePrice, offer) => {
  const base = Number(basePrice);
  if (!Number.isFinite(base) || base < 0 || !offer) return null;

  const discountValue = Number(offer.discount_value || 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return round2(base);

  let discountAmount = discountValue;
  if (offer.discount_type === "percent" || offer.discount_type === "percentage") {
    discountAmount = (base * discountValue) / 100;
  }

  if (offer.max_discount != null && offer.max_discount !== "") {
    const maxDiscount = Number(offer.max_discount);
    if (Number.isFinite(maxDiscount) && maxDiscount >= 0) {
      discountAmount = Math.min(discountAmount, maxDiscount);
    }
  }

  return round2(Math.max(base - discountAmount, 0));
};

export const shouldRestoreBasePriceFromOfferEcho = (submittedPrice, existingPrice, offer) => {
  const submitted = Number(submittedPrice);
  const existing = Number(existingPrice);
  if (!Number.isFinite(submitted) || !Number.isFinite(existing) || !offer) return false;
  const expectedDiscounted = discountedPriceForOffer(existing, offer);
  if (!Number.isFinite(expectedDiscounted)) return false;
  return Math.abs(round2(submitted) - round2(expectedDiscounted)) <= 0.01;
};

/** Listing/display price: min variant price when variants exist, else product row */
export const effectiveBasePrice = (product) => {
  const rows = product.variants || [];
  if (rows.length) {
    const nums = rows
      .map((v) => {
        const j = typeof v.toJSON === "function" ? v.toJSON() : v;
        return Number(j.price);
      })
      .filter((n) => !Number.isNaN(n));
    if (nums.length) return Math.min(...nums);
  }
  return Number(product.price) || 0;
};

export const effectiveBaseOldPrice = (product) => {
  const rows = product.variants || [];
  if (rows.length) {
    const minP = effectiveBasePrice(product);
    const match = rows.find((v) => {
      const j = typeof v.toJSON === "function" ? v.toJSON() : v;
      return Number(j.price) === minP;
    });
    if (match) {
      const j = typeof match.toJSON === "function" ? match.toJSON() : match;
      if (j.old_price != null && j.old_price !== "") return Number(j.old_price);
    }
  }
  return product.old_price != null ? Number(product.old_price) : null;
};

export async function syncProductFromVariants(productId, transaction) {
  const list = await ProductVariant.findAll({ where: { product_id: productId }, transaction });
  if (list.length === 0) {
    await Product.update(
      { price: null, old_price: null, in_stock: false },
      { where: { id: productId }, transaction },
    );
    return;
  }
  const nums = list.map((v) => Number(v.price)).filter((n) => !Number.isNaN(n));
  const minP = nums.length ? Math.min(...nums) : null;
  const minVar = minP != null ? list.find((v) => Number(v.price) === minP) : null;
  const oldP = minVar && minVar.old_price != null && minVar.old_price !== "" ? Number(minVar.old_price) : null;
  const anyStock = list.some((v) => Number(v.stock) > 0);
  await Product.update(
    { price: minP, old_price: Number.isFinite(oldP) ? oldP : null, in_stock: anyStock },
    { where: { id: productId }, transaction },
  );
}

/** Replaces all variants for a product (product_variants + product_variant_images) and syncs product price/stock. */
export async function replaceProductVariants(productId, variantsPayload, transaction) {
  const oldVariants = await ProductVariant.findAll({ where: { product_id: productId }, transaction });
  const variantIds = oldVariants.map((v) => v.id);

  if (variantIds.length > 0) {
    await ProductVariantImage.destroy({ where: { variant_id: variantIds }, transaction });
  }

  await ProductVariant.destroy({ where: { product_id: productId }, transaction });

  for (const v of variantsPayload) {
    let rawAttrs = v.attributes ?? v.variantAttrs;
    rawAttrs = parseJsonIfString(rawAttrs);
    const variantAttrs =
      rawAttrs != null && typeof rawAttrs === "object" && !Array.isArray(rawAttrs) ? rawAttrs : {};

    const { specs, specsHeading, heading: variantHeading } = coerceIncomingVariantFields(v);

    const variant = await ProductVariant.create(
      {
        product_id: productId,
        variantAttrs,
        short_description: sanitizeRichText(v.short_description) || null,
        heading: variantHeading,
        price: Number(v.price) || 0,
        old_price: v.old_price != null && v.old_price !== "" ? Number(v.old_price) : null,
        stock: Number(v.stock) || 0,
        specifications: normalizeVariantSpecificationsForStorage(specs, specsHeading),
        image: v.image || null,
      },
      { transaction },
    );

    const existingImages = Array.isArray(v.images) ? v.images : [];
    const rows = existingImages
      .map((item) => {
        if (typeof item === "string") {
          return item.trim() ? { variant_id: variant.id, image: item.trim() } : null;
        }
        if (item && typeof item.image === "string" && item.image.trim()) {
          return { variant_id: variant.id, image: item.image.trim() };
        }
        return null;
      })
      .filter(Boolean);

    if (rows.length > 0) {
      await ProductVariantImage.bulkCreate(rows, { transaction });
    }
  }

  await syncProductFromVariants(productId, transaction);
}

export const formatProductVariants = (product, offer, { applyOffer = true } = {}) => {
  const rows = product.variants || [];

  return rows.map((v) => {
    const json = typeof v.toJSON === "function" ? v.toJSON() : v;

    const base = Number(json.price);
    let price = Number.isFinite(base) ? base : 0;

    const rawOld = json.old_price != null && json.old_price !== "" ? Number(json.old_price) : null;
    let old_price = Number.isFinite(rawOld) ? rawOld : null;

    if (applyOffer && offer && Number.isFinite(base)) {
      const discounted = discountedPriceForOffer(base, offer);
      if (Number.isFinite(discounted)) {
        price = discounted;
      }
      old_price = base;
    }

    const gallery = (json.images || []).map((img) => (typeof img === "object" && img.image != null ? img.image : img));

    const stock = Number(json.stock) || 0;

    return {
      id: json.id,
      product_id: json.product_id,
      attributes: json.variantAttrs ?? json.attributes,
      short_description: json.short_description ?? null,
      heading: json.heading ?? null,
      specifications: parseVariantSpecifications(json.specifications),
      specifications_heading: specificationsHeadingFromStored(json.specifications),
      price,
      old_price,
      stock,
      stock_available: stock,
      in_stock: stock > 0,
      images: gallery,
      image: json.image || null,
    };
  });
};

export const applyOffer = (product, offers) => {
  let price = effectiveBasePrice(product);
  let old_price = effectiveBaseOldPrice(product);

  const offer = resolveProductOffer(product, offers);

  if (offer) {
    old_price = price;
    const discounted = discountedPriceForOffer(price, offer);
    price = Number.isFinite(discounted) ? discounted : price;
  }

  const json = product.toJSON();
  const formattedVariants = formatProductVariants({ ...json, variants: product.variants }, offer);

  return { ...json, variants: formattedVariants, price, old_price };
};
