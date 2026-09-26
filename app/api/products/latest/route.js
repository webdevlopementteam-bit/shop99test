import "@/lib/models/relations.js";
import Product from "@/lib/models/productModel.js";
import Category from "@/lib/models/categoryModel.js";
import ProductVariant from "@/lib/models/productVariantModel.js";
import ProductVariantImage from "@/lib/models/productVariantImageModel.js";
import Offer from "@/lib/models/offerModel.js";
import { applyOffer } from "@/lib/productHelpers.js";

export async function GET() {
  try {
    const products = await Product.findAll({
      include: [
        { model: Category, attributes: ["id", "name"] },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "product_id",
            "variantAttrs",
            "short_description",
            "price",
            "old_price",
            "stock",
            "specifications",
            "image",
          ],
          include: [{ model: ProductVariantImage, as: "images", attributes: ["image"] }],
        },
      ],
      order: [["id", "DESC"]],
      limit: 8,
    });

    const offers = await Offer.findAll({ where: { is_active: true } });

    const result = products.map((p) => applyOffer(p, offers));

    return Response.json(result);
  } catch (err) {
    return Response.json({ message: "Failed to fetch latest products" }, { status: 500 });
  }
}
