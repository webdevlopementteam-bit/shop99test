import Order from "@/lib/models/orderModel.js";
import { redirectToPage } from "@/lib/orderHelpers.js";
import { isGenuinePayuResponse } from "@/lib/payuVerify.js";

export async function POST(request) {
  try {
    const formData = await request.formData().catch(() => null);
    const body = formData ? Object.fromEntries(formData.entries()) : {};

    const txnid = body?.txnid;
    if (!txnid) {
      return redirectToPage(`/payment-failure?reason=missing_txnid`);
    }
    // Only a genuine PayU response may mark the order failed; otherwise anyone
    // with a txnid could fail someone else's order. The user still sees the
    // failure page either way.
    if (isGenuinePayuResponse(body)) {
      const order = await Order.findOne({ where: { txnid } });
      if (order && !["confirmed", "delivered", "shipped"].includes(String(order.status || "").toLowerCase())) {
        await order.update({ status: "failed" });
      }
    } else {
      console.warn("PAYU FAILURE: hash verification failed for txnid", txnid);
    }
    return redirectToPage(`/payment-failure?txnid=${encodeURIComponent(txnid)}`);
  } catch (err) {
    console.error("PAYU FAILURE ERROR:", err);
    return redirectToPage(`/payment-failure?reason=server_error`);
  }
}
