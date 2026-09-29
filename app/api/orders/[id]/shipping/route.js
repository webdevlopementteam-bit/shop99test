import { withAdmin } from "@/lib/auth.js";
import Order from "@/lib/models/orderModel.js";

async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const { delivery_date, shipping_partner, tracking_id, tracking_link } = await request.json();

    const order = await Order.findByPk(id);

    if (!order) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    await order.update({
      shipping_date: new Date(),
      shipped_status_date: new Date(),
      delivery_date,
      shipping_partner,
      tracking_id,
      tracking_link,
      status: "shipped",
    });

    return Response.json({ success: true, message: "Shipping updated", data: order });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);
