import { collectVariantsForPdp } from "./productVariants";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveNumber = (value) => {
  const parsed = toNumber(value);
  return parsed != null && parsed > 0 ? parsed : null;
};

const toHiddenFlag = (value) => {
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
};

const isVariantHidden = (variant) => {
  if (!variant || typeof variant !== "object") return false;
  if (variant.visible != null) return !toHiddenFlag(variant.visible);
  return toHiddenFlag(
    variant.is_hidden ??
      variant.isHidden ??
      variant.hidden ??
      variant.visibility,
  );
};

const pickRawVariantWithPrice = (product) => {
  if (!product || typeof product !== "object") return null;

  const rawVariants =
    product.variants ??
    product.product_variants ??
    product.ProductVariants ??
    product.productVariants ??
    product.Variants;

  if (!Array.isArray(rawVariants) || rawVariants.length === 0) return null;

  return (
    rawVariants.find(
      (variant) =>
        !isVariantHidden(variant) &&
        toPositiveNumber(
          variant?.price ??
            variant?.discounted_price ??
            variant?.discount_price ??
            variant?.final_price ??
            variant?.sale_price ??
            variant?.selling_price ??
            variant?.sellingPrice,
        ) != null,
    ) ?? null
  );
};

const resolvePriceSource = (product) => {
  if (!product || typeof product !== "object") return {};

  // Listing payloads me variant attributes incomplete ho sakte hain.
  // Pricing ke liye direct raw variant price prefer karo (PDP ke behavior ke closer).
  const rawVariantWithPrice = pickRawVariantWithPrice(product);
  if (rawVariantWithPrice) {
    return {
      price:
        rawVariantWithPrice.price ??
        rawVariantWithPrice.discounted_price ??
        rawVariantWithPrice.discount_price ??
        rawVariantWithPrice.final_price ??
        rawVariantWithPrice.sale_price ??
        rawVariantWithPrice.selling_price ??
        rawVariantWithPrice.sellingPrice,
      old_price:
        rawVariantWithPrice.old_price ??
        rawVariantWithPrice.original_price ??
        rawVariantWithPrice.regular_price ??
        rawVariantWithPrice.mrp ??
        rawVariantWithPrice.MRP,
      discount_type: product.discount_type,
      discount_value: product.discount_value,
      discount_percent: product.discount_percent,
      discount_percentage: product.discount_percentage,
    };
  }

  const pdpVariants = collectVariantsForPdp(product);
  if (Array.isArray(pdpVariants) && pdpVariants.length > 0) {
    const variantWithPrice = pdpVariants.find(
      (variant) =>
        toPositiveNumber(
          variant?.price ??
            variant?.discounted_price ??
            variant?.discount_price ??
            variant?.final_price,
        ) != null,
    );
    if (variantWithPrice) {
      return {
        price:
          variantWithPrice.price ??
          variantWithPrice.discounted_price ??
          variantWithPrice.discount_price ??
          variantWithPrice.final_price,
        old_price:
          variantWithPrice.old_price ??
          variantWithPrice.original_price ??
          variantWithPrice.regular_price,
        discount_type: product.discount_type,
        discount_value: product.discount_value,
        discount_percent: product.discount_percent,
        discount_percentage: product.discount_percentage,
      };
    }
  }

  return product;
};

export const getProductDisplayPricing = (product = {}) => {
  const source = resolvePriceSource(product);
  const currentPrice =
    toPositiveNumber(source.price) ??
    toPositiveNumber(source.discounted_price) ??
    toPositiveNumber(source.discount_price) ??
    toPositiveNumber(source.final_price) ??
    0;
  const oldPriceRaw =
    toPositiveNumber(source.old_price) ??
    toPositiveNumber(source.original_price) ??
    toPositiveNumber(source.regular_price) ??
    toPositiveNumber(source.mrp);

  const discountType = String(source.discount_type || "").toLowerCase();
  const discountValue = toPositiveNumber(source.discount_value) ?? 0;
  const discountPercentRaw =
    toPositiveNumber(source.discount_percent) ??
    toPositiveNumber(source.discount_percentage);

  let finalPrice = currentPrice;
  let oldPrice = oldPriceRaw;

  if (discountType && discountValue > 0) {
    const expectedFromOld =
      oldPriceRaw != null
        ? discountType === "percent"
          ? Math.max(oldPriceRaw - (oldPriceRaw * discountValue) / 100, 0)
          : Math.max(oldPriceRaw - discountValue, 0)
        : null;

    const currentLooksAlreadyDiscounted =
      expectedFromOld != null && Math.abs(expectedFromOld - currentPrice) < 0.01;

    const base =
      currentLooksAlreadyDiscounted || oldPriceRaw == null ? currentPrice : oldPriceRaw;

    oldPrice = base;
    if (discountType === "percent") {
      finalPrice = Math.max(base - (base * discountValue) / 100, 0);
    } else {
      finalPrice = Math.max(base - discountValue, 0);
    }
  } else if (oldPriceRaw != null && oldPriceRaw > currentPrice) {
    finalPrice = currentPrice;
    oldPrice = oldPriceRaw;
  } else if (discountPercentRaw != null && discountPercentRaw > 0) {
    oldPrice = currentPrice;
    finalPrice = Math.max(currentPrice - (currentPrice * discountPercentRaw) / 100, 0);
  } else {
    oldPrice = null;
    finalPrice = currentPrice;
  }

  const hasDiscount = oldPrice != null && oldPrice > finalPrice;
  const discountPercent = hasDiscount
    ? Math.round(((oldPrice - finalPrice) / oldPrice) * 100)
    : 0;

  return {
    finalPrice,
    oldPrice,
    hasDiscount,
    discountPercent,
  };
};
