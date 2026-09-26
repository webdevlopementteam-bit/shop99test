import Order from "@/lib/models/orderModel.js";
import { notifyOrderStatusChangeAsync } from "@/lib/services/orderStatusSms.js";
import {
  pickRefundPayload,
  calculateRefundAmount,
  getReturnReplaceWindowState,
  hasBankDetails,
  RETURN_REPLACE_WINDOW_DAYS,
} from "@/lib/orderHelpers.js";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { return_status, replacement_status, return_reason, replacement_reason, reason } = body;

    const order = await Order.findByPk(id);

    if (!order) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const prevReplacementStatus = order.replacement_status;

    const normalizedStatus = String(order.status ?? "").trim().toLowerCase();
    const requestingReturn = String(return_status ?? "").trim().toLowerCase() === "requested";
    const requestingReplacement = String(replacement_status ?? "").trim().toLowerCase() === "requested";

    if (requestingReturn || requestingReplacement) {
      if (normalizedStatus !== "delivered") {
        return Response.json(
          { message: "Return/Replacement request is allowed only for delivered orders." },
          { status: 400 },
        );
      }

      const requestWindow = getReturnReplaceWindowState(order);
      if (!requestWindow.withinWindow) {
        return Response.json(
          { message: `Return/Replacement request is allowed only within ${RETURN_REPLACE_WINDOW_DAYS} days of delivery.` },
          { status: 400 },
        );
      }
    }

    const updateData = {
      return_status: return_status || order.return_status,
      replacement_status: replacement_status || order.replacement_status,
    };
    const now = new Date();
    if (return_status === "requested" && order.return_status !== "requested") {
      updateData.return_requested_date = now;
    }
    if (return_status === "approved" && order.return_status !== "approved") {
      updateData.return_approved_date = now;
    }
    if (return_status === "completed" && order.return_status !== "completed") {
      updateData.return_completed_date = now;
    }
    if (replacement_status === "requested" && order.replacement_status !== "requested") {
      updateData.replacement_requested_date = now;
    }
    if (replacement_status === "approved" && order.replacement_status !== "approved") {
      updateData.replacement_approved_date = now;
    }
    if (replacement_status === "shipped" && order.replacement_status !== "shipped") {
      updateData.replacement_shipped_date = now;
    }
    if (replacement_status === "delivered" && order.replacement_status !== "delivered") {
      updateData.replacement_delivered_date = now;
    }

    if (return_reason != null || (return_status && reason != null)) {
      updateData.return_reason = return_reason ?? reason;
    }

    if (replacement_reason != null || (replacement_status && reason != null)) {
      updateData.replacement_reason = replacement_reason ?? reason;
    }

    const refundPayload = pickRefundPayload(body);

    if (refundPayload.refund_account_holder != null) {
      updateData.refund_account_holder = refundPayload.refund_account_holder;
    }
    if (refundPayload.refund_account_number != null) {
      updateData.refund_account_number = refundPayload.refund_account_number;
    }
    if (refundPayload.refund_ifsc != null) {
      updateData.refund_ifsc = refundPayload.refund_ifsc;
    }
    if (refundPayload.refund_upi_id != null) {
      updateData.refund_upi_id = refundPayload.refund_upi_id;
    }

    const returnApprovedNow = return_status === "approved" && order.return_status !== "approved";

    if (returnApprovedNow) {
      const derivedRefundAmount =
        refundPayload.refund_amount != null ? Number(refundPayload.refund_amount) : calculateRefundAmount(order);

      updateData.refund_amount = Number.isFinite(derivedRefundAmount) ? derivedRefundAmount : calculateRefundAmount(order);

      updateData.refund_method = refundPayload.refund_method || "bank_transfer";
      updateData.refund_reason = refundPayload.refund_reason || "Return approved by admin";
      updateData.refund_requested_at = new Date();

      const paymentMode = String(order.payment_mode || "").trim().toLowerCase();

      const bankProvided =
        hasBankDetails({
          refund_account_number: refundPayload.refund_account_number || order.refund_account_number,
          refund_ifsc: refundPayload.refund_ifsc || order.refund_ifsc,
        }) || Boolean(refundPayload.refund_upi_id || order.refund_upi_id);

      if (paymentMode === "cod" && !bankProvided) {
        updateData.refund_status = "pending_bank_details";
      } else {
        updateData.refund_status = "pending";
      }
    }

    await order.update(updateData);
    await order.reload();

    const nextReplacementStatus = String(order.replacement_status || "").trim().toLowerCase();

    const prevReplacement = String(prevReplacementStatus || "").trim().toLowerCase();

    if (
      replacement_status &&
      nextReplacementStatus !== prevReplacement &&
      ["shipped", "delivered"].includes(nextReplacementStatus)
    ) {
      notifyOrderStatusChangeAsync(order, prevReplacementStatus, nextReplacementStatus);
    }

    return Response.json({ success: true, data: order });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
