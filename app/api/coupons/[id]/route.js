import { withAdmin } from "@/lib/auth.js";
import Coupon from "@/lib/models/couponModel.js";

/* ================= UPDATE COUPON ================= */
async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    await Coupon.update(body, { where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ message: "Coupon update failed" }, { status: 500 });
  }
}

/* ================= DELETE COUPON ================= */
async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;

    await Coupon.destroy({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ message: "Coupon delete failed" }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);

export const DELETE = withAdmin(handleDELETE);
