import Order from "@/lib/models/orderModel.js";
import { getFrontendUrl } from "@/lib/orderHelpers.js";

export async function POST(request) {
  try {
    const formData = await request.formData().catch(() => null);
    const body = formData ? Object.fromEntries(formData.entries()) : {};
    console.log("PAYU FAILURE BODY:", body);

    const searchParams = request.nextUrl.searchParams;
    const txnid = body?.txnid || searchParams.get("txnid");
    if (!txnid) {
      return Response.redirect(`${getFrontendUrl()}/payment-failure?reason=missing_txnid`, 302);
    }
    const order = await Order.findOne({ where: { txnid } });
    if (order && !["confirmed", "delivered", "shipped"].includes(String(order.status || "").toLowerCase())) {
      await order.update({ status: "failed" });
    }
    return Response.redirect(`${getFrontendUrl()}/payment-failure?txnid=${encodeURIComponent(txnid)}`, 302);
  } catch (err) {
    console.error("PAYU FAILURE ERROR:", err);
    return Response.redirect(`${getFrontendUrl()}/payment-failure?reason=server_error`, 302);
  }
}
