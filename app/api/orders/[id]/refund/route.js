import { withAdmin } from "@/lib/auth.js";
import Order from "@/lib/models/orderModel.js";
import { pickRefundPayload } from "@/lib/orderHelpers.js";

async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { refund_status } = body;

    const allowed = ["none", "pending", "pending_bank_details", "processing", "refunded", "failed", "not_required"];

    if (!allowed.includes(refund_status)) {
      return Response.json({ message: "Invalid refund_status" }, { status: 400 });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const p = pickRefundPayload(body);
    const updateData = { refund_status };

    if (p.refund_amount != null) updateData.refund_amount = p.refund_amount;
    if (p.refund_method != null) updateData.refund_method = p.refund_method;
    if (p.refund_reason != null) updateData.refund_reason = p.refund_reason;
    if (p.refund_reference != null) updateData.refund_reference = p.refund_reference;
    if (p.refund_account_holder != null) updateData.refund_account_holder = p.refund_account_holder;
    if (p.refund_account_number != null) updateData.refund_account_number = p.refund_account_number;
    if (p.refund_ifsc != null) updateData.refund_ifsc = p.refund_ifsc;
    if (p.refund_upi_id != null) updateData.refund_upi_id = p.refund_upi_id;

    if (!order.refund_requested_at) {
      updateData.refund_requested_at = new Date();
    }
    if (refund_status === "refunded") {
      updateData.refund_processed_at = new Date();
    }

    await order.update(updateData);
    return Response.json({ success: true, data: order });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);
