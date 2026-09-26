import { Op } from "sequelize";
import Offer from "@/lib/models/offerModel.js";
import Product from "@/lib/models/productModel.js";

/* ================= GET OFFERS ================= */
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Offer.update(
      { is_active: false },
      { where: { end_on: { [Op.lt]: today }, is_active: true } },
    );

    const offers = await Offer.findAll({
      include: [{ model: Product, attributes: ["id", "name", "image", "price"] }],
      order: [["id", "DESC"]],
    });

    return Response.json(offers);
  } catch (err) {
    console.error("GET OFFERS ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= CREATE ================= */
export async function POST(request) {
  try {
    let data = await request.json();
    data = { ...data };

    if (data.apply_on === "product") data.category_id = null;
    if (data.apply_on === "category") data.product_id = null;
    if (data.apply_on === "all") {
      data.product_id = null;
      data.category_id = null;
    }

    if (!data.offer_name || !data.discount_value) {
      return Response.json({ message: "Offer name and discount required" }, { status: 400 });
    }

    const offer = await Offer.create(data);

    return Response.json({ message: "Offer Created", data: offer }, { status: 201 });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);
    return Response.json({ message: error.message }, { status: 500 });
  }
}
