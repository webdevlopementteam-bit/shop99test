import Order from "@/lib/models/orderModel.js";

export async function POST(request) {
  try {
    const formData = await request.formData().catch(() => null);
    const body = formData ? Object.fromEntries(formData.entries()) : {};
    const searchParams = request.nextUrl.searchParams;

    const txnid = body?.txnid || searchParams.get("txnid");
    const payuStatus = String(body?.status || searchParams.get("status") || "").toLowerCase();

    if (!txnid) {
      return Response.redirect(`${process.env.FRONTEND_URL}/payment-failure?reason=missing_txnid`, 302);
    }

    const order = await Order.findOne({ where: { txnid } });

    if (!order) {
      return Response.redirect(
        `${process.env.FRONTEND_URL}/payment-failure?reason=order_not_found&txnid=${encodeURIComponent(txnid)}`,
        302,
      );
    }

    if (payuStatus && payuStatus !== "success") {
      await order.update({ status: "failed" });

      return Response.redirect(`${process.env.FRONTEND_URL}/payment-failure?txnid=${encodeURIComponent(txnid)}`, 302);
    }

    await order.update({
      status: "confirmed",
      confirmed_date: order.confirmed_date || new Date(),
    });
    return Response.redirect(
      `${process.env.FRONTEND_URL}/payment-success?order_id=${encodeURIComponent(order.order_id)}&txnid=${encodeURIComponent(txnid)}`,
      302,
    );
  } catch (err) {
    console.error("PAYU SUCCESS ERROR:", err);
    return Response.redirect(`${process.env.FRONTEND_URL}/payment-failure?reason=server_error`, 302);
  }
}
