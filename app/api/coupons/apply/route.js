import Coupon from "@/lib/models/couponModel.js";

export async function POST(request) {
  try {
    const { code, price } = await request.json();

    const coupon = await Coupon.findOne({ where: { code, is_active: true } });

    if (!coupon) {
      return Response.json({ message: "Invalid Coupon" }, { status: 404 });
    }

    const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];

    const begin = coupon.begin_on ? new Date(coupon.begin_on).toLocaleDateString("en-CA") : null;

    const end = coupon.end_on ? new Date(coupon.end_on).toLocaleDateString("en-CA") : null;

    console.log("TODAY:", today);
    console.log("BEGIN:", begin);
    console.log("END:", end);

    if ((begin && begin > today) || (end && end < today)) {
      return Response.json({ message: "Coupon expired" }, { status: 400 });
    }

    // USAGE LIMIT CHECK
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return Response.json({ message: "Coupon usage limit reached" }, { status: 400 });
    }

    // DISCOUNT LOGIC
    let discount = 0;

    if (coupon.discount_type === "percentage") {
      discount = (price * Number(coupon.discount_value)) / 100;
    } else {
      discount = Number(coupon.discount_value || 0);
    }

    // max discount cap
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = Number(coupon.max_discount);
    }

    const finalPrice = Math.max(price - discount, 0);

    // increment usage
    await coupon.increment("used_count");

    return Response.json({ success: true, discount, finalPrice });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Coupon apply failed" }, { status: 500 });
  }
}
