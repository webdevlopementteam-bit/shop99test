import Order from "@/lib/models/orderModel.js";
import { notifyOrderStatusChangeAsync } from "@/lib/services/orderStatusSms.js";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body?.status || "").trim().toLowerCase();

    const order = await Order.findByPk(id);

    if (!order) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const prevStatus = order.status;
    const prevStatusNorm = String(prevStatus || "").trim().toLowerCase();

    const now = new Date();

    let updateData = { status };

    // Save date only when status newly reaches that step
    if (status === "confirmed" && prevStatusNorm !== "confirmed") {
      updateData.confirmed_date = now;
    }

    if (status === "processing" && prevStatusNorm !== "processing") {
      updateData.processing_date = now;
    }

    if (status === "shipped" && prevStatusNorm !== "shipped") {
      updateData.shipped_status_date = now;
      updateData.shipping_date = now;
    }

    if (status === "delivered" && prevStatusNorm !== "delivered") {
      updateData.delivered_date = now;
    }

    // If moved back from delivered, clear delivered date
    if (status !== "delivered") {
      updateData.delivered_date = null;
    }

    await order.update(updateData);
    await order.reload();

    notifyOrderStatusChangeAsync(order, prevStatus, status);

    return Response.json({ success: true, data: order });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
