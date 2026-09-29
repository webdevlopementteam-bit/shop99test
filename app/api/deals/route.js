import { withAdmin } from "@/lib/auth.js";
import { Op } from "sequelize";
import Deal from "@/lib/models/dealModel.js";
import Product from "@/lib/models/productModel.js";
import Offer from "@/lib/models/offerModel.js";

const round2 = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

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

const discountedPriceForOffer = (basePrice, offer) => {
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

const resolveProductOfferByIds = (productId, categoryId, offers) => {
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

/* ================= ADD ================= */
async function handlePOST(request) {
  try {
    const body = await request.json();
    const { deals, productIds, discount_type, discount_value } = body;

    const normalizedDeals = Array.isArray(deals)
      ? deals
      : Array.isArray(productIds)
        ? productIds.map((productId) => ({
            product_id: productId,
            discount_type: discount_type || "percent",
            discount_value: discount_value !== undefined ? Number(discount_value) : 0,
          }))
        : [];

    if (!normalizedDeals.length) {
      return Response.json({ message: "No deals selected" }, { status: 400 });
    }

    const created = [];

    for (const item of normalizedDeals) {
      const productId = Number(item.product_id);
      const type = item.discount_type;
      const value = Number(item.discount_value);

      if (!Number.isInteger(productId) || productId <= 0) continue;
      if (!["flat", "percent"].includes(type)) continue;
      if (!Number.isFinite(value) || value < 0) continue;

      const exists = await Deal.findOne({ where: { product_id: productId } });

      if (!exists) {
        const newDeal = await Deal.create({
          product_id: productId,
          discount_type: type,
          discount_value: value,
        });
        created.push(newDeal);
      } else {
        await exists.update({ discount_type: type, discount_value: value });
      }
    }

    return Response.json({ message: "Deals added", data: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================= GET ================= */
export async function GET() {
  try {
    const data = await Deal.findAll({
      include: [
        {
          model: Product,
          attributes: ["id", "category_id", "name", "slug", "price", "image", "in_stock", "old_price"],
        },
      ],
      order: [["id", "DESC"]],
    });

    const products = data.map((item) => item.Product).filter(Boolean);
    const productIds = products.map((product) => product.id);
    const categoryIds = [...new Set(products.map((product) => product.category_id).filter(Boolean))];
    const now = new Date();
    const offers =
      productIds.length > 0
        ? await Offer.findAll({
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
          })
        : [];

    const response = data.map((item) => {
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
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
