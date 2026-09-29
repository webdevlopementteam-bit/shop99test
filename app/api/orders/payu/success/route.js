import Order from "@/lib/models/orderModel.js";
import { redirectToPage } from "@/lib/orderHelpers.js";
import { isGenuinePayuResponse, amountMatchesOrder } from "@/lib/payuVerify.js";

export async function POST(request) {
  try {
    const formData = await request.formData().catch(() => null);
    const body = formData ? Object.fromEntries(formData.entries()) : {};

    // Everything below trusts the POSTed status/txnid, so it must be PayU's.
    // (No query-string fallback: PayU always posts the signed fields.)
    const txnid = body?.txnid;
    if (!txnid) {
      return redirectToPage(`/payment-failure?reason=missing_txnid`);
    }
    if (!isGenuinePayuResponse(body)) {
      console.warn("PAYU SUCCESS: hash verification failed for txnid", txnid);
      return redirectToPage(`/payment-failure?reason=verification_failed&txnid=${encodeURIComponent(txnid)}`);
    }

    const payuStatus = String(body.status || "").toLowerCase();
    const order = await Order.findOne({ where: { txnid } });

    if (!order) {
      return redirectToPage(`/payment-failure?reason=order_not_found&txnid=${encodeURIComponent(txnid)}`);
    }

    if (payuStatus !== "success") {
      await order.update({ status: "failed" });
      return redirectToPage(`/payment-failure?txnid=${encodeURIComponent(txnid)}`);
    }

    // Genuine success, but for a different amount than the order — don't confirm.
    if (!amountMatchesOrder(body, order)) {
      console.warn("PAYU SUCCESS: amount mismatch for txnid", txnid, "paid", body.amount, "due", order.total_amount);
      return redirectToPage(`/payment-failure?reason=amount_mismatch&txnid=${encodeURIComponent(txnid)}`);
    }

    await order.update({
      status: "confirmed",
      confirmed_date: order.confirmed_date || new Date(),
    });
    return redirectToPage(`/payment-success?order_id=${encodeURIComponent(order.order_id)}&txnid=${encodeURIComponent(txnid)}`);
  } catch (err) {
    console.error("PAYU SUCCESS ERROR:", err);
    return redirectToPage(`/payment-failure?reason=server_error`);
  }
}
