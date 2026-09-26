import { Op } from "sequelize";
import MostSellingProduct from "@/lib/models/mostSellingProductModel.js";
import Product from "@/lib/models/productModel.js";
import Offer from "@/lib/models/offerModel.js";
import { discountedPriceForOffer, resolveProductOfferByIds } from "@/lib/offerPricing.js";

/* ================= ADD ================= */
export async function POST(request) {
  try {
    const { productIds } = await request.json();

    if (!productIds || !productIds.length) {
      return Response.json({ message: "No products selected" }, { status: 400 });
    }

    const created = [];

    for (const id of productIds) {
      const exists = await MostSellingProduct.findOne({ where: { product_id: id } });

      if (!exists) {
        const item = await MostSellingProduct.create({ product_id: id });
        created.push(item);
      }
    }

    return Response.json({ message: "Most selling products added", data: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================= GET ================= */
export async function GET() {
  try {
    const data = await MostSellingProduct.findAll({
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
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
