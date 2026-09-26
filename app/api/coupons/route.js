import Coupon from "@/lib/models/couponModel.js";

/* ================= CREATE COUPON ================= */
export async function POST(request) {
  try {
    const body = await request.json();
    const data = {
      ...body,
      product_id: body.product_id || null,
      category_id: body.category_id || null,
    };

    const coupon = await Coupon.create(data);

    return Response.json({ success: true, data: coupon });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Coupon creation failed" }, { status: 500 });
  }
}

/* ================= GET ALL COUPONS ================= */
export async function GET() {
  try {
    const coupons = await Coupon.findAll({ order: [["id", "DESC"]] });
    return Response.json(coupons);
  } catch (err) {
    return Response.json({ message: "Failed to fetch coupons" }, { status: 500 });
  }
}
