// Shared discount/offer pricing helpers used identically across
// deals, latest-products, popular-products, and most-selling-products
// controllers (ported verbatim from each backend controller — they were
// byte-identical copies of each other there too).

export const round2 = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
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

export const resolveProductOfferByIds = (productId, categoryId, offers) => {
  const pid = Number(productId);
  const cid = Number(categoryId);

  const productOffer = offers.find(
    (offer) => offer.apply_on === "product" && Number(offer.product_id) === pid,
  );
  const categoryOffer = offers.find(
    (offer) => offer.apply_on === "category" && Number(offer.category_id) === cid,
  );
  const globalOffer = offers.find((offer) => offer.apply_on === "all");

  return productOffer || categoryOffer || globalOffer || null;
};
