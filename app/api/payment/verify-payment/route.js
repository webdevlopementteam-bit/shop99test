import Order from "@/lib/models/orderModel.js";

/* ================= VERIFY PAYMENT ================= */
export async function POST(request) {
  try {
    const r = await request.json();
    const txnid = String(r.txnid || "").trim();
    if (!txnid) {
      return Response.json({ success: false, message: "txnid is required" }, { status: 400 });
    }
    const order = await Order.findOne({ where: { txnid } });
    if (!order) {
      return Response.json({ success: false, message: "Order not found" }, { status: 404 });
    }
    const currentStatus = String(order.status || "").trim().toLowerCase();
    const payuStatus = String(r.status || "").trim().toLowerCase();
    const unmapped = String(r.unmappedstatus || r.unmapped_status || "").trim().toLowerCase();
    const isSuccessStatus =
      payuStatus === "success" || payuStatus === "captured" || payuStatus === "paid" || payuStatus === "completed";
    const isFailureStatus =
      ["failure", "failed", "cancelled", "canceled", "declined", "aborted"].includes(payuStatus) ||
      unmapped === "user cancelled" ||
      unmapped === "user_cancelled" ||
      unmapped === "failed" ||
      unmapped === "failure";
    if (isSuccessStatus) {
      // Admin manually confirmed karega.
      if (!["confirmed", "delivered", "shipped"].includes(currentStatus)) {
        await order.update({ status: "pending" });
      }
      return Response.json({
        success: true,
        message: "Payment successful. Order kept pending for admin confirmation.",
        status: ["confirmed", "delivered", "shipped"].includes(currentStatus) ? order.status : "pending",
        txnid: order.txnid,
        order_id: order.order_id,
        id: order.id,
      });
    }
    if (isFailureStatus) {
      // Failed/cancelled payment DB me failed hoga.
      if (["confirmed", "delivered", "shipped"].includes(currentStatus)) {
        return Response.json({
          success: true,
          message: "Order already processed; ignoring payment failure",
          status: order.status,
          txnid: order.txnid,
          order_id: order.order_id,
          id: order.id,
        });
      }
      await order.update({ status: "failed" });
      return Response.json({
        success: false,
        message: "Payment failed",
        status: "failed",
        txnid: order.txnid,
        order_id: order.order_id,
        id: order.id,
      });
    }
    return Response.json({
      success: currentStatus === "pending" || currentStatus === "confirmed",
      message: "Payment status inconclusive; keeping existing order status",
      status: order.status,
      txnid: order.txnid,
      order_id: order.order_id,
      id: order.id,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, message: "Payment verification failed" }, { status: 500 });
  }
}
