// Server-only: the public storefront lists (top categories, brands, curated
// product lists, deals). Shared by their GET /api/* routes and the homepage,
// which renders them into its HTML so search engines and AI crawlers see the
// products without running JavaScript.
//
// Each function returns plain JSON — the exact body its API route sends.
import { Op } from "sequelize";
import "@/lib/models/relations.js";
import Category from "@/lib/models/categoryModel.js";
import Brand from "@/lib/models/brandModel.js";
import Deal from "@/lib/models/dealModel.js";
import Product from "@/lib/models/productModel.js";
import Offer from "@/lib/models/offerModel.js";
import FooterModel from "@/lib/models/footerModel.js";
import { round2, discountedPriceForOffer, resolveProductOfferByIds } from "@/lib/offerPricing.js";

// Dates → strings etc., same as Response.json() does.
const toJSON = (value) => JSON.parse(JSON.stringify(value));

const PRODUCT_ATTRIBUTES = ["id", "category_id", "name", "slug", "price", "image", "in_stock", "old_price"];

/** GET /api/categories/top */
export async function listTopCategories() {
  const data = await Category.findAll({
    where: { is_top_category: true },
    order: [["id", "DESC"]],
  });
  return toJSON(data);
}

/** GET /api/brands */
export async function listBrands() {
  const data = await Brand.findAll({ order: [["id", "DESC"]] });
  return toJSON(data);
}

/** Active offers that could apply to any of `products`. */
async function findOffersFor(products) {
  const productIds = products.map((product) => product.id);
  const categoryIds = [...new Set(products.map((product) => product.category_id).filter(Boolean))];
  if (productIds.length === 0) return [];

  const now = new Date();
  return Offer.findAll({
    where: {
      is_active: true,
      begin_on: { [Op.lte]: now },
      end_on: { [Op.gte]: now },
      [Op.or]: [
        { apply_on: "all" },
        { apply_on: "product", product_id: { [Op.in]: productIds } },
        { apply_on: "category", category_id: { [Op.in]: categoryIds } },
      ],
    },
  });
}

/**
 * GET /api/popular-products, /api/latest-products, /api/most-selling-products —
 * the same query against each list's model, with any active offer applied.
 */
export async function listCuratedProducts(CurationModel) {
  const data = await CurationModel.findAll({
    include: [{ model: Product, attributes: PRODUCT_ATTRIBUTES }],
    order: [["id", "DESC"]],
  });

  const offers = await findOffersFor(data.map((item) => item.Product).filter(Boolean));

  return toJSON(
    data.map((item) => {
      const json = item.toJSON();
      const product = json.Product;

      if (!product) return json;

      const offer = resolveProductOfferByIds(product.id, product.category_id, offers);
      const basePrice = Number(product.price);

      if (offer && Number.isFinite(basePrice)) {
        const discountedPrice = discountedPriceForOffer(basePrice, offer);
        if (Number.isFinite(discountedPrice)) {
          product.old_price = basePrice;
          product.price = discountedPrice;
        }
      }

      delete product.category_id;
      return json;
    }),
  );
}

const discountedPriceForDeal = (basePrice, discountType, discountValue) => {
  const base = Number(basePrice);
  const value = Number(discountValue || 0);

  if (!Number.isFinite(base) || base < 0) return null;
  if (!Number.isFinite(value) || value <= 0) return round2(base);

  let discountAmount = value;
  if (discountType === "percent" || discountType === "percentage") {
    discountAmount = (base * value) / 100;
  }

  return round2(Math.max(base - discountAmount, 0));
};

/** GET /api/deals — an active offer wins over the deal's own discount. */
export async function listDeals() {
  const data = await Deal.findAll({
    include: [{ model: Product, attributes: PRODUCT_ATTRIBUTES }],
    order: [["id", "DESC"]],
  });

  const offers = await findOffersFor(data.map((item) => item.Product).filter(Boolean));

  return toJSON(
    data.map((item) => {
      const json = item.toJSON();
      const product = json.Product;

      if (!product) return json;

      const basePrice = Number(product.price);
      const offer = resolveProductOfferByIds(product.id, product.category_id, offers);
      const discountedPrice = offer
        ? discountedPriceForOffer(basePrice, offer)
        : discountedPriceForDeal(basePrice, json.discount_type, json.discount_value);

      if (Number.isFinite(discountedPrice)) {
        product.old_price = basePrice;
        product.price = discountedPrice;
      }

      delete product.category_id;
      return json;
    }),
  );
}

const safeParse = (data) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return [];
  }
};

/** GET /api/footer — the active footer settings, or null if none. */
export async function getActiveFooter() {
  const footer = await FooterModel.findOne({ where: { is_active: true }, order: [["id", "DESC"]] });
  if (!footer) return null;

  return toJSON({
    ...footer.toJSON(),
    columns: safeParse(footer.columns),
    contact: safeParse(footer.contact),
    socials: safeParse(footer.socials),
  });
}
