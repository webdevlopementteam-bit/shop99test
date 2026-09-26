import Coupon from "@/lib/models/couponModel.js";

/* ================= UPDATE COUPON ================= */
export async function PUT(request, { params }) {
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
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await Coupon.destroy({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ message: "Coupon delete failed" }, { status: 500 });
  }
}
