import Offer from "@/lib/models/offerModel.js";
import Product from "@/lib/models/productModel.js";

export async function POST(request) {
  try {
    const { offer_id, price, product_id } = await request.json();

    if (!offer_id || !price || price <= 0) {
      return Response.json({ message: "Invalid data" }, { status: 400 });
    }

    const offer = await Offer.findOne({
      where: { id: offer_id, is_active: true },
      include: [{ model: Product, attributes: ["id"] }],
    });

    if (!offer) {
      return Response.json({ message: "Offer not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const begin = offer.begin_on ? new Date(offer.begin_on) : null;
    const end = offer.end_on ? new Date(offer.end_on) : null;

    if (begin) begin.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    console.log("TODAY:", today);
    console.log("BEGIN:", begin);
    console.log("END:", end);

    if (begin && begin > today) {
      return Response.json({ message: "Offer not started yet" }, { status: 400 });
    }

    if (end && end < today) {
      return Response.json({ message: "Offer expired" }, { status: 400 });
    }

    if (offer.usage_limit !== null && offer.used_count >= offer.usage_limit) {
      return Response.json({ message: "Offer usage limit reached" }, { status: 400 });
    }

    if (offer.apply_on === "product") {
      if (!product_id) {
        return Response.json({ message: "Product ID required for this offer" }, { status: 400 });
      }

      const productIds = offer.Product ? [offer.Product.id] : [];

      if (!productIds.includes(Number(product_id))) {
        return Response.json({ message: "Offer not valid for this product" }, { status: 400 });
      }
    }

    let discount = 0;

    if (offer.discount_type === "percent") {
      discount = (price * Number(offer.discount_value)) / 100;
    } else {
      discount = Number(offer.discount_value || 0);
    }

    if (offer.max_discount && discount > offer.max_discount) {
      discount = Number(offer.max_discount);
    }

    const finalPrice = Math.max(price - discount, 0);

    await offer.increment("used_count");

    return Response.json({ success: true, discount, finalPrice, offer_id: offer.id });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Apply offer failed" }, { status: 500 });
  }
}
